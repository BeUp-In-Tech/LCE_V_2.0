<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
        public function index(Request $request)
    {
        $user = $this->user();

        $query = DB::table('lce_user_invoice')
            ->leftJoin('lce_user_pickup', 'lce_user_invoice.id', '=', 'lce_user_pickup.invoice_id')
            ->where('lce_user_invoice.user_id', $user->user_id)
            ->select(
                'lce_user_invoice.*',
                'lce_user_pickup.pickup_type',
                'lce_user_pickup.pickup_date'
            )
            ->selectSub(function ($query) {
                $query->select('cdate')
                    ->from('lce_user_transactions')
                    ->whereColumn('invoice_id', 'lce_user_invoice.id')
                    ->where('type', 'debit')
                    ->orderBy('cdate', 'asc')
                    ->limit(1);
            }, 'billing_date')
            ->orderBy('lce_user_invoice.cdate', 'desc');

        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        
        if ($request->has('from_date')) {
            $query->where('cdate', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->where('cdate', '<=', $request->to_date . ' 23:59:59');
        }

        
        $perPage = $request->get('per_page', 999);
        $invoices = $query->paginate($perPage);

        return response()->json([
            'invoices' => collect($invoices->items())->map(fn($inv) => $this->formatInvoice($inv)),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ],
        ]);
    }

        public function show($id)
    {
        $user = $this->user();

        $invoice = DB::table('lce_user_invoice')
            ->select('lce_user_invoice.*')
            ->selectSub(function ($query) {
                $query->select('cdate')
                    ->from('lce_user_transactions')
                    ->whereColumn('invoice_id', 'lce_user_invoice.id')
                    ->where('type', 'debit')
                    ->orderBy('cdate', 'asc')
                    ->limit(1);
            }, 'billing_date')
            ->where('id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$invoice) {
            return response()->json(['error' => 'Invoice not found'], 404);
        }

        
        $lineItems = DB::table('lce_user_invoice_line')
            ->where('invoice_id', $id)
            ->where('deleted', 'No')
            ->orderBy('order')
            ->get();

        
        $pickup = DB::table('lce_user_pickup')
            ->where('invoice_id', $id)
            ->first();

        return response()->json([
            'invoice' => $this->formatInvoice($invoice),
            'line_items' => $lineItems->map(fn($item) => [
                'id' => $item->id,
                'sku' => $item->sku,
                'type' => $item->type,
                'name' => html_entity_decode($item->name ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'quantity' => (float) $item->quantity,
                'price' => (float) $item->price,
                'amount' => (float) $item->amount,
                'note' => $item->note,
            ]),
            'pickup' => $pickup ? [
                'id' => $pickup->id,
                'pickup_date' => $pickup->pickup_date,
                'status' => $pickup->status,
            ] : null,
        ]);
    }

        public function export(Request $request)
    {
        $user = $this->user();

        $query = DB::table('lce_user_invoice')
            ->leftJoin('lce_user_pickup', 'lce_user_invoice.id', '=', 'lce_user_pickup.invoice_id')
            ->where('lce_user_invoice.user_id', $user->user_id)
            ->select(
                'lce_user_invoice.*',
                'lce_user_pickup.pickup_type',
                'lce_user_pickup.pickup_date'
            )
            ->selectSub(function ($query) {
                $query->select('cdate')
                    ->from('lce_user_transactions')
                    ->whereColumn('invoice_id', 'lce_user_invoice.id')
                    ->where('type', 'debit')
                    ->orderBy('cdate', 'asc')
                    ->limit(1);
            }, 'billing_date')
            ->orderBy('lce_user_invoice.cdate', 'desc');

        
        if ($request->filled('from_date')) {
            $query->where('lce_user_invoice.cdate', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->where('lce_user_invoice.cdate', '<=', $request->to_date . ' 23:59:59');
        }

        $invoices = $query->limit(500)->get();

        
        $headers = [
            'Invoice #',
            'Date',
            'Status',
            'Service Type',
            'Hang Dry Items',      
            'Dry Cleaning Items',  
            'Subtotal WF',
            'Subtotal DC',
            'Pickup Charge',
            'Total',
            'Promo Code',
            'Promo Amount'
        ];

        $csv = implode(',', $headers) . "\n";

        foreach ($invoices as $inv) {
            $serviceLabel = $this->getServiceNameFromPickupType($inv->pickup_type);

            
            $lineItems = DB::table('lce_user_invoice_line')
                ->where('invoice_id', $inv->id)
                ->where('deleted', 'No')
                ->whereIn('type', ['HD', 'DC'])
                ->orderBy('order')
                ->get();

            
            $hdItems = [];
            $dcItems = [];

            foreach ($lineItems as $item) {
                $itemText = (html_entity_decode($item->name ?? 'Item', ENT_QUOTES | ENT_HTML5, 'UTF-8')) . ' ($' . number_format($item->price ?? 0, 2) . ')';
                if ($item->quantity > 1) {
                    $itemText = ($item->quantity) . 'x ' . $itemText;
                }

                if ($item->type === 'HD') {
                    $hdItems[] = $itemText;
                } elseif ($item->type === 'DC') {
                    $dcItems[] = $itemText;
                }
            }

            $hdBreakdown = count($hdItems) > 0 ? implode(', ', $hdItems) : '';
            $dcBreakdown = count($dcItems) > 0 ? implode(', ', $dcItems) : '';

            $row = [
                $inv->number,
                $inv->cdate,
                $inv->status,
                '"' . str_replace('"', '""', $serviceLabel) . '"',
                '"' . str_replace('"', '""', $hdBreakdown) . '"',  // HD items in one cell
                '"' . str_replace('"', '""', $dcBreakdown) . '"',  // DC items in one cell
                $inv->sub_total_wf ?? 0,
                $inv->sub_total_dc ?? 0,
                $inv->pickup_charge ?? 0,
                $inv->total ?? 0,
                $inv->promocode ?? '',
                $inv->promo_amount ?? 0,
            ];
            $csv .= implode(',', $row) . "\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="invoices_' . date('Y-m-d') . '.csv"',
        ]);
    }

        private function formatInvoice($inv): array
    {
        
        $lineItems = DB::table('lce_user_invoice_line')
            ->where('invoice_id', $inv->id)
            ->where('deleted', 'No')
            ->whereNotIn('type', ['FEE', 'CREDIT'])  
            ->get(['name', 'type']);

        
        $services = [];
        foreach ($lineItems as $item) {
            
            $serviceName = html_entity_decode($item->name ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if (empty($serviceName)) {
                $serviceName = match ($item->type) {
                    'WF' => 'Wash & Fold Laundry',
                    'DC' => 'Dry Cleaning/Launder & Press',
                    'HD' => 'Hang Dry Laundry',
                    default => $item->type,
                };
            }

            
            if (!in_array($serviceName, $services)) {
                $services[] = $serviceName;
            }
        }

        
        $servicesDisplay = count($services) > 0
            ? implode(' + ', $services)
            : $this->getServiceNameFromPickupType($inv->pickup_type ?? 'wf');

        return [
            'id' => $inv->id,
            'number' => $inv->number,
            'status' => $inv->status,
            'pickup_type' => $inv->pickup_type ?? 'wf',
            'pickup_date' => $inv->pickup_date ?? null,
            'services' => $servicesDisplay,  
            'services_list' => $services,     
            'subtotal' => [
                'wf' => (float) ($inv->sub_total_wf ?? 0),
                'dc' => (float) ($inv->sub_total_dc ?? 0),
                'total' => (float) ($inv->sub_total ?? 0),
            ],
            'pickup_charge' => (float) ($inv->pickup_charge ?? 0),
            'total' => (float) ($inv->total ?? 0),
            'promo' => [
                'code' => $inv->promocode ?? null,
                'amount' => (float) ($inv->promo_amount ?? 0),
            ],
            'billing_date' => $inv->billing_date ?? $inv->cdate,
            'created_at' => $inv->cdate,
            'updated_at' => $inv->mdate,
        ];
    }

        private function getServiceNameFromPickupType(?string $type): string
    {
        return match ($type) {
            'wf' => 'Wash & Fold Laundry',
            'dc' => 'Dry Cleaning/Launder & Press',
            'hd' => 'Hang Dry Laundry',
            'both', 'wf_dc' => 'Wash & Fold Laundry + Dry Cleaning/Launder & Press',
            'hd_dc' => 'Hang Dry Laundry + Dry Cleaning/Launder & Press',
            'wf_hd' => 'Wash & Fold Laundry + Hang Dry Laundry',
            'all', 'wf_dc_hd', 'wf_hd_dc' => 'Wash & Fold Laundry + Dry Cleaning/Launder & Press + Hang Dry Laundry',
            default => 'Wash & Fold Laundry',
        };
    }
}
