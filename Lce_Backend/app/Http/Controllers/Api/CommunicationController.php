<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunicationSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Http\Requests\Communication\UpdateCommunicationSettingsRequest;

class CommunicationController extends Controller
{
        public function index()
    {
        $user = JWTAuth::parseToken()->authenticate();

        $settings = DB::table('lce_communication_settings')
            ->where('user_id', $user->user_id)
            ->first();

        if (!$settings) {
            
            return response()->json([
                'settings' => [
                    'pickup_confirm_email' => 'Yes',
                    'pickup_confirm_sms' => 'Yes',
                    'pickup_reminder_email' => 'Yes',
                    'picked_up_email' => 'Yes',
                    'picked_up_sms' => 'Yes',
                    'outfordelivery_email' => 'Yes',
                    'outfordelivery_sms' => 'Yes',
                    'delivered_email' => 'Yes',
                    'delivered_sms' => 'Yes',
                    'payment_sms' => 'Yes',
                ],
            ]);
        }

        return response()->json([
            'settings' => [
                'pickup_confirm_email' => $settings->pickup_confirm_email,
                'pickup_confirm_sms' => $settings->pickup_confirm_sms,
                'pickup_reminder_email' => $settings->pickup_reminder_email,
                'picked_up_email' => $settings->picked_up_email,
                'picked_up_sms' => $settings->picked_up_sms,
                'outfordelivery_email' => $settings->outfordelivery_email,
                'outfordelivery_sms' => $settings->outfordelivery_sms,
                'delivered_email' => $settings->delivered_email,
                'delivered_sms' => $settings->delivered_sms,
                'payment_sms' => $settings->payment_sms ?? 'No',
            ],
        ]);
    }

        public function update(UpdateCommunicationSettingsRequest $request)
    {
        

        $user = JWTAuth::parseToken()->authenticate();

        $data = [
            'user_id' => $user->user_id,
        ];

        $fields = [
            'pickup_confirm_email',
            'pickup_confirm_sms',
            'pickup_reminder_email',
            'picked_up_email',
            'picked_up_sms',
            'outfordelivery_email',
            'outfordelivery_sms',
            'delivered_email',
            'delivered_sms',
            'payment_sms',
        ];

        foreach ($fields as $field) {
            if ($request->has($field)) {
                $data[$field] = $request->$field;
            }
        }

        
        $exists = DB::table('lce_communication_settings')
            ->where('user_id', $user->user_id)
            ->exists();

        if ($exists) {
            DB::table('lce_communication_settings')
                ->where('user_id', $user->user_id)
                ->update($data);
        } else {
            
            $defaults = [
                'pickup_confirm_email' => 'Yes',
                'pickup_confirm_sms' => 'Yes',
                'pickup_reminder_email' => 'Yes',
                'picked_up_email' => 'Yes',
                'picked_up_sms' => 'Yes',
                'outfordelivery_email' => 'Yes',
                'outfordelivery_sms' => 'Yes',
                'delivered_email' => 'Yes',
                'delivered_sms' => 'Yes',
                'payment_sms' => 'Yes',
            ];
            DB::table('lce_communication_settings')->insert(array_merge($defaults, $data));
        }

        Log::info('Communication settings updated', ['user_id' => $user->user_id]);

        $settings = DB::table('lce_communication_settings')
            ->where('user_id', $user->user_id)
            ->first();

        return response()->json([
            'message' => 'Communication settings updated successfully',
            'settings' => [
                'pickup_confirm_email' => $settings->pickup_confirm_email,
                'pickup_confirm_sms' => $settings->pickup_confirm_sms,
                'pickup_reminder_email' => $settings->pickup_reminder_email,
                'picked_up_email' => $settings->picked_up_email,
                'picked_up_sms' => $settings->picked_up_sms,
                'outfordelivery_email' => $settings->outfordelivery_email,
                'outfordelivery_sms' => $settings->outfordelivery_sms,
                'delivered_email' => $settings->delivered_email,
                'delivered_sms' => $settings->delivered_sms,
                'payment_sms' => $settings->payment_sms ?? 'No',
            ],
        ]);
    }
}
