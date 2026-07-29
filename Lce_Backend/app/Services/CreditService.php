<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CreditService
{
        public function getAvailableBalance(int $userId): float
    {
        return (float) DB::table('lce_user_credits')
            ->where('user_id', $userId)
            ->where('used', 0)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->sum('balance');
    }

        public function addCredit(
        int $userId,
        float $amount,
        string $type,
        string $description,
        ?\DateTime $expiresAt = null
    ): int {
        $id = DB::table('lce_user_credits')->insertGetId([
            'user_id' => $userId,
            'type' => $type,
            'description' => $description,
            'amount' => $amount,
            'balance' => $amount,
            'expires_at' => $expiresAt,
            'used' => 0,
            'cdate' => now(),
            'mdate' => now(),
        ]);

        Log::info('Credit added', [
            'user_id' => $userId,
            'amount' => $amount,
            'type' => $type,
        ]);

        return $id;
    }

        public function addWelcomeCredit(int $userId, float $amount = 20.00): int
    {
        return $this->addCredit(
            $userId,
            $amount,
            'welcome',
            'New user welcome credit',
            now()->addMonths(6) 
        );
    }

        public function deductCredits(int $userId, float $amount, string $reason): float
    {
        $result = $this->applyCreditsToOrder($userId, $amount, $reason);
        return $result['credits_used'];
    }

        public function applyCreditsToOrder(int $userId, float $orderTotal, string $reason = 'Order payment'): array
    {
        $remaining = $orderTotal;
        $totalDeducted = 0;
        $creditDetails = [];

        $credits = DB::table('lce_user_credits')
            ->where('user_id', $userId)
            ->where('used', 0)
            ->where('balance', '>', 0)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->orderByRaw('expires_at IS NULL, expires_at ASC') 
            ->orderBy('cdate', 'asc') 
            ->get();

        foreach ($credits as $credit) {
            if ($remaining <= 0)
                break;

            $toDeduct = min($remaining, $credit->balance);
            $newBalance = $credit->balance - $toDeduct;

            DB::table('lce_user_credits')
                ->where('id', $credit->id)
                ->update([
                    'balance' => $newBalance,
                    'used' => $newBalance <= 0 ? 1 : 0,
                    'mdate' => now(),
                ]);

            $remaining -= $toDeduct;
            $totalDeducted += $toDeduct;

            $creditDetails[] = [
                'credit_id' => $credit->id,
                'type' => $credit->type,
                'description' => $credit->description,
                'amount_deducted' => round($toDeduct, 2),
                'previous_balance' => round((float) $credit->balance, 2),
                'new_balance' => round($newBalance, 2),
            ];
        }

        Log::info('Credits applied to order', [
            'user_id' => $userId,
            'order_total' => $orderTotal,
            'credits_used' => $totalDeducted,
            'amount_to_charge' => max($remaining, 0),
            'reason' => $reason,
        ]);

        return [
            'order_total' => round($orderTotal, 2),
            'credits_used' => round($totalDeducted, 2),
            'amount_to_charge' => round(max($remaining, 0), 2),
            'credit_details' => $creditDetails,
        ];
    }

        public function addRefundCredit(int $userId, float $amount, string $reason): int
    {
        return $this->addCredit($userId, $amount, 'refund', $reason);
    }

        public function getCreditHistory(int $userId, int $limit = 20): array
    {
        return DB::table('lce_user_credits')
            ->where('user_id', $userId)
            ->orderBy('cdate', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'type' => $c->type,
                'description' => $c->description,
                'amount' => (float) $c->amount,
                'balance' => (float) $c->balance,
                'used' => (bool) $c->used,
                'expires_at' => $c->expires_at,
                'created_at' => $c->cdate,
            ])
            ->toArray();
    }
}
