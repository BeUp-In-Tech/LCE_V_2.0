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
        if (Schema::hasTable('lce_user_subscriptions')) {
            Schema::table('lce_user_subscriptions', function (Blueprint $table) {
                if (!Schema::hasColumn('lce_user_subscriptions', 'next_cron_date')) {
                    $table->date('next_cron_date')->nullable()->after('next_renewal_date');
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'bags_plan_period')) {
                    $table->integer('bags_plan_period')->default(0);
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'bags_plan_total')) {
                    $table->integer('bags_plan_total')->default(0);
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'bags_plan_balance')) {
                    $table->integer('bags_plan_balance')->default(0);
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'bags_plan_used')) {
                    $table->integer('bags_plan_used')->default(0);
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'bags_available')) {
                    $table->integer('bags_available')->default(0);
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'credit_lbs')) {
                    $table->decimal('credit_lbs', 8, 2)->default(0);
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'created_via')) {
                    $table->string('created_via', 50)->default('web');
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'payment_last')) {
                    $table->decimal('payment_last', 10, 2)->default(0);
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'payment_discount')) {
                    $table->decimal('payment_discount', 10, 2)->default(0);
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'payment_balance')) {
                    $table->decimal('payment_balance', 10, 2)->default(0);
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'payment_last_transactionId')) {
                    $table->string('payment_last_transactionId', 100)->nullable();
                }
                if (!Schema::hasColumn('lce_user_subscriptions', 'notes')) {
                    $table->text('notes')->nullable();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('lce_user_subscriptions')) {
            Schema::table('lce_user_subscriptions', function (Blueprint $table) {
                $columns = [
                    'next_cron_date', 'bags_plan_period', 'bags_plan_total', 'bags_plan_balance',
                    'bags_plan_used', 'bags_available', 'credit_lbs', 'created_via',
                    'payment_last', 'payment_discount', 'payment_balance',
                    'payment_last_transactionId', 'notes'
                ];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('lce_user_subscriptions', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
