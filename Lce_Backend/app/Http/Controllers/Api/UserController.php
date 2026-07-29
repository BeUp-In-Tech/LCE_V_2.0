<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Http\Requests\User\UpdateProfileRequest;
use App\Http\Requests\User\UpdateAddressRequest;
use App\Http\Requests\User\UpdatePasswordRequest;

class UserController extends Controller
{
        public function show()
    {
        $user = $this->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'user_id' => $user->user_id,
                'email' => $user->email,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'full_name' => $user->full_name,
                'phone' => $user->phone_1,
                'phone_2' => $user->phone_2,
                'cell_phone' => $user->cell_phone_1,
                'opt_in' => $user->opt_in === 'Yes',
                'address' => [
                    'street' => $user->address_1,
                    'apt' => $user->address_2,
                    'city' => $user->city,
                    'state' => $user->state,
                    'zip' => $user->zip,
                    'country' => $user->country,
                    'nearest_cross_street' => $user->nearest_cross_street,
                ],
                'payment' => [
                    'has_payment_method' => !empty($user->customerPaymentProfileId),
                    'card_last_four' => $user->payment_cc_number ? substr($user->payment_cc_number, -4) : null,
                    'card_expiry' => $user->payment_cc_edate_month && $user->payment_cc_edate_year
                        ? "{$user->payment_cc_edate_month}/{$user->payment_cc_edate_year}"
                        : null,
                ],
                'billing_address' => [
                    'street' => $user->payment_address_1,
                    'apt' => $user->payment_address_2,
                    'city' => $user->payment_city,
                    'state' => $user->payment_state,
                    'zip' => $user->payment_zip,
                ],
                'geo' => [
                    'lat' => $user->geo_lat,
                    'lng' => $user->geo_lng,
                    'address' => $user->geo_address,
                ],
                'price_list_id' => $user->price_list_id,
                'customer_type' => $user->customer_type,
                'created_at' => $user->cdate?->toIso8601String(),
                'updated_at' => $user->mdate?->toIso8601String(),
            ],
        ]);
    }

        public function update(UpdateProfileRequest $request)
    {
        

        $user = $this->user();

        if ($request->has('first_name')) {
            $user->first_name = $request->first_name;
        }
        if ($request->has('last_name')) {
            $user->last_name = $request->last_name;
        }
        if ($request->has('email')) {
            $user->email = $request->email;
        }
        if ($request->has('phone')) {
            $user->phone_1 = $request->phone;
        }
        if ($request->has('phone_2')) {
            $user->phone_2 = $request->phone_2;
        }
        if ($request->has('cell_phone')) {
            $user->cell_phone_1 = $request->cell_phone;
        }
        if ($request->has('opt_in')) {
            $user->opt_in = $request->opt_in ? 'Yes' : 'No';
        }

        $user->mdate = now();
        $user->save();

        Log::info('User profile updated', ['user_id' => $user->id]);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $this->formatUserSummary($user),
        ]);
    }

        public function updateAddress(UpdateAddressRequest $request)
    {
        

        $user = $this->user();

        if ($request->has('street')) {
            $user->address_1 = $request->street;
        }
        if ($request->has('apt')) {
            $user->address_2 = $request->apt;
        }
        if ($request->has('city')) {
            $user->city = $request->city;
        }
        if ($request->has('state')) {
            $user->state = $request->state;
        }
        if ($request->has('zip')) {
            $user->zip = $request->zip;
        }
        if ($request->has('country')) {
            $user->country = $request->country;
        }
        if ($request->has('nearest_cross_street')) {
            $user->nearest_cross_street = $request->nearest_cross_street;
        }

        $user->mdate = now();
        $user->save();

        Log::info('User address updated', ['user_id' => $user->id]);

        return response()->json([
            'message' => 'Address updated successfully',
            'address' => [
                'street' => $user->address_1,
                'apt' => $user->address_2,
                'city' => $user->city,
                'state' => $user->state,
                'zip' => $user->zip,
                'country' => $user->country,
            ],
        ]);
    }

        public function updatePassword(UpdatePasswordRequest $request)
    {
        

        $user = $this->user();

        
        if (!$user->verifyPassword($request->current_password)) {
            return response()->json(['error' => 'Current password is incorrect'], 400);
        }

        
        $user->password = password_hash($request->password, PASSWORD_BCRYPT, ['cost' => 10]);
        $user->mdate = now();
        $user->save();

        Log::info('User password updated', ['user_id' => $user->id]);

        return response()->json(['message' => 'Password updated successfully']);
    }

        private function formatUserSummary($user): array
    {
        return [
            'id' => $user->id,
            'email' => $user->email,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'full_name' => $user->full_name,
            'phone' => $user->phone_1,
            'phone_2' => $user->phone_2,
            'cell_phone' => $user->cell_phone_1,
        ];
    }
}
