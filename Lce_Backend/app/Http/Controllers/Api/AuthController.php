<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use Laravel\Socialite\Facades\Socialite;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\GoogleAuthRequest;
use App\Http\Requests\Auth\AppleAuthRequest;
use App\Services\CreditService;

class AuthController extends Controller
{
    
    public function register(RegisterRequest $request)
    {

        try {
            $maxUserId = DB::table('lce_user_info')->max('user_id') ?? 100000;
            $userId = $maxUserId + 1;

            $user = new User;
            $user->user_id = $userId;
            $user->password = $request->password;
            $user->email = $request->email;
            $user->first_name = $request->first_name;
            $user->last_name = $request->last_name;
            $user->phone_1 = $request->phone ?? '';
            $user->address_1 = $request->address ?? '';
            $user->city = $request->city ?? '';
            $user->state = $request->state ?? '';
            $user->zip = $request->zip ?? '';
            $user->country = 'US';
            $user->price_list_id = 1;
            $user->wash_fold_instructions = ' ';
            $user->customer_type = 'Regular';
            $user->custom_minimum_charge = 0.00;
            $user->cdate = now();
            $user->mdate = now();
            $user->save();

            
            try {
                app(CreditService::class)->addWelcomeCredit($user->user_id);
            } catch (\Exception $e) {
                Log::warning('Welcome credit failed', ['user_id' => $user->user_id, 'error' => $e->getMessage()]);
            }

            
            try {
                DB::table('lce_communication_settings')->insert([
                    'user_id' => $user->user_id,
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
                ]);
            } catch (\Exception $e) {
                Log::warning('Default communication settings creation failed', ['user_id' => $user->user_id, 'error' => $e->getMessage()]);
            }

            $token = JWTAuth::fromUser($user);

            Log::info('User registered', ['user_id' => $user->id, 'email' => $user->email]);

            return response()->json([
                'message' => 'Registration successful',
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
                'user' => $this->formatUserResponse($user),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Registration failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Registration failed: ' . $e->getMessage()], 500);
        }
    }

        public function login(LoginRequest $request)
    {
        

        
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'error' => 'User not found',
                'code' => 'USER_NOT_FOUND'
            ], 404);
        }

        if (!$user->verifyPassword($request->password)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        try {
            $token = JWTAuth::fromUser($user);

            
            $user->mdate = now();
            $user->save();

            Log::info('User logged in', ['user_id' => $user->id]);

            return response()->json([
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
                'user' => $this->formatUserResponse($user),
            ]);
        } catch (JWTException $e) {
            Log::error('Token generation failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Could not create token'], 500);
        }
    }

        public function me()
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            return response()->json([
                'user' => $this->formatUserResponse($user),
            ]);
        } catch (JWTException $e) {
            return response()->json(['error' => 'Invalid token'], 401);
        }
    }

        public function logout()
    {
        try {
            JWTAuth::invalidate(JWTAuth::getToken());
            return response()->json(['message' => 'Successfully logged out']);
        } catch (JWTException $e) {
            
            return response()->json(['message' => 'Logged out']);
        }
    }

        public function refresh()
    {
        try {
            $token = JWTAuth::refresh(JWTAuth::getToken());
            return response()->json([
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
            ]);
        } catch (JWTException $e) {
            return response()->json(['error' => 'Could not refresh token'], 401);
        }
    }

        public function forgotPassword(ForgotPasswordRequest $request)
    {
        

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            
            return response()->json([
                'message' => 'If an account exists with this email, you will receive a password reset link.',
            ]);
        }

        
        
        $payload = [
            'email' => $request->email,
            'purpose' => 'password_reset',
            'jti' => Str::random(32),
            'iat' => time(),
            'exp' => time() + 3600, 
        ];

        
        $token = \Firebase\JWT\JWT::encode($payload, config('jwt.secret'), 'HS256');

        
        $resetUrl = config('app.frontend_url', 'http://localhost:5173') . '/reset-password?token=' . urlencode($token);

        try {
            Mail::send([], [], function ($message) use ($request, $resetUrl) {
                $message->to($request->email)
                    ->subject('Reset Your Password - Laundry Care Express')
                    ->html("
                        <h2>Password Reset Request</h2>
                        <p>Hello,</p>
                        <p>You requested to reset your password for your Laundry Care Express account.</p>
                        <p>Click the button below to reset your password:</p>
                        <p style='margin: 20px 0;'>
                            <a href='{$resetUrl}' style='background-color: #00ADF1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;'>
                                Reset Password
                            </a>
                        </p>
                        <p>Or copy this link: {$resetUrl}</p>
                        <p>This link will expire in 60 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                        <br>
                        <p>Thanks,<br>Laundry Care Express Team</p>
                    ");
            });
            Log::info('Password reset email sent', ['email' => $request->email]);
        } catch (\Exception $e) {
            Log::error('Failed to send password reset email', ['email' => $request->email, 'error' => $e->getMessage()]);
        }

        return response()->json([
            'message' => 'If an account exists with this email, you will receive a password reset link.',
        ]);
    }

        public function resetPassword(ResetPasswordRequest $request)
    {
        

        try {
            
            $payload = \Firebase\JWT\JWT::decode(
                $request->token,
                new \Firebase\JWT\Key(config('jwt.secret'), 'HS256')
            );

            
            if (!isset($payload->purpose) || $payload->purpose !== 'password_reset') {
                return response()->json(['error' => 'Invalid reset token'], 400);
            }

            if (!isset($payload->jti)) {
                return response()->json(['error' => 'Invalid reset token format'], 400);
            }

            if (\Illuminate\Support\Facades\Cache::has('pwd_reset_' . $payload->jti)) {
                return response()->json(['error' => 'Reset token has already been used'], 400);
            }

            
            $user = User::where('email', $payload->email)->first();
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            
            $user->password = $request->password;
            $user->mdate = now();
            $user->save();

            \Illuminate\Support\Facades\Cache::put('pwd_reset_' . $payload->jti, true, 3600);

            Log::info('Password reset successful', ['user_id' => $user->id]);

            return response()->json(['message' => 'Password has been reset successfully']);

        } catch (\Firebase\JWT\ExpiredException $e) {
            return response()->json(['error' => 'Reset token has expired'], 400);
        } catch (\Exception $e) {
            Log::error('Password reset failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid or expired reset token'], 400);
        }
    }

        public function google(GoogleAuthRequest $request)
    {
        

        try {
            
            try {
                $googleUser = Socialite::driver('google')->stateless()->userFromToken($request->access_token);
            } catch (\Exception $e) {
                Log::error('Socialite Google token error', [
                    'message' => $e->getMessage(),
                    'token' => $request->access_token
                ]);
                return response()->json(['error' => 'Invalid Google token: ' . $e->getMessage()], 401);
            }

            $email = $googleUser->getEmail();
            $firstName = $googleUser->user['given_name'] ?? '';
            $lastName = $googleUser->user['family_name'] ?? '';

            // Find or create user
            $user = User::where('email', $email)->first();
            $isNewUser = false;

            if (!$user) {
                $isNewUser = true;
                
                $maxUserId = DB::table('lce_user_info')->max('user_id') ?? 100000;
                $password = Str::random(32);

                $user = new User;
                $user->user_id = $maxUserId + 1;
                $user->password = $password;
                $user->email = $email;
                $user->first_name = $firstName;
                $user->last_name = $lastName;
                $user->phone_1 = '';
                $user->address_1 = '';
                $user->city = '';
                $user->state = '';
                $user->zip = '';
                $user->country = 'US';
                $user->price_list_id = 1;
                $user->wash_fold_instructions = ' ';
                $user->customer_type = 'Regular';
                $user->custom_minimum_charge = 0.00;
                $user->cdate = now();
                $user->mdate = now();
                $user->save();

                
                try {
                    app(CreditService::class)->addWelcomeCredit($user->user_id);
                } catch (\Exception $e) {
                    Log::warning('Welcome credit failed (Google)', ['user_id' => $user->user_id, 'error' => $e->getMessage()]);
                }

                
                try {
                    DB::table('lce_communication_settings')->insert([
                        'user_id' => $user->user_id,
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
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Default communication settings creation failed (Google)', ['user_id' => $user->user_id, 'error' => $e->getMessage()]);
                }

                Log::info('User registered via Google', ['user_id' => $user->id]);
            }

            $token = JWTAuth::fromUser($user);

            return response()->json([
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
                'user' => $this->formatUserResponse($user),
                'is_new_user' => $isNewUser,
            ]);
        } catch (\Exception $e) {
            Log::error('Google auth failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Google authentication failed'], 401);
        }
    }

        public function apple(AppleAuthRequest $request)
    {
        

        try {
            
            
            try {
                $appleKeys = \Illuminate\Support\Facades\Cache::remember('apple_jwks', 3600, function () {
                    $jwksJson = file_get_contents('https://appleid.apple.com/auth/keys');
                    if (!$jwksJson) {
                        throw new \Exception('Failed to fetch Apple JWKS');
                    }
                    return $jwksJson;
                });

                $keys = \Firebase\JWT\JWK::parseKeySet(json_decode($appleKeys, true));
                $decoded = \Firebase\JWT\JWT::decode($request->id_token, $keys);

                
                if ($decoded->iss !== 'https://appleid.apple.com') {
                    return response()->json(['error' => 'Invalid Apple token issuer'], 401);
                }

                $expectedAudience = config('services.apple.client_id');
                if (!$expectedAudience) {
                    throw new \Exception('Apple client ID not configured');
                }
                if ($decoded->aud !== $expectedAudience) {
                    return response()->json(['error' => 'Invalid Apple token audience'], 401);
                }

                if (!isset($decoded->email)) {
                    return response()->json(['error' => 'Apple token missing email claim'], 401);
                }

                $email = $decoded->email;
            } catch (\Firebase\JWT\ExpiredException $e) {
                return response()->json(['error' => 'Apple token has expired'], 401);
            } catch (\Firebase\JWT\SignatureInvalidException $e) {
                return response()->json(['error' => 'Invalid Apple token signature'], 401);
            } catch (\Exception $e) {
                Log::error('Apple JWKS verification failed', ['error' => $e->getMessage()]);
                return response()->json(['error' => 'Apple authentication unavailable'], 503);
            }

            
            $user = User::where('email', $email)->first();

            if (!$user) {
                $maxUserId = DB::table('lce_user_info')->max('user_id') ?? 100000;

                $user = User::create([
                    'user_id' => $maxUserId + 1,
                    'password' => Str::random(32),
                    'email' => $email,
                    'first_name' => $request->first_name ?? '',
                    'last_name' => $request->last_name ?? '',
                    'country' => 'US',
                    'price_list_id' => 1,
                    'cdate' => now(),
                    'mdate' => now(),
                ]);

                
                try {
                    app(CreditService::class)->addWelcomeCredit($user->user_id);
                } catch (\Exception $e) {
                    Log::warning('Welcome credit failed (Apple)', ['user_id' => $user->user_id, 'error' => $e->getMessage()]);
                }

                Log::info('User registered via Apple', ['user_id' => $user->id]);
            }

            $token = JWTAuth::fromUser($user);

            return response()->json([
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => config('jwt.ttl') * 60,
                'user' => $this->formatUserResponse($user),
            ]);
        } catch (\Exception $e) {
            Log::error('Apple auth failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Apple authentication failed'], 401);
        }
    }

        private function formatUserResponse(User $user): array
    {
        return [
            'id' => $user->id,
            'user_id' => $user->user_id,
            'email' => $user->email,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'full_name' => $user->full_name,
            'phone' => $user->phone_1,
            'phone_2' => $user->phone_2,
            'cell_phone' => $user->cell_phone_1,
            'address' => [
                'street' => $user->address_1,
                'apt' => $user->address_2,
                'city' => $user->city,
                'state' => $user->state,
                'zip' => $user->zip,
                'country' => $user->country,
            ],
            'payment' => [
                'has_payment_method' => !empty($user->customerPaymentProfileId),
                'card_last_four' => $user->payment_cc_number ? substr($user->payment_cc_number, -4) : null,
            ],
            'price_list_id' => $user->price_list_id,
            'created_at' => $user->cdate?->toIso8601String(),
        ];
    }
}
