<?php

use App\Http\Controllers\Api\AIFaceSwapController;
use App\Http\Controllers\Api\AIGenerationStatusController;
use App\Http\Controllers\Api\AIImageGenerationController;
use App\Http\Controllers\Api\AIImageToVideoController;
use App\Http\Controllers\Api\AIVideoFaceSwapController;
use App\Http\Controllers\Api\CoinCostController;
use App\Http\Controllers\Api\CustomerAuthController;
use App\Http\Controllers\Api\CustomerGenerationController;
use App\Http\Controllers\Api\SliderController;
use App\Http\Controllers\Api\TemplateCategoryController;
use App\Http\Controllers\Api\TemplateController;
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
    Route::post('auth/forgot-password', [CustomerAuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('auth/reset-password', [CustomerAuthController::class, 'resetPassword']);
});

// Email verification — uses signed URL from email, no auth required
Route::prefix('v1')->get('email/verify/{id}/{hash}', [CustomerAuthController::class, 'verifyEmail'])
    ->middleware('signed')
    ->name('api.v1.email.verify');

Route::prefix('v1')->group(function () {
    Route::get('sliders', [SliderController::class, 'index']);
    Route::get('templates', [TemplateController::class, 'index']);
    Route::get('templates/{slug}', [TemplateController::class, 'show']);
    Route::get('template-categories', [TemplateCategoryController::class, 'index']);
    Route::get('coin-costs', [CoinCostController::class, 'index']);
});

Route::prefix('v1')->middleware(['auth:sanctum', 'customer.not-banned'])->group(function () {
    Route::post('auth/logout', [CustomerAuthController::class, 'logout']);
    Route::get('auth/me', [CustomerAuthController::class, 'me']);
    Route::post('auth/email/verify/resend', [CustomerAuthController::class, 'sendVerificationEmail']);

    Route::post('ai/face-swap', [AIFaceSwapController::class, 'store'])->middleware('throttle:30,1');
    Route::post('ai/video-face-swap', [AIVideoFaceSwapController::class, 'store'])->middleware('throttle:10,1');
    Route::post('ai/images', [AIImageGenerationController::class, 'store'])->middleware('throttle:20,1');
    Route::post('ai/image-to-video', [AIImageToVideoController::class, 'store'])->middleware('throttle:10,1');
    Route::get('ai/generations/{generation}', [AIGenerationStatusController::class, 'show']);
    Route::get('customer/generations', [CustomerGenerationController::class, 'index']);
});
