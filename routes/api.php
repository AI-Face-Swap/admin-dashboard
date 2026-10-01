<?php

use App\Http\Controllers\Api\AIFaceSwapController;
use App\Http\Controllers\Api\AIGenerationStatusController;
use App\Http\Controllers\Api\AIImageEditController;
use App\Http\Controllers\Api\AIImageGenerationController;
use App\Http\Controllers\Api\AIImageToVideoController;
use App\Http\Controllers\Api\AIVideoFaceSwapController;
use App\Http\Controllers\Api\CoinCostController;
use App\Http\Controllers\Api\CustomerAuthController;
use App\Http\Controllers\Api\CustomerGenerationController;
use App\Http\Controllers\Api\HomePageController;
use App\Http\Controllers\Api\HtutCentralAuthController;
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

// All Customer Authentication is handled exclusively via HTUT Central Auth SSO

// HTUT Central Auth SSO & S2S Webhook
Route::prefix('v1')->group(function () {
    Route::get('auth/htut/redirect', [HtutCentralAuthController::class, 'redirect'])->name('api.v1.auth.htut.redirect');
    Route::get('auth/htut/callback', [HtutCentralAuthController::class, 'callback'])->name('api.v1.auth.htut.callback');
    Route::post('htut/customer/sync', [HtutCentralAuthController::class, 'syncCustomerWebhook'])->name('api.v1.htut.customer.sync');
});

Route::prefix('v1')->group(function () {
    Route::get('sliders', [SliderController::class, 'index']);
    Route::get('templates', [TemplateController::class, 'index']);
    Route::get('templates/{slug}', [TemplateController::class, 'show']);
    Route::get('template-categories', [TemplateCategoryController::class, 'index']);
    Route::get('coin-costs', [CoinCostController::class, 'index']);

    // Home Page Dynamic Content
    Route::get('home-heroes', [HomePageController::class, 'heroes']);
    Route::get('home-showcases', [HomePageController::class, 'showcases']);
    Route::get('home-features', [HomePageController::class, 'features']);
    Route::get('partners', [HomePageController::class, 'partners']);
    Route::get('packages', [App\Http\Controllers\Api\PaymentPackageController::class, 'index']);
    Route::get('settings/footer', [HomePageController::class, 'footerSettings']);
});

Route::prefix('v1')->middleware(['auth:sanctum', 'customer.not-banned'])->group(function () {
    Route::post('auth/logout', [CustomerAuthController::class, 'logout']);
    Route::get('auth/me', [CustomerAuthController::class, 'me']);
    Route::post('customer/avatar', [CustomerAuthController::class, 'updateAvatar']);
    Route::post('packages/checkout', [App\Http\Controllers\Api\PaymentPackageController::class, 'checkout']);

    Route::post('ai/face-swap', [AIFaceSwapController::class, 'store'])->middleware('throttle:30,1');
    Route::post('ai/video-face-swap', [AIVideoFaceSwapController::class, 'store'])->middleware('throttle:10,1');
    Route::post('ai/images', [AIImageGenerationController::class, 'store'])->middleware('throttle:20,1');
    Route::post('ai/image-to-video', [AIImageToVideoController::class, 'store'])->middleware('throttle:10,1');
    Route::post('ai/image-edit', [AIImageEditController::class, 'store'])->middleware('throttle:20,1');
    Route::get('ai/generations/{generation}', [AIGenerationStatusController::class, 'show']);
    Route::get('ai/generations/{generation}/download', [AIGenerationStatusController::class, 'download']);
    Route::delete('ai/generations/{generation}', [AIGenerationStatusController::class, 'destroy']);
    Route::get('customer/generations', [CustomerGenerationController::class, 'index']);
});
