<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');



Schedule::command('pickups:generate-recurring')
    ->dailyAt('05:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/recurring-pickups.log'));


Schedule::command('subscriptions:process-nightly')
    ->dailyAt('00:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/subscription-cron.log'));
