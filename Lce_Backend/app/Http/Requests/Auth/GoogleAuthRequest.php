<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class GoogleAuthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'access_token' => 'required|string',
        ];
    }

    public function messages(): array
    {
        return [
            'access_token.required' => 'Google access token is required.',
        ];
    }
}
