<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InvoiceService
{
    protected PricingService $pricingService;
    protected CreditService $creditService;
    protected TransactionService $transactionService;

    public function __construct(PricingService $pricingService, CreditService $creditService, TransactionService $transactionService)
    {
        $this->pricingService = $pricingService;
        $this->creditService = $creditService;
        $this->transactionService = $transactionService;
    }

        public function createInvoice(int $userId, array $lineItems, array $options = []): object
    {
        return DB::transaction(function () use ($userId, $lineItems, $options) {
            
            $subTotalWf = 0;
            $subTotalDc = 0;

            foreach ($lineItems as $item) {
                $amount = ($item['quantity'] ?? 1) * ($item['price'] ?? 0);
                if (in_array($item['type'] ?? '', ['WF', 'HD'])) {
                    $subTotalWf += $amount;
                } else {
                    $subTotalDc += $amount;
                }
            }

            $subTotal = $subTotalWf + $subTotalDc;
            $pickupCharge = $options['pickup_charge'] ?? 0;
            $promoAmount = $options['promo_amount'] ?? 0;

            
            $creditUsed = 0;
            if ($options['use_credits'] ?? false) {
                $creditUsed = $this->creditService->getAvailableBalance($userId);
                $creditUsed = min($creditUsed, $subTotal + $pickupCharge - $promoAmount);
            }

            $total = max(0, $subTotal + $pickupCharge - $promoAmount - $creditUsed);

            
            $invoiceNumber = (DB::table('lce_user_invoice')->max('number') ?? 0) + 1;

            
            // Resolve to canonical internal PK id if public 6-digit user_id was passed
            $userInfo = DB::table('lce_user_info')
                ->where('id', $userId)
                ->orWhere('user_id', $userId)
                ->first(['id', 'user_id']);
            $canonicalUserId = $userInfo ? (int) $userInfo->id : $userId;

            $isSubscription = !empty($options['subscription_id'])
                || (isset($options['order_type']) && strtolower($options['order_type']) === 'subscription')
                || !empty($options['is_subscription_invoice']);

            $invoiceId = DB::table('lce_user_invoice')->insertGetId([
                'number' => $invoiceNumber,
                'user_id' => $canonicalUserId,
                'status' => 'pending',
                'sub_total_wf' => $subTotalWf,
                'sub_total_dc' => $subTotalDc,
                'sub_total' => $subTotal,
                'pickup_charge' => $pickupCharge,
                'total' => $total,
                'promo_id' => $options['promo_id'] ?? 0,
                'promocode' => $options['promocode'] ?? '',
                'promo_amount' => $promoAmount,
                'group_admin_id' => $options['group_admin_id'] ?? 0,
                'group_admin_discount_amount' => $options['group_discount'] ?? 0,
                'partial_invoice' => $options['partial'] ?? 0,
                'order_type' => $options['order_type'] ?? ($isSubscription ? 'subscription' : 'PPO'),
                'subscription_id' => $options['subscription_id'] ?? null,
                'is_subscription_invoice' => $isSubscription ? 1 : 0,
                'deleted' => 'No',
                'cdate' => now(),
                'mdate' => now(),
            ]);

            
            $order = 1;
            foreach ($lineItems as $item) {
                $quantity = $item['quantity'] ?? 1;
                $price = $item['price'] ?? 0;
                $amount = $quantity * $price;

                DB::table('lce_user_invoice_line')->insert([
                    'invoice_id' => $invoiceId,
                    'item_id' => $item['item_id'] ?? null,
                    'site_id' => $item['site_id'] ?? null,
                    'sku' => $item['sku'] ?? null,
                    'type' => $item['type'] ?? 'WF',
                    'name' => $item['name'] ?? 'Service',
                    'quantity' => $quantity,
                    'wholesale_price' => $item['wholesale_price'] ?? null,
                    'wholesale_amount' => $item['wholesale_amount'] ?? null,
                    'price' => $price,
                    'amount' => $amount,
                    'note' => $item['note'] ?? null,
                    'deleted' => 'No',
                    'order' => $order++,
                    'cdate' => now(),
                    'mdate' => now(),
                ]);
            }

            
            if ($creditUsed > 0) {
                $this->creditService->deductCredits($userId, $creditUsed, "Invoice #{$invoiceNumber}");
                $this->transactionService->logCreditUsage($userId, $invoiceId, $creditUsed);
            }

            Log::info('Invoice created', [
                'invoice_id' => $invoiceId,
                'user_id' => $userId,
                'total' => $total,
            ]);

            return DB::table('lce_user_invoice')->find($invoiceId);
        });
    }

        public function markAsPaid(int $invoiceId, string $transactionId): void
    {
        DB::table('lce_user_invoice')
            ->where('id', $invoiceId)
            ->update([
                'status' => 'Paid',
                'mdate' => now(),
            ]);
    }

        public function addFeeLine(int $invoiceId, string $name, float $amount, string $type = 'FEE'): void
    {
        $order = DB::table('lce_user_invoice_line')
            ->where('invoice_id', $invoiceId)
            ->max('order') ?? 0;

        DB::table('lce_user_invoice_line')->insert([
            'invoice_id' => $invoiceId,
            'type' => $type,
            'name' => $name,
            'quantity' => 1,
            'price' => $amount,
            'amount' => $amount,
            'deleted' => 'No',
            'order' => $order + 1,
            'cdate' => now(),
            'mdate' => now(),
        ]);

        
        $invoice = DB::table('lce_user_invoice')->find($invoiceId);
        DB::table('lce_user_invoice')
            ->where('id', $invoiceId)
            ->update([
                'pickup_charge' => ($invoice->pickup_charge ?? 0) + ($type === 'PD' ? $amount : 0),
                'total' => ($invoice->total ?? 0) + $amount,
                'mdate' => now(),
            ]);
    }
}
