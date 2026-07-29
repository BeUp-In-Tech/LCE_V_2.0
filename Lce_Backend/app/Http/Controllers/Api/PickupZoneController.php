<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Helpers\DateHelper;

class PickupZoneController extends Controller
{
        public function index(Request $request)
    {
        $query = DB::table('lce_pickup_zones');

        
        if ($request->has('city')) {
            $query->where('city', 'like', '%' . $request->city . '%');
        }

        
        if ($request->has('state')) {
            $query->where('state', $request->state);
        }

        $zones = $query->orderBy('city')->get();

        return response()->json([
            'zones' => $zones->map(fn($zone) => [
                'id' => $zone->id,
                'zip' => $zone->zip,
                'city' => $zone->city,
                'state' => $zone->state,
                'area' => $zone->area,
                'available_days' => [
                    'monday' => (bool) $zone->day_monday,
                    'tuesday' => (bool) $zone->day_tuesday,
                    'wednesday' => (bool) $zone->day_wednesday,
                    'thursday' => (bool) $zone->day_thursday,
                    'friday' => (bool) $zone->day_friday,
                ],
            ]),
        ]);
    }

        public function check(Request $request)
    {
        $request->validate([
            'zip' => 'required|string|max:10',
        ]);

        $zone = DB::table('lce_pickup_zones')
            ->where('zip', $request->zip)
            ->first();

        if (!$zone) {
            
            return response()->json([
                'serviceable' => false,
                'message' => 'Sorry, we do not currently service this ZIP code.',
                'can_join_waitlist' => true,
            ]);
        }

        
        $availableDays = [];
        if ($zone->day_monday) $availableDays[] = 'Monday';
        if ($zone->day_tuesday) $availableDays[] = 'Tuesday';
        if ($zone->day_wednesday) $availableDays[] = 'Wednesday';
        if ($zone->day_thursday) $availableDays[] = 'Thursday';
        if ($zone->day_friday) $availableDays[] = 'Friday';

        
        $nonWorkingDays = DB::table('lce_pickup_nonworking_days')
            ->where(function ($query) use ($zone) {
                $query->where('area', $zone->area)
                      ->orWhere('area', '')
                      ->orWhereNull('area');
            })
            ->where('date', '>=', DateHelper::today())
            ->pluck('date')
            ->toArray();

        return response()->json([
            'serviceable' => true,
            'zone' => [
                'zip' => $zone->zip,
                'city' => $zone->city,
                'state' => $zone->state,
                'area' => $zone->area,
            ],
            'available_days' => $availableDays,
            'non_working_days' => $nonWorkingDays,
            'message' => 'We service your area.',
        ]);
    }

        public function joinWaitlist(Request $request)
    {
        $request->validate([
            'zip' => 'required|string|max:10',
            'email' => 'required|email',
        ]);

        
        $exists = DB::table('lce_waiting_list')
            ->where('zip', $request->zip)
            ->where('notify_email', $request->email)
            ->exists();

        if (!$exists) {
            DB::table('lce_waiting_list')->insert([
                'zip' => $request->zip,
                'notify_email' => $request->email,
                'notified' => '0',
                'notify_date' => now(),
            ]);
        }

        return response()->json([
            'message' => 'You have been added to our waiting list. We will notify you when service becomes available in your area.',
        ]);
    }
}
