<?php

namespace App\Http\Middleware;

Closure;
Illuminate\Http\Request;
Illuminate\Support\Facades\DB;
Illuminate\Support\Facades\Log;
Tymon\JWTAuth\Facades\JWTAuth;

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

            // Check is_admin == 1 in lce_user_info
            $userInfo = DB::table('lce_user_info')
                ->where('user_id', $user->user_id)
                ->first();

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
