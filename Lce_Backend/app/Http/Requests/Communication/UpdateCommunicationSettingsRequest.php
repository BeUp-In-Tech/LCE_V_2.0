<?php

namespace App\Http\Requests\Communication;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCommunicationSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pickup_confirm_email' => 'sometimes|string|in:Yes,No',
            'pickup_confirm_sms' => 'sometimes|string|in:Yes,No',
            'pickup_reminder_email' => 'sometimes|string|in:Yes,No',
            'picked_up_email' => 'sometimes|string|in:Yes,No',
            'picked_up_sms' => 'sometimes|string|in:Yes,No',
            'outfordelivery_email' => 'sometimes|string|in:Yes,No',
            'outfordelivery_sms' => 'sometimes|string|in:Yes,No',
            'delivered_email' => 'sometimes|string|in:Yes,No',
            'delivered_sms' => 'sometimes|string|in:Yes,No',
            'payment_sms' => 'sometimes|string|in:Yes,No',
        ];
    }
}
