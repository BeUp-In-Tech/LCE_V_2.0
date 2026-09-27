<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\PreferenceController;
use App\Http\Controllers\Api\CommunicationController;
use App\Http\Controllers\Api\PickupController;
use App\Http\Controllers\Api\PickupZoneController;
use App\Http\Controllers\Api\SubscriptionPlanController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\PromoCodeController;
use App\Http\Controllers\Api\CreditController;
use App\Http\Controllers\Api\GiftCardController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\VacationHoldController;
use App\Http\Controllers\Api\PriceController;
use App\Http\Controllers\Api\ProcessingSiteController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\BillingController;



Route::get('server-time', function () {
    return response()->json([
        'iso' => now()->toIso8601String(),
        'formatted' => now()->format('Y-m-d h:i:s A'),
        'timezone' => config('app.timezone'),
        'timestamp' => now()->timestamp,
    ]);
});


Route::get('health', function () {
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $dbStatus = 'connected';
    } catch (\Exception $e) {
        $dbStatus = 'error';
    }

    return response()->json([
        'status' => 'ok',
        'database' => $dbStatus,
        'timestamp' => now()->toIso8601String(),
        'version' => 'v1',
    ]);
});


Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:3,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:3,1');
    Route::post('google', [AuthController::class, 'google'])->middleware('throttle:5,1');
    Route::post('apple', [AuthController::class, 'apple'])->middleware('throttle:5,1');
});


Route::get('subscription-plans', [SubscriptionPlanController::class, 'index']);
Route::get('subscription-plans/{id}', [SubscriptionPlanController::class, 'show']);
Route::get('pickup-zones', [PickupZoneController::class, 'index']);
Route::post('pickup-zones/check', [PickupZoneController::class, 'check']);


Route::prefix('webhooks')->group(function () {
    Route::post('authorize-net', [\App\Http\Controllers\Api\WebhookController::class, 'handleAuthorizeNet']);
});


Route::middleware('auth:api')->group(function () {

    
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me', [AuthController::class, 'me']);
    });

    
    Route::prefix('users')->group(function () {
        Route::get('profile', [UserController::class, 'show']);
        Route::match(['put', 'patch'], 'profile', [UserController::class, 'update']);
        Route::match(['put', 'patch'], 'address', [UserController::class, 'updateAddress']);
        Route::match(['put', 'patch'], 'password', [UserController::class, 'updatePassword']);
    });

    
    Route::get('preferences', [PreferenceController::class, 'index']);
    Route::match(['put', 'patch'], 'preferences', [PreferenceController::class, 'update']);
    Route::get('communication-settings', [CommunicationController::class, 'index']);
    Route::match(['put', 'patch'], 'communication-settings', [CommunicationController::class, 'update']);

    
    Route::apiResource('pickups', PickupController::class);
    Route::post('pickups/{id}/complete-weighing', [PickupController::class, 'completeWeighing']);
    Route::post('pickups/{id}/complete-item-entry', [PickupController::class, 'completeItemEntry']);
    Route::get('services', [PickupController::class, 'services']);

    
    Route::get('recurring-schedule', [\App\Http\Controllers\Api\RecurringScheduleController::class, 'show']);
    Route::post('recurring-schedule', [\App\Http\Controllers\Api\RecurringScheduleController::class, 'update']);

    
    Route::delete('subscriptions/pending', [SubscriptionController::class, 'cancelPending']);
    Route::apiResource('subscriptions', SubscriptionController::class);
    Route::match(['put', 'patch'], 'subscriptions/{id}/cancel', [SubscriptionController::class, 'cancel']);
    Route::match(['put', 'patch'], 'subscriptions/{id}/revert-cancel', [SubscriptionController::class, 'revertCancel']);

    
    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::get('invoices/export', [InvoiceController::class, 'export']);
    Route::get('invoices/{id}', [InvoiceController::class, 'show']);
    Route::get('transactions', [TransactionController::class, 'index']);

    
    Route::get('payment-methods', [PaymentMethodController::class, 'index']);
    Route::post('payment-methods', [PaymentMethodController::class, 'store']);
    Route::delete('payment-methods/{id}', [PaymentMethodController::class, 'destroy']);
    Route::match(['put', 'patch'], 'payment-methods/{id}/default', [PaymentMethodController::class, 'setDefault']);

    
    Route::middleware(['idempotency', 'throttle:billing'])->group(function () {
        Route::post('payments/charge', [PaymentController::class, 'charge']);
    });

    
    Route::prefix('billing')->middleware(['idempotency', 'throttle:billing'])->group(function () {
        Route::post('charge-pickup', [BillingController::class, 'chargePickup']);
        Route::post('subscribe', [BillingController::class, 'subscribe']);
        Route::post('renew', [BillingController::class, 'renew']);
        Route::post('cancel', [BillingController::class, 'cancel']);
        Route::post('process-overage', [BillingController::class, 'processOverage']);
        Route::get('credits', [BillingController::class, 'getCredits']);
        Route::get('pricing', [BillingController::class, 'getPricing']);
    });

    
    Route::get('promo-codes', [PromoCodeController::class, 'index']);
    Route::middleware(['promo-abuse', 'throttle:promo'])->group(function () {
        Route::post('promo-codes/validate', [PromoCodeController::class, 'validateCode']);
        Route::post('promo-codes/apply', [PromoCodeController::class, 'apply']);
    });
    Route::get('credits', [CreditController::class, 'index']);

    
    Route::post('gift-cards/purchase', [GiftCardController::class, 'purchase'])->middleware(['idempotency', 'throttle:billing']);
    Route::middleware(['promo-abuse', 'throttle:promo'])->group(function () {
        Route::post('gift-cards/redeem', [GiftCardController::class, 'redeem']);
        Route::post('gift-cards/check-balance', [GiftCardController::class, 'checkBalance']);
    });

    
    Route::post('groups', [GroupController::class, 'store']);
    Route::get('groups/me', [GroupController::class, 'me']);
    Route::post('groups/join', [GroupController::class, 'join']);
    Route::get('groups/{id}/members', [GroupController::class, 'members']);
    Route::match(['put', 'patch'], 'groups/{id}', [GroupController::class, 'update']);

    
    Route::get('vacation-holds', [VacationHoldController::class, 'index']);
    Route::post('vacation-holds', [VacationHoldController::class, 'store']);
    Route::delete('vacation-holds/{id}', [VacationHoldController::class, 'destroy']);

    
    Route::get('prices', [PriceController::class, 'index']);
    Route::get('prices/items', [PriceController::class, 'items']);
    Route::get('processing-sites', [ProcessingSiteController::class, 'index']);
});


/*
|--------------------------------------------------------------------------
| Admin Management Routes (Standalone Subdomain / External Admin Access)
|--------------------------------------------------------------------------
*/
use App\Http\Controllers\Api\AdminController;
use App\Http\Middleware\AdminAuthMiddleware;

Route::prefix('admin')->group(function () {
    Route::post('login', [AdminController::class, 'login']);

    Route::middleware([AdminAuthMiddleware::class])->group(function () {
        Route::get('stats', [AdminController::class, 'getStats']);
        Route::get('tables', [AdminController::class, 'getTables']);
        Route::get('tables/{tableName}', [AdminController::class, 'getTableData']);
        Route::post('tables/{tableName}', [AdminController::class, 'createRecord']);
        Route::put('tables/{tableName}/{id}', [AdminController::class, 'updateRecord']);
        Route::delete('tables/{tableName}/{id}', [AdminController::class, 'deleteRecord']);
        Route::post('pickups/{id}/status', [AdminController::class, 'updatePickupStatus']);
    });
});

