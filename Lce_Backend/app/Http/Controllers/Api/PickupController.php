<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Http\Requests\Pickup\StorePickupRequest;
use App\Http\Requests\Pickup\UpdatePickupRequest;
use App\Mail\PickupConfirmationMail;
use App\Mail\OrderCompletedMail;
use App\Mail\PaymentReceiptMail;
use App\Services\PricingService;
use App\Http\Resources\PickupResource;

class PickupController extends Controller
{
    protected PricingService $pricing;

    public function __construct(PricingService $pricing)
    {
        $this->pricing = $pricing;
    }

        public function index(Request $request)
    {
        $user = $this->user();

        $query = DB::table('lce_user_pickup')
            ->where('user_id', $user->user_id)
            ->orderBy('pickup_date', 'desc');

        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        
        if ($request->has('from_date')) {
            $query->where('pickup_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->where('pickup_date', '<=', $request->to_date);
        }

        
        $perPage = $request->get('per_page', 999);
        $pickups = $query->paginate($perPage);

        return response()->json([
            'pickups' => PickupResource::collection($pickups),
            'meta' => [
                'current_page' => $pickups->currentPage(),
                'last_page' => $pickups->lastPage(),
                'per_page' => $pickups->perPage(),
                'total' => $pickups->total(),
            ],
        ]);
    }

        public function store(StorePickupRequest $request)
    {
        

        $user = $this->user();

        

        
        $paymentAmount = 0;
        $paymentDescription = 'Pickup Service';

        
        if ($request->has('subscription_plan_id') && $request->subscription_plan_id) {
            
            
            $plan = DB::table('lce_subscription_plans')
                ->where('id', $request->subscription_plan_id)
                ->first();

            if ($plan) {
                $paymentAmount = 0; 
                $paymentDescription = "Subscription: {$plan->name} (Billed Later)";
            }
        } else {
            
            $paymentAmount = $request->has('payment_amount')
                ? (float) $request->payment_amount
                : 0; 

            if ($request->has('payment_description') && !empty($request->payment_description)) {
                $paymentDescription = $request->payment_description;
            } else {
                $wfRate = $this->pricing->getWashFoldRate();
                $paymentDescription = "Pay Per Order (\${$wfRate}/lb) - Charged after weighing";
            }
        }

        
        $discountAmount = 0;
        $activePromo = null;

        DB::transaction(function () use (&$activePromo, &$discountAmount, &$paymentAmount, &$paymentDescription, $user) {
            
            $activePromo = DB::table('lce_user_promocode')
                ->join('lce_promo_codes', 'lce_user_promocode.promocode_id', '=', 'lce_promo_codes.id')
                ->where('lce_user_promocode.user_id', $user->user_id)
                ->where('lce_user_promocode.active', 1)
                ->where('lce_user_promocode.expiry_date', '>=', now())
                ->select(
                    'lce_user_promocode.id as user_promo_id',
                    'lce_user_promocode.promocode as code',
                    'lce_promo_codes.promocode_type',
                    'lce_promo_codes.promocode_value',
                    'lce_promo_codes.promocode_description',
                    'lce_promo_codes.id as promo_id'
                )
                ->lockForUpdate()
                ->first();

            if ($activePromo) {
                if ($activePromo->promocode_type === 'percentage') {
                    $discountAmount = $paymentAmount * ($activePromo->promocode_value / 100);
                } else {
                    
                    $discountAmount = (float) $activePromo->promocode_value;
                }

                if ($discountAmount > $paymentAmount) {
                    $discountAmount = $paymentAmount;
                }

                $paymentAmount -= $discountAmount;

                $paymentDescription .= " (Promo: {$activePromo->code} - \${$discountAmount} Off)";

                
                DB::table('lce_user_promocode')
                    ->where('id', $activePromo->user_promo_id)
                    ->update(['active' => 0]);

                
                DB::table('lce_user_promocodes')->insert([
                    'user_id' => $user->user_id,
                    'promocode_id' => $activePromo->user_promo_id,
                    'promocode_name' => $activePromo->code,
                    'used_date' => now(),
                    'cdate' => now(),
                ]);
            }
        });

        
        $paymentResult = null;
        if ($paymentAmount > 0) {
            
            if (!$user->customerProfileId || !$user->customerPaymentProfileId) {
                return response()->json([
                    'error' => 'No payment method on file. Please add a card first.',
                    'code' => 'NO_PAYMENT_METHOD',
                ], 400);
            }
            try {
                $authorizeNet = app(\App\Services\AuthorizeNetService::class);

                $paymentResult = $authorizeNet->chargeCustomer(
                    $user->customerProfileId,
                    $user->customerPaymentProfileId,
                    $paymentAmount,
                    $paymentDescription,
                    $user->email,  
                    $request->ip() 
                );

                if (!$paymentResult['success']) {
                    return response()->json([
                        'error' => 'Payment failed: ' . ($paymentResult['message'] ?? 'Unknown error'),
                        'code' => 'PAYMENT_FAILED',
                    ], 400);
                }

                Log::info('Pickup payment successful', [
                    'user_id' => $user->user_id,
                    'amount' => $paymentAmount,
                    'transaction_id' => $paymentResult['transaction_id'] ?? null,
                ]);
            } catch (\Exception $e) {
                Log::error('Pickup payment exception', ['error' => $e->getMessage()]);
                return response()->json([
                    'error' => 'Payment processing error: ' . $e->getMessage(),
                    'code' => 'PAYMENT_ERROR',
                ], 500);
            }
        }

        
        
        
        
        $hasActiveSubscription = DB::table('lce_user_subscriptions')
            ->where('user_id', $user->user_id)
            ->where('status', 'active')
            ->exists();
        $isWashAndFold = in_array($request->pickup_type, ['wf', 'wf_hd', 'wf_dc', 'both', 'all']);
        $orderType = ($hasActiveSubscription && $isWashAndFold) ? 'subscription' : 'PPO';

        
        $pickupId = DB::table('lce_user_pickup')->insertGetId([
            'user_id' => $user->user_id,
            'pickup_type' => $request->pickup_type,
            'pickup_date' => $request->pickup_date,
            'status' => 'pickup',
            'order_type' => $orderType,
            'customerPaymentTransId' => $paymentResult['transaction_id'] ?? null,
            'customerPaymentTransAmount' => $paymentAmount,
            'cdate' => now(),
            'cuser_id' => $user->user_id,
            
            'keep_record' => 0,
            'geo_location' => '',
            'pickup_driver_id' => 0,
            'deliver_driver_id' => 0,
            'group_admin_id' => 0,
            'group_code' => '',
            'partial_invoice' => 0,
            'group_invoice_id' => 0,
            'skipped_pickup' => 0,
            'on_vacation' => 0,
        ]);

        
        
        $subscriptionData = null;
        if ($request->has('subscription_plan_id') && $request->subscription_plan_id && isset($plan)) {
            
            $existingActive = DB::table('lce_user_subscriptions')
                ->where('user_id', $user->user_id)
                ->whereIn('status', ['active', 'pending'])
                ->first();

            if (!$existingActive) {
                try {
                    $subscriptionService = app(\App\Services\SubscriptionBillingService::class);
                    $billingCycle = $plan->billing_cycle ?? 'monthly';

                    $subResult = $subscriptionService->createSubscription(
                        $user->user_id,
                        $plan->id,
                        $billingCycle
                    );

                    $subscriptionData = [
                        'subscription_id' => $subResult['subscription_id'],
                        'plan_name' => $plan->name ?? 'Subscription Plan',
                        'bags_per_month' => $plan->bags_per_month,
                        'billing_cycle' => $billingCycle,
                    ];

                    Log::info('Subscription created via pickup (using billing service)', [
                        'user_id' => $user->user_id,
                        'subscription_id' => $subResult['subscription_id'],
                        'plan_id' => $plan->id,
                        'pickup_id' => $pickupId,
                    ]);

                    
                    if ($isWashAndFold) {
                        DB::table('lce_user_pickup')
                            ->where('id', $pickupId)
                            ->update(['order_type' => 'subscription']);
                    }
                } catch (\Exception $e) {
                    Log::error('Subscription creation failed during pickup', [
                        'user_id' => $user->user_id,
                        'plan_id' => $plan->id,
                        'error' => $e->getMessage(),
                    ]);
                    
                }
            } else {
                Log::info('Subscription already exists, skipping creation during pickup', [
                    'user_id' => $user->user_id,
                    'existing_subscription_id' => $existingActive->id,
                ]);
            }
        }

        
        if ($paymentResult && $paymentResult['success']) {
            DB::table('lce_user_transactions')->insert([
                'user_id' => $user->user_id,
                'type' => 'pickup_charge',
                'transactionId' => $paymentResult['transaction_id'],
                'name' => 'Pickup Payment',
                'amount' => $paymentAmount,
                'description' => $paymentDescription,
                'note' => 'Pickup ID: ' . $pickupId . ' | Auth: ' . ($paymentResult['auth_code'] ?? ''),
                'cdate' => now(),
                'mdate' => now(),
                'cuserid' => $user->user_id,
                'muserid' => $user->user_id,
                'group_admin_id' => 0,
            ]);

            
            $invoiceNumber = DB::table('lce_user_invoice')->max('number') + 1;
            $invoiceId = DB::table('lce_user_invoice')->insertGetId([
                'user_id' => $user->user_id,
                'number' => $invoiceNumber ?? 1,
                'status' => 'Paid',
                'sub_total' => $paymentAmount + $discountAmount,
                'sub_total_wf' => ($request->pickup_type === 'wf' || $request->pickup_type === 'both') ? $paymentAmount + $discountAmount : 0,
                'sub_total_dc' => ($request->pickup_type === 'dc' || $request->pickup_type === 'both') ? $paymentAmount + $discountAmount : 0,
                'pickup_charge' => 0,
                'total' => $paymentAmount,
                
                'promo_id' => $activePromo ? ($activePromo->promo_id ?? 0) : 0,
                'promocode' => $activePromo ? $activePromo->code : '',
                'promo_amount' => $discountAmount ?? 0,
                'group_admin_id' => 0,
                'group_admin_discount_amount' => 0,
                'partial_invoice' => 0,
                'deleted' => 'No',
                'cdate' => now(),
                'mdate' => now(),
            ]);

            
            DB::table('lce_user_pickup')
                ->where('id', $pickupId)
                ->update(['invoice_id' => $invoiceId]);

            
            DB::table('lce_payment')->insert([
                'user_id' => $user->user_id,
                'type' => 'charge',
                'amount' => $paymentAmount,
                'note' => "Pickup Payment | Trans: " . ($paymentResult['transaction_id'] ?? 'N/A') . " | Pickup ID: {$pickupId}",
                'deleted' => 'No',
                'cdate' => now(),
                'mdate' => now(),
                'cuser_id' => $user->user_id,
            ]);

            Log::info('Invoice and payment created', ['user_id' => $user->user_id, 'invoice_id' => $invoiceId, 'pickup_id' => $pickupId]);
        }

        
        if ($request->service_type !== 'one_time') {
            $this->createRecurringSchedule($user->user_id, $request);
        }

        $pickup = DB::table('lce_user_pickup')->find($pickupId);

        Log::info('Pickup created', ['user_id' => $user->user_id, 'pickup_id' => $pickupId, 'payment_amount' => $paymentAmount]);

        
        $emailUser = $user->email;
        $emailName = $user->first_name ?? 'Customer';
        $emailPickupDate = $request->pickup_date;
        $emailPickupType = $request->pickup_type;
        $emailPickupId = $pickupId;
        $emailPaymentAmount = $paymentAmount;

        dispatch(function () use ($emailUser, $emailName, $emailPickupDate, $emailPickupType, $emailPickupId, $emailPaymentAmount) {
            try {
                $serviceTypeMap = [
                    'wf' => 'Wash & Fold',
                    'dc' => 'Dry Cleaning',
                    'hd' => 'Hang Dry',
                    'both' => 'Wash & Fold + Dry Cleaning',
                    'all' => 'All Services',
                ];
                Mail::to($emailUser)->send(new PickupConfirmationMail(
                    customerName: $emailName,
                    pickupDate: $emailPickupDate,
                    serviceType: $serviceTypeMap[$emailPickupType] ?? ucfirst($emailPickupType),
                    pickupId: $emailPickupId,
                    paymentAmount: $emailPaymentAmount
                ));
            } catch (\Exception $e) {
                Log::warning('Pickup confirmation email failed', ['error' => $e->getMessage()]);
            }
        })->afterResponse();

        return response()->json([
            'message' => 'Pickup scheduled successfully',
            'pickup' => new PickupResource($pickup),
            'payment' => $paymentResult ? [
                'success' => true,
                'amount' => $paymentAmount,
                'transaction_id' => $paymentResult['transaction_id'] ?? null,
            ] : null,
            'subscription' => $subscriptionData,
        ], 201);
    }

        public function show($id)
    {
        $user = $this->user();

        $pickup = DB::table('lce_user_pickup')
            ->where('id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$pickup) {
            return response()->json(['error' => 'Pickup not found'], 404);
        }

        
        $invoice = null;
        if ($pickup->invoice_id) {
            $invoice = DB::table('lce_user_invoice')
                ->where('id', $pickup->invoice_id)
                ->first();
        }

        return response()->json([
            'pickup' => new PickupResource($pickup),
            'invoice' => $invoice ? [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'total' => $invoice->total,
                'status' => $invoice->status,
            ] : null,
        ]);
    }

        public function update(UpdatePickupRequest $request, $id)
    {
        

        $user = $this->user();

        $pickup = DB::table('lce_user_pickup')
            ->where('id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$pickup) {
            return response()->json(['error' => 'Pickup not found'], 404);
        }

        
        if ($pickup->status !== 'pickup') {
            return response()->json(['error' => 'Cannot reschedule pickup in current status'], 400);
        }

        $updateData = [];
        if ($request->has('pickup_date')) {
            $updateData['pickup_date'] = $request->pickup_date;
        }
        if ($request->has('pickup_type')) {
            $updateData['pickup_type'] = $request->pickup_type;
        }

        if (!empty($updateData)) {
            $updateData['log'] = ($pickup->log ?? '') . "\nRescheduled on " . now();
            DB::table('lce_user_pickup')->where('id', $id)->update($updateData);
        }

        $pickup = DB::table('lce_user_pickup')->find($id);

        Log::info('Pickup rescheduled', ['user_id' => $user->user_id, 'pickup_id' => $id]);

        return response()->json([
            'message' => 'Pickup rescheduled successfully',
            'pickup' => new PickupResource($pickup),
        ]);
    }

        public function destroy($id)
    {
        $user = $this->user();

        $pickup = DB::table('lce_user_pickup')
            ->where('id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$pickup) {
            return response()->json(['error' => 'Pickup not found'], 404);
        }

        
        $nonCancellableStatuses = ['delivered', 'completed', 'cancelled'];
        if (in_array($pickup->status, $nonCancellableStatuses)) {
            return response()->json(['error' => 'Cannot cancel pickup that is already ' . $pickup->status], 400);
        }

        DB::table('lce_user_pickup')->where('id', $id)->update([
            'status' => 'cancelled',
            'cancelled_time' => now(),
            'log' => ($pickup->log ?? '') . "\nCancelled on " . now(),
        ]);

        Log::info('Pickup cancelled', ['user_id' => $user->user_id, 'pickup_id' => $id]);

        return response()->json(['message' => 'Pickup cancelled successfully']);
    }

        public function completeWeighing(Request $request, $id)
    {
        $request->validate([
            'weight_lbs' => 'required|numeric|min:0.1',
        ]);

        
        $pickup = DB::table('lce_user_pickup')->find($id);

        if (!$pickup || $pickup->user_id !== $this->user()->user_id) {
            return response()->json(['error' => 'Pickup not found'], 404);
        }

        
        $allowedStatuses = ['pickup', 'processing', 'picked_up'];
        if (!in_array($pickup->status, $allowedStatuses)) {
            return response()->json([
                'error' => 'Pickup cannot be billed. Current status: ' . $pickup->status,
                'allowed_statuses' => $allowedStatuses
            ], 400);
        }

        
        $user = DB::table('lce_user_info')->find($pickup->user_id);

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        
        if (!$user->customerProfileId || !$user->customerPaymentProfileId) {
            return response()->json([
                'error' => 'No payment method on file for this user',
                'code' => 'NO_PAYMENT_METHOD',
            ], 400);
        }

        
        $weightLbs = (float) $request->weight_lbs;

        
        $userZip = $user->zip ?? '';
        $priceListId = \App\Services\PricingService::getPriceListIdForUser($userZip, $user->price_list_id ?? 21);
        $ratePerLb = $this->pricing->getWashFoldRate($priceListId);
        $minimumLaundryAmount = $this->pricing->getMinimumCharge($priceListId);
        $pndFee = $this->pricing->getPickupDeliveryFee($priceListId);
        $serviceFee = $this->pricing->getServiceFee($priceListId);

        Log::info('PPO Pricing loaded from DB (dynamic)', [
            'rate_per_lb' => $ratePerLb,
            'minimum' => $minimumLaundryAmount,
            'pnd_fee' => $pndFee,
            'service_fee' => $serviceFee,
            'price_list_id' => $priceListId,
            'source' => 'PricingService → lce_configurations + lce_prices',
        ]);

        
        $wfAmount = max($weightLbs * $ratePerLb, $minimumLaundryAmount);

        
        $orderTotal = $wfAmount + $pndFee + $serviceFee;

        
        $orderTotal = round($orderTotal, 2);

        $paymentDescription = sprintf(
            'PPO Wash & Fold: %.2f lbs @ $%.2f/lb ($%.2f) + P&D $%.2f + Service $%.2f',
            $weightLbs,
            $ratePerLb,
            $wfAmount,
            $pndFee,
            $serviceFee
        );

        
        $creditService = app(\App\Services\CreditService::class);
        $creditResult = $creditService->applyCreditsToOrder(
            $user->user_id,
            $orderTotal,
            "PPO Order #{$id} - {$weightLbs} lbs"
        );

        $amountToCharge = $creditResult['amount_to_charge'];
        $creditsUsed = $creditResult['credits_used'];

        Log::info('Credits applied to PPO order', [
            'pickup_id' => $id,
            'order_total' => $orderTotal,
            'credits_used' => $creditsUsed,
            'amount_to_charge' => $amountToCharge,
        ]);

        
        $paymentResult = ['success' => true, 'transaction_id' => null, 'message' => 'Paid with credits'];

        if ($amountToCharge > 0) {
            try {
                $authorizeNet = app(\App\Services\AuthorizeNetService::class);

                $paymentResult = $authorizeNet->chargeCustomer(
                    $user->customerProfileId,
                    $user->customerPaymentProfileId,
                    $amountToCharge,  
                    $paymentDescription . ($creditsUsed > 0 ? " (Credits: -\${$creditsUsed})" : ''),
                    $user->email,
                    $request->ip()
                );

                if (!$paymentResult['success']) {
                    
                    
                    Log::error('Payment failed after credits applied', [
                        'pickup_id' => $id,
                        'credits_used' => $creditsUsed,
                        'amount_attempted' => $amountToCharge,
                    ]);

                    return response()->json([
                        'error' => 'Payment failed: ' . ($paymentResult['message'] ?? 'Unknown error'),
                        'code' => 'PAYMENT_FAILED',
                        'amount_attempted' => $amountToCharge,
                        'credits_applied' => $creditsUsed,
                        'note' => 'Credits have been deducted. Please contact support if payment continues to fail.',
                    ], 400);
                }

                Log::info('PPO Weighing payment successful', [
                    'pickup_id' => $id,
                    'user_id' => $user->user_id,
                    'weight_lbs' => $weightLbs,
                    'order_total' => $orderTotal,
                    'credits_used' => $creditsUsed,
                    'amount_charged' => $amountToCharge,
                    'transaction_id' => $paymentResult['transaction_id'] ?? null,
                ]);

            } catch (\Exception $e) {
                Log::error('PPO Weighing payment error', ['error' => $e->getMessage(), 'pickup_id' => $id]);
                return response()->json([
                    'error' => 'Payment processing error: ' . $e->getMessage(),
                    'code' => 'PAYMENT_ERROR',
                ], 500);
            }
        } else {
            
            Log::info('PPO Order fully covered by credits', [
                'pickup_id' => $id,
                'user_id' => $user->user_id,
                'order_total' => $orderTotal,
                'credits_used' => $creditsUsed,
            ]);
        }

        

        
        DB::table('lce_user_pickup')->where('id', $id)->update([
            'status' => 'completed',
            'wf_weight' => $weightLbs,  
            'wf_bags_items' => ceil($weightLbs / 20), 
            'customerPaymentTransId' => $paymentResult['transaction_id'] ?? null,
            'customerPaymentTransAmount' => $orderTotal,
            'log' => ($pickup->log ?? '') . "\nWeighed: {$weightLbs} lbs, Charged: \${$orderTotal} on " . now(),
        ]);

        // Create invoice
        $invoiceNumber = (DB::table('lce_user_invoice')->max('number') ?? 0) + 1;
        $invoiceId = DB::table('lce_user_invoice')->insertGetId([
            'user_id' => $user->user_id,
            'number' => $invoiceNumber,
            'status' => 'Paid',
            'sub_total' => $wfAmount,
            'sub_total_wf' => $wfAmount,
            'sub_total_dc' => 0,
            'pickup_charge' => $pndFee + $serviceFee,
            'total' => $orderTotal,
            'promo_id' => 0,
            'promocode' => $creditsUsed > 0 ? 'CREDIT' : '',
            'promo_amount' => $creditsUsed,  
            'group_admin_id' => 0,
            'group_admin_discount_amount' => 0,
            'partial_invoice' => 0,
            'order_type' => 'PPO',
            'is_subscription_invoice' => 0,
            'deleted' => 'No',
            'cdate' => now(),
            'mdate' => now(),
        ]);

        
        $lineItems = [];
        $pickupType = $pickup->pickup_type ?? 'wf';

        
        
        $hasWf = in_array($pickupType, ['wf', 'both', 'wf_hd', 'all']);
        $hasHd = in_array($pickupType, ['hd', 'wf_hd', 'hd_dc', 'all']);
        $hasDc = in_array($pickupType, ['dc', 'both', 'hd_dc', 'all']);

        
        if ($hasWf) {
            $lineItems[] = [
                'invoice_id' => $invoiceId,
                'sku' => 'WF1',
                'type' => 'WF',
                'name' => 'Wash & Fold Laundry',
                'quantity' => $weightLbs,
                'price' => $ratePerLb,
                'amount' => $wfAmount,
                'deleted' => 'No',
                'cdate' => now(),
            ];
        }

        
        if ($hasHd) {
            $lineItems[] = [
                'invoice_id' => $invoiceId,
                'sku' => 'HD1',
                'type' => 'HD',
                'name' => 'Hang Dry Laundry',
                'quantity' => 1,  
                'price' => 0,     
                'amount' => 0,
                'deleted' => 'No',
                'cdate' => now(),
            ];
        }

        
        if ($hasDc) {
            $lineItems[] = [
                'invoice_id' => $invoiceId,
                'sku' => 'DC1',
                'type' => 'DC',
                'name' => 'Dry Cleaning/Launder & Press',
                'quantity' => 1,  
                'price' => 0,     
                'amount' => 0,
                'deleted' => 'No',
                'cdate' => now(),
            ];
        }

        
        $lineItems[] = [
            'invoice_id' => $invoiceId,
            'sku' => 'PND',
            'type' => 'FEE',
            'name' => 'Pickup & Delivery Fee',
            'quantity' => 1,
            'price' => $pndFee,
            'amount' => $pndFee,
            'deleted' => 'No',
            'cdate' => now(),
        ];

        $lineItems[] = [
            'invoice_id' => $invoiceId,
            'sku' => 'SVC',
            'type' => 'FEE',
            'name' => 'Service Fee',
            'quantity' => 1,
            'price' => $serviceFee,
            'amount' => $serviceFee,
            'deleted' => 'No',
            'cdate' => now(),
        ];

        DB::table('lce_user_invoice_line')->insert($lineItems);

        
        if ($creditsUsed > 0) {
            DB::table('lce_user_invoice_line')->insert([
                'invoice_id' => $invoiceId,
                'sku' => 'CREDIT',
                'type' => 'CREDIT',
                'name' => 'Account Credit Applied',
                'quantity' => 1,
                'price' => -$creditsUsed,  
                'amount' => -$creditsUsed,
                'deleted' => 'No',
                'cdate' => now(),
            ]);
        }

        
        DB::table('lce_user_pickup')->where('id', $id)->update([
            'invoice_id' => $invoiceId
        ]);

        
        DB::table('lce_user_transactions')->insert([
            'user_id' => $user->user_id,
            'type' => 'Debit',
            'transactionId' => $paymentResult['transaction_id'] ?? '',
            'invoice_id' => $invoiceId,
            'name' => 'Credit Card',
            'amount' => $amountToCharge,  
            'description' => $paymentDescription . ($creditsUsed > 0 ? " | Credits: -\${$creditsUsed}" : ''),
            'note' => "Pickup ID: {$id} | Weight: {$weightLbs} lbs | Order Total: \${$orderTotal} | Credits: \${$creditsUsed} | Charged: \${$amountToCharge}",
            'cdate' => now(),
            'mdate' => now(),
            'cuserid' => $user->user_id,
            'muserid' => $user->user_id,
            'group_admin_id' => 0,
        ]);

        
        DB::table('lce_payment')->insert([
            'user_id' => $user->user_id,
            'type' => 'charge',
            'amount' => $orderTotal,
            'note' => "PPO Payment | Trans: " . ($paymentResult['transaction_id'] ?? 'N/A') . " | Pickup: {$id} | {$weightLbs} lbs",
            'deleted' => 'No',
            'cdate' => now(),
            'mdate' => now(),
            'cuser_id' => $user->user_id,
        ]);

        
        $ocEmail = $user->email;
        $ocName = $user->first_name ?? 'Customer';
        $ocPickupId = (int) $id;
        $ocWeightLbs = $weightLbs;
        $ocRatePerLb = $ratePerLb;
        $ocWfAmount = $wfAmount;
        $ocPndFee = $pndFee;
        $ocServiceFee = $serviceFee;
        $ocTotalCharged = $orderTotal;
        $ocCreditsUsed = $creditsUsed;
        $ocInvoiceNumber = (string) $invoiceNumber;
        $ocTransactionId = $paymentResult['transaction_id'] ?? null;

        dispatch(function () use ($ocEmail, $ocName, $ocPickupId, $ocWeightLbs, $ocRatePerLb, $ocWfAmount, $ocPndFee, $ocServiceFee, $ocTotalCharged, $ocCreditsUsed, $ocInvoiceNumber, $ocTransactionId) {
            try {
                Mail::to($ocEmail)->send(new OrderCompletedMail(
                    customerName: $ocName,
                    pickupId: $ocPickupId,
                    weightLbs: $ocWeightLbs,
                    ratePerLb: $ocRatePerLb,
                    wfAmount: $ocWfAmount,
                    pndFee: $ocPndFee,
                    serviceFee: $ocServiceFee,
                    totalCharged: $ocTotalCharged,
                    creditsUsed: $ocCreditsUsed,
                    invoiceNumber: $ocInvoiceNumber,
                    transactionId: $ocTransactionId
                ));
            } catch (\Exception $e) {
                Log::warning('Order completed email failed', ['error' => $e->getMessage()]);
            }
        })->afterResponse();

        return response()->json([
            'success' => true,
            'message' => 'PPO order completed and charged successfully',
            'pickup_id' => $id,
            'billing' => [
                'weight_lbs' => $weightLbs,
                'rate_per_lb' => $ratePerLb,
                'wf_amount' => $wfAmount,
                'pnd_fee' => $pndFee,
                'service_fee' => $serviceFee,
                'total_charged' => $orderTotal,
            ],
            'payment' => [
                'success' => true,
                'transaction_id' => $paymentResult['transaction_id'] ?? null,
                'auth_code' => $paymentResult['auth_code'] ?? null,
            ],
            'invoice_id' => $invoiceId,
        ]);
    }

        public function completeItemEntry(Request $request, $id)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer|exists:lce_prices,id',
            'items.*.quantity' => 'required|integer|min:1|max:500',
        ]);

        
        $pickup = DB::table('lce_user_pickup')->find($id);

        if (!$pickup || $pickup->user_id !== $this->user()->user_id) {
            return response()->json(['error' => 'Pickup not found'], 404);
        }

        
        $allowedStatuses = ['pickup', 'processing', 'picked_up', 'scheduled'];
        if (!in_array($pickup->status, $allowedStatuses)) {
            return response()->json([
                'error' => 'Pickup cannot be billed. Current status: ' . $pickup->status,
                'allowed_statuses' => $allowedStatuses
            ], 400);
        }

        
        $allowedPickupTypes = ['dc', 'hd', 'hang_dry', 'both', 'hd_dc', 'all'];
        if (!in_array($pickup->pickup_type, $allowedPickupTypes)) {
            return response()->json([
                'error' => 'This endpoint is for Dry Cleaning (DC) and Hang Dry (HD) services. Use complete-weighing for Wash & Fold.',
                'pickup_type' => $pickup->pickup_type,
            ], 400);
        }

        
        $user = DB::table('lce_user_info')->find($pickup->user_id);

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        
        if (!$user->customerProfileId || !$user->customerPaymentProfileId) {
            return response()->json([
                'error' => 'No payment method on file for this user',
                'code' => 'NO_PAYMENT_METHOD',
            ], 400);
        }

        
        $priceListId = $user->price_list_id ?? 1;
        $priceColumn = 'price_' . $priceListId;

        
        $itemsTotal = 0;
        $lineItems = [];
        $itemDescriptions = [];

        foreach ($request->items as $item) {
            $priceRecord = DB::table('lce_prices')
                ->where('id', $item['item_id'])
                ->where('deleted', 'No')
                ->first();

            if (!$priceRecord) {
                return response()->json([
                    'error' => "Price item not found: {$item['item_id']}",
                    'code' => 'INVALID_ITEM',
                ], 400);
            }

            
            $unitPrice = (float) ($priceRecord->$priceColumn ?? $priceRecord->price_1 ?? 0);
            $quantity = (int) $item['quantity'];
            $lineTotal = $unitPrice * $quantity;
            $itemsTotal += $lineTotal;

            $lineItems[] = [
                'item_id' => $priceRecord->id,
                'sku' => $priceRecord->sku,
                'type' => $priceRecord->type,
                'name' => $priceRecord->name,
                'quantity' => $quantity,
                'price' => $unitPrice,
                'amount' => $lineTotal,
            ];

            $itemDescriptions[] = "{$quantity}x {$priceRecord->name} @ \${$unitPrice}";
        }

        
        
        $hasActiveSubscription = DB::table('lce_user_subscriptions')
            ->where('user_id', $pickup->user_id)
            ->where('status', 'active')
            ->exists();
        $waiveFees = $pickup->order_type === 'subscription' || $hasActiveSubscription;
        $pickupUser = DB::table('lce_user_info')->where('user_id', $pickup->user_id)->first();
        $userZip = $pickupUser->zip ?? '';
        $priceListId = \App\Services\PricingService::getPriceListIdForUser($userZip, $pickupUser->price_list_id ?? 21);
        $pndFee = $waiveFees ? 0 : (float)$this->pricing->getPickupDeliveryFee($priceListId);
        $serviceFee = $waiveFees ? 0 : (float)$this->pricing->getServiceFee($priceListId);

        
        $orderTotal = round($itemsTotal + $pndFee + $serviceFee, 2);

        $paymentDescription = 'HD/DC Items: ' . implode(', ', $itemDescriptions);
        if (!$waiveFees) {
            $paymentDescription .= sprintf(' + P&D $%.2f + Service $%.2f', $pndFee, $serviceFee);
        }

        Log::info('HD/DC Item Entry calculated', [
            'pickup_id' => $id,
            'items_total' => $itemsTotal,
            'pnd_fee' => $pndFee,
            'service_fee' => $serviceFee,
            'order_total' => $orderTotal,
        ]);

        
        $creditService = app(\App\Services\CreditService::class);
        $creditResult = $creditService->applyCreditsToOrder(
            $user->user_id,
            $orderTotal,
            "HD/DC Order #{$id} - " . count($request->items) . " items"
        );

        $amountToCharge = $creditResult['amount_to_charge'];
        $creditsUsed = $creditResult['credits_used'];

        Log::info('Credits applied to HD/DC order', [
            'pickup_id' => $id,
            'order_total' => $orderTotal,
            'credits_used' => $creditsUsed,
            'amount_to_charge' => $amountToCharge,
        ]);

        
        $paymentResult = ['success' => true, 'transaction_id' => null, 'message' => 'Paid with credits'];

        if ($amountToCharge > 0) {
            try {
                $authorizeNet = app(\App\Services\AuthorizeNetService::class);

                $paymentResult = $authorizeNet->chargeCustomer(
                    $user->customerProfileId,
                    $user->customerPaymentProfileId,
                    $amountToCharge,
                    $paymentDescription . ($creditsUsed > 0 ? " (Credits: -\${$creditsUsed})" : ''),
                    $user->email,
                    $request->ip()
                );

                if (!$paymentResult['success']) {
                    Log::error('HD/DC Payment failed after credits applied', [
                        'pickup_id' => $id,
                        'credits_used' => $creditsUsed,
                        'amount_attempted' => $amountToCharge,
                    ]);

                    return response()->json([
                        'error' => 'Payment failed: ' . ($paymentResult['message'] ?? 'Unknown error'),
                        'code' => 'PAYMENT_FAILED',
                        'amount_attempted' => $amountToCharge,
                        'credits_applied' => $creditsUsed,
                        'note' => 'Credits have been deducted. Please contact support if payment continues to fail.',
                    ], 400);
                }

                Log::info('HD/DC Item Entry payment successful', [
                    'pickup_id' => $id,
                    'user_id' => $user->user_id,
                    'order_total' => $orderTotal,
                    'credits_used' => $creditsUsed,
                    'amount_charged' => $amountToCharge,
                    'transaction_id' => $paymentResult['transaction_id'] ?? null,
                ]);

            } catch (\Exception $e) {
                Log::error('HD/DC payment error', ['error' => $e->getMessage(), 'pickup_id' => $id]);
                return response()->json([
                    'error' => 'Payment processing error: ' . $e->getMessage(),
                    'code' => 'PAYMENT_ERROR',
                ], 500);
            }
        } else {
            Log::info('HD/DC Order fully covered by credits', [
                'pickup_id' => $id,
                'user_id' => $user->user_id,
                'order_total' => $orderTotal,
                'credits_used' => $creditsUsed,
            ]);
        }

        

        
        DB::table('lce_user_pickup')->where('id', $id)->update([
            'status' => 'completed',
            'dc_items' => count($lineItems),
            'customerPaymentTransId' => $paymentResult['transaction_id'] ?? null,
            'customerPaymentTransAmount' => $orderTotal,
            'log' => ($pickup->log ?? '') . "\nItems entered: " . count($lineItems) . " items, Charged: \${$orderTotal} on " . now(),
        ]);

        // Create invoice
        $invoiceNumber = (DB::table('lce_user_invoice')->max('number') ?? 0) + 1;
        $invoiceId = DB::table('lce_user_invoice')->insertGetId([
            'user_id' => $user->user_id,
            'number' => $invoiceNumber,
            'status' => 'Paid',
            'sub_total' => $itemsTotal,
            'sub_total_wf' => 0,
            'sub_total_dc' => $itemsTotal,
            'pickup_charge' => $pndFee + $serviceFee,
            'total' => $orderTotal,
            'promo_id' => 0,
            'promocode' => $creditsUsed > 0 ? 'CREDIT' : '',
            'promo_amount' => $creditsUsed,
            'group_admin_id' => 0,
            'group_admin_discount_amount' => 0,
            'partial_invoice' => 0,
            'order_type' => $pickup->order_type ?? 'PPO',
            'deleted' => 'No',
            'cdate' => now(),
            'mdate' => now(),
        ]);

        
        foreach ($lineItems as $item) {
            DB::table('lce_user_invoice_line')->insert([
                'invoice_id' => $invoiceId,
                'item_id' => $item['item_id'],
                'sku' => $item['sku'],
                'type' => $item['type'],
                'name' => $item['name'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'amount' => $item['amount'],
                'deleted' => 'No',
                'cdate' => now(),
            ]);
        }

        
        if (!$waiveFees) {
            DB::table('lce_user_invoice_line')->insert([
                'invoice_id' => $invoiceId,
                'sku' => 'PND',
                'type' => 'FEE',
                'name' => 'Pickup & Delivery Fee',
                'quantity' => 1,
                'price' => $pndFee,
                'amount' => $pndFee,
                'deleted' => 'No',
                'cdate' => now(),
            ]);

            DB::table('lce_user_invoice_line')->insert([
                'invoice_id' => $invoiceId,
                'sku' => 'SVC',
                'type' => 'FEE',
                'name' => 'Service Fee',
                'quantity' => 1,
                'price' => $serviceFee,
                'amount' => $serviceFee,
                'deleted' => 'No',
                'cdate' => now(),
            ]);
        }

        
        if ($creditsUsed > 0) {
            DB::table('lce_user_invoice_line')->insert([
                'invoice_id' => $invoiceId,
                'sku' => 'CREDIT',
                'type' => 'CREDIT',
                'name' => 'Account Credit Applied',
                'quantity' => 1,
                'price' => -$creditsUsed,
                'amount' => -$creditsUsed,
                'deleted' => 'No',
                'cdate' => now(),
            ]);
        }

        
        DB::table('lce_user_pickup')->where('id', $id)->update([
            'invoice_id' => $invoiceId
        ]);

        
        DB::table('lce_user_transactions')->insert([
            'user_id' => $user->user_id,
            'type' => 'Debit',
            'transactionId' => $paymentResult['transaction_id'] ?? '',
            'invoice_id' => $invoiceId,
            'name' => 'Credit Card',
            'amount' => $amountToCharge,
            'description' => $paymentDescription . ($creditsUsed > 0 ? " | Credits: -\${$creditsUsed}" : ''),
            'note' => "Pickup ID: {$id} | Items: " . count($lineItems) . " | Order Total: \${$orderTotal} | Credits: \${$creditsUsed} | Charged: \${$amountToCharge}",
            'cdate' => now(),
            'mdate' => now(),
            'cuserid' => $user->user_id,
            'muserid' => $user->user_id,
            'group_admin_id' => 0,
        ]);

        
        DB::table('lce_payment')->insert([
            'user_id' => $user->user_id,
            'type' => 'charge',
            'amount' => $orderTotal,
            'note' => "HD/DC Payment | Trans: " . ($paymentResult['transaction_id'] ?? 'N/A') . " | Pickup: {$id} | Items: " . count($lineItems),
            'deleted' => 'No',
            'cdate' => now(),
            'mdate' => now(),
            'cuser_id' => $user->user_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'HD/DC order completed and charged successfully',
            'pickup_id' => $id,
            'billing' => [
                'items_count' => count($lineItems),
                'items_total' => $itemsTotal,
                'pnd_fee' => $pndFee,
                'service_fee' => $serviceFee,
                'credits_used' => $creditsUsed,
                'total_charged' => $orderTotal,
                'amount_paid' => $amountToCharge,
            ],
            'payment' => [
                'success' => true,
                'transaction_id' => $paymentResult['transaction_id'] ?? null,
                'auth_code' => $paymentResult['auth_code'] ?? null,
            ],
            'invoice_id' => $invoiceId,
            'line_items' => $lineItems,
        ]);
    }

        public function services()
    {
        $user = $this->user();
        $priceListId = $user->price_list_id ?? 1;
        $priceColumn = "price_{$priceListId}";

        
        $serviceMeta = [
            'WF' => [
                'code' => 'wf',
                'name' => 'Wash & Fold Laundry',
                'description' => 'You can Pay Per Order or Subscribe & Save. Choose what fits for you...',
                'pricing_type' => 'per_pound',
            ],
            'HD' => [
                'code' => 'hang_dry',
                'name' => 'Hang Dry Laundry',
                'description' => 'Hang Dry Laundry pricing based on per items you send.',
                'pricing_type' => 'per_item',
            ],
            'DC' => [
                'code' => 'dc',
                'name' => 'Dry Cleaning/Launder & Press',
                'description' => 'Dry Cleaning / Launder & Press — Pay Per Order. Your card will be charged after we process your items.',
                'pricing_type' => 'per_item',
            ],
        ];

        
        $priceItems = DB::table('lce_prices')
            ->where('deleted', 'No')
            ->orderBy('order')
            ->get();

        $grouped = $priceItems->groupBy('type');

        $services = [];
        foreach ($serviceMeta as $dbType => $meta) {
            $items = $grouped->get($dbType, collect());
            $firstItem = $items->first();

            $service = $meta;
            $service['item_count'] = $items->count();
            $service['base_price'] = $firstItem
                ? (float) ($firstItem->$priceColumn ?? $firstItem->price_1 ?? 0)
                : 0;
            $services[] = $service;
        }

        return response()->json([
            'services' => $services,
            'service_types' => [
                ['code' => 'one_time', 'name' => 'One Time Service'],
                ['code' => 'weekly', 'name' => 'Weekly'],
                ['code' => 'bi_weekly', 'name' => 'Bi-Weekly'],
            ],
        ]);
    }

        private function createRecurringSchedule($userId, Request $request)
    {
        
        $preferredDays = $request->get('preferred_day', '');
        $dayMapping = [
            'mon' => 'monday',
            'tue' => 'tuesday',
            'wed' => 'wednesday',
            'thu' => 'thursday',
            'fri' => 'friday',
            'sat' => 'saturday',
            'sun' => 'sunday',
        ];

        $days = [];
        if (!empty($preferredDays)) {
            $dayParts = explode(',', strtolower($preferredDays));
            foreach ($dayParts as $day) {
                $day = trim($day);
                if (isset($dayMapping[$day])) {
                    $days[] = $dayMapping[$day];
                } elseif (in_array($day, $dayMapping)) {
                    
                    $days[] = $day;
                }
            }
        }

        DB::table('lce_user_rs')->updateOrInsert(
            ['user_id' => $userId],
            [
                'day_monday' => in_array('monday', $days) ? 'Y' : null,
                'day_tuesday' => in_array('tuesday', $days) ? 'Y' : null,
                'day_wednesday' => in_array('wednesday', $days) ? 'Y' : null,
                'day_thursday' => in_array('thursday', $days) ? 'Y' : null,
                'day_friday' => in_array('friday', $days) ? 'Y' : null,
                'delivey_type' => $request->service_type === 'bi_weekly' ? 'bi-weekly' : 'weekly',
                'start_date' => $request->pickup_date,
            ]
        );
    }

    
        public function getRecurringSchedule()
    {
        $user = $this->user();

        $schedule = DB::table('lce_user_rs')
            ->where('user_id', $user->user_id)
            ->first();

        if (!$schedule) {
            return response()->json([
                'has_recurring' => false,
                'schedule_type' => 'one_time',
                'days' => [],
                'days_formatted' => '',
                'next_pickup_date' => null,
                'next_delivery_date' => null,
            ]);
        }

        
        $dayMapping = [
            'day_monday' => 'Monday',
            'day_tuesday' => 'Tuesday',
            'day_wednesday' => 'Wednesday',
            'day_thursday' => 'Thursday',
            'day_friday' => 'Friday',
            'day_saturday' => 'Saturday',
            'day_sunday' => 'Sunday',
        ];

        $selectedDays = [];
        foreach ($dayMapping as $column => $dayName) {
            if ($schedule->$column === 'Y') {
                $selectedDays[] = $dayName;
            }
        }

        
        $daysFormatted = count($selectedDays) > 0
            ? implode(' & ', $selectedDays)
            : '';

        // Determine schedule type
        $scheduleType = $schedule->delivey_type ?? 'one_time';
        if ($scheduleType === 'bi-weekly') {
            $scheduleType = 'bi_weekly';
        }

        
        $nextPickupDate = null;
        $nextDeliveryDate = null;

        if (count($selectedDays) > 0) {
            $today = now();
            $dayOfWeekMap = [
                'Monday' => 1,
                'Tuesday' => 2,
                'Wednesday' => 3,
                'Thursday' => 4,
                'Friday' => 5,
                'Saturday' => 6,
                'Sunday' => 0,
            ];

            
            $nearestDays = [];
            foreach ($selectedDays as $dayName) {
                $targetDayNum = $dayOfWeekMap[$dayName];
                $currentDayNum = (int) $today->format('w');

                $daysUntil = ($targetDayNum - $currentDayNum + 7) % 7;
                if ($daysUntil === 0)
                    $daysUntil = 7; 

                $nearestDays[] = $today->copy()->addDays($daysUntil);
            }

            
            usort($nearestDays, fn($a, $b) => $a->timestamp - $b->timestamp);

            $nextPickupDate = $nearestDays[0]->format('Y-m-d');
            $nextDeliveryDate = $nearestDays[0]->addDay()->format('Y-m-d'); 
        }

        return response()->json([
            'has_recurring' => true,
            'schedule_type' => $scheduleType,
            'days' => $selectedDays,
            'days_formatted' => $daysFormatted,
            'next_pickup_date' => $nextPickupDate,
            'next_delivery_date' => $nextDeliveryDate,
            'start_date' => $schedule->start_date,
        ]);
    }
}
