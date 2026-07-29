<?php

namespace App\Http\Requests\Pickup;

use Illuminate\Foundation\Http\FormRequest;
use App\Helpers\DateHelper;

class UpdatePickupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pickup_date' => ['sometimes', 'date', function ($attribute, $value, $fail) {
                $ptToday = DateHelper::today();

                if ($value < $ptToday) {
                    $fail('Pickup date must be today or later.');
                }

                
                $ptNow = DateHelper::now();
                if ($value === $ptToday && $ptNow->hour >= 8) {
                    $fail('Same-day pickup is only available before 8:00 AM PT.');
                }
                
                $user = $this->user();
                $pickupId = $this->route('pickup') ?? $this->route('id');
                
                $query = \Illuminate\Support\Facades\DB::table('lce_user_pickup')
                    ->where('user_id', $user->user_id)
                    ->where('pickup_date', $value)
                    ->whereNotIn('status', ['cancelled', 'completed', 'delivered']);
                    
                if ($pickupId) {
                    $query->where('id', '!=', $pickupId);
                }

                if ($query->exists()) {
                    $fail('You already have another pickup scheduled for this date.');
                }
            }],
            'driver_instructions' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
