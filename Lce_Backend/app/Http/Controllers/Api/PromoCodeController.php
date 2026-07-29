<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Requests\PromoCode\ValidatePromoCodeRequest;
use App\Helpers\DateHelper;

class PromoCodeController extends Controller
{
        public function index()
    {
        $user = $this->user();

        $promoCodes = DB::table('lce_user_promocode')
            ->join('lce_promo_codes', 'lce_user_promocode.promocode_id', '=', 'lce_promo_codes.id')
            ->where('lce_user_promocode.user_id', $user->user_id)
            ->where('lce_user_promocode.active', 1)
            ->select(
                'lce_user_promocode.id',
                'lce_user_promocode.promocode',
                'lce_user_promocode.expiry_date',
                'lce_promo_codes.promocode_type',
                'lce_promo_codes.promocode_value',
                'lce_promo_codes.promocode_description'
            )
            ->get();

        return response()->json([
            'promo_codes' => $promoCodes->map(fn($pc) => [
                'id' => $pc->id,
                'code' => $pc->promocode,
                'type' => $pc->promocode_type,
                'value' => (float) $pc->promocode_value,
                'description' => $pc->promocode_description,
                'expires_at' => $pc->expiry_date,
            ]),
        ]);
    }

        public function validateCode(ValidatePromoCodeRequest $request)
    {
        

        $code = strtoupper(trim($request->code));

        $promoCode = DB::table('lce_promo_codes')
            ->where('promocode', $code)
            ->where('publish', 1)
            ->first();

        if (!$promoCode) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid promo code',
            ]);
        }

        
        if ($promoCode->promo_expiry_date && $promoCode->promo_expiry_date < DateHelper::today()) {
            return response()->json([
                'valid' => false,
                'message' => 'This promo code has expired',
            ]);
        }

        
        $user = $this->user();
        $alreadyUsed = DB::table('lce_user_promocode')
            ->where('user_id', $user->user_id)
            ->where('promocode_id', $promoCode->id)
            ->exists();

        if ($alreadyUsed && $promoCode->promocode_for !== 'multiple') {
            return response()->json([
                'valid' => false,
                'message' => 'You have already used this promo code',
            ]);
        }

        return response()->json([
            'valid' => true,
            'promo_code' => [
                'id' => $promoCode->id,
                'code' => $promoCode->promocode,
                'type' => $promoCode->promocode_type, 
                'value' => (float) $promoCode->promocode_value,
                'description' => $promoCode->promocode_description,
                'expires_at' => $promoCode->promo_expiry_date,
            ],
            'message' => 'Promo code is valid!',
        ]);
    }

        public function apply(ValidatePromoCodeRequest $request)
    {
        

        $code = strtoupper(trim($request->code));
        $user = $this->user();

        $promoCode = DB::table('lce_promo_codes')
            ->where('promocode', $code)
            ->where('publish', 1)
            ->first();

        if (!$promoCode) {
            return response()->json(['error' => 'Invalid promo code'], 400);
        }

        
        if ($promoCode->promo_expiry_date && $promoCode->promo_expiry_date < DateHelper::today()) {
            return response()->json(['error' => 'This promo code has expired'], 400);
        }

        
        $exists = DB::table('lce_user_promocode')
            ->where('user_id', $user->user_id)
            ->where('promocode_id', $promoCode->id)
            ->where('active', 1)
            ->exists();

        if ($exists) {
            return response()->json(['error' => 'Promo code already applied to your account'], 400);
        }

        
        DB::table('lce_user_promocode')->insert([
            'user_id' => $user->user_id,
            'promocode_id' => $promoCode->id,
            'promocode' => $code,
            'active' => 1,
            'expiry_date' => $promoCode->promo_expiry_date ?? now()->addMonths(3),
        ]);

        Log::info('Promo code applied', ['user_id' => $user->user_id, 'code' => $code]);

        return response()->json([
            'message' => 'Promo code applied successfully',
            'promo_code' => [
                'code' => $code,
                'type' => $promoCode->promocode_type,
                'value' => (float) $promoCode->promocode_value,
            ],
        ]);
    }
}
