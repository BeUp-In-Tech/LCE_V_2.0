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
    }
}
