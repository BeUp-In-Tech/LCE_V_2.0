<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use App\Services\PricingService;
use App\Services\CreditService;
use App\Services\InvoiceService;
use App\Services\TransactionService;
use App\Services\PPOBillingService;
use App\Services\SubscriptionBillingService;
use App\Services\AuthorizeNetService;

class AppServiceProvider extends ServiceProvider
{
        public function register(): void
    {
        
        $this->app->singleton(PricingService::class);

        
        $this->app->singleton(CreditService::class);

        
        $this->app->singleton(AuthorizeNetService::class);

        
        $this->app->singleton(TransactionService::class);

        
        $this->app->singleton(InvoiceService::class, function ($app) {
            return new InvoiceService(
                $app->make(PricingService::class),
                $app->make(CreditService::class),
                $app->make(TransactionService::class)
            );
        });

        
        $this->app->singleton(PPOBillingService::class, function ($app) {
            return new PPOBillingService(
                $app->make(PricingService::class),
                $app->make(InvoiceService::class),
                $app->make(TransactionService::class),
                $app->make(CreditService::class),
                $app->make(AuthorizeNetService::class)
            );
        });

        
        $this->app->singleton(SubscriptionBillingService::class, function ($app) {
            return new SubscriptionBillingService(
                $app->make(PricingService::class),
                $app->make(InvoiceService::class),
                $app->make(TransactionService::class),
                $app->make(PPOBillingService::class),
                $app->make(AuthorizeNetService::class)
            );
        });
    }

        public function boot(): void
    {
        
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        // Auto-ensure is_admin and order_type columns exist
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('lce_user_pickup')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('lce_user_pickup', 'order_type')) {
                    \Illuminate\Support\Facades\Schema::table('lce_user_pickup', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->string('order_type', 50)->default('PPO')->after('status');
                    });
                }
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('lce_user_invoice')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('lce_user_invoice', 'order_type')) {
                    \Illuminate\Support\Facades\Schema::table('lce_user_invoice', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->string('order_type', 50)->default('PPO')->after('status');
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('lce_user_invoice', 'subscription_id')) {
                    \Illuminate\Support\Facades\Schema::table('lce_user_invoice', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->unsignedBigInteger('subscription_id')->nullable()->after('order_type');
                    });
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('lce_user_invoice', 'is_subscription_invoice')) {
                    \Illuminate\Support\Facades\Schema::table('lce_user_invoice', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->tinyInteger('is_subscription_invoice')->default(0)->after('subscription_id');
                    });
                }
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('lce_user_subscriptions')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('lce_user_subscriptions', 'next_cron_date')) {
                    \Illuminate\Support\Facades\Schema::table('lce_user_subscriptions', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->date('next_cron_date')->nullable()->after('next_renewal_date');
                    });
                }
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('lce_user_info')) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('lce_user_info', 'is_admin')) {
                    \Illuminate\Support\Facades\Schema::table('lce_user_info', function (\Illuminate\Database\Schema\Blueprint $table) {
                        $table->tinyInteger('is_admin')->default(0);
                    });
                }

                $hasAdmin = \Illuminate\Support\Facades\DB::table('lce_user_info')
                    ->where('is_admin', 1)
                    ->exists();

                if (!$hasAdmin) {
                    $insertData = [
                        'email' => 'admin@laundrycareexpress.com',
                        'password' => \Illuminate\Support\Facades\Hash::make('Admin12345!'),
                        'first_name' => 'Admin',
                        'last_name' => 'User',
                        'is_admin' => 1,
                        'user_md' => substr(md5('admin@laundrycareexpress.com' . time()), 0, 10),
                    ];

                    try {
                        $columns = \Illuminate\Support\Facades\DB::select("SHOW COLUMNS FROM `lce_user_info`");
                        foreach ($columns as $col) {
                            $field = $col->Field;
                            if ($col->Null === 'NO' && $col->Default === null && !isset($insertData[$field]) && $col->Key !== 'PRI') {
                                $type = strtolower($col->Type);
                                if (
                                    str_contains($type, 'int') ||
                                    str_contains($type, 'decimal') ||
                                    str_contains($type, 'float') ||
                                    str_contains($type, 'double') ||
                                    str_contains($type, 'numeric')
                                ) {
                                    $insertData[$field] = 0;
                                } else {
                                    $insertData[$field] = '';
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        $insertData['custom_minimum_charge'] = 0;
                    }


                    \Illuminate\Support\Facades\DB::table('lce_user_info')->insert($insertData);
                }
            }
        } catch (\Exception $e) {
            // Silently handle if DB is not connected yet
        }
    }
}




