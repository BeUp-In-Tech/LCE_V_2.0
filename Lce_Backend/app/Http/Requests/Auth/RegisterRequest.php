<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
        public function authorize(): bool
    {
        return true; 
    }

        public function rules(): array
    {
        return [
            'email' => 'required|email|unique:lce_user_info,email',
            'password' => 'required|min:6',
            'first_name' => 'required|string|max:32',
            'last_name' => 'required|string|max:32',
            'phone' => 'nullable|string|max:32',
            'address' => 'nullable|string|max:64',
            'city' => 'nullable|string|max:32',
            'state' => 'nullable|string|max:32',
            'zip' => 'nullable|string|max:10',
        ];
    }

        public function messages(): array
    {
        return [
            'email.unique' => 'This email address is already registered.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'password.required' => 'Password is required.',
            'password.min' => 'Password must be at least 6 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
            'first_name.required' => 'First name is required.',
            'last_name.required' => 'Last name is required.',
        ];
    }
}
