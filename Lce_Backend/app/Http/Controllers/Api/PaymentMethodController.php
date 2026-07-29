<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthorizeNetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Http\Requests\Payment\StorePaymentMethodRequest;

class PaymentMethodController extends Controller
{
    protected AuthorizeNetService $authorizeNet;

    public function __construct(AuthorizeNetService $authorizeNet)
    {
        $this->authorizeNet = $authorizeNet;
    }

        public function index()
    {
        $user = $this->user();

        $paymentMethods = [];

        
        if ($user->customerPaymentProfileId) {
            $paymentMethods[] = [
                'id' => $user->customerPaymentProfileId,
                'type' => $user->payment_type ?? 'card',
                'card_last_four' => $user->payment_cc_number ? substr($user->payment_cc_number, -4) : null,
                'card_expiry' => $user->payment_cc_edate_month && $user->payment_cc_edate_year
                    ? "{$user->payment_cc_edate_month}/{$user->payment_cc_edate_year}"
                    : null,
                'is_default' => true,
                'billing_address' => [
                    'street' => $user->payment_address_1,
                    'city' => $user->payment_city,
                    'state' => $user->payment_state,
                    'zip' => $user->payment_zip,
                ],
            ];
        }

        return response()->json([
            'payment_methods' => $paymentMethods,
            'has_payment_method' => !empty($paymentMethods),
        ]);
    }

        public function store(StorePaymentMethodRequest $request)
    {
        

        $user = $this->user();
        Log::info('Payment Method Store Payload:', $request->all());

        try {
            
            $result = $this->authorizeNet->createPaymentProfile(
                $user,
                $request->dataDescriptor,
                $request->dataValue,
                $request->billing_address ?? []
            );

            if (!$result['success']) {
                return response()->json(['error' => $result['message']], 400);
            }

            
            $user->customerProfileId = $result['customer_profile_id'];
            $user->customerPaymentProfileId = $result['payment_profile_id'];
            $user->payment_type = 'card';
            $user->payment_cc_number = '****' . $request->last_four;
            $user->payment_cc_edate_month = $request->expiry_month;
            $user->payment_cc_edate_year = $request->expiry_year;

            if ($request->has('billing_address')) {
                $user->payment_address_1 = $request->billing_address['street'] ?? $user->payment_address_1;
                $user->payment_city = $request->billing_address['city'] ?? $user->payment_city;
                $user->payment_state = $request->billing_address['state'] ?? $user->payment_state;
                $user->payment_zip = $request->billing_address['zip'] ?? $user->payment_zip;
            }

            $user->mdate = now();
            $user->save();

            Log::info('Payment method added', ['user_id' => $user->user_id]);

            return response()->json([
                'message' => 'Payment method added successfully',
                'payment_method' => [
                    'id' => $user->customerPaymentProfileId,
                    'card_last_four' => $request->last_four,
                    'card_expiry' => "{$request->expiry_month}/{$request->expiry_year}",
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Payment method creation failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to add payment method'], 500);
        }
    }

        public function destroy($id)
    {
        $user = $this->user();

        if ($user->customerPaymentProfileId != $id) {
            return response()->json(['error' => 'Payment method not found'], 404);
        }

        try {
            
            $this->authorizeNet->deletePaymentProfile($user->customerProfileId, $id);

            
            $user->customerPaymentProfileId = null;
            $user->payment_cc_number = null;
            $user->payment_cc_edate_month = null;
            $user->payment_cc_edate_year = null;
            $user->mdate = now();
            $user->save();

            Log::info('Payment method removed', ['user_id' => $user->user_id]);

            return response()->json(['message' => 'Payment method removed successfully']);
        } catch (\Exception $e) {
            Log::error('Payment method deletion failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to remove payment method'], 500);
        }
    }

        public function setDefault($id)
    {
        $user = $this->user();

        if ($user->customerPaymentProfileId != $id) {
            return response()->json(['error' => 'Payment method not found'], 404);
        }

        
        
        Log::info('Payment method set as default', ['user_id' => $user->user_id, 'profile_id' => $id]);

        return response()->json(['message' => 'Payment method set as default']);
    }


}
