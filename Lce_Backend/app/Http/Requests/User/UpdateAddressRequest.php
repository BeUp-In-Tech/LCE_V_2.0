<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'street' => 'sometimes|string|max:64',
            'apt' => 'sometimes|nullable|string|max:64',
            'city' => 'sometimes|string|max:32',
            'state' => 'sometimes|string|max:32',
            'zip' => 'sometimes|string|max:10|exists:lce_pickup_zones,zip',
            'country' => 'sometimes|string|max:32',
            'nearest_cross_street' => 'sometimes|nullable|string|max:64',
        ];
    }


    public function messages(): array
    {
        return [
            'zip.exists' => 'Sorry, we do not currently service this Zip code.',
        ];
    }
}
