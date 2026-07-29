<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TransactionService
{
        public function logCharge(
        int $userId,
        ?int $invoiceId,
        string $transactionId,
        float $amount,
        string $description,
        string $note = ''
    ): int {
        return $this->log($userId, 'charge', $invoiceId, $transactionId, $amount, $description, $note);
    }

        public function logRefund(
        int $userId,
        ?int $invoiceId,
        string $transactionId,
        float $amount,
        string $description,
        string $note = ''
    ): int {
        return $this->log($userId, 'refund', $invoiceId, $transactionId, $amount, $description, $note);
    }

        public function logSubscription(
        int $userId,
        int $invoiceId,
        string $transactionId,
        float $amount,
        string $planName
    ): int {
        return $this->log(
            $userId,
            'subscription',
            $invoiceId,
            $transactionId,
            $amount,
            "Subscription: {$planName}",
            ''
        );
    }

    /**
     * Log a credit usage (internal, no payment gateway).
     */
    public function logCreditUsage(int $userId, int $invoiceId, float $amount): int
    {
        return $this->log(
            $userId,
            'credit',
            $invoiceId,
            time(),
            $amount,
            'Credit applied to invoice',
            ''
        );
    }

    /**
     * Core logging method.
     */
    private function log(
        int $userId,
        string $type,
        ?int $invoiceId,
        string|int $transactionId,
        float $amount,
        string $description,
        string $note
    ): int {
        $id = DB::table('lce_user_transactions')->insertGetId([
            'user_id' => $userId,
            'type' => $type,
            'invoice_id' => $invoiceId,
            'transactionId' => $transactionId,
            'name' => ucfirst($type) . ' Payment',
            'amount' => $amount,
            'description' => substr($description, 0, 200),
            'note' => substr($note, 0, 1000),
            'cdate' => now(),
            'mdate' => now(),
            'cuserid' => $userId,
            'muserid' => $userId,
            'group_admin_id' => 0,
        ]);

        Log::info('Transaction logged', [
            'id' => $id,
            'user_id' => $userId,
            'type' => $type,
            'amount' => $amount,
            'transaction_id' => $transactionId,
        ]);

        return $id;
    }

        public function getHistory(int $userId, int $limit = 50): array
    {
        return DB::table('lce_user_transactions')
            ->where('user_id', $userId)
            ->orderBy('cdate', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'type' => $t->type,
                'invoice_id' => $t->invoice_id,
                'transaction_id' => $t->transactionId,
                'amount' => (float) $t->amount,
                'description' => $t->description,
                'date' => $t->cdate,
            ])
            ->toArray();
    }
}
