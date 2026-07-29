<?php

namespace App\Http\Requests\Group;

use Illuminate\Foundation\Http\FormRequest;

class StoreGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'group_name' => 'required|string|max:64',
            'group_type' => 'required|in:Independent,InHouse',
        ];
    }

    public function messages(): array
    {
        return [
            'group_name.required' => 'Group name is required.',
            'group_type.required' => 'Group type is required.',
            'group_type.in' => 'Group type must be Independent or InHouse.',
        ];
    }
}
