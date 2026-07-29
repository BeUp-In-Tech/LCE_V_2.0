<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class IdempotencyMiddleware
{
        private const CACHE_TTL_SECONDS = 86400;

        private const CACHE_PREFIX = 'idempotency:';

        public function handle(Request $request, Closure $next): Response
    {
        
        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            return $next($request);
        }

        $idempotencyKey = $request->header('X-Idempotency-Key');

        
        if (empty($idempotencyKey)) {
            \Log::warning('Payment request without idempotency key', [
                'path' => $request->path(),
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
            ]);
            return $next($request);
        }

        
        $userId = $request->user()?->id ?? 'guest';
        $cacheKey = self::CACHE_PREFIX . $userId . ':' . $idempotencyKey;

        
        $cachedResponse = Cache::get($cacheKey);

        if ($cachedResponse !== null) {
            \Log::info('Idempotency key hit - returning cached response', [
                'key' => $idempotencyKey,
                'user_id' => $userId,
            ]);

            return response()->json(
                array_merge($cachedResponse['data'], [
                    '_idempotent' => true,
                    '_cached_at' => $cachedResponse['cached_at'],
                ]),
                $cachedResponse['status']
            );
        }

        
        $response = $next($request);

        
        if ($response->isSuccessful()) {
            $responseData = json_decode($response->getContent(), true) ?? [];
            
            Cache::put($cacheKey, [
                'data' => $responseData,
                'status' => $response->getStatusCode(),
                'cached_at' => now()->toIso8601String(),
            ], self::CACHE_TTL_SECONDS);

            \Log::info('Idempotency key stored', [
                'key' => $idempotencyKey,
                'user_id' => $userId,
                'ttl' => self::CACHE_TTL_SECONDS,
            ]);
        }

        return $response;
    }
}
