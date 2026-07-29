<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class PromoAbuseMiddleware
{
        private const WINDOW_SECONDS = 3600;

        private const MAX_USER_ATTEMPTS = 5;

        private const MAX_IP_ATTEMPTS = 10;

        private const USER_PREFIX = 'promo_abuse:user:';
    private const IP_PREFIX = 'promo_abuse:ip:';

        public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $userId = $request->user()?->id;

        
        $ipKey = self::IP_PREFIX . $ip;
        $ipAttempts = (int) Cache::get($ipKey, 0);

        if ($ipAttempts >= self::MAX_IP_ATTEMPTS) {
            Log::warning('Promo abuse blocked - IP limit exceeded', [
                'ip' => $ip,
                'user_id' => $userId,
                'attempts' => $ipAttempts,
                'path' => $request->path(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Too many promo code attempts. Please try again later.',
                'retry_after' => self::WINDOW_SECONDS,
            ], 429);
        }

        
        if ($userId) {
            $userKey = self::USER_PREFIX . $userId;
            $userAttempts = (int) Cache::get($userKey, 0);

            if ($userAttempts >= self::MAX_USER_ATTEMPTS) {
                Log::warning('Promo abuse blocked - user limit exceeded', [
                    'ip' => $ip,
                    'user_id' => $userId,
                    'attempts' => $userAttempts,
                    'path' => $request->path(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'You have reached the maximum promo code attempts. Please try again in an hour.',
                    'retry_after' => self::WINDOW_SECONDS,
                ], 429);
            }
        }

        
        $response = $next($request);

        
        Cache::put($ipKey, $ipAttempts + 1, self::WINDOW_SECONDS);

        if ($userId) {
            $userKey = self::USER_PREFIX . $userId;
            $userAttempts = (int) Cache::get($userKey, 0);
            Cache::put($userKey, $userAttempts + 1, self::WINDOW_SECONDS);
        }

        
        if (!$response->isSuccessful()) {
            Log::info('Promo attempt failed', [
                'ip' => $ip,
                'user_id' => $userId,
                'path' => $request->path(),
                'status' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }
}
