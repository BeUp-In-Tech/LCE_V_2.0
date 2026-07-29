<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CreditController extends Controller
{
        public function index()
    {
        $user = $this->user();

        $credits = DB::table('lce_user_credits')
            ->where('user_id', $user->user_id)
            ->where('used', 0)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->get();

        $totalBalance = $credits->sum('balance');

        return response()->json([
            'total_balance' => round((float) $totalBalance, 2),
            'credits' => $credits->map(fn($c) => [
                'id' => $c->id,
                'type' => $c->type,
                'description' => $c->description,
                'amount' => (float) $c->amount,
                'balance' => (float) $c->balance,
                'expires_at' => $c->expires_at,
                'created_at' => $c->cdate,
            ]),
        ]);
    }
}
