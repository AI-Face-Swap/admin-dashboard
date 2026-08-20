<?php

use App\Http\Controllers\Api\AIFaceSwapController;
use App\Http\Controllers\Api\AIGenerationStatusController;
use App\Http\Controllers\Api\AIImageGenerationController;
use App\Http\Controllers\Api\AIVideoFaceSwapController;
use App\Http\Controllers\Api\CustomerAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| The shared API used by the mobile app and the admin dashboard.
|
| Auth model:
|  - Customers (mobile app) authenticate with Sanctum Bearer tokens.
|  - Admins (dashboard) authenticate with the session cookie via
|    Sanctum's stateful handling — the face-swap endpoint accepts both.
|
*/

Route::prefix('v1')->middleware('guest:customer')->group(function () {
    Route::post('auth/register', [CustomerAuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('auth/login', [CustomerAuthController::class, 'login'])->middleware('throttle:10,1');
});

Route::prefix('v1')->middleware(['auth:sanctum', 'customer.not-banned'])->group(function () {
    Route::post('auth/logout', [CustomerAuthController::class, 'logout']);
    Route::get('auth/me', [CustomerAuthController::class, 'me']);

    Route::post('ai/face-swap', [AIFaceSwapController::class, 'store'])->middleware('throttle:30,1');
    Route::post('ai/video-face-swap', [AIVideoFaceSwapController::class, 'store'])->middleware('throttle:10,1');
    Route::post('ai/images', [AIImageGenerationController::class, 'store'])->middleware('throttle:20,1');
    Route::get('ai/generations/{generation}', [AIGenerationStatusController::class, 'show']);
});
