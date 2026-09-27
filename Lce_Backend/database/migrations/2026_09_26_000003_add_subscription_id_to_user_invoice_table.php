<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('lce_user_invoice')) {
            Schema::table('lce_user_invoice', function (Blueprint $table) {
                if (!Schema::hasColumn('lce_user_invoice', 'subscription_id')) {
                    $table->unsignedBigInteger('subscription_id')->nullable()->after('order_type');
                }
                if (!Schema::hasColumn('lce_user_invoice', 'is_subscription_invoice')) {
                    $table->tinyInteger('is_subscription_invoice')->default(0)->after('subscription_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('lce_user_invoice')) {
            Schema::table('lce_user_invoice', function (Blueprint $table) {
                if (Schema::hasColumn('lce_user_invoice', 'subscription_id')) {
                    $table->dropColumn('subscription_id');
                }
                if (Schema::hasColumn('lce_user_invoice', 'is_subscription_invoice')) {
                    $table->dropColumn('is_subscription_invoice');
                }
            });
        }
    }
};
