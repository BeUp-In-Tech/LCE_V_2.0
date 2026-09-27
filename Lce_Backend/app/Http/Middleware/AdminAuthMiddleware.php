<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tymon\JWTAuth\Facades\JWTAuth;

class AdminAuthMiddleware
{
    /**
     * Handle an incoming request for Admin routes.
     */
    public function handle(Request $request, Closure $next)
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();
            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $userId = $user->user_id ?? $user->id ?? null;

            // Check is_admin == 1 in lce_user_info
            $userInfo = null;
            if ($userId) {
                $userInfo = DB::table('lce_user_info')
                    ->where('user_id', $userId)
                    ->orWhere('id', $userId)
                    ->first();
            }

            if (!$userInfo && isset($user->email)) {
                $userInfo = DB::table('lce_user_info')
                    ->where('email', $user->email)
                    ->first();
            }

            $isAdmin = false;
            if ($userInfo) {
                if (isset($userInfo->is_admin) && (int)$userInfo->is_admin === 1) {
                    $isAdmin = true;
                }
            }

            // Fallback check if user object has is_admin directly
            if (!$isAdmin && isset($user->is_admin) && (int)$user->is_admin === 1) {
                $isAdmin = true;
            }

            if (!$isAdmin) {
                return response()->json([
                    'error' => 'Forbidden. Access restricted to Admin users only (is_admin = 1 required).'
                ], 403);
            }

            return $next($request);
        } catch (\Exception $e) {
            Log::error("AdminAuthMiddleware Error: " . $e->getMessage());
            return response()->json([
                'error' => 'Unauthorized admin access',
                'details' => $e->getMessage()
            ], 401);
        }
    }
}
