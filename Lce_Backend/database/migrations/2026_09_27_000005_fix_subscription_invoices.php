<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('lce_user_invoice')) {
            return;
        }

        // 1. Identify historical subscription invoices via line items (type = 'SUB' or sku LIKE 'SUB_%')
        if (Schema::hasTable('lce_user_invoice_line')) {
            $subInvoiceIds = DB::table('lce_user_invoice_line')
                ->where('type', 'SUB')
                ->orWhere('sku', 'LIKE', 'SUB_%')
                ->distinct()
                ->pluck('invoice_id');

            if ($subInvoiceIds->isNotEmpty()) {
                DB::table('lce_user_invoice')
                    ->whereIn('id', $subInvoiceIds)
                    ->update([
                        'order_type' => 'subscription',
                        'is_subscription_invoice' => 1,
                    ]);
            }
        }

        // 2. Mark any invoice with order_type = 'subscription' as is_subscription_invoice = 1
        DB::table('lce_user_invoice')
            ->where('order_type', 'subscription')
            ->update(['is_subscription_invoice' => 1]);

        // 3. Link subscription_id and reconcile user_id for all subscription invoices
        $subInvoices = DB::table('lce_user_invoice')
            ->where('order_type', 'subscription')
            ->get();

        foreach ($subInvoices as $inv) {
            // Find matching user in lce_user_info
            $user = DB::table('lce_user_info')
                ->where('id', $inv->user_id)
                ->orWhere('user_id', $inv->user_id)
                ->first(['id', 'user_id']);

            $userIds = $user ? array_unique(array_filter([(int) $user->id, (int) $user->user_id])) : [(int) $inv->user_id];

            // Find matching subscription in lce_user_subscriptions
            $subscription = DB::table('lce_user_subscriptions')
                ->whereIn('user_id', $userIds)
                ->orderBy('id', 'desc')
                ->first();

            $updateData = ['is_subscription_invoice' => 1];

            if ($subscription && empty($inv->subscription_id)) {
                $updateData['subscription_id'] = $subscription->id;
            }

            // Normalize public 6-digit user_id to internal primary key id
            if ($user && (int) $inv->user_id === (int) $user->user_id && (int) $user->id !== (int) $user->user_id) {
                $updateData['user_id'] = (int) $user->id;
            }

            DB::table('lce_user_invoice')
                ->where('id', $inv->id)
                ->update($updateData);

            // Also normalize subscription record user_id if needed
            if ($subscription && $user && (int) $subscription->user_id === (int) $user->user_id && (int) $user->id !== (int) $user->user_id) {
                DB::table('lce_user_subscriptions')
                    ->where('id', $subscription->id)
                    ->update(['user_id' => (int) $user->id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe no-op reversal
    }
};
