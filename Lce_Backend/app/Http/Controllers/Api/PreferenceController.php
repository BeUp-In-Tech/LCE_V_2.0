<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PreferenceController extends Controller
{
        public function index()
    {
        $user = $this->user();

        return response()->json([
            'preferences' => [
                'detergent' => $user->laundry_pref_detergent ?? 'Unscented',
                'softener' => $user->laundry_pref_softener ?? 'No',
                'bleach' => $user->laundry_pref_bleach ?? 'No',
                'hanging' => $user->laundry_pref_hanging ?? 'Fold',
                'starch' => $user->laundry_pref_starch ?? 'None',
                'shirts' => $user->laundry_pref_shirts ?? '',
                'wash_fold_instructions' => $user->wash_fold_instructions ?? '',
                'laundry_instructions' => $user->laundry_instructions ?? '',
                'driver_instructions' => $user->driver_instructions ?? '',
            ],
        ]);
    }

    /**
     * Update user's laundry preferences.
     * PUT /api/v1/preferences
     */
    public function update(Request $request)
    {
        $request->validate([
            'detergent' => 'sometimes|string|in:Unscented,Scented',
            'softener' => 'sometimes|string|in:Yes,No',
            'bleach' => 'sometimes|string|in:Yes,No',
            'hanging' => 'sometimes|string|in:Fold,Fold_Only,Hang_and_Fold,Everything_on_Hanger',
            'starch' => 'sometimes|string|in:None,Light,Medium,Heavy',
            'shirts' => 'sometimes|nullable|string|max:16',
            'wash_fold_instructions' => 'sometimes|nullable|string|max:255',
            'laundry_instructions' => 'sometimes|nullable|string|max:255',
            'driver_instructions' => 'sometimes|nullable|string|max:255',
        ]);

        $user = $this->user();

        $fields = [
            'detergent' => 'laundry_pref_detergent',
            'softener' => 'laundry_pref_softener',
            'bleach' => 'laundry_pref_bleach',
            'hanging' => 'laundry_pref_hanging',
            'starch' => 'laundry_pref_starch',
            'shirts' => 'laundry_pref_shirts',
            'wash_fold_instructions' => 'wash_fold_instructions',
            'laundry_instructions' => 'laundry_instructions',
            'driver_instructions' => 'driver_instructions',
        ];

        foreach ($fields as $requestField => $dbField) {
            if ($request->has($requestField)) {
                
                $value = $request->$requestField;
                if ($value === null && in_array($requestField, ['wash_fold_instructions', 'laundry_instructions', 'driver_instructions'])) {
                    $value = '';
                }
                $user->$dbField = $value;
            }
        }

        // Track when driver instructions were updated
        if ($request->has('driver_instructions')) {
            $user->driver_instructions_mdate = now();
        }
        if ($request->has('laundry_instructions')) {
            $user->laundry_instructions_mdate = now();
        }

        $user->mdate = now();
        $user->save();

        Log::info('User preferences updated', ['user_id' => $user->user_id]);

        return response()->json([
            'message' => 'Preferences updated successfully',
            'preferences' => [
                'detergent' => $user->laundry_pref_detergent,
                'softener' => $user->laundry_pref_softener,
                'bleach' => $user->laundry_pref_bleach,
                'hanging' => $user->laundry_pref_hanging,
                'starch' => $user->laundry_pref_starch,
                'shirts' => $user->laundry_pref_shirts,
                'wash_fold_instructions' => $user->wash_fold_instructions,
                'laundry_instructions' => $user->laundry_instructions,
                'driver_instructions' => $user->driver_instructions,
            ],
        ]);
    }
}
