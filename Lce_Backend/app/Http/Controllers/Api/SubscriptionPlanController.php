<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\PricingService;

class SubscriptionPlanController extends Controller
{
    protected PricingService $pricing;

    public function __construct(PricingService $pricing)
    {
        $this->pricing = $pricing;
    }

        public function index()
    {
        $plans = DB::table('lce_subscription_plans')
            ->where('active', 1)
            ->orderBy('bags_per_month')
            ->orderBy('billing_cycle')
            ->get();

        return response()->json([
            'plans' => $plans->map(fn($plan) => $this->formatPlan($plan)),
        ]);
    }

        public function show($id)
    {
        $plan = DB::table('lce_subscription_plans')
            ->where('id', $id)
            ->where('active', 1)
            ->first();

        if (!$plan) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        return response()->json([
            'plan' => $this->formatPlan($plan),
        ]);
    }

        private function formatPlan($plan): array
    {
        $pricePerBag = (float) $plan->price_per_bag;
        $bagsPerMonth = $plan->bags_per_month;
        $annualDiscount = (float) $plan->annual_discount;

        
        $effectivePricePerBag = $plan->billing_cycle === 'annual'
            ? round($pricePerBag * (1 - $annualDiscount / 100), 2)
            : $pricePerBag;

        
        $monthlyTotal = $pricePerBag * $bagsPerMonth;
        $annualTotal = $monthlyTotal * 12;
        $annualDiscountedTotal = $annualTotal * (1 - $annualDiscount / 100);
        $annualSavings = $annualTotal - $annualDiscountedTotal;

        return [
            'id' => $plan->id,
            'code' => $plan->code,
            'name' => $plan->name,
            'bags_per_month' => $bagsPerMonth,
            'price_per_bag' => $effectivePricePerBag,
            'billing_cycle' => $plan->billing_cycle,
            'annual_discount_percent' => $annualDiscount,
            'monthly_total' => round($effectivePricePerBag * $bagsPerMonth, 2),
            'annual_total' => round($plan->billing_cycle === 'annual' ? $annualDiscountedTotal : $annualTotal, 2),
            'annual_savings' => round($annualSavings, 2),
            'features' => [
                'Reschedule or cancel anytime',
                '$' . number_format($this->pricing->getPickupDeliveryFee(), 2) . ' pickup & delivery',
                '$' . number_format($this->pricing->getServiceFee(), 2) . ' service fee',
                'Pickups & Deliveries 8am - 5pm',
                "Additional bag will be charged \$" . number_format($pricePerBag, 0) . "/bag",
            ],
        ];
    }
}
