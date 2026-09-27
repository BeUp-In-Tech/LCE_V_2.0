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
        if (Schema::hasTable('lce_user_invoice')) {
            // 1. Mark all subscription order_type invoices as is_subscription_invoice = 1
            DB::table('lce_user_invoice')
                ->where('order_type', 'subscription')
                ->update(['is_subscription_invoice' => 1]);

            // 2. Fix missing subscription_id or mismatched user_id on subscription invoices
            $subInvoices = DB::table('lce_user_invoice')
                ->where('order_type', 'subscription')
                ->get();

            foreach ($subInvoices as $inv) {
                // Find matching user by id or user_id
                $user = DB::table('lce_user_info')
                    ->where('id', $inv->user_id)
                    ->orWhere('user_id', $inv->user_id)
                    ->first(['id', 'user_id']);

                $userIds = $user ? array_unique(array_filter([(int) $user->id, (int) $user->user_id])) : [(int) $inv->user_id];

                // Find active or newest subscription for this user
                $subscription = DB::table('lce_user_subscriptions')
                    ->whereIn('user_id', $userIds)
                    ->orderBy('id', 'desc')
                    ->first();

                $updateData = ['is_subscription_invoice' => 1];

                if ($subscription && empty($inv->subscription_id)) {
                    $updateData['subscription_id'] = $subscription->id;
                }

                // If invoice stored public 6-digit user_id, normalize to internal user id
                if ($user && (int) $inv->user_id === (int) $user->user_id && (int) $user->id !== (int) $user->user_id) {
                    $updateData['user_id'] = (int) $user->id;
                }

                DB::table('lce_user_invoice')
                    ->where('id', $inv->id)
                    ->update($updateData);

                // Also normalize subscription table user_id if needed
                if ($subscription && $user && (int) $subscription->user_id === (int) $user->user_id && (int) $user->id !== (int) $user->user_id) {
                    DB::table('lce_user_subscriptions')
                        ->where('id', $subscription->id)
                        ->update(['user_id' => (int) $user->id]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No destructive reversal needed
    }
};
