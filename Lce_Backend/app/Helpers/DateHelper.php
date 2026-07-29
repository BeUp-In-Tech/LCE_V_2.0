<?php

namespace App\Helpers;

use Carbon\Carbon;

class DateHelper
{
        public static function now(): Carbon
    {
        return Carbon::now(config('app.timezone_display'));
    }

        public static function today(): string
    {
        return static::now()->format('Y-m-d');
    }

        public static function toDisplay(Carbon|string|null $date): ?Carbon
    {
        if (!$date) return null;

        if (is_string($date)) {
            $date = Carbon::parse($date);
        }

        return $date->setTimezone(config('app.timezone_display'));
    }

        public static function formatForUser(Carbon|string|null $date, string $format = 'M j, Y g:i A'): string
    {
        $converted = static::toDisplay($date);
        return $converted ? $converted->format($format) : 'N/A';
    }

        public static function formatDate(Carbon|string|null $date): string
    {
        return static::formatForUser($date, 'M j, Y');
    }

        public static function formatDateIso(Carbon|string|null $date): string
    {
        return static::formatForUser($date, 'Y-m-d');
    }
}
