<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Helpers\DateHelper;

class RecurringScheduleController extends Controller
{
        public function show(Request $request)
    {
        $user = $request->user();

        $schedule = DB::table('lce_user_rs')
            ->where('user_id', $user->user_id)
            ->first();

        if (!$schedule) {
            return response()->json([
                'has_recurring' => false,
                'schedule_type' => 'one_time',
                'days' => [],
                'days_formatted' => '',
                'next_pickup_date' => null,
                'next_delivery_date' => null,
            ]);
        }

        
        $dayMapping = [
            'day_monday' => 'Monday',
            'day_tuesday' => 'Tuesday',
            'day_wednesday' => 'Wednesday',
            'day_thursday' => 'Thursday',
            'day_friday' => 'Friday',
            'day_saturday' => 'Saturday',
            'day_sunday' => 'Sunday',
        ];

        $selectedDays = [];
        foreach ($dayMapping as $column => $dayName) {
            if ($schedule->$column === 'Y') {
                $selectedDays[] = $dayName;
            }
        }

        
        $daysFormatted = count($selectedDays) > 0
            ? implode(' & ', $selectedDays)
            : '';

        // Determine schedule type
        $scheduleType = $schedule->delivey_type ?? 'one_time';
        
        if ($scheduleType === 'bi-weekly') {
            $scheduleType = 'bi_weekly';
        }

        
        $nextPickupDate = null;
        $nextDeliveryDate = null;

        if (count($selectedDays) > 0) {
            $today = DateHelper::now();
            $dayOfWeekMap = [
                'Monday' => 1,
                'Tuesday' => 2,
                'Wednesday' => 3,
                'Thursday' => 4,
                'Friday' => 5,
                'Saturday' => 6,
                'Sunday' => 0,
            ];

            
            
            $nearestDays = [];
            foreach ($selectedDays as $dayName) {
                if (!isset($dayOfWeekMap[$dayName]))
                    continue;

                $targetDayNum = $dayOfWeekMap[$dayName];
                $currentDayNum = (int) $today->format('w');

                $daysUntil = ($targetDayNum - $currentDayNum + 7) % 7;
                if ($daysUntil === 0)
                    $daysUntil = 7; 

                $nearestDays[] = $today->copy()->addDays($daysUntil);
            }

            if (count($nearestDays) > 0) {
                
                usort($nearestDays, fn($a, $b) => $a->timestamp - $b->timestamp);

                
                $pickupDate = $nearestDays[0]->copy();
                $pickupDate = $this->skipHolidays($pickupDate, $user);
                $nextPickupDate = $pickupDate->format('Y-m-d');

                
                $deliveryDate = $this->getNextBusinessDay($pickupDate->copy()->addDay(), $user);
                $nextDeliveryDate = $deliveryDate->format('Y-m-d');
            }
        }

        return response()->json([
            'has_recurring' => true,
            'schedule_type' => $scheduleType,
            'days' => $selectedDays,
            'days_formatted' => $daysFormatted,
            'next_pickup_date' => $nextPickupDate,
            'next_delivery_date' => $nextDeliveryDate,
            'start_date' => $schedule->start_date ?? null,
        ]);
    }

        private function skipHolidays($date, $user, $maxAttempts = 14)
    {
        for ($i = 0; $i < $maxAttempts; $i++) {
            if (!$this->isHoliday($date, $user)) {
                return $date;
            }
            $date->addDay();
        }
        return $date; 
    }

        private function getNextBusinessDay($date, $user)
    {
        $maxAttempts = 14;
        for ($i = 0; $i < $maxAttempts; $i++) {
            $dayOfWeek = (int) $date->format('w');

            
            if ($dayOfWeek === 6) {
                $date->addDays(2);
                continue;
            } elseif ($dayOfWeek === 0) {
                $date->addDay();
                continue;
            }

            
            if ($this->isHoliday($date, $user)) {
                $date->addDay();
                continue;
            }

            
            return $date;
        }
        return $date; 
    }

        private function isHoliday($date, $user = null): bool
    {
        $dateStr = $date->format('Y-m-d');

        
        $holiday = DB::table('lce_holidays_logs')
            ->where('filter_date', $dateStr)
            ->exists();

        if ($holiday) {
            return true;
        }

        
        $query = DB::table('lce_pickup_nonworking_days')
            ->where('date', $dateStr);

        if ($user) {
            
            $area = DB::table('lce_user_info')
                ->join('lce_pickup_zones', 'lce_user_info.zip', '=', 'lce_pickup_zones.zip')
                ->where('lce_user_info.user_id', $user->user_id)
                ->value('lce_pickup_zones.area');

            $query->where(function ($q) use ($area) {
                $q->where('area', $area)
                  ->orWhere('area', '')
                  ->orWhereNull('area');
            });
        } else {
            
            $query->where(function ($q) {
                $q->where('area', '')
                  ->orWhereNull('area');
            });
        }

        return $query->exists();
    }

        public function update(Request $request)
    {
        $request->validate([
            'schedule_type' => 'required|in:one-time,weekly,bi-weekly',
            'days' => 'array', 
            'days.*' => 'string|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'start_date' => 'date',
        ]);

        $user = $request->user();
        $type = $request->schedule_type;

        
        

        $dbType = $type === 'bi-weekly' ? 'bi-weekly' : $type;
        $selectedDays = $request->days ?? [];

        
        if (!empty($selectedDays) && $type !== 'one-time') {
            
            $userInfo = DB::table('lce_user_info')
                ->where('user_id', $user->user_id)
                ->first(['zip']);

            if ($userInfo && $userInfo->zip) {
                
                $zone = DB::table('lce_pickup_zones')
                    ->where('zip', $userInfo->zip)
                    ->first(['day_monday', 'day_tuesday', 'day_wednesday', 'day_thursday', 'day_friday']);

                if ($zone) {
                    
                    $zoneDays = [];
                    if ($zone->day_monday)
                        $zoneDays[] = 'Monday';
                    if ($zone->day_tuesday)
                        $zoneDays[] = 'Tuesday';
                    if ($zone->day_wednesday)
                        $zoneDays[] = 'Wednesday';
                    if ($zone->day_thursday)
                        $zoneDays[] = 'Thursday';
                    if ($zone->day_friday)
                        $zoneDays[] = 'Friday';
                    

                    
                    $invalidDays = array_diff($selectedDays, $zoneDays);

                    if (!empty($invalidDays)) {
                        return response()->json([
                            'error' => 'Invalid days selected',
                            'message' => 'Your zone does not offer service on: ' . implode(', ', $invalidDays),
                            'allowed_days' => $zoneDays
                        ], 422);
                    }
                }
            }
        }

        
        
        if (!empty($selectedDays) && $type !== 'one-time') {
            $dayToNumber = [
                'Sunday' => 0,
                'Monday' => 1,
                'Tuesday' => 2,
                'Wednesday' => 3,
                'Thursday' => 4,
                'Friday' => 5,
                'Saturday' => 6
            ];

            
            $pendingPickups = DB::table('lce_user_pickup')
                ->where('user_id', $user->user_id)
                ->whereIn('status', ['pending', 'scheduled', 'Pending', 'Scheduled'])
                ->where('pickup_date', '>=', DateHelper::today())
                ->get(['pickup_date', 'status']);

            $conflicts = [];
            foreach ($pendingPickups as $pickup) {
                $pickupDayOfWeek = date('l', strtotime($pickup->pickup_date)); 
                if (in_array($pickupDayOfWeek, $selectedDays)) {
                    $conflicts[] = [
                        'date' => $pickup->pickup_date,
                        'day' => $pickupDayOfWeek,
                        'status' => $pickup->status
                    ];
                }
            }

            if (!empty($conflicts)) {
                
                Log::info('Conflict detected for recurring schedule', [
                    'user_id' => $user->user_id,
                    'conflicts' => $conflicts
                ]);

                
                
            }
        }

        
        $data = [
            'user_id' => $user->user_id,
            'delivey_type' => $dbType,
        ];

        if ($request->has('start_date')) {
            $startDate = \Carbon\Carbon::parse($request->start_date);
            
            
            $safety = 8;
            while ($this->isHoliday($startDate, $user) && $safety > 0) {
                $startDate->addDays(7);
                $safety--;
            }
            
            $data['start_date'] = $startDate->format('Y-m-d');
        }

        
        $dayMapping = [
            'Monday' => 'day_monday',
            'Tuesday' => 'day_tuesday',
            'Wednesday' => 'day_wednesday',
            'Thursday' => 'day_thursday',
            'Friday' => 'day_friday',
            'Saturday' => 'day_saturday',
            'Sunday' => 'day_sunday',
        ];

        foreach ($dayMapping as $dayName => $column) {
            
            $data[$column] = in_array($dayName, $selectedDays) ? 'Y' : 'N';
        }

        
        $exists = DB::table('lce_user_rs')->where('user_id', $user->user_id)->exists();

        if ($exists) {
            DB::table('lce_user_rs')->where('user_id', $user->user_id)->update($data);
        } else {
            
            if (!isset($data['start_date'])) {
                $data['start_date'] = DateHelper::today();
            }
            DB::table('lce_user_rs')->insert($data);
        }

        Log::info('Recurring schedule updated', ['user_id' => $user->user_id, 'type' => $type]);

        $response = ['message' => 'Recurring schedule updated successfully'];

        
        if (isset($conflicts) && !empty($conflicts)) {
            $response['warning'] = 'You have existing pickups on selected days';
            $response['conflicts'] = $conflicts;
        }

        return response()->json($response);
    }
}
