<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\GiftCardMail;
use App\Helpers\DateHelper;
use App\Http\Requests\GiftCard\PurchaseGiftCardRequest;
use App\Http\Requests\GiftCard\RedeemGiftCardRequest;

class GiftCardController extends Controller
{
        public function purchase(PurchaseGiftCardRequest $request)
    {
        

        $user = $this->user();

        
        $code = strtoupper('LCE-' . Str::random(8));

        
        if (!$user->customerProfileId || !$user->customerPaymentProfileId) {
            return response()->json([
                'message' => 'No payment method found. Please add a payment method first.'
            ], 400);
        }

        try {
            
            $authorizeNet = app(\App\Services\AuthorizeNetService::class);
            $paymentResult = $authorizeNet->chargeCustomer(
                $user->customerProfileId,
                $user->customerPaymentProfileId,
                $request->amount,
                "Gift Card Purchase: {$code}",
                $user->email  
            );

            if (!$paymentResult['success']) {
                Log::error('Gift card payment failed', [
                    'user_id' => $user->user_id,
                    'error' => $paymentResult['message']
                ]);
                return response()->json([
                    'message' => 'Payment failed: ' . $paymentResult['message']
                ], 400);
            }

            
            $promoId = DB::table('lce_promo_codes')->insertGetId([
                'promocode' => $code,
                'promocode_type' => 'fixed',
                'promocode_value' => $request->amount,
                'publish' => 1,
                'promocode_time_period' => 'single',
                'time_period_value' => '',
                'promo_expiry_date' => now()->addYear(),
                'promocode_for' => 'giftcard',
                'promocode_description' => "Gift card from {$user->first_name} {$user->last_name}",
                'created_date' => DateHelper::today(),
            ]);

            
            $invoiceNumber = DB::table('lce_user_invoice')->max('number') + 1;
            DB::table('lce_user_invoice')->insert([
                'user_id' => $user->user_id,
                'number' => $invoiceNumber ?? 1,
                'status' => 'Paid',
                'sub_total' => $request->amount,
                'sub_total_wf' => 0,
                'sub_total_dc' => 0,
                'pickup_charge' => 0,
                'total' => $request->amount,
                
                'promo_id' => 0,
                'promocode' => '',
                'promo_amount' => 0,
                'group_admin_id' => 0,
                'group_admin_discount_amount' => 0,
                'partial_invoice' => 0,
                'deleted' => 'No',
                'cdate' => now(),
                'mdate' => now(),
            ]);

            Log::info('Gift card purchased', [
                'user_id' => $user->user_id,
                'code' => $code,
                'amount' => $request->amount,
                'transaction_id' => $paymentResult['transaction_id'] ?? 'N/A'
            ]);

            
            DB::table('lce_payment')->insert([
                'user_id' => $user->user_id,
                'type' => 'charge',
                'amount' => $request->amount,
                'note' => "Gift Card Purchase | Trans: " . ($paymentResult['transaction_id'] ?? 'N/A') . " | Code: {$code}",
                'deleted' => 'No',
                'cdate' => now(),
                'mdate' => now(),
                'cuser_id' => $user->user_id,
            ]);

            
            if ($request->delivery_method === 'email' && $request->recipient_email) {
                try {
                    Mail::to($request->recipient_email)->send(new GiftCardMail(
                        code: $code,
                        amount: (float) $request->amount,
                        recipientName: $request->recipient_name ?? 'Friend',
                        senderName: "{$user->first_name} {$user->last_name}",
                        giftMessage: $request->message ?? null,
                        expiresAt: DateHelper::now()->addYear()->format('F j, Y')
                    ));
                    Log::info('Gift card email sent', [
                        'to' => $request->recipient_email,
                        'code' => $code
                    ]);
                } catch (\Exception $mailError) {
                    Log::error('Gift card email failed: ' . $mailError->getMessage());
                    
                }
            }

            return response()->json([
                'message' => 'Gift card purchased successfully',
                'gift_card' => [
                    'code' => $code,
                    'amount' => (float) $request->amount,
                    'recipient_email' => $request->recipient_email,
                    'recipient_name' => $request->recipient_name,
                    'expires_at' => DateHelper::now()->addYear()->format('Y-m-d'),
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Gift card purchase error: ' . $e->getMessage());
            return response()->json(['message' => 'An error occurred processing your request.'], 500);
        }
    }

        public function redeem(RedeemGiftCardRequest $request)
    {
        
        $code = strtoupper(trim($request->code));
        $user = $this->user();

        try {
            DB::beginTransaction();

            $giftCard = DB::table('lce_promo_codes')
                ->where('promocode', $code)
                ->where('promocode_for', 'giftcard')
                ->where('publish', 1)
                ->lockForUpdate() 
                ->first();

            if (!$giftCard) {
                DB::rollBack();
                return response()->json(['message' => 'Invalid gift card code'], 400);
            }

            
            $alreadyRedeemed = DB::table('lce_user_promocode')
                ->where('promocode_id', $giftCard->id)
                ->exists();

            if ($alreadyRedeemed) {
                DB::rollBack();
                return response()->json(['message' => 'This gift card has already been redeemed'], 400);
            }

            
            if ($giftCard->promo_expiry_date && $giftCard->promo_expiry_date < DateHelper::today()) {
                DB::rollBack();
                return response()->json(['message' => 'This gift card has expired'], 400);
            }

            
            DB::table('lce_user_credits')->insert([
                'user_id' => $user->user_id,
                'type' => 'promo', 
                'description' => "Redeemed Gift Card: {$code}",
                'amount' => $giftCard->promocode_value,
                'balance' => $giftCard->promocode_value,
                'expires_at' => null, 
                'used' => 0,
                'cdate' => now(),
                'mdate' => now(),
            ]);

            
            DB::table('lce_user_promocode')->insert([
                'user_id' => $user->user_id,
                'promocode_id' => $giftCard->id,
                'promocode' => $code,
                'active' => 0, 
                'expiry_date' => $giftCard->promo_expiry_date,
            ]);

            
            DB::table('lce_user_promocodes')->insert([
                'user_id' => $user->user_id,
                'promocode_id' => $giftCard->id,
                'promocode_name' => $code,
                'used_date' => now(),
                'cdate' => now(),
            ]);

            DB::commit();

            
            $newBalance = DB::table('lce_user_credits')
                ->where('user_id', $user->user_id)
                ->where('used', 0)
                ->sum('balance');

            Log::info('Gift card redeemed', [
                'user_id' => $user->user_id,
                'code' => $code,
                'amount' => $giftCard->promocode_value
            ]);

            return response()->json([
                'message' => 'Gift card redeemed successfully!',
                'redeemed_amount' => (float) $giftCard->promocode_value,
                'new_balance' => (float) $newBalance,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Gift card redeem error: ' . $e->getMessage());
            return response()->json(['message' => 'An error occurred processing your request.'], 500);
        }
    }

        public function checkBalance(Request $request)
    {
        $request->validate([
            'code' => 'required|string|min:4|max:50', 
        ]);

        $code = strtoupper(trim($request->code));

        $giftCard = DB::table('lce_promo_codes')
            ->where('promocode', $code)
            ->where('promocode_for', 'giftcard')
            ->where('publish', 1)
            ->first();

        if (!$giftCard) {
            return response()->json(['valid' => false, 'message' => 'Invalid gift card code'], 400);
        }

        
        $alreadyRedeemed = DB::table('lce_user_promocode')
            ->where('promocode_id', $giftCard->id)
            ->exists();

        if ($alreadyRedeemed) {
            return response()->json(['valid' => false, 'message' => 'This gift card has already been redeemed'], 400);
        }

        
        if ($giftCard->promo_expiry_date && $giftCard->promo_expiry_date < DateHelper::today()) {
            return response()->json(['valid' => false, 'message' => 'This gift card has expired'], 400);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Gift card is valid',
            'balance' => (float) $giftCard->promocode_value,
            'expires_at' => $giftCard->promo_expiry_date
        ]);
    }
}
