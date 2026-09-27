<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class PricingService
{
        private const CACHE_TTL = 3600;

        public function getPrice(string $sku, int $priceListId = 1): ?float
    {
        $cacheKey = "price:{$sku}:{$priceListId}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($sku, $priceListId) {
            $priceColumn = "price_{$priceListId}";

            $item = DB::table('lce_prices')
                ->where('sku', $sku)
                ->where('deleted', 'No')
                ->select('id', $priceColumn)
                ->first();

            if (!$item || !isset($item->$priceColumn)) {
                
                $item = DB::table('lce_prices')
                    ->where('sku', $sku)
                    ->where('deleted', 'No')
                    ->select('id', 'price_1')
                    ->first();

                return $item ? (float) $item->price_1 : null;
            }

            return (float) $item->$priceColumn;
        });
    }

        public function getPricesByType(string $type, int $priceListId = 1): array
    {
        $priceColumn = "price_{$priceListId}";

        $items = DB::table('lce_prices')
            ->where('type', $type)
            ->where('deleted', 'No')
            ->orderBy('order')
            ->get();

        return $items->map(function ($item) use ($priceColumn) {
            return [
                'id' => $item->id,
                'sku' => $item->sku,
                'name' => $item->name,
                'description' => $item->description,
                'price' => (float) ($item->$priceColumn ?? $item->price_1),
            ];
        })->toArray();
    }

        public function getConfigFee(string $name, float $default = 0.0): float
    {
        $cacheKey = "config_fee:{$name}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($name, $default) {
            $config = DB::table('lce_configurations')
                ->where('name', $name)
                ->where('state', 1)
                ->first();

            return $config ? (float) $config->value : $default;
        });
    }

    /**
     * Map user zip code to special institutional price list ID dynamically from lce_prices_lists table.
     * e.g. zip 00003 (Cruise America) -> 132, zip 00005 (Days Inn) -> 134, etc.
     * Otherwise return user's configured price_list_id (defaulting to 21 for new system).
     */
    public static function getPriceListIdForUser(?string $zip, ?int $userPriceListId = null): int
    {
        if (!empty($zip)) {
            $cleanZip = trim((string)$zip);
            $paddedZip = str_pad($cleanZip, 5, '0', STR_PAD_LEFT);

            try {
                if (\Illuminate\Support\Facades\Schema::hasTable('lce_prices_lists')) {
                    $match = DB::table('lce_prices_lists')
                        ->where('deleted', 'No')
                        ->where(function ($q) use ($cleanZip, $paddedZip) {
                            $q->where('zip', $cleanZip)
                              ->orWhere('zip', $paddedZip);
                        })
                        ->where('zip', '!=', '00000')
                        ->first();

                    if ($match && !empty($match->id)) {
                        return (int)$match->id;
                    }
                }
            } catch (\Throwable $e) {
                // Fallback gracefully
            }
        }

        return !empty($userPriceListId) ? (int)$userPriceListId : 21;
    }

    public function getWashFoldRate(int $priceListId = 21): float
    {
        $cacheKey = "wf_rate:{$priceListId}";
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($priceListId) {
            $item = DB::table('lce_prices')
                ->where('deleted', 'No')
                ->where(function ($q) use ($priceListId) {
                    $q->where('sku', "WF{$priceListId}_1+")
                      ->orWhere('sku', "WF{$priceListId}_1");
                })
                ->first();

            if ($item) {
                $col = "price_{$priceListId}";
                if (isset($item->$col) && (float)$item->$col > 0) {
                    return (float)$item->$col;
                }
                if (isset($item->price_1) && (float)$item->price_1 > 0) {
                    return (float)$item->price_1;
                }
            }

            $base = DB::table('lce_prices')
                ->where('deleted', 'No')
                ->where('type', 'WF')
                ->where('sku', 'like', '%_1+')
                ->first();

            if ($base) {
                $col = "price_{$priceListId}";
                if (isset($base->$col) && (float)$base->$col > 0) {
                    return (float)$base->$col;
                }
            }

            if ($priceListId === 2) return 1.99;
            if ($priceListId === 1) return 3.09;
            if ($priceListId === 21) return 2.99;

            return $this->getConfigFee('wf_base_rate', 2.99);
        });
    }

    public function getPickupDeliveryFee(int $priceListId = 21): float
    {
        if ($priceListId === 2) {
            return 0.0;
        }

        $cacheKey = "pd_fee:{$priceListId}";
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($priceListId) {
            $item = DB::table('lce_prices')
                ->where('deleted', 'No')
                ->where(function ($q) use ($priceListId) {
                    $q->where('sku', "G{$priceListId}_PD")
                      ->orWhere('sku', 'G_PD');
                })
                ->first();

            if ($item) {
                $col = "price_{$priceListId}";
                if (isset($item->$col) && $item->$col !== null) {
                    return (float)$item->$col;
                }
                if (isset($item->price_1) && $item->price_1 !== null) {
                    return (float)$item->price_1;
                }
            }

            return $this->getConfigFee('pd_fee', 9.99);
        });
    }

    public function getServiceFee(int $priceListId = 21): float
    {
        if ($priceListId === 2) {
            return 0.0;
        }

        $cacheKey = "service_fee:{$priceListId}";
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($priceListId) {
            $item = DB::table('lce_prices')
                ->where('deleted', 'No')
                ->where(function ($q) use ($priceListId) {
                    $q->where('sku', "G{$priceListId}_SVC")
                      ->orWhere('sku', 'G_SVC');
                })
                ->first();

            if ($item) {
                $col = "price_{$priceListId}";
                if (isset($item->$col) && $item->$col !== null) {
                    return (float)$item->$col;
                }
                if (isset($item->price_1) && $item->price_1 !== null) {
                    return (float)$item->price_1;
                }
            }

            return $this->getConfigFee('service_fee', 5.00);
        });
    }

    public function getMinimumCharge(int $priceListId = 21): float
    {
        if ($priceListId === 2) {
            return 0.0;
        }

        $cacheKey = "min_charge:{$priceListId}";
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($priceListId) {
            $item = DB::table('lce_prices')
                ->where('deleted', 'No')
                ->where(function ($q) use ($priceListId) {
                    $q->where('sku', "G{$priceListId}_MIN")
                      ->orWhere('sku', 'G_MIN');
                })
                ->first();

            if ($item) {
                $col = "price_{$priceListId}";
                if (isset($item->$col) && (float)$item->$col > 0) {
                    return (float)$item->$col;
                }
                if (isset($item->price_1) && (float)$item->price_1 > 0) {
                    return (float)$item->price_1;
                }
            }

            if ($priceListId === 21) return 44.95;
            return $this->getConfigFee('ppo_minimum', 30.00);
        });
    }

    public function getBagCapacity(): float
    {
        return $this->getConfigFee('bag_capacity_lbs', 21.0);
    }

    public function getCancellationFeePercent(): float
    {
        return $this->getConfigFee('cancellation_fee_percent', 15.0);
    }

    public function getMinimumCancellationFee(): float
    {
        return $this->getConfigFee('cancellation_fee_min', 100.0);
    }

        public function clearCache(): void
    {
        
        $configKeys = [
            'wf_base_rate', 'pd_fee', 'service_fee', 'ppo_minimum',
            'bag_capacity_lbs', 'cancellation_fee_percent', 'cancellation_fee_min',
        ];
        foreach ($configKeys as $key) {
            Cache::forget("config_fee:{$key}");
        }

        
        $skus = DB::table('lce_prices')->where('deleted', 'No')->pluck('sku');
        foreach ($skus as $sku) {
            for ($listId = 1; $listId <= 10; $listId++) {
                Cache::forget("price:{$sku}:{$listId}");
            }
        }
    }
}
