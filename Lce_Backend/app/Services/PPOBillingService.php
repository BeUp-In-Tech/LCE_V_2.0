<?php

namespace App\Services;

use App\Services\AuthorizeNetService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PPOBillingService
{
    protected PricingService $pricing;
    protected InvoiceService $invoiceService;
    protected TransactionService $transactionService;
    protected CreditService $creditService;
    protected AuthorizeNetService $authorizeNet;

    public function __construct(
        PricingService $pricing,
        InvoiceService $invoiceService,
        TransactionService $transactionService,
        CreditService $creditService,
        AuthorizeNetService $authorizeNet
    ) {
        $this->pricing = $pricing;
        $this->invoiceService = $invoiceService;
        $this->transactionService = $transactionService;
        $this->creditService = $creditService;
        $this->authorizeNet = $authorizeNet;
    }

        public function calculateCharges(float $weight, int $priceListId = 1, bool $includeFees = true): array
    {
        $baseRate = $this->pricing->getWashFoldRate();
        $minimum = $this->pricing->getMinimumCharge();
        $pdFee = $this->pricing->getPickupDeliveryFee();
        $serviceFee = $this->pricing->getServiceFee();

        
        $laundryTotal = $weight * $baseRate;
        $laundryCharge = max($laundryTotal, $minimum);

        $breakdown = [
            'weight' => $weight,
            'rate_per_lb' => $baseRate,
            'laundry_calculated' => round($laundryTotal, 2),
            'laundry_charge' => round($laundryCharge, 2),
            'minimum_applied' => $laundryTotal < $minimum,
            'minimum_amount' => $minimum,
        ];

        if ($includeFees) {
            $breakdown['pd_fee'] = $pdFee;
            $breakdown['service_fee'] = $serviceFee;
            $breakdown['total'] = round($laundryCharge + $pdFee + $serviceFee, 2);
        } else {
            $breakdown['total'] = round($laundryCharge, 2);
        }

        return $breakdown;
    }

        public function billPickup(int $pickupId, float $weight): array
    {
        $pickup = DB::table('lce_user_pickup')->find($pickupId);
        if (!$pickup) {
            throw new \Exception("Pickup not found: {$pickupId}");
        }

        $user = DB::table('lce_user_info')->where('user_id', $pickup->user_id)->first();
        if (!$user) {
            throw new \Exception("User not found for pickup: {$pickupId}");
        }

        
        $priceListId = $user->price_list_id ?? 1;

        
        $charges = $this->calculateCharges($weight, $priceListId, true);

        
        $lineItems = [
            [
                'sku' => 'WF_PPO',
                'type' => 'WF',
                'name' => "Wash & Fold ({$weight} lbs @ \${$charges['rate_per_lb']}/lb)",
                'quantity' => $weight,
                'price' => $charges['rate_per_lb'],
                'note' => $charges['minimum_applied'] ? "Minimum charge applied" : null,
            ],
        ];

        
        if ($charges['pd_fee'] > 0) {
            $lineItems[] = [
                'sku' => 'PD_FEE',
                'type' => 'FEE',
                'name' => 'Pickup & Delivery Fee',
                'quantity' => 1,
                'price' => $charges['pd_fee'],
            ];
        }

        if ($charges['service_fee'] > 0) {
            $lineItems[] = [
                'sku' => 'SVC_FEE',
                'type' => 'FEE',
                'name' => 'Service Fee',
                'quantity' => 1,
                'price' => $charges['service_fee'],
            ];
        }

        
        $promoOptions = $this->checkPromo($pickup->user_id);

        
        
        
        
        $invoice = $this->invoiceService->createInvoice(
            $pickup->user_id,
            $lineItems,
            array_merge($promoOptions, [
                'pickup_charge' => 0,
                'use_credits' => true,
            ])
        );

        
        $paymentResult = null;
        if ($invoice->total > 0) {
            $paymentResult = $this->chargeUser($pickup->user_id, $invoice);

            if (!$paymentResult || !$paymentResult['success']) {
                Log::warning('PPO charge failed — pickup NOT marked invoiced', [
                    'pickup_id' => $pickupId,
                    'invoice_id' => $invoice->id,
                    'total' => $invoice->total,
                ]);
                throw new \Exception("Payment failed for PPO pickup #{$pickupId}. Invoice #{$invoice->id} created but not collected.");
            }
        }

        
        DB::table('lce_user_pickup')
            ->where('id', $pickupId)
            ->update([
                'invoice_id' => $invoice->id,
                'wf_weight' => $weight,
                'status' => 'invoiced',
                'invoice_time' => now(),
                'customerPaymentTransId' => $paymentResult['transaction_id'] ?? null,
                'customerPaymentTransAmount' => $invoice->total,
            ]);

        Log::info('PPO pickup billed', [
            'pickup_id' => $pickupId,
            'invoice_id' => $invoice->id,
            'total' => $invoice->total,
        ]);

        return [
            'success' => true,
            'invoice' => $invoice,
            'charges' => $charges,
            'payment' => $paymentResult,
        ];
    }

        private function chargeUser(int $userId, object $invoice): ?array
    {
        $user = DB::table('lce_user_info')->where('user_id', $userId)->first();

        if (!$user || !$user->customerProfileId || !$user->customerPaymentProfileId) {
            Log::warning('No payment method on file', ['user_id' => $userId]);
            return null;
        }

        $result = $this->authorizeNet->chargeCustomer(
            $user->customerProfileId,
            $user->customerPaymentProfileId,
            $invoice->total,
            "Invoice #{$invoice->number}",
            $user->email
        );

        if ($result['success']) {
            $this->invoiceService->markAsPaid($invoice->id, $result['transaction_id']);

            $this->transactionService->logCharge(
                $userId,
                $invoice->id,
                $result['transaction_id'],
                $invoice->total,
                "PPO Payment - Invoice #{$invoice->number}",
                "Auth: " . ($result['auth_code'] ?? 'N/A')
            );
        }

        return $result;
    }

        private function checkPromo(int $userId): array
    {
        $promo = DB::table('lce_user_promocode')
            ->join('lce_promo_codes', 'lce_user_promocode.promocode_id', '=', 'lce_promo_codes.id')
            ->where('lce_user_promocode.user_id', $userId)
            ->where('lce_user_promocode.active', 1)
            ->where('lce_user_promocode.expiry_date', '>=', now())
            ->select(
                'lce_user_promocode.id as user_promo_id',
                'lce_promo_codes.id as promo_id',
                'lce_promo_codes.promocode',
                'lce_promo_codes.promocode_type',
                'lce_promo_codes.promocode_value'
            )
            ->first();

        if (!$promo) {
            return [];
        }

        
        DB::table('lce_user_promocode')
            ->where('id', $promo->user_promo_id)
            ->update(['active' => 0]);

        
        DB::table('lce_user_promocodes')->insert([
            'user_id' => $userId,
            'promocode_id' => $promo->user_promo_id,
            'promocode_name' => $promo->promocode,
            'used_date' => now(),
            'cdate' => now(),
        ]);

        return [
            'promo_id' => $promo->promo_id,
            'promocode' => $promo->promocode,
            'promo_amount' => $promo->promocode_type === 'percentage' ? 0 : (float) $promo->promocode_value,
        ];
    }

        public function chargeNoLaundry(int $pickupId): array
    {
        $pickup = DB::table('lce_user_pickup')->find($pickupId);
        if (!$pickup) {
            throw new \Exception("Pickup not found: {$pickupId}");
        }

        $pdFee = $this->pricing->getPickupDeliveryFee();

        $lineItems = [
            [
                'sku' => 'NL_FEE',
                'type' => 'FEE',
                'name' => 'No Laundry - P&D Fee',
                'quantity' => 1,
                'price' => $pdFee,
            ],
        ];

        $invoice = $this->invoiceService->createInvoice($pickup->user_id, $lineItems);

        $paymentResult = $this->chargeUser($pickup->user_id, $invoice);

        DB::table('lce_user_pickup')
            ->where('id', $pickupId)
            ->update([
                'status' => 'no_laundry',
                'no_laundry_time' => now(),
                'invoice_id' => $invoice->id,
            ]);

        return [
            'success' => true,
            'invoice' => $invoice,
            'payment' => $paymentResult,
        ];
    }
}
