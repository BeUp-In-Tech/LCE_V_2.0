<?php

namespace App\Console\Commands;

use App\Services\SubscriptionBillingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ProcessSubscriptions extends Command
{
    protected $signature = 'subscriptions:process-nightly
                            {--dry-run : Preview what would be processed without making changes}';

    protected $description = 'Nightly subscription cron: activate pending, finalize cancellations, process renewals';

    public function __construct(
        private SubscriptionBillingService $subscriptionBilling
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $cronDate = Carbon::today();
        $cronNow = Carbon::now();
        $dryRun = $this->option('dry-run');

        $this->info("=== Subscription Nightly Cron ===");
        $this->info("Date: {$cronDate->toDateString()}  Time: {$cronNow->toDateTimeString()}");
        if ($dryRun) {
            $this->warn("DRY RUN MODE — no changes will be made.");
        }
        $this->newLine();

        $stats = [
            'pending_activated' => 0,
            'pending_skipped' => 0,
            'pending_errors' => 0,
            'cancellations_finalized' => 0,
            'cancellation_errors' => 0,
            'renewals_processed' => 0,
            'renewal_errors' => 0,
        ];

        
        
        
        $this->info("--- Step 1: Activate Pending Subscriptions ---");
        $this->processActivations($cronDate, $dryRun, $stats);
        $this->newLine();

        
        
        
        $this->info("--- Step 2: Finalize Scheduled Cancellations ---");
        $this->processCancellations($cronDate, $dryRun, $stats);
        $this->newLine();

        
        
        
        $this->info("--- Step 3: Process Monthly Renewals ---");
        $this->processRenewals($cronDate, $dryRun, $stats);
        $this->newLine();

        
        $this->info("=== Summary ===");
        $this->table(
            ['Category', 'Count'],
            [
                ['Pending Activated', $stats['pending_activated']],
                ['Pending Skipped', $stats['pending_skipped']],
                ['Pending Errors', $stats['pending_errors']],
                ['Cancellations Finalized', $stats['cancellations_finalized']],
                ['Cancellation Errors', $stats['cancellation_errors']],
                ['Renewals Processed', $stats['renewals_processed']],
                ['Renewal Errors', $stats['renewal_errors']],
            ]
        );

        $totalErrors = $stats['pending_errors'] + $stats['cancellation_errors'] + $stats['renewal_errors'];
        return $totalErrors > 0 ? Command::FAILURE : Command::SUCCESS;
    }

        private function processActivations(Carbon $cronDate, bool $dryRun, array &$stats): void
    {
        $pendingRows = DB::table('lce_user_subscriptions')
            ->where('status', 'pending')
            ->where('start_date', '<=', $cronDate->toDateString())
            ->orderBy('start_date')
            ->orderBy('id')
            ->get();

        $this->info("Found {$pendingRows->count()} pending subscription(s) due.");

        foreach ($pendingRows as $pending) {
            try {
                
                $result = DB::transaction(function () use ($pending, $dryRun) {
                    
                    $lockedPending = DB::table('lce_user_subscriptions')
                        ->where('id', $pending->id)
                        ->lockForUpdate()
                        ->first();

                    
                    if (!$lockedPending || $lockedPending->status !== 'pending') {
                        return ['skipped' => true, 'reason' => 'No longer pending'];
                    }

                    
                    $activeRow = DB::table('lce_user_subscriptions')
                        ->where('user_id', $lockedPending->user_id)
                        ->whereIn('status', ['active', 'cancelled_pending'])
                        ->lockForUpdate()
                        ->first();

                    
                    
                    
                    

                    
                    $activeCount = DB::table('lce_user_subscriptions')
                        ->where('user_id', $lockedPending->user_id)
                        ->where('status', 'active')
                        ->count();

                    $pendingCount = DB::table('lce_user_subscriptions')
                        ->where('user_id', $lockedPending->user_id)
                        ->where('status', 'pending')
                        ->count();

                    if ($activeCount > 1) {
                        Log::error('Data integrity: multiple active rows', [
                            'user_id' => $lockedPending->user_id,
                            'count' => $activeCount,
                        ]);
                        return ['skipped' => true, 'reason' => "Multiple active rows ({$activeCount})"];
                    }

                    if ($pendingCount > 1) {
                        
                        $newestPendingId = DB::table('lce_user_subscriptions')
                            ->where('user_id', $lockedPending->user_id)
                            ->where('status', 'pending')
                            ->orderByDesc('id')
                            ->value('id');

                        if ($lockedPending->id != $newestPendingId) {
                            
                            DB::table('lce_user_subscriptions')
                                ->where('id', $lockedPending->id)
                                ->update([
                                    'status' => 'cancelled',
                                    'mdate' => now(),
                                    'notes' => 'Auto-cleaned by cron: duplicate pending row, newer row #' . $newestPendingId . ' takes priority.',
                                ]);
                            Log::warning('Duplicate pending row cleaned up', [
                                'cleaned_id' => $lockedPending->id,
                                'kept_id' => $newestPendingId,
                                'user_id' => $lockedPending->user_id,
                            ]);
                            return ['skipped' => true, 'reason' => "Duplicate pending — cleaned up, newest #{$newestPendingId} kept"];
                        }
                    }

                    if ($dryRun) {
                        return ['skipped' => false, 'dry_run' => true];
                    }

                    
                    return $this->subscriptionBilling->activatePendingSubscription($lockedPending, $activeRow);
                });

                if (isset($result['skipped']) && $result['skipped']) {
                    $this->line("  [SKIP] Pending #{$pending->id} (User {$pending->user_id}): {$result['reason']}");
                    $stats['pending_skipped']++;
                } elseif (isset($result['dry_run'])) {
                    $this->info("  [DRY-RUN] Would activate Pending #{$pending->id} (User {$pending->user_id})");
                    $stats['pending_activated']++;
                } else {
                    $this->info("  [OK] Activated #{$pending->id} (User {$pending->user_id}) — {$result['type']}, charged \${$result['amount_charged']}");
                    $stats['pending_activated']++;
                }
            } catch (\Exception $e) {
                $this->error("  [ERROR] Pending #{$pending->id} (User {$pending->user_id}): {$e->getMessage()}");
                Log::error('Cron: pending activation failed', [
                    'pending_id' => $pending->id,
                    'user_id' => $pending->user_id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                $stats['pending_errors']++;
            }
        }
    }

        private function processCancellations(Carbon $cronDate, bool $dryRun, array &$stats): void
    {
        $cancelledPending = DB::table('lce_user_subscriptions')
            ->where('status', 'cancelled_pending')
            ->where('end_date', '<=', $cronDate->toDateString())
            ->orderBy('id')
            ->get();

        $this->info("Found {$cancelledPending->count()} cancellation(s) due.");

        foreach ($cancelledPending as $row) {
            try {
                $result = DB::transaction(function () use ($row, $dryRun) {
                    
                    $locked = DB::table('lce_user_subscriptions')
                        ->where('id', $row->id)
                        ->lockForUpdate()
                        ->first();

                    if (!$locked || $locked->status !== 'cancelled_pending') {
                        return ['skipped' => true, 'reason' => 'No longer cancelled_pending'];
                    }

                    if (Carbon::parse($locked->end_date)->gt(Carbon::today())) {
                        return ['skipped' => true, 'reason' => "end_date {$locked->end_date} hasn't passed"];
                    }

                    if ($dryRun) {
                        return ['skipped' => false, 'dry_run' => true];
                    }

                    return $this->subscriptionBilling->processScheduledCancellation($locked);
                });

                if (isset($result['skipped']) && $result['skipped']) {
                    $this->line("  [SKIP] Subscription #{$row->id} (User {$row->user_id}): {$result['reason']}");
                } elseif (isset($result['dry_run'])) {
                    $this->info("  [DRY-RUN] Would finalize cancellation #{$row->id} (User {$row->user_id})");
                    $stats['cancellations_finalized']++;
                } else {
                    $refundInfo = $result['refund_amount'] > 0
                        ? ", refund \${$result['refund_amount']}"
                        : ", no refund";
                    $this->info("  [OK] Cancelled #{$row->id} (User {$row->user_id}){$refundInfo}");
                    $stats['cancellations_finalized']++;
                }
            } catch (\Exception $e) {
                $this->error("  [ERROR] Cancellation #{$row->id} (User {$row->user_id}): {$e->getMessage()}");
                Log::error('Cron: cancellation finalization failed', [
                    'subscription_id' => $row->id,
                    'user_id' => $row->user_id,
                    'error' => $e->getMessage(),
                ]);
                $stats['cancellation_errors']++;
            }
        }
    }

        private function processRenewals(Carbon $cronDate, bool $dryRun, array &$stats): void
    {
        $dueRenewals = DB::table('lce_user_subscriptions')
            ->where('status', 'active')
            ->whereNotNull('next_cron_date')
            ->where('next_cron_date', '<=', $cronDate->toDateString())
            ->orderBy('id')
            ->get();

        $this->info("Found {$dueRenewals->count()} renewal(s) due.");

        foreach ($dueRenewals as $sub) {
            try {
                $result = DB::transaction(function () use ($sub, $dryRun) {
                    
                    $locked = DB::table('lce_user_subscriptions')
                        ->where('id', $sub->id)
                        ->lockForUpdate()
                        ->first();

                    if (!$locked || $locked->status !== 'active') {
                        return ['skipped' => true, 'reason' => 'No longer active'];
                    }

                    if (Carbon::parse($locked->next_cron_date)->gt(Carbon::today())) {
                        return ['skipped' => true, 'reason' => "next_cron_date hasn't arrived"];
                    }

                    if ($dryRun) {
                        return ['skipped' => false, 'dry_run' => true];
                    }

                    return $this->subscriptionBilling->processMonthlyRenewal($locked);
                });

                if (isset($result['skipped']) && $result['skipped']) {
                    $this->line("  [SKIP] Subscription #{$sub->id} (User {$sub->user_id}): {$result['reason']}");
                } elseif (isset($result['dry_run'])) {
                    $this->info("  [DRY-RUN] Would process renewal #{$sub->id} (User {$sub->user_id})");
                    $stats['renewals_processed']++;
                } else {
                    $chargeInfo = $result['charged'] > 0 ? ", charged \${$result['charged']}" : ", no charge";
                    $this->info("  [OK] Renewed #{$sub->id} (User {$sub->user_id}), banked {$result['banked_bags']} bags{$chargeInfo}");
                    $stats['renewals_processed']++;
                }
            } catch (\Exception $e) {
                $this->error("  [ERROR] Renewal #{$sub->id} (User {$sub->user_id}): {$e->getMessage()}");
                Log::error('Cron: renewal failed', [
                    'subscription_id' => $sub->id,
                    'user_id' => $sub->user_id,
                    'error' => $e->getMessage(),
                ]);
                $stats['renewal_errors']++;
            }
        }
    }
}
