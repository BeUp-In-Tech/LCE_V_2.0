<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PPOBillingService;
use App\Services\SubscriptionBillingService;
use App\Services\PricingService;
use App\Services\CreditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    public function __construct(
        private PPOBillingService $ppoBilling,
        private SubscriptionBillingService $subscriptionBilling,
        private PricingService $pricing,
        private CreditService $credits
    ) {
    }

        private function authorizePickup(int $pickupId): object
    {
        $pickup = DB::table('lce_user_pickup')->find($pickupId);
        if (!$pickup || $pickup->user_id !== $this->user()->user_id) {
            abort(403, 'You do not have permission to access this pickup.');
        }
        return $pickup;
    }

        private function authorizeSubscription(int $subscriptionId): object
    {
        $subscription = DB::table('lce_user_subscriptions')->find($subscriptionId);
        if (!$subscription || $subscription->user_id !== $this->user()->user_id) {
            abort(403, 'You do not have permission to access this subscription.');
        }
        return $subscription;
    }

        public function chargePickup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pickup_id' => 'required|integer|exists:lce_user_pickup,id',
            'weight_lbs' => 'required|numeric|min:0',
        ]);

        
        $this->authorizePickup($validated['pickup_id']);

        try {
            $result = $this->ppoBilling->billPickup(
                $validated['pickup_id'],
                $validated['weight_lbs']
            );

            return response()->json([
                'success' => true,
                'message' => 'Pickup charged successfully',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }

        public function subscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => 'required|integer|exists:lce_subscription_plans,id',
        ]);

        
        $userId = $this->user()->user_id;

        try {
            $result = $this->subscriptionBilling->createSubscription(
                $userId,
                $validated['plan_id']
            );

            return response()->json([
                'success' => true,
                'message' => 'Subscription created successfully',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }

        public function renew(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subscription_id' => 'required|integer|exists:lce_user_subscriptions,id',
        ]);

        try {
            
            $subscription = $this->authorizeSubscription($validated['subscription_id']);

            if ($subscription->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'error' => 'Subscription is not active',
                ], 400);
            }

            $result = $this->subscriptionBilling->processMonthlyRenewal($subscription);

            return response()->json([
                'success' => true,
                'message' => 'Subscription renewed successfully',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }

        public function cancel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subscription_id' => 'required|integer|exists:lce_user_subscriptions,id',
        ]);

        
        $this->authorizeSubscription($validated['subscription_id']);

        try {
            $result = $this->subscriptionBilling->cancelSubscription(
                $validated['subscription_id']
            );

            return response()->json([
                'success' => true,
                'message' => 'Subscription cancelled',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }

        public function processOverage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pickup_id' => 'required|integer|exists:lce_user_pickup,id',
            'weight_lbs' => 'required|numeric|min:0',
            'bags_used' => 'nullable|integer|min:1',
        ]);

        
        $this->authorizePickup($validated['pickup_id']);

        try {
            $result = $this->subscriptionBilling->billPickup(
                $validated['pickup_id'],
                $validated['weight_lbs'],
                $validated['bags_used'] ?? 1
            );

            return response()->json([
                'success' => true,
                'message' => 'Subscription pickup billed',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }

        public function getCredits(): JsonResponse
    {
        
        $userId = $this->user()->user_id;

        try {
            $balance = $this->credits->getAvailableBalance($userId);
            $details = $this->credits->getCreditHistory($userId);

            return response()->json([
                'success' => true,
                'data' => [
                    'balance' => $balance,
                    'credits' => $details
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }

        public function getPricing(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'ppo_rate' => $this->pricing->getWashFoldRate(),
                'minimum_charge' => $this->pricing->getMinimumCharge(),
                'pd_fee' => $this->pricing->getPickupDeliveryFee(),
                'service_fee' => $this->pricing->getServiceFee(),
                'bag_capacity_lbs' => $this->pricing->getBagCapacity(),
            ]
        ]);
    }
}
