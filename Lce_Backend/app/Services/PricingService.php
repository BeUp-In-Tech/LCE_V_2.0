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

        public function getWashFoldRate(): float
    {
        return $this->getConfigFee('wf_base_rate', 2.99);
    }

        public function getPickupDeliveryFee(): float
    {
        return $this->getConfigFee('pd_fee', 9.99);
    }

        public function getServiceFee(): float
    {
        return $this->getConfigFee('service_fee', 5.00);
    }

        public function getMinimumCharge(): float
    {
        return $this->getConfigFee('ppo_minimum', 30.00);
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
