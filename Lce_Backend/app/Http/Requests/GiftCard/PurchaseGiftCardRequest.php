<?php

namespace App\Http\Requests\GiftCard;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseGiftCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount' => 'required|numeric|min:10|max:500',
            'delivery_method' => 'required|in:email,print',
            'recipient_email' => 'required_if:delivery_method,email|nullable|email',
            'recipient_name' => 'required|string|max:64',
            'message' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => 'Gift card amount is required.',
            'amount.min' => 'Minimum gift card amount is $10.',
            'amount.max' => 'Maximum gift card amount is $500.',
            'recipient_email.required' => 'Recipient email is required.',
            'recipient_email.email' => 'Please enter a valid recipient email.',
            'recipient_name.required' => 'Recipient name is required.',
        ];
    }
}
