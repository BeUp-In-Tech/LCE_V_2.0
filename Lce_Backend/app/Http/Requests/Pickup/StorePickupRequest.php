<?php

namespace App\Http\Requests\Pickup;

use Illuminate\Foundation\Http\FormRequest;
use App\Helpers\DateHelper;

class StorePickupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pickup_date' => ['required', 'date', function ($attribute, $value, $fail) {
                $ptToday = DateHelper::today();

                if ($value < $ptToday) {
                    $fail('Pickup date must be today or later.');
                }

                
                $ptNow = DateHelper::now();
                if ($value === $ptToday && $ptNow->hour >= 8) {
                    $fail('Same-day pickup is only available before 8:00 AM PT.');
                }
                
                $user = $this->user();
                $existingPickup = \Illuminate\Support\Facades\DB::table('lce_user_pickup')
                    ->where('user_id', $user->user_id)
                    ->where('pickup_date', $value)
                    ->whereNotIn('status', ['cancelled', 'completed', 'delivered'])
                    ->exists();

                if ($existingPickup) {
                    $fail('You already have a pickup scheduled for this date.');
                }

                
                $userInfo = \Illuminate\Support\Facades\DB::table('lce_user_info')
                    ->where('user_id', $user->user_id)
                    ->first();

                if ($userInfo && $userInfo->zip) {
                    $zone = \Illuminate\Support\Facades\DB::table('lce_pickup_zones')
                        ->where('zip', $userInfo->zip)
                        ->first();

                    if ($zone) {
                        $pickupDate = \Carbon\Carbon::parse($value);
                        $dayOfWeek = strtolower($pickupDate->format('l')); 
                        $dayColumn = 'day_' . $dayOfWeek;

                        if (isset($zone->$dayColumn) && !$zone->$dayColumn) {
                            
                            $availableDays = [];
                            if ($zone->day_monday) $availableDays[] = 'Monday';
                            if ($zone->day_tuesday) $availableDays[] = 'Tuesday';
                            if ($zone->day_wednesday) $availableDays[] = 'Wednesday';
                            if ($zone->day_thursday) $availableDays[] = 'Thursday';
                            if ($zone->day_friday) $availableDays[] = 'Friday';

                            $fail('Pickup service is not available on ' . ucfirst($dayOfWeek)
                                . ' for your area. Available days: ' . implode(', ', $availableDays) . '.');
                        }

                        
                        $isNonWorking = \Illuminate\Support\Facades\DB::table('lce_pickup_nonworking_days')
                            ->where('area', $zone->area)
                            ->where('date', $value)
                            ->exists();

                        if ($isNonWorking) {
                            $fail('Pickup service is closed on this date due to a scheduled closure or holiday.');
                        }
                    }
                }
            }],
            'pickup_type' => 'required|in:wf,dc,hd,both,wf_dc,wf_hd,hd_dc,all',
            'service_type' => 'sometimes|in:one_time,weekly,bi_weekly',
            'preferred_day' => 'nullable|string|max:50',
            'driver_instructions' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'pickup_date.required' => 'Pickup date is required.',
            'pickup_type.required' => 'Pickup type is required.',
            'pickup_type.in' => 'Pickup type must be wf, dc, hd, both, wf_hd, hd_dc, or all.',
            'service_type.in' => 'Service type must be one_time, weekly, or bi_weekly.',
        ];
    }
}
