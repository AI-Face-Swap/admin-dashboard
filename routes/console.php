<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Auto-fail generations stuck in processing for more than 10 minutes.
Schedule::command('app:cleanup-stuck-generations')->everyFiveMinutes();
