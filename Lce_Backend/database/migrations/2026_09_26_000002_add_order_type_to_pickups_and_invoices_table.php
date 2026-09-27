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
        if (Schema::hasTable('lce_user_pickup') && !Schema::hasColumn('lce_user_pickup', 'order_type')) {
            Schema::table('lce_user_pickup', function (Blueprint $table) {
                $table->string('order_type', 50)->default('PPO')->after('status');
            });
        }

        if (Schema::hasTable('lce_user_invoice') && !Schema::hasColumn('lce_user_invoice', 'order_type')) {
            Schema::table('lce_user_invoice', function (Blueprint $table) {
                $table->string('order_type', 50)->default('PPO')->after('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('lce_user_pickup') && Schema::hasColumn('lce_user_pickup', 'order_type')) {
            Schema::table('lce_user_pickup', function (Blueprint $table) {
                $table->dropColumn('order_type');
            });
        }

        if (Schema::hasTable('lce_user_invoice') && Schema::hasColumn('lce_user_invoice', 'order_type')) {
            Schema::table('lce_user_invoice', function (Blueprint $table) {
                $table->dropColumn('order_type');
            });
        }
    }
};
