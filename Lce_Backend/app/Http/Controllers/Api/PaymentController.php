<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthorizeNetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    protected AuthorizeNetService $authorizeNet;

    public function __construct(AuthorizeNetService $authorizeNet)
    {
        $this->authorizeNet = $authorizeNet;
    }

        public function charge(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01|max:10000',
            'description' => 'nullable|string|max:255',
        ]);

        $user = $this->user();

        
        if (!$user->customerProfileId || !$user->customerPaymentProfileId) {
            return response()->json([
                'error' => 'No payment method on file. Please add a card first.',
                'code' => 'NO_PAYMENT_METHOD',
            ], 400);
        }

        $amount = (float) $request->amount;
        $description = $request->description ?? 'Pay-As-You-Go Payment';

        try {
            $result = $this->authorizeNet->chargeCustomer(
                $user->customerProfileId,
                $user->customerPaymentProfileId,
                $amount,
                $description,
                $user->email
            );

            if ($result['success']) {
                
                $dbTransactionId = $this->saveTransaction(
                    $user->user_id,
                    'charge',
                    $result['transaction_id'],
                    $amount,
                    $description,
                    'Auth Code: ' . $result['auth_code']
                );

                Log::info('Payment successful', [
                    'user_id' => $user->user_id,
                    'amount' => $amount,
                    'transaction_id' => $result['transaction_id'],
                    'db_id' => $dbTransactionId,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Payment successful',
                    'transaction' => [
                        'id' => $result['transaction_id'],
                        'db_id' => $dbTransactionId,
                        'auth_code' => $result['auth_code'],
                        'amount' => $amount,
                        'description' => $description,
                        'timestamp' => now()->toIso8601String(),
                    ],
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => $result['message'] ?? 'Payment failed',
                'code' => 'PAYMENT_FAILED',
            ], 400);
        } catch (\Exception $e) {
            Log::error('Payment exception', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Payment processing error',
                'code' => 'PAYMENT_ERROR',
            ], 500);
        }
    }


        private function saveTransaction(
        int $userId,
        string $type,
        string $transactionId,
        float $amount,
        string $description,
        string $note = ''
    ): int {
        return DB::table('lce_user_transactions')->insertGetId([
            'user_id' => $userId,
            'type' => $type,
            'transactionId' => $transactionId,
            'name' => 'Payment',
            'amount' => $amount,
            'description' => substr($description, 0, 200),
            'note' => substr($note, 0, 1000),
            'cdate' => now(),
            'mdate' => now(),
            'cuserid' => $userId,
            'muserid' => $userId,
            'group_admin_id' => 0,
        ]);
    }
}
