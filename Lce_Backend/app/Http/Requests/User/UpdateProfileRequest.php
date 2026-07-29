<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'first_name' => 'sometimes|string|max:32',
            'last_name' => 'sometimes|string|max:32',
            'email' => 'sometimes|email|unique:lce_user_info,email,' . $userId,
            'phone' => 'sometimes|string|max:32',
            'phone_2' => 'sometimes|string|max:32',
            'cell_phone' => 'sometimes|string|max:32',
            'opt_in' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email address is already in use.',
            'email.email' => 'Please enter a valid email address.',
        ];
    }
}
