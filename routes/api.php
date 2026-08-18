<?php

use App\Http\Controllers\Api\AIFaceSwapController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| The shared API used by the mobile app and the admin dashboard.
| Currently session-authenticated for admin use; customer token auth
| (Sanctum) ships with the customer auth phase — endpoints unchanged.
|
*/

Route::prefix('v1')->middleware(['web', 'auth'])->group(function () {
    Route::post('ai/face-swap', [AIFaceSwapController::class, 'store'])->middleware('throttle:30,1');
});
