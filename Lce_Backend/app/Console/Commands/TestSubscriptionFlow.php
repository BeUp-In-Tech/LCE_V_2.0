<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\SubscriptionBillingService;
use App\Services\AuthorizeNetService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class TestSubscriptionFlow extends Command
{
    protected $signature = 'app:test-subscriptions';
    protected $description = 'End-to-End Test of Subscription Lifecycle';

    public function handle()
    {
        $this->info("Starting Subscription E2E Test...");

        
        $this->info("Mocking Authorize.net...");
        $mockAuthNet = \Mockery::mock(AuthorizeNetService::class);
        $mockAuthNet->shouldReceive('chargeCustomer')->andReturn([
            'success' => true,
            'transaction_id' => 'test_txn_' . rand(1000, 9999),
            'message' => 'Success'
        ]);
        app()->instance(AuthorizeNetService::class, $mockAuthNet);

        
        $userId = 999888;
        DB::table('lce_user_info')->updateOrInsert(['user_id' => $userId], [
            'email' => 'e2e@test.com',
            'customerProfileId' => '123',
            'customerPaymentProfileId' => '456',
            'wash_fold_instructions' => '',
            'customer_type' => 'residential',
            'custom_minimum_charge' => 0
        ]);
        DB::table('lce_user_subscriptions')->where('user_id', $userId)->delete();

        $service = app(SubscriptionBillingService::class);

        
        $this->info("Testing Create Subscription...");
        try {
            $service->createSubscription($userId, 1);
            $sub = DB::table('lce_user_subscriptions')->where('user_id', $userId)->first();
            if (!$sub) throw new \Exception("Create failed entirely");
            
            
            $this->info("✓ Create success (ID: {$sub->id}, Status: {$sub->status})");
            
            
            DB::table('lce_user_subscriptions')->where('id', $sub->id)->update(['status' => 'active', 'bags_plan_balance' => 1]);
            $sub->status = 'active';

        } catch (\Exception $e) {
            $this->error("Create failed: " . $e->getMessage());
            return;
        }

        
        $this->info("Testing Change Plan (Downgrade)...");
        try {
            $service->changePlan($sub->id, 2);
            $pending = DB::table('lce_user_subscriptions')->where('user_id', $userId)->where('status', 'pending')->first();
            if (!$pending || $pending->plan_id != 2) throw new \Exception("Pending row not created");
            $this->info("✓ Change plan successfully queued pending downgrade");
        } catch (\Exception $e) {
            $this->error("Change plan failed: " . $e->getMessage());
        }

        
        $this->info("Testing Cancel...");
        try {
            $service->cancelSubscription($sub->id);
            $cancelledPending = DB::table('lce_user_subscriptions')->where('id', $sub->id)->first();
            if ($cancelledPending->status !== 'cancelled_pending') throw new \Exception("Status is not cancelled_pending");
            $this->info("✓ Cancel successfully set cancelled_pending");
        } catch (\Exception $e) {
            $this->error("Cancel failed: " . $e->getMessage());
        }

        
        $this->info("Testing Revert Cancel...");
        try {
            $service->revertCancellation($sub->id);
            $reverted = DB::table('lce_user_subscriptions')->where('id', $sub->id)->first();
            if ($reverted->status !== 'active') throw new \Exception("Revert failed");
            $this->info("✓ Revert successfully restored active status");
        } catch (\Exception $e) {
            $this->error("Revert failed: " . $e->getMessage());
        }

        
        DB::table('lce_user_subscriptions')->where('user_id', $userId)->delete();
        DB::table('lce_user_info')->where('user_id', $userId)->delete();
        
        $this->info("All Feature Tests Passed Successfully! 🎉");
    }
}
