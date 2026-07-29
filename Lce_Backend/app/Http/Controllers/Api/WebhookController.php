<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
        protected $signatureKey;

    public function __construct()
    {
        $this->signatureKey = config('services.authorizenet.signature_key');
    }

        public function handleAuthorizeNet(Request $request)
    {
        Log::info('Authorize.Net webhook received', [
            'headers' => $request->headers->all(),
        ]);

        
        $payload = $request->getContent();
        $signature = $request->header('X-ANET-Signature');

        
        if (!$this->signatureKey) {
            Log::error('Authorize.Net webhook signature key not configured');
            return response()->json(['error' => 'Server configuration error'], 500);
        }

        if (!$signature) {
            Log::warning('Authorize.Net webhook missing signature header');
            return response()->json(['error' => 'Missing signature'], 401);
        }

        if (!$this->verifySignature($payload, $signature)) {
            Log::warning('Authorize.Net webhook signature verification failed');
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        
        $data = json_decode($payload, true);

        if (!$data) {
            Log::error('Authorize.Net webhook: Invalid JSON payload');
            return response()->json(['error' => 'Invalid payload'], 400);
        }

        $eventType = $data['eventType'] ?? null;
        $payload = $data['payload'] ?? [];

        Log::info('Authorize.Net webhook event', [
            'event_type' => $eventType,
            'payload' => $payload,
        ]);

        
        switch ($eventType) {
            case 'net.authorize.payment.authcapture.created':
                return $this->handlePaymentCreated($payload);

            case 'net.authorize.payment.capture.created':
                return $this->handlePaymentCreated($payload);

            case 'net.authorize.payment.refund.created':
                return $this->handleRefundCreated($payload);

            case 'net.authorize.payment.void.created':
                return $this->handleVoidCreated($payload);

            case 'net.authorize.payment.fraud.held':
                return $this->handleFraudHeld($payload);

            case 'net.authorize.payment.fraud.declined':
                return $this->handleFraudDeclined($payload);

            default:
                Log::info('Authorize.Net webhook: Unhandled event type', ['event_type' => $eventType]);
                return response()->json(['message' => 'Event acknowledged']);
        }
    }

        private function handlePaymentCreated(array $payload): \Illuminate\Http\JsonResponse
    {
        $transactionId = $payload['id'] ?? null;
        $customerProfileId = $payload['customerProfileId'] ?? null;
        $amount = (float) ($payload['authAmount'] ?? 0);
        $responseCode = $payload['responseCode'] ?? null;

        
        if ($responseCode != 1) {
            Log::info('Authorize.Net webhook: Non-successful transaction', [
                'transaction_id' => $transactionId,
                'response_code' => $responseCode,
            ]);
            return response()->json(['message' => 'Non-successful transaction acknowledged']);
        }

        
        $user = DB::table('lce_user_info')
            ->where('customerProfileId', $customerProfileId)
            ->first();

        if (!$user) {
            Log::warning('Authorize.Net webhook: User not found for customerProfileId', [
                'customer_profile_id' => $customerProfileId,
            ]);
            return response()->json(['message' => 'User not found, event acknowledged']);
        }

        
        $existingPayment = DB::table('lce_payment')
            ->where('note', 'LIKE', "%Trans: {$transactionId}%")
            ->first();

        if ($existingPayment) {
            Log::info('Authorize.Net webhook: Payment already recorded', [
                'transaction_id' => $transactionId,
            ]);
            return response()->json(['message' => 'Payment already recorded']);
        }

        
        $paymentId = DB::table('lce_payment')->insertGetId([
            'user_id' => $user->user_id,
            'type' => 'charge',
            'amount' => $amount,
            'note' => "Authorize.Net Payment | Trans: {$transactionId}",
            'deleted' => 'No',
            'cdate' => now(),
            'mdate' => now(),
            'cuser_id' => $user->user_id,
        ]);

        Log::info('Authorize.Net webhook: Payment recorded in lce_payment', [
            'payment_id' => $paymentId,
            'user_id' => $user->user_id,
            'amount' => $amount,
            'transaction_id' => $transactionId,
        ]);

        return response()->json([
            'message' => 'Payment recorded successfully',
            'payment_id' => $paymentId,
        ]);
    }

        private function handleRefundCreated(array $payload): \Illuminate\Http\JsonResponse
    {
        $transactionId = $payload['id'] ?? null;
        $customerProfileId = $payload['customerProfileId'] ?? null;
        $amount = (float) ($payload['authAmount'] ?? 0);

        $user = DB::table('lce_user_info')
            ->where('customerProfileId', $customerProfileId)
            ->first();

        if ($user) {
            DB::table('lce_payment')->insert([
                'user_id' => $user->user_id,
                'type' => 'refund',
                'amount' => -$amount, 
                'note' => "Authorize.Net Refund | Trans: {$transactionId}",
                'deleted' => 'No',
                'cdate' => now(),
                'mdate' => now(),
                'cuser_id' => $user->user_id,
            ]);

            Log::info('Authorize.Net webhook: Refund recorded', [
                'user_id' => $user->user_id,
                'amount' => $amount,
                'transaction_id' => $transactionId,
            ]);
        }

        return response()->json(['message' => 'Refund acknowledged']);
    }

        private function handleVoidCreated(array $payload): \Illuminate\Http\JsonResponse
    {
        $transactionId = $payload['id'] ?? null;

        Log::info('Authorize.Net webhook: Void transaction', [
            'transaction_id' => $transactionId,
        ]);

        
        DB::table('lce_payment')
            ->where('note', 'LIKE', "%Trans: {$transactionId}%")
            ->update([
                'deleted' => 'Yes',
                'mdate' => now(),
            ]);

        return response()->json(['message' => 'Void acknowledged']);
    }

        private function handleFraudHeld(array $payload): \Illuminate\Http\JsonResponse
    {
        Log::warning('Authorize.Net webhook: Fraud HELD', $payload);

        

        return response()->json(['message' => 'Fraud held acknowledged']);
    }

        private function handleFraudDeclined(array $payload): \Illuminate\Http\JsonResponse
    {
        Log::warning('Authorize.Net webhook: Fraud DECLINED', $payload);

        return response()->json(['message' => 'Fraud declined acknowledged']);
    }

        private function verifySignature(string $payload, string $signature): bool
    {
        
        $signature = str_replace('sha512=', '', $signature);

        // Calculate expected signature
        $expectedSignature = strtoupper(hash_hmac('sha512', $payload, $this->signatureKey));

        return hash_equals($expectedSignature, strtoupper($signature));
    }
}
