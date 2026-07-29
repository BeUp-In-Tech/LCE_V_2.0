<?php

namespace App\Http\Requests\Payment;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation()
    {
        \Illuminate\Support\Facades\Log::info('Incoming Payment Payload:', $this->all());
    }

    public function rules(): array
    {
        return [
            'dataDescriptor' => 'required|string',
            'dataValue' => 'required|string',
            'last_four' => 'required|string|size:4',
            'expiry_month' => 'required|string|size:2',
            'expiry_year' => 'required|string|size:4',
            'billing_address' => 'sometimes|array',
            'billing_address.street' => 'sometimes|string|max:64',
            'billing_address.city' => 'sometimes|string|max:32',
            'billing_address.state' => 'sometimes|string|max:32',
            'billing_address.zip' => 'sometimes|string|max:10',
        ];
    }

    public function messages(): array
    {
        return [
            'dataDescriptor.required' => 'Payment token descriptor is required.',
            'dataValue.required' => 'Payment token is required.',
            'last_four.required' => 'Card last four digits are required.',
            'expiry_month.required' => 'Expiry month is required.',
            'expiry_year.required' => 'Expiry year is required.',
        ];
    }
}
