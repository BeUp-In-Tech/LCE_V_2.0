<?php

namespace App\Services;

use App\Services\AuthorizeNetService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SubscriptionBillingService
{
    protected PricingService $pricing;
    protected InvoiceService $invoiceService;
    protected TransactionService $transactionService;
    protected PPOBillingService $ppoBilling;
    protected AuthorizeNetService $authorizeNet;

    public function __construct(
        PricingService $pricing,
        InvoiceService $invoiceService,
        TransactionService $transactionService,
        PPOBillingService $ppoBilling,
        AuthorizeNetService $authorizeNet
    ) {
        $this->pricing = $pricing;
        $this->invoiceService = $invoiceService;
        $this->transactionService = $transactionService;
        $this->ppoBilling = $ppoBilling;
        $this->authorizeNet = $authorizeNet;
    }

    
    
    

        public function createSubscription(int $userId, int $planId, string $billingCycle = 'monthly'): array
    {
        $existing = DB::table('lce_user_subscriptions')
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->first();

        if ($existing) {
            throw new \Exception('User already has an active subscription. Cancel or upgrade first.');
        }

        $plan = DB::table('lce_subscription_plans')->find($planId);
        if (!$plan || !$plan->active) {
            throw new \Exception('Invalid or inactive plan.');
        }

        $startDate = now();
        $dates = $this->calculateSubscriptionDates($startDate, $billingCycle);

        
        $monthlyAmount = $plan->price_per_bag * $plan->bags_per_month;
        $annualDiscountRate = $billingCycle === 'annual' ? ($plan->annual_discount / 100) : 0;

        $fullAmount = $billingCycle === 'annual'
            ? $monthlyAmount * 12
            : $monthlyAmount;
        $discountAmount = $fullAmount * $annualDiscountRate;
        $paymentAmount = $fullAmount - $discountAmount;

        
        $bagsPlanPeriod = $plan->bags_per_month; 
        $bagsPlanTotal = $billingCycle === 'annual'
            ? $plan->bags_per_month * 12
            : $plan->bags_per_month;

        return DB::transaction(function () use (
            $userId, $plan, $billingCycle, $startDate, $dates,
            $paymentAmount, $discountAmount, $bagsPlanPeriod, $bagsPlanTotal
        ) {
            
            $lineItems = [
                [
                    'sku' => $plan->code,
                    'type' => 'SUB',
                    'name' => $plan->name . ($billingCycle === 'annual' ? ' (Annual)' : ''),
                    'quantity' => $billingCycle === 'annual' ? 12 : 1,
                    'price' => $plan->price_per_bag * $plan->bags_per_month,
                ],
            ];

            if ($discountAmount > 0) {
                $lineItems[] = [
                    'sku' => 'ANN_DISC',
                    'type' => 'DISC',
                    'name' => 'Annual Discount (' . round($plan->annual_discount) . '%)',
                    'quantity' => 1,
                    'price' => -$discountAmount,
                ];
            }

            $invoice = $this->invoiceService->createInvoice($userId, $lineItems, [
                'order_type' => 'subscription',
                'use_credits' => true,
            ]);

            
            $paymentResult = $this->chargeSubscription($userId, $invoice, $plan->name);

            if (!$paymentResult || empty($paymentResult['success'])) {
                $errorMsg = $paymentResult['message'] ?? 'Payment failed. Please check your payment method.';
                throw new \Exception($errorMsg);
            }

            $status = 'active';
            $paymentLast = $paymentAmount;
            $paymentBalance = $paymentAmount;
            $transactionId = $paymentResult['transaction_id'] ?? null;
            $bagsBalance = $bagsPlanTotal - $bagsPlanPeriod; 
            $bagsAvailable = $plan->bags_per_month;

            $subscriptionId = DB::table('lce_user_subscriptions')->insertGetId([
                'user_id' => $userId,
                'plan_id' => $plan->id,
                'status' => $status,
                'billing_cycle' => $billingCycle,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $dates['end_date'],
                'next_renewal_date' => $dates['end_date'],
                'next_cron_date' => $status === 'active'
                    ? $startDate->copy()->addMonth()->format('Y-m-d')
                    : null,
                'bags_plan_period' => $bagsPlanPeriod,
                'bags_plan_total' => $bagsPlanTotal,
                'bags_plan_balance' => $bagsBalance,
                'bags_plan_used' => 0,
                'bags_available' => $bagsAvailable,
                'credit_lbs' => 0,
                'created_via' => 'web',
                'payment_last' => $paymentLast,
                'payment_discount' => $discountAmount,
                'payment_balance' => $paymentBalance,
                'payment_last_transactionId' => $transactionId,
                'notes' => $status === 'pending' ? 'Payment failed or no card on file at creation.' : null,
                'cdate' => now(),
                'mdate' => now(),
            ]);

            Log::info('Subscription created', [
                'subscription_id' => $subscriptionId,
                'user_id' => $userId,
                'plan' => $plan->name,
                'status' => $status,
                'amount' => $paymentAmount,
            ]);

            return [
                'success' => true,
                'subscription_id' => $subscriptionId,
                'status' => $status,
                'invoice' => $invoice,
                'payment' => $paymentResult,
            ];
        });
    }

    
    
    

        public function changePlan(int $subscriptionId, int $newPlanId, ?string $billingCycle = null): array
    {
        $subscription = DB::table('lce_user_subscriptions')->find($subscriptionId);
        if (!$subscription) {
            throw new \Exception('Subscription not found.');
        }

        
        if (!in_array($subscription->status, ['active', 'cancelled_pending'])) {
            throw new \Exception('Only active subscriptions can be changed.');
        }

        $billingCycle = $billingCycle ?? $subscription->billing_cycle;

        if ($subscription->plan_id == $newPlanId && $subscription->billing_cycle === $billingCycle) {
            throw new \Exception('You are already on this plan.');
        }

        $newPlan = DB::table('lce_subscription_plans')->find($newPlanId);
        if (!$newPlan || !$newPlan->active) {
            throw new \Exception('Invalid or inactive plan.');
        }

        $oldPlan = DB::table('lce_subscription_plans')->find($subscription->plan_id);

        
        $oldMonthly = $oldPlan->price_per_bag * $oldPlan->bags_per_month;
        $newMonthly = $newPlan->price_per_bag * $newPlan->bags_per_month;
        $isUpgrade = $newMonthly > $oldMonthly || ($newMonthly === $oldMonthly && $billingCycle === 'annual' && $subscription->billing_cycle === 'monthly');

        
        if ($isUpgrade) {
            
            $startDate = Carbon::tomorrow()->format('Y-m-d');
        } else {
            
            $startDate = $subscription->next_cron_date ?? $subscription->end_date;
        }

        return DB::transaction(function () use ($subscription, $newPlan, $billingCycle, $startDate, $isUpgrade) {
            
            if ($subscription->status === 'cancelled_pending') {
                DB::table('lce_user_subscriptions')
                    ->where('id', $subscription->id)
                    ->update([
                        'status' => 'active',
                        'mdate' => now(),
                        'notes' => ($subscription->notes ?? '') .
                            "\nCancellation reverted due to plan change on " . now(),
                    ]);
            }

            // Check for existing pending row for this user (Rule B: only one pending per user)
            $existingPending = DB::table('lce_user_subscriptions')
                ->where('user_id', $subscription->user_id)
                ->where('status', 'pending')
                ->first();

            $pendingData = [
                'user_id' => $subscription->user_id,
                'plan_id' => $newPlan->id,
                'status' => 'pending',
                'billing_cycle' => $billingCycle,
                'start_date' => $startDate,
                'end_date' => $startDate,
                'next_renewal_date' => $startDate,
                'next_cron_date' => null,
                'bags_plan_period' => 0,
                'bags_plan_total' => 0,
                'bags_plan_balance' => 0,
                'bags_plan_used' => 0,
                'bags_available' => 0,
                'credit_lbs' => 0,
                'payment_last' => 0,
                'payment_discount' => 0,
                'payment_balance' => 0,
                'payment_last_transactionId' => null,
                'created_via' => 'web',
                'notes' => null,
                'mdate' => now(),
            ];

            if ($existingPending) {
                
                DB::table('lce_user_subscriptions')
                    ->where('id', $existingPending->id)
                    ->update($pendingData);
                $pendingId = $existingPending->id;
            } else {
                
                $pendingData['cdate'] = now();
                $pendingData['notes'] = null;
                $pendingId = DB::table('lce_user_subscriptions')->insertGetId($pendingData);
            }

            Log::info('Subscription plan change requested', [
                'user_id' => $subscription->user_id,
                'active_subscription_id' => $subscription->id,
                'pending_subscription_id' => $pendingId,
                'new_plan' => $newPlan->name,
                'type' => $isUpgrade ? 'upgrade' : 'downgrade',
                'effective_date' => $startDate,
            ]);

            return [
                'success' => true,
                'type' => $isUpgrade ? 'upgrade' : 'downgrade',
                'effective_date' => $startDate,
                'pending_id' => $pendingId,
            ];
        });
    }

    
    
    

        public function cancelPendingChange(int $userId): array
    {
        $pending = DB::table('lce_user_subscriptions')
            ->where('user_id', $userId)
            ->where('status', 'pending')
            ->first();

        if (!$pending) {
            throw new \Exception('No pending plan change found.');
        }

        DB::table('lce_user_subscriptions')
            ->where('id', $pending->id)
            ->delete();

        Log::info('Pending plan change cancelled', [
            'pending_id' => $pending->id,
            'user_id' => $userId,
        ]);

        return [
            'success' => true,
            'message' => 'Your pending plan change has been cancelled.',
        ];
    }

    
    
    

        public function cancelSubscription(int $subscriptionId): array
    {
        $subscription = DB::table('lce_user_subscriptions')->find($subscriptionId);
        if (!$subscription) {
            throw new \Exception('Subscription not found.');
        }

        if ($subscription->status !== 'active') {
            throw new \Exception('Subscription is not active.');
        }

        return DB::transaction(function () use ($subscription) {
            
            DB::table('lce_user_subscriptions')
                ->where('user_id', $subscription->user_id)
                ->where('status', 'pending')
                ->delete();

            
            DB::table('lce_user_subscriptions')
                ->where('id', $subscription->id)
                ->update([
                    'status' => 'cancelled_pending',
                    'mdate' => now(),
                ]);

            Log::info('Subscription cancellation scheduled', [
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
                'effective_date' => $subscription->end_date,
            ]);

            return [
                'success' => true,
                'status' => 'cancelled_pending',
                'effective_date' => $subscription->end_date,
                'message' => 'Your subscription will remain active until ' . $subscription->end_date,
            ];
        });
    }

    
    
    

        public function revertCancellation(int $subscriptionId): array
    {
        $subscription = DB::table('lce_user_subscriptions')->find($subscriptionId);
        if (!$subscription) {
            throw new \Exception('Subscription not found.');
        }

        if ($subscription->status !== 'cancelled_pending') {
            throw new \Exception('Subscription is not pending cancellation.');
        }

        DB::table('lce_user_subscriptions')
            ->where('id', $subscription->id)
            ->update([
                'status' => 'active',
                'mdate' => now(),
                'notes' => ($subscription->notes ?? '') .
                    "\nCancellation reverted on " . now(),
            ]);

        Log::info('Subscription cancellation reverted', [
            'subscription_id' => $subscription->id,
            'user_id' => $subscription->user_id,
        ]);

        return [
            'success' => true,
            'status' => 'active',
            'message' => 'Your subscription has been reactivated.',
        ];
    }

    
    
    

        public function activatePendingSubscription(object $pendingRow, ?object $activeRow): array
    {
        $plan = DB::table('lce_subscription_plans')->find($pendingRow->plan_id);
        if (!$plan) {
            throw new \Exception("Plan not found for pending subscription {$pendingRow->id}");
        }

        $billingCycle = $pendingRow->billing_cycle;
        $startDate = Carbon::parse($pendingRow->start_date);
        $dates = $this->calculateSubscriptionDates($startDate, $billingCycle);

        
        $monthlyAmount = $plan->price_per_bag * $plan->bags_per_month;
        $fullAmount = $billingCycle === 'annual' ? $monthlyAmount * 12 : $monthlyAmount;
        $discountRate = $billingCycle === 'annual' ? ($plan->annual_discount / 100) : 0;
        $discountAmount = $fullAmount * $discountRate;
        $paymentAmount = $fullAmount - $discountAmount;

        $bagsPlanPeriod = $plan->bags_per_month;
        $bagsPlanTotal = $billingCycle === 'annual' ? $plan->bags_per_month * 12 : $plan->bags_per_month;

        return DB::transaction(function () use (
            $pendingRow, $activeRow, $plan, $billingCycle,
            $startDate, $dates, $paymentAmount, $discountAmount,
            $bagsPlanPeriod, $bagsPlanTotal
        ) {
            
            $isEarlyReplacement = false;
            if ($activeRow) {
                $activeEndDate = Carbon::parse($activeRow->end_date);
                $isEarlyReplacement = $startDate->lt($activeEndDate);
            }

            
            if ($activeRow) {
                
                
                
                $newStatus = 'upgraded';
                DB::table('lce_user_subscriptions')
                    ->where('id', $activeRow->id)
                    ->update([
                        'status' => $newStatus,
                        'end_date' => Carbon::today()->format('Y-m-d'),
                        'next_renewal_date' => Carbon::today()->format('Y-m-d'),
                        'next_cron_date' => null,
                        'mdate' => now(),
                        'notes' => ($activeRow->notes ?? '') .
                            "\nClosed as '{$newStatus}' on " . now() .
                            " — replaced by subscription #{$pendingRow->id}",
                    ]);
            }

            // Charge the new subscription
            $transactionId = null;
            $paymentSucceeded = false;
            try {
                $lineItems = [
                    [
                        'sku' => $plan->code,
                        'type' => 'SUB',
                        'name' => $plan->name . ($billingCycle === 'annual' ? ' (Annual)' : ''),
                        'quantity' => $billingCycle === 'annual' ? 12 : 1,
                        'price' => $plan->price_per_bag * $plan->bags_per_month,
                    ],
                ];

                if ($discountAmount > 0) {
                    $lineItems[] = [
                        'sku' => 'ANN_DISC',
                        'type' => 'DISC',
                        'name' => 'Annual Discount (' . round($plan->annual_discount) . '%)',
                        'quantity' => 1,
                        'price' => -$discountAmount,
                    ];
                }

                $invoice = $this->invoiceService->createInvoice($pendingRow->user_id, $lineItems);
                $paymentResult = $this->chargeSubscription($pendingRow->user_id, $invoice, $plan->name);

                if ($paymentResult && $paymentResult['success']) {
                    $transactionId = $paymentResult['transaction_id'] ?? null;
                    $paymentSucceeded = true;
                }
            } catch (\Exception $e) {
                Log::error('Payment failed during pending activation', [
                    'pending_id' => $pendingRow->id,
                    'error' => $e->getMessage(),
                ]);
            }

            
            
            if (!$paymentSucceeded) {
                Log::warning('Subscription activation deferred — payment failed, will retry next cron', [
                    'pending_id' => $pendingRow->id,
                    'user_id' => $pendingRow->user_id,
                ]);

                
                
                throw new \Exception("Payment failed for pending subscription #{$pendingRow->id} — keeping as pending for retry");
            }

            
            DB::table('lce_user_subscriptions')
                ->where('id', $pendingRow->id)
                ->update([
                    'status' => 'active',
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $dates['end_date'],
                    'next_renewal_date' => $dates['end_date'],
                    'next_cron_date' => $startDate->copy()->addMonth()->format('Y-m-d'),
                    'bags_plan_period' => $bagsPlanPeriod,
                    'bags_plan_total' => $bagsPlanTotal,
                    'bags_plan_balance' => $bagsPlanTotal - $bagsPlanPeriod,
                    'bags_plan_used' => 0,
                    'bags_available' => $plan->bags_per_month,
                    'credit_lbs' => 0,
                    'payment_last' => $paymentAmount,
                    'payment_discount' => $discountAmount,
                    'payment_balance' => $paymentAmount,
                    'payment_last_transactionId' => $transactionId,
                    'mdate' => now(),
                    'notes' => "Activated by cron on " . now() .
                        ($activeRow ? " — replaced subscription #{$activeRow->id}" : ' — new subscription'),
                ]);

            Log::info('Pending subscription activated', [
                'pending_id' => $pendingRow->id,
                'user_id' => $pendingRow->user_id,
                'plan' => $plan->name,
                'type' => $isEarlyReplacement ? 'upgrade' : 'downgrade',
                'charged' => $paymentAmount,
            ]);

            return [
                'success' => true,
                'subscription_id' => $pendingRow->id,
                'type' => $isEarlyReplacement ? 'upgrade' : 'downgrade',
                'amount_charged' => $paymentAmount,
            ];
        });
    }

    
    
    

        public function processScheduledCancellation(object $row): array
    {
        $plan = DB::table('lce_subscription_plans')->find($row->plan_id);
        $refundAmount = 0;
        $cancellationFee = 0;

        
        if ($row->billing_cycle === 'annual') {
            $startDate = Carbon::parse($row->start_date);
            $endDate = Carbon::parse($row->end_date);
            $today = Carbon::today();

            $daysActive = max(0, $startDate->diffInDays($today));
            $daysRemaining = max(0, $today->diffInDays($endDate));
            $monthsRemaining = $daysRemaining / 30;

            $monthlyValue = $plan->price_per_bag * $plan->bags_per_month;
            $originalAmountPaid = (float) $row->payment_last;

            
            if ($daysActive <= 5) {
                $refundAmount = $originalAmountPaid;
                $cancellationFee = 0;
            } else {
                $proRatedRefund = $monthsRemaining * $monthlyValue;
                $cancelFeePercent = $this->pricing->getCancellationFeePercent() / 100;
                $cancelFeeMin = $this->pricing->getMinimumCancellationFee();
                $cancellationFee = max($originalAmountPaid * $cancelFeePercent, $cancelFeeMin);
                $refundAmount = max(0, $proRatedRefund - $cancellationFee);
            }
        }

        return DB::transaction(function () use ($row, $refundAmount, $cancellationFee) {
            
            DB::table('lce_user_subscriptions')
                ->where('id', $row->id)
                ->update([
                    'status' => 'cancelled',
                    'end_date' => Carbon::today()->format('Y-m-d'),
                    'next_renewal_date' => Carbon::today()->format('Y-m-d'),
                    'next_cron_date' => null,
                    'mdate' => now(),
                    'notes' => ($row->notes ?? '') .
                        "\nCancellation finalized by cron on " . now() .
                        ". Refund: \${$refundAmount}, Fee: \${$cancellationFee}",
                ]);

            // Process refund if applicable
            if ($refundAmount > 0) {
                $lineItems = [
                    [
                        'sku' => 'SUB_REFUND',
                        'type' => 'REFUND',
                        'name' => 'Subscription Cancellation Refund',
                        'quantity' => 1,
                        'price' => $refundAmount,
                    ],
                ];

                if ($cancellationFee > 0) {
                    $lineItems[] = [
                        'sku' => 'CANCEL_FEE',
                        'type' => 'FEE',
                        'name' => 'Early Cancellation Fee',
                        'quantity' => 1,
                        'price' => -$cancellationFee,
                    ];
                }

                $invoice = $this->invoiceService->createInvoice($row->user_id, $lineItems);
                $this->transactionService->logRefund(
                    $row->user_id,
                    $invoice->id,
                    time(),
                    $refundAmount,
                    'Subscription cancellation refund'
                );
            }

            Log::info('Subscription cancellation finalized', [
                'subscription_id' => $row->id,
                'user_id' => $row->user_id,
                'refund' => $refundAmount,
                'fee' => $cancellationFee,
            ]);

            return [
                'success' => true,
                'refund_amount' => $refundAmount,
                'cancellation_fee' => $cancellationFee,
            ];
        });
    }

    
    
    

        public function processMonthlyRenewal(object $subscription): array
    {
        if ($subscription->status !== 'active') {
            throw new \Exception('Invalid or inactive subscription.');
        }

        $plan = DB::table('lce_subscription_plans')->find($subscription->plan_id);

        return DB::transaction(function () use ($subscription, $plan) {
            $unusedBags = $subscription->bags_available;

            
            $currentCronDate = Carbon::parse($subscription->next_cron_date);
            $nextCronDate = $this->addMonthClamped($currentCronDate);

            $newBalance = $subscription->bags_plan_balance + $unusedBags;
            $maxBalance = $plan->bags_per_month * 3;
            if ($newBalance > $maxBalance) {
                $newBalance = $maxBalance;
            }

            $updateData = [
                'bags_plan_balance' => $newBalance,
                'bags_available' => $plan->bags_per_month,
                'bags_plan_used' => 0,
                'next_cron_date' => $nextCronDate->format('Y-m-d'),
                'mdate' => now(),
            ];

            $chargedAmount = 0;
            $transactionId = null;

            
            if ($subscription->billing_cycle === 'monthly') {
                $amount = $plan->price_per_bag * $plan->bags_per_month;

                $lineItems = [
                    [
                        'sku' => 'SUB_RENEW',
                        'type' => 'SUB',
                        'name' => $plan->name . ' - Monthly Renewal',
                        'quantity' => 1,
                        'price' => $amount,
                    ],
                ];

                $invoice = $this->invoiceService->createInvoice($subscription->user_id, $lineItems);
                $paymentResult = $this->chargeSubscription($subscription->user_id, $invoice, $plan->name);

                if (!$paymentResult || !$paymentResult['success']) {
                    
                    
                    Log::warning('Monthly renewal payment failed — dates NOT advanced', [
                        'subscription_id' => $subscription->id,
                        'user_id' => $subscription->user_id,
                    ]);
                    throw new \Exception("Monthly renewal payment failed for subscription #{$subscription->id}");
                }

                $transactionId = $paymentResult['transaction_id'] ?? null;

                $newEndDate = $this->addMonthClamped(Carbon::parse($subscription->end_date));

                $updateData['end_date'] = $newEndDate->format('Y-m-d');
                $updateData['next_renewal_date'] = $newEndDate->format('Y-m-d');
                $updateData['payment_last'] = $amount;
                $updateData['payment_balance'] = $amount;
                $updateData['payment_last_transactionId'] = $transactionId;
                $chargedAmount = $amount;
            }
            

            DB::table('lce_user_subscriptions')
                ->where('id', $subscription->id)
                ->update($updateData);

            Log::info('Subscription renewal processed', [
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
                'banked_bags' => $unusedBags,
                'charged' => $chargedAmount,
            ]);

            return [
                'success' => true,
                'banked_bags' => $unusedBags,
                'charged' => $chargedAmount,
            ];
        });
    }

    
    
    

        public function billPickup(int $pickupId, float $weight, int $bagsUsed = 1): array
    {
        $pickup = DB::table('lce_user_pickup')->find($pickupId);
        if (!$pickup) {
            throw new \Exception("Pickup not found: {$pickupId}");
        }

        $subscription = DB::table('lce_user_subscriptions')
            ->where('user_id', $pickup->user_id)
            ->whereIn('status', ['active', 'cancelled_pending'])
            ->first();

        if (!$subscription) {
            return $this->ppoBilling->billPickup($pickupId, $weight);
        }

        $plan = DB::table('lce_subscription_plans')->find($subscription->plan_id);
        $bagCapacity = $this->pricing->getBagCapacity();

        $availableBags = $subscription->bags_available + $subscription->bags_plan_balance;

        $overageCharges = [];
        $totalOverage = 0;

        if ($bagsUsed > $availableBags) {
            $extraBags = $bagsUsed - $availableBags;
            $extraBagCharge = $extraBags * $plan->price_per_bag;
            $overageCharges[] = [
                'type' => 'extra_bags',
                'quantity' => $extraBags,
                'rate' => $plan->price_per_bag,
                'amount' => $extraBagCharge,
            ];
            $totalOverage += $extraBagCharge;
        }

        $expectedWeight = $bagsUsed * $bagCapacity;
        if ($weight > $expectedWeight) {
            $overweightLbs = $weight - $expectedWeight;
            $ppoRate = $this->pricing->getWashFoldRate();
            $overweightCharge = $overweightLbs * $ppoRate;
            $overageCharges[] = [
                'type' => 'overweight',
                'quantity' => $overweightLbs,
                'rate' => $ppoRate,
                'amount' => $overweightCharge,
            ];
            $totalOverage += $overweightCharge;
        }

        return DB::transaction(function () use ($pickup, $subscription, $bagsUsed, $weight, $overageCharges, $totalOverage, $availableBags) {
            $bagsToDeduct = min($bagsUsed, $availableBags);
            $fromBalance = max(0, $bagsToDeduct - $subscription->bags_available);
            $fromAvailable = $bagsToDeduct - $fromBalance;

            DB::table('lce_user_subscriptions')
                ->where('id', $subscription->id)
                ->update([
                    'bags_available' => $subscription->bags_available - $fromAvailable,
                    'bags_plan_balance' => $subscription->bags_plan_balance - $fromBalance,
                    'bags_plan_used' => $subscription->bags_plan_used + $bagsUsed,
                    'mdate' => now(),
                ]);

            $invoice = null;
            if ($totalOverage > 0) {
                $lineItems = [];
                foreach ($overageCharges as $charge) {
                    $lineItems[] = [
                        'sku' => $charge['type'] === 'extra_bags' ? 'SUB_EXTRA' : 'SUB_OVR',
                        'type' => 'SUB',
                        'name' => $charge['type'] === 'extra_bags'
                            ? "Extra Subscription Bags ({$charge['quantity']})"
                            : "Overweight ({$charge['quantity']} lbs @ \${$charge['rate']}/lb)",
                        'quantity' => $charge['quantity'],
                        'price' => $charge['rate'],
                    ];
                }
                $invoice = $this->invoiceService->createInvoice($pickup->user_id, $lineItems, [
                    'order_type' => 'subscription',
                    'subscription_id' => $subscription->id,
                ]);
                $chargeResult = $this->chargeSubscription($pickup->user_id, $invoice, 'Subscription Overage');

                if (!$chargeResult || !$chargeResult['success']) {
                    Log::warning('Subscription overage charge failed — pickup NOT marked invoiced', [
                        'pickup_id' => $pickup->id,
                        'user_id' => $pickup->user_id,
                        'total_overage' => $totalOverage,
                    ]);
                    throw new \Exception("Overage payment failed for pickup #{$pickup->id}");
                }
            }

            DB::table('lce_user_subscription_usage')->insert([
                'user_subscription_id' => $subscription->id,
                'invoice_id' => $invoice->id ?? 0,
                'pickup_id' => $pickup->id,
                'bags_used' => $bagsUsed,
                'cdate' => now(),
                'mdate' => now(),
            ]);

            DB::table('lce_user_pickup')
                ->where('id', $pickup->id)
                ->update([
                    'invoice_id' => $invoice->id ?? null,
                    'wf_weight' => $weight,
                    'status' => 'invoiced',
                ]);

            return [
                'success' => true,
                'bags_used' => $bagsUsed,
                'overage_charges' => $overageCharges,
                'total_overage' => $totalOverage,
                'invoice' => $invoice,
            ];
        });
    }

    
    
    

        private function calculateSubscriptionDates(Carbon $startDate, string $billingCycle): array
    {
        if ($billingCycle === 'annual') {
            $endDate = $startDate->copy()->addYear();
        } else {
            $endDate = $this->addMonthClamped($startDate);
        }

        return [
            'end_date' => $endDate->format('Y-m-d'),
        ];
    }

        private function addMonthClamped(Carbon $date): Carbon
    {
        $day = $date->day;
        $next = $date->copy()->addMonthNoOverflow();

        
        return $next;
    }

        private function chargeSubscription(int $userId, object $invoice, string $planName): ?array
    {
        $user = DB::table('lce_user_info')->where('user_id', $userId)->first();

        if (!$user || !$user->customerProfileId || !$user->customerPaymentProfileId) {
            return null;
        }

        $result = $this->authorizeNet->chargeCustomer(
            $user->customerProfileId,
            $user->customerPaymentProfileId,
            $invoice->total,
            "Subscription: {$planName}",
            $user->email
        );

        if ($result['success']) {
            $this->invoiceService->markAsPaid($invoice->id, $result['transaction_id']);
            $this->transactionService->logSubscription(
                $userId,
                $invoice->id,
                $result['transaction_id'],
                $invoice->total,
                $planName
            );
        }

        return $result;
    }
}
