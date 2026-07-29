<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class AppleAuthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_token' => 'required|string',
            'first_name' => 'nullable|string',
            'last_name' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'id_token.required' => 'Apple ID token is required.',
        ];
    }
}
