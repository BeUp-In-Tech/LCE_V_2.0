<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PriceController extends Controller
{
        public function index(Request $request)
    {
        $user = $this->user();

        
        $priceListId = $user->price_list_id ?? 1;
        $priceColumn = "price_{$priceListId}";

        
        $query = DB::table('lce_prices')
            ->where('deleted', 'No')
            ->orderBy('order')
            ->orderBy('type')
            ->orderBy('name');

        
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $prices = $query->get();

        
        $groupedPrices = $prices->groupBy('type')->map(function ($items, $type) use ($priceColumn) {
            return [
                'type' => $type,
                'items' => $items->map(function ($item) use ($priceColumn) {
                    return [
                        'sku' => $item->sku,
                        'name' => $item->name,
                        'description' => $item->description,
                        'price' => (float) ($item->$priceColumn ?? $item->price_1 ?? 0),
                    ];
                })->values(),
            ];
        })->values();

        
        
        $pricingService = app(\App\Services\PricingService::class);

        return response()->json([
            'price_list_id' => $priceListId,
            'categories' => $groupedPrices,
            'base_rate' => $pricingService->getWashFoldRate(),
            'pd_fee' => $pricingService->getPickupDeliveryFee(),
            'service_fee' => $pricingService->getServiceFee(),
        ]);
    }

        public function items(Request $request)
    {
        $type = strtoupper($request->input('type', 'HD'));

        if (!in_array($type, ['HD', 'DC'])) {
            return response()->json(['error' => 'Type must be HD or DC'], 400);
        }

        $user = $this->user();
        $priceListId = $user->price_list_id ?? 1;
        $priceColumn = "price_{$priceListId}";

        $items = DB::table('lce_prices')
            ->where('type', $type)
            ->where('deleted', 'No')
            ->orderBy('order')
            ->get();

        
        $normalizeName = function($name) {
            $name = strtolower($name);
            
            $name = str_replace(['dry cleaning:', 'laundered/pressed'], '', $name);
            // Remove text in parentheses like (regular), (long), (laundry/machine press*)
            $name = preg_replace('/\([^)]*\)/', '', $name);
            // Remove special characters and extra spaces
            $name = trim(preg_replace('/[^a-z0-9]+/', ' ', $name));
            return $name;
        };

        // De-duplicate: prefer newer hyphenated SKUs (DC-T1, HD-1) over legacy ones (DCB, HD_UG).
        $seen = [];
        $items = $items->filter(function ($item) use (&$seen, $normalizeName) {
            // Also deduplicate by SKU prefix if available to prevent DCSW vs DCSW
            $key = $normalizeName($item->name);
            // Treat DCSW Sweater and DCSW Shawl as separate by combining normalized name
            $key = $item->sku . '_' . $key; 

            
            
            $nameKey = $normalizeName($item->name);

            if (isset($seen[$nameKey])) {
                $existingSku = $seen[$nameKey];
                if (str_contains($item->sku, '-') && !str_contains($existingSku, '-')) {
                    $seen[$nameKey] = $item->sku;
                    return true;
                }
                return false; 
            }
            $seen[$nameKey] = $item->sku;
            return true;
        })->values();

        
        
        
        
        $items->transform(function ($item) {
            $item->name = trim(str_ireplace('Dry cleaning:', '', $item->name));
            $item->name = trim(str_ireplace('Laundered/Pressed', '', $item->name));
            return $item;
        });

        // Category display order (Other always last)
        $categoryOrder = [
            'Dress Shirt' => 1,
            'Tops' => 2,
            'Bottom' => 3,
            'Full Body' => 4,
            'Comforter' => 5,
            'Household' => 6,
            'Accessories' => 7,
            'Other' => 99,
        ];

        
        $grouped = [];
        foreach ($items as $item) {
            $categoryName = $this->resolveCategory($item->sku, $item->name);

            if (!isset($grouped[$categoryName])) {
                $grouped[$categoryName] = [
                    'name' => $categoryName,
                    'order' => $categoryOrder[$categoryName] ?? 98,
                    'items' => [],
                ];
            }

            $grouped[$categoryName]['items'][] = [
                'id' => $item->sku,
                'sku' => $item->sku,
                'name' => $item->name,
                'description' => $item->description,
                'price' => (float) ($item->$priceColumn ?? $item->price_1 ?? 0),
                'category' => $categoryName,
            ];
        }

        
        usort($grouped, fn($a, $b) => $a['order'] <=> $b['order']);
        
        $grouped = array_map(function ($cat) {
            unset($cat['order']);
            return $cat;
        }, $grouped);

        return response()->json([
            'type' => $type,
            'price_list_id' => $priceListId,
            'categories' => array_values($grouped),
        ]);
    }

        private function resolveCategory(string $sku, string $name): string
    {
        
        $codeMap = [
            'DS' => 'Dress Shirt',
            'T'  => 'Tops',
            'B'  => 'Bottom',
            'FB' => 'Full Body',
            'C'  => 'Comforter',
            'H'  => 'Household',
            'A'  => 'Accessories',
            'O'  => 'Other',
        ];

        
        if (str_contains($sku, '-')) {
            $parts = explode('-', $sku);
            $code = preg_replace('/[\d\/]+$/', '', $parts[1] ?? '');
            if ($code && isset($codeMap[$code])) {
                return $codeMap[$code];
            }
            // For numeric-only codes (HD-1, HD-2), fall through to name matching
        }

        // 2. Try matching by item name (most reliable for legacy SKUs)
        $lowerName = strtolower($name);

        $namePatterns = [
            'Dress Shirt' => ['dress shirt', 'laundry/machine press', 'hand ironed'],
            'Tops'        => ['blouse', 'sweater', 'polo shirt', 'shirt', 'vest', 'jacket', 'blazer', 'hoodie', 'cardigan', 'lab coat'],
            'Bottom'      => ['pants', 'trousers', 'skirt', 'shorts'],
            'Full Body'   => ['dress', 'coat', 'sari', 'jumpsuit', 'coverall', 'suit'],
            'Comforter'   => ['comforter', 'duvet'],
            'Household'   => ['blanket', 'sheet', 'pillow', 'table', 'napkin', 'drape', 'towel'],
            'Accessories' => ['tie', 'scarf', 'skarf', 'shawl', 'hat', 'undergarment'],
        ];

        foreach ($namePatterns as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($lowerName, $keyword)) {
                    return $category;
                }
            }
        }

        
        if (str_contains($sku, '_')) {
            $parts = explode('_', $sku);
            $subCode = $parts[1] ?? '';
            $underscoreMap = [
                'UG' => 'Accessories',
                'SB' => 'Tops',
                'SA' => 'Tops',
                'F'  => 'Household',
                'O'  => 'Other',
            ];
            if (isset($underscoreMap[$subCode])) {
                return $underscoreMap[$subCode];
            }
        }

        return 'Other';
    }
}
