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
        if (Schema::hasTable('lce_user_info')) {
            Schema::table('lce_user_info', function (Blueprint $table) {
                if (!Schema::hasColumn('lce_user_info', 'password')) {
                    $table->string('password', 255)->nullable()->after('email');
                }
                if (!Schema::hasColumn('lce_user_info', 'is_admin')) {
                    $table->tinyInteger('is_admin')->default(0)->after('email');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('lce_user_info')) {
            Schema::table('lce_user_info', function (Blueprint $table) {
                if (Schema::hasColumn('lce_user_info', 'is_admin')) {
                    $table->dropColumn('is_admin');
                }
            });
        }
    }
};
