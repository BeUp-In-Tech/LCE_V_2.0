<?php

namespace App\Http\Requests\Group;

use Illuminate\Foundation\Http\FormRequest;

class JoinGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'group_code' => 'required|string',
        ];
    }

    public function messages(): array
    {
        return [
            'group_code.required' => 'Group code is required.',
        ];
    }
}
