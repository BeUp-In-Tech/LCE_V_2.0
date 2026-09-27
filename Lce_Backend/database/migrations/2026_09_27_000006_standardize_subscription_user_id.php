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
        if (!Schema::hasTable('lce_user_subscriptions') || !Schema::hasTable('lce_user_info')) {
            return;
        }

        // Standardize all subscription user_id references to use lce_user_info.user_id instead of lce_user_info.id
        $subscriptions = DB::table('lce_user_subscriptions')->get();

        foreach ($subscriptions as $sub) {
            $user = DB::table('lce_user_info')->where('id', $sub->user_id)->first();
            if ($user && $user->user_id && $user->user_id != $sub->user_id) {
                DB::table('lce_user_subscriptions')
                    ->where('id', $sub->id)
                    ->update(['user_id' => $user->user_id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Irreversible data standardization
    }
};
