<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

        protected $table = 'lce_user_info';

        protected $primaryKey = 'id';

        public $timestamps = false;

        protected $fillable = [
        'user_id',
        'password',
        'email',
        'first_name',
        'last_name',
        'phone_1',
        'phone_2',
        'phone_3',
        'cell_phone_1',
        'opt_in',
        'address_1',
        'address_2',
        'city',
        'state',
        'zip',
        'country',
        'nearest_cross_street',
        'geo_address',
        'geo_lat',
        'geo_lng',
        'payment_type',
        'payment_cc_number',
        'payment_cc_edate_month',
        'payment_cc_edate_year',
        'customerProfileId',
        'customerPaymentProfileId',
        'payment_phone',
        'payment_address_1',
        'payment_address_2',
        'payment_city',
        'payment_state',
        'payment_zip',
        'payment_country',
        'driver_instructions',
        'laundry_instructions',
        'laundry_pref_detergent',
        'laundry_pref_softener',
        'laundry_pref_bleach',
        'laundry_pref_hanging',
        'laundry_pref_starch',
        'laundry_pref_shirts',
        'price_list_id',
        'wash_fold_instructions',
        'customer_type',
        'custom_minimum_charge',
        'cdate',
        'mdate',
    ];

        protected $hidden = [
        'password',
        'customerProfileId',
        'customerPaymentProfileId',
    ];

        protected function casts(): array
    {
        return [
            'cdate' => 'datetime',
            'mdate' => 'datetime',
            'geo_lat' => 'float',
            'geo_lng' => 'float',
        ];
    }

        public function getJWTIdentifier()
    {
        return $this->getKey();
    }

        public function getJWTCustomClaims()
    {
        return [];
    }

        public function getAuthPassword()
    {
        return $this->password;
    }

        public function setPasswordAttribute($value)
    {
        if (str_starts_with($value, '$2y$') || str_starts_with($value, '$2a$') || str_starts_with($value, '$2b$')) {
            $this->attributes['password'] = $value;
        } else {
            $this->attributes['password'] = password_hash($value, PASSWORD_BCRYPT, ['cost' => 10]);
        }
    }

        public function verifyPassword(string $plainPassword): bool
    {
        $storedHash = trim($this->password);
        
        
        if (empty($storedHash) && !empty($this->user_md)) {
            $storedHash = trim($this->user_md);
        }

        
        if (str_starts_with($storedHash, '$2y$') || str_starts_with($storedHash, '$2a$') || str_starts_with($storedHash, '$2b$')) {
            return password_verify($plainPassword, $storedHash);
        }

        
        if (preg_match('/^[0-9a-f]{32}:(.+)$/i', $storedHash)) {
            [$hashPart, $salt] = explode(':', $storedHash, 2);
            $matches = hash_equals(strtolower($hashPart), md5($plainPassword . $salt));
            if ($matches) {
                $this->upgradePasswordToBcrypt($plainPassword);
            }
            return $matches;
        }

        
        if (preg_match('/^[0-9a-f]{32}$/i', $storedHash)) {
            $matches = hash_equals(strtolower($storedHash), md5($plainPassword));
            if ($matches) {
                $this->upgradePasswordToBcrypt($plainPassword);
            }
            return $matches;
        }

        return false;
    }

        private function upgradePasswordToBcrypt(string $plainPassword): void
    {
        $this->password = $plainPassword;
        $this->save();
    }

        public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

        public function getPickups()
    {
        return DB::table('lce_user_pickup')->where('user_id', $this->user_id);
    }

        public function getInvoices()
    {
        return DB::table('lce_user_invoice')->where('user_id', $this->user_id);
    }

        public function getSubscriptions()
    {
        return DB::table('lce_user_subscription')->where('user_id', $this->user_id);
    }

        public function getCredits()
    {
        return DB::table('lce_credit')->where('user_id', $this->user_id);
    }

        public function getCommunicationSettings()
    {
        return DB::table('lce_user_communicate')->where('user_id', $this->user_id);
    }
}
