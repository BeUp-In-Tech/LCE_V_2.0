<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SubscriptionBillingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\SubscriptionCreatedMail;

class SubscriptionController extends Controller
{
    public function __construct(
        private SubscriptionBillingService $subscriptionBilling
    ) {
    }

        public function index()
    {
        $user = $this->user();

        $userIds = array_unique(array_filter([(int) $user->id, (int) $user->user_id]));

        $subscriptions = DB::table('lce_user_subscriptions')
            ->join('lce_subscription_plans', 'lce_user_subscriptions.plan_id', '=', 'lce_subscription_plans.id')
            ->whereIn('lce_user_subscriptions.user_id', $userIds)
            ->select(
                'lce_user_subscriptions.*',
                'lce_subscription_plans.name as plan_name',
                'lce_subscription_plans.code as plan_code',
                'lce_subscription_plans.bags_per_month',
                'lce_subscription_plans.price_per_bag',
                'lce_subscription_plans.annual_discount'
            )
            ->orderBy('lce_user_subscriptions.cdate', 'desc')
            ->get();

        return response()->json([
            'subscriptions' => $subscriptions->map(fn($sub) => $this->formatSubscription($sub)),
        ]);
    }

        public function show($id)
    {
        $user = $this->user();

        $userIds = array_unique(array_filter([(int) $user->id, (int) $user->user_id]));

        $subscription = DB::table('lce_user_subscriptions')
            ->join('lce_subscription_plans', 'lce_user_subscriptions.plan_id', '=', 'lce_subscription_plans.id')
            ->where('lce_user_subscriptions.id', $id)
            ->whereIn('lce_user_subscriptions.user_id', $userIds)
            ->select(
                'lce_user_subscriptions.*',
                'lce_subscription_plans.name as plan_name',
                'lce_subscription_plans.code as plan_code',
                'lce_subscription_plans.bags_per_month',
                'lce_subscription_plans.price_per_bag',
                'lce_subscription_plans.annual_discount'
            )
            ->first();

        if (!$subscription) {
            return response()->json(['error' => 'Subscription not found'], 404);
        }

        $usage = DB::table('lce_user_subscription_usage')
            ->where('user_subscription_id', $id)
            ->orderBy('cdate', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'subscription' => $this->formatSubscription($subscription),
            'usage_history' => $usage->map(fn($u) => [
                'id' => $u->id,
                'bags_used' => $u->bags_used,
                'invoice_id' => $u->invoice_id,
                'pickup_id' => $u->pickup_id,
                'date' => $u->cdate,
            ]),
        ]);
    }

        public function store(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|integer|exists:lce_subscription_plans,id',
            'billing_cycle' => 'nullable|in:monthly,annual',
        ]);

        $user = $this->user();

        
        $plan = DB::table('lce_subscription_plans')->find($request->plan_id);
        $billingCycle = $request->billing_cycle ?? $plan->billing_cycle;

        try {
            $result = $this->subscriptionBilling->createSubscription(
                (int) $user->id,
                $request->plan_id,
                $billingCycle
            );

            
            try {
                $createdSub = DB::table('lce_user_subscriptions')->find($result['subscription_id']);
                $invoiceTotal = $result['invoice']->total ?? 0;

                Mail::to($user->email)->send(new SubscriptionCreatedMail(
                    customerName: $user->first_name ?? 'Customer',
                    planName: $plan->name,
                    bagsPerMonth: $plan->bags_per_month,
                    pricePerBag: (float) $plan->price_per_bag,
                    billingCycle: $billingCycle,
                    startDate: $createdSub->start_date,
                    endDate: $createdSub->end_date,
                    amountCharged: (float) $createdSub->payment_last,
                    discount: (float) $createdSub->payment_discount
                ));
            } catch (\Exception $e) {
                Log::warning('Subscription email failed', ['error' => $e->getMessage()]);
            }

            
            $subscription = DB::table('lce_user_subscriptions')
                ->join('lce_subscription_plans', 'lce_user_subscriptions.plan_id', '=', 'lce_subscription_plans.id')
                ->where('lce_user_subscriptions.id', $result['subscription_id'])
                ->select('lce_user_subscriptions.*', 'lce_subscription_plans.name as plan_name', 'lce_subscription_plans.code as plan_code', 'lce_subscription_plans.bags_per_month', 'lce_subscription_plans.price_per_bag', 'lce_subscription_plans.annual_discount')
                ->first();

            return response()->json([
                'message' => 'Subscription created successfully',
                'subscription' => $this->formatSubscription($subscription),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Subscription creation failed', [
                'user_id' => $user->user_id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

        public function update(Request $request, $id)
    {
        $user = $this->user();

        $request->validate([
            'plan_id' => 'required|integer|exists:lce_subscription_plans,id',
            'billing_cycle' => 'nullable|in:monthly,annual',
        ]);

        
        $userIds = array_unique(array_filter([(int) $user->id, (int) $user->user_id]));

        $subscription = DB::table('lce_user_subscriptions')
            ->where('id', $id)
            ->whereIn('user_id', $userIds)
            ->first();

        if (!$subscription) {
            return response()->json(['error' => 'Subscription not found'], 404);
        }

        try {
            $result = $this->subscriptionBilling->changePlan(
                $id,
                $request->plan_id,
                $request->billing_cycle
            );

            return response()->json([
                'message' => $result['type'] === 'upgrade'
                    ? 'Your upgrade will take effect at midnight.'
                    : 'Your downgrade will take effect at your next cron date.',
                'change' => [
                    'type' => $result['type'],
                    'effective_date' => $result['effective_date'],
                    'pending_id' => $result['pending_id'],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Subscription update failed', [
                'user_id' => $user->user_id,
                'subscription_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

        public function cancel($id)
    {
        $user = $this->user();

        $userIds = array_unique(array_filter([(int) $user->id, (int) $user->user_id]));

        $subscription = DB::table('lce_user_subscriptions')
            ->where('id', $id)
            ->whereIn('user_id', $userIds)
            ->first();

        if (!$subscription) {
            return response()->json(['error' => 'Subscription not found'], 404);
        }

        if ($subscription->status !== 'active') {
            return response()->json(['error' => 'Subscription is not active'], 400);
        }

        try {
            $result = $this->subscriptionBilling->cancelSubscription($id);

            return response()->json([
                'message' => $result['message'],
                'status' => $result['status'],
                'effective_date' => $result['effective_date'],
            ]);
        } catch (\Exception $e) {
            Log::error('Subscription cancellation failed', [
                'user_id' => $user->user_id,
                'subscription_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Failed to cancel subscription: ' . $e->getMessage()], 500);
        }
    }

        public function revertCancel($id)
    {
        $user = $this->user();

        $userIds = array_unique(array_filter([(int) $user->id, (int) $user->user_id]));

        $subscription = DB::table('lce_user_subscriptions')
            ->where('id', $id)
            ->whereIn('user_id', $userIds)
            ->first();

        if (!$subscription) {
            return response()->json(['error' => 'Subscription not found'], 404);
        }

        if ($subscription->status !== 'cancelled_pending') {
            return response()->json(['error' => 'Subscription is not pending cancellation'], 400);
        }

        try {
            $result = $this->subscriptionBilling->revertCancellation($id);

            return response()->json([
                'message' => $result['message'],
                'status' => $result['status'],
            ]);
        } catch (\Exception $e) {
            Log::error('Subscription revert-cancel failed', [
                'user_id' => $user->user_id,
                'subscription_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

        public function cancelPending()
    {
        $user = $this->user();

        try {
            $userIds = array_unique(array_filter([(int) $user->id, (int) $user->user_id]));
            $result = null;
            foreach ($userIds as $uid) {
                try {
                    $result = $this->subscriptionBilling->cancelPendingChange($uid);
                    break;
                } catch (\Exception $e) {
                    // Try next ID if first fails
                }
            }
            if (!$result) {
                throw new \Exception('No pending subscription change found to cancel.');
            }

            return response()->json([
                'message' => $result['message'],
            ]);
        } catch (\Exception $e) {
            Log::error('Cancel pending change failed', [
                'user_id' => $user->user_id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

        public function destroy($id)
    {
        return $this->cancel($id);
    }

        private function formatSubscription($sub): array
    {
        $pricePerBag = (float) $sub->price_per_bag;
        $annualDiscount = isset($sub->annual_discount) ? (float) $sub->annual_discount : 0;
        $effectivePricePerBag = $sub->billing_cycle === 'annual'
            ? round($pricePerBag * (1 - $annualDiscount / 100), 2)
            : $pricePerBag;

        return [
            'id' => $sub->id,
            'plan' => [
                'id' => $sub->plan_id,
                'name' => $sub->plan_name,
                'code' => $sub->plan_code,
                'bags_per_month' => $sub->bags_per_month,
                'price_per_bag' => $effectivePricePerBag,
            ],
            'status' => $sub->status,
            'billing_cycle' => $sub->billing_cycle,
            'start_date' => $sub->start_date,
            'end_date' => $sub->end_date,
            'next_renewal_date' => $sub->next_renewal_date,
            'next_cron_date' => $sub->next_cron_date ?? null,
            'bags' => [
                'available' => $sub->bags_available,
                'used' => $sub->bags_plan_used,
                'total' => $sub->bags_plan_total,
                'balance' => $sub->bags_plan_balance,
                'period' => $sub->bags_plan_period,
            ],
            'payment' => [
                'last_amount' => (float) $sub->payment_last,
                'discount' => (float) $sub->payment_discount,
                'balance' => (float) $sub->payment_balance,
                'transaction_id' => $sub->payment_last_transactionId ?? null,
            ],
            'credit_lbs' => (float) ($sub->credit_lbs ?? 0),
            'created_at' => $sub->cdate,
        ];
    }
}
