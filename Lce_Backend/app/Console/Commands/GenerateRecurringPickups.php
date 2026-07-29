<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GenerateRecurringPickups extends Command
{
        protected $signature = 'pickups:generate-recurring 
                            {--date= : Specific date to generate for (YYYY-MM-DD), defaults to today}
                            {--dry-run : Preview what would be generated without actually creating pickups}';

        protected $description = 'Generate pickup entries from recurring schedules (lce_user_rs)';

        private const DAY_COLUMNS = [
        'day_monday' => Carbon::MONDAY,
        'day_tuesday' => Carbon::TUESDAY,
        'day_wednesday' => Carbon::WEDNESDAY,
        'day_thursday' => Carbon::THURSDAY,
        'day_friday' => Carbon::FRIDAY,
        'day_saturday' => Carbon::SATURDAY,
        'day_sunday' => Carbon::SUNDAY,
    ];

        public function handle(): int
    {
        $targetDate = $this->option('date')
            ? Carbon::parse($this->option('date'))
            : Carbon::today();

        $dryRun = $this->option('dry-run');
        $dayOfWeek = $targetDate->dayOfWeek;

        $this->info("Generating recurring pickups for: {$targetDate->toDateString()} ({$targetDate->format('l')})");

        if ($dryRun) {
            $this->warn("DRY RUN MODE - No pickups will be created.");
        }

        
        $dayColumn = array_search($dayOfWeek, self::DAY_COLUMNS);

        if (!$dayColumn) {
            $this->error("Could not determine day column for day of week: {$dayOfWeek}");
            return Command::FAILURE;
        }

        $this->info("Checking column: {$dayColumn}");

        
        
        
        
        $schedules = DB::table('lce_user_rs')
            ->where($dayColumn, 'Y')
            ->whereNotNull('user_id')
            ->get();

        $this->info("Found {$schedules->count()} schedule(s) matching {$dayColumn}='Y'");

        $created = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($schedules as $schedule) {
            try {
                
                if (!empty($schedule->start_date)) {
                    $startDate = Carbon::parse($schedule->start_date);
                    if ($startDate->gt($targetDate)) {
                        $this->line("  [SKIP] User {$schedule->user_id}: Start date {$startDate->toDateString()} is in the future.");
                        $skipped++;
                        continue;
                    }
                }

                
                $existingPickup = DB::table('lce_user_pickup')
                    ->where('user_id', $schedule->user_id)
                    ->where('pickup_date', $targetDate->toDateString())
                    ->whereNotIn('status', ['cancelled']) 
                    ->exists();

                if ($existingPickup) {
                    $this->line("  [SKIP] User {$schedule->user_id}: Pickup already exists for {$targetDate->toDateString()}.");
                    $skipped++;
                    continue;
                }

                
                $dateStr = $targetDate->toDateString();
                
                
                $isHoliday = DB::table('lce_holidays_logs')->where('filter_date', $dateStr)->exists();
                
                if (!$isHoliday) {
                    
                    $userZone = DB::table('lce_user_info')
                        ->join('lce_pickup_zones', 'lce_user_info.zip', '=', 'lce_pickup_zones.zip')
                        ->where('lce_user_info.user_id', $schedule->user_id)
                        ->first(['lce_pickup_zones.area']);
                    
                    $area = $userZone ? $userZone->area : '';

                    $isHoliday = DB::table('lce_pickup_nonworking_days')
                        ->where('date', $dateStr)
                        ->where(function ($q) use ($area) {
                            $q->where('area', $area)
                              ->orWhere('area', '')
                              ->orWhereNull('area');
                        })
                        ->exists();
                }

                if ($isHoliday) {
                    $this->line("  [SKIP] User {$schedule->user_id}: {$dateStr} is a holiday/non-working day.");
                    $skipped++;
                    continue;
                }

                
                $user = DB::table('lce_user_info')->where('id', $schedule->user_id)->first();
                if ($user && $user->hold_date && Carbon::parse($user->hold_date)->gte($targetDate)) {
                    $this->line("  [SKIP] User {$schedule->user_id}: On vacation hold until {$user->hold_date}.");
                    $skipped++;
                    continue;
                }

                
                if ($schedule->delivey_type === 'bi-weekly' || $schedule->delivey_type === 'bi_weekly') {
                    if (empty($schedule->start_date)) {
                        $this->line("  [SKIP] User {$schedule->user_id}: Bi-weekly requires a start_date to calculate intervals.");
                        $skipped++;
                        continue;
                    }

                    $startDate = Carbon::parse($schedule->start_date)->startOfDay();
                    $checkDate = $targetDate->copy()->startOfDay();
                    
                    
                    
                    $diffInWeeks = $startDate->diffInWeeks($checkDate);

                    if ($diffInWeeks % 2 !== 0) {
                        $this->line("  [SKIP] User {$schedule->user_id}: Bi-weekly 'OFF' week (Week {$diffInWeeks} from start).");
                        $skipped++;
                        continue;
                    }
                    
                    $this->line("  [INFO] User {$schedule->user_id}: Bi-weekly 'ON' week (Week {$diffInWeeks} from start).");
                }

                if ($dryRun) {
                    $this->info("  [DRY-RUN] Would create pickup for User {$schedule->user_id}");
                    $created++;
                    continue;
                }

                
                $pickupId = DB::table('lce_user_pickup')->insertGetId([
                    'user_id' => $schedule->user_id,
                    'pickup_type' => 'wf', 
                    'pickup_date' => $targetDate->toDateString(),
                    'status' => 'pickup',
                    'cdate' => now(),
                    'cuser_id' => 0, 
                    
                    'keep_record' => 0,
                    'geo_location' => '',
                    'pickup_driver_id' => 0,
                    'deliver_driver_id' => 0,
                    'group_admin_id' => 0,
                    'group_code' => '',
                    'partial_invoice' => 0,
                    'group_invoice_id' => 0,
                    'skipped_pickup' => 0,
                    'on_vacation' => 0,
                ]);

                $this->info("  [CREATED] Pickup #{$pickupId} for User {$schedule->user_id}");
                $created++;

                Log::info('Recurring pickup generated', [
                    'pickup_id' => $pickupId,
                    'user_id' => $schedule->user_id,
                    'date' => $targetDate->toDateString(),
                    'schedule_type' => $schedule->delivey_type,
                ]);

            } catch (\Exception $e) {
                $this->error("  [ERROR] User {$schedule->user_id}: {$e->getMessage()}");
                Log::error('Recurring pickup generation failed', [
                    'user_id' => $schedule->user_id,
                    'error' => $e->getMessage(),
                ]);
                $errors++;
            }
        }

        $this->newLine();
        $this->info("Summary: Created={$created}, Skipped={$skipped}, Errors={$errors}");

        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
