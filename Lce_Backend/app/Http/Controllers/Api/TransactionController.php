<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
        public function index(Request $request)
    {
        $user = $this->user();

        $query = DB::table('lce_user_transactions')
            ->where('user_id', $user->user_id)
            ->orderBy('cdate', 'desc');

        
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        
        if ($request->has('from_date')) {
            $query->where('cdate', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->where('cdate', '<=', $request->to_date . ' 23:59:59');
        }

        
        $perPage = $request->get('per_page', 999);
        $transactions = $query->paginate($perPage);

        return response()->json([
            'transactions' => collect($transactions->items())->map(fn($txn) => [
                'id' => $txn->id,
                'type' => $txn->type,
                'name' => html_entity_decode($txn->name ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'amount' => (float) $txn->amount,
                'description' => html_entity_decode($txn->description ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'invoice_id' => $txn->invoice_id,
                'transaction_id' => $txn->transactionId,
                'note' => $txn->note,
                'created_at' => $txn->cdate,
            ]),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }
}
