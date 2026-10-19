<?php

use App\Http\Controllers\Api\AIChatController;
use App\Http\Controllers\Api\AIFaceSwapController;
use App\Http\Controllers\Api\AIGenerationStatusController;
use App\Http\Controllers\Api\AIImageEditController;
use App\Http\Controllers\Api\AIImageGenerationController;
use App\Http\Controllers\Api\AIImageToVideoController;
use App\Http\Controllers\Api\AIModelApiController;
use App\Http\Controllers\Api\AIVideoFaceSwapController;
use App\Http\Controllers\Api\Auth\SocialAuthController;
use App\Http\Controllers\Api\CustomerAuthController;
use App\Http\Controllers\Api\CustomerGenerationController;
use App\Http\Controllers\Api\HomePageController;
use App\Http\Controllers\Api\HtutCentralAuthController;
use App\Http\Controllers\Api\PaymentPackageController;
use App\Http\Controllers\Api\PointCostController;
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

// ── Mobile SDK Social Login (Direct mobile access with verified id_token, synced to Central Auth) ──
Route::post('/auth/{provider}/login', [SocialAuthController::class, 'login'])->middleware('throttle:30,1');

// HTUT Central Auth SSO & S2S Webhook
Route::prefix('v1')->group(function () {
    // ── Mobile SDK Social Login (Direct mobile access with verified id_token, synced to Central Auth) ──
    Route::post('auth/{provider}/login', [SocialAuthController::class, 'login'])->middleware('throttle:30,1');

    Route::get('auth/htut/redirect', [HtutCentralAuthController::class, 'redirect'])->name('api.v1.auth.htut.redirect');
    Route::get('auth/htut/callback', [HtutCentralAuthController::class, 'callback'])->name('api.v1.auth.htut.callback');
    Route::post('auth/htut/callback', [HtutCentralAuthController::class, 'mobileCallback'])->name('api.v1.auth.htut.mobile-callback');
    Route::post('htut/customer/sync', [HtutCentralAuthController::class, 'syncCustomerWebhook'])->name('api.v1.htut.customer.sync');
    Route::post('htut/packages/cache-clear', [HtutCentralAuthController::class, 'clearPackageCache'])->name('api.v1.htut.packages.cache-clear');
});

Route::prefix('v1')->group(function () {
    Route::get('sliders', [SliderController::class, 'index']);
    Route::get('templates', [TemplateController::class, 'index']);
    Route::get('templates/{slug}', [TemplateController::class, 'show']);
    Route::get('template-categories', [TemplateCategoryController::class, 'index']);
    Route::get('point-costs', [PointCostController::class, 'index']);
    Route::get('ai-models', [AIModelApiController::class, 'index']);

    // Home Page Dynamic Content
    Route::get('home-heroes', [HomePageController::class, 'heroes']);
    Route::get('home-showcases', [HomePageController::class, 'showcases']);
    Route::get('home-features', [HomePageController::class, 'features']);
    Route::get('partners', [HomePageController::class, 'partners']);
    Route::get('packages', [PaymentPackageController::class, 'index']);
    Route::get('settings/footer', [HomePageController::class, 'footerSettings']);

    // Local Dev Testing Routes (WebSockets & SSE Streaming)
    Route::get('test/broadcast', function () {
        broadcast(new \App\Events\TestBroadcastEvent(
            message: 'Hello from Laravel Reverb! WebSocket real-time broadcast is active 🚀',
            meta: ['triggered_by' => 'web_tester', 'sent_at' => now()->toIso8601String()]
        ));
        return response()->json([
            'status' => 'success',
            'message' => 'Event broadcasted to Reverb on channel [test-channel]!',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    Route::match(['GET', 'POST'], 'test/stream-chat', function (\Illuminate\Http\Request $request) {
        $prompt = $request->input('prompt', 'Why is HTUT AI so fast?');
        return response()->stream(function () use ($prompt) {
            $words = [
                '✨', 'Hello!', 'This', 'is', 'a', 'live', 'SSE', '(Server-Sent', 'Events)', 'stream', 'from', 'HTUT', 'AI.',
                "\n\n",
                'You', 'asked:', '"' . htmlspecialchars($prompt) . '"',
                "\n\n",
                '⚡', 'Real-time', 'tokens', 'stream', 'directly', 'from', 'our', 'backend',
                'to', 'your', 'client', 'without', 'waiting', 'for', 'the', 'entire', 'response', 'to', 'finish.',
                "\n\n",
                '🚀', 'Laravel', 'Reverb', 'handles', 'the', 'WebSockets,', 'and', 'PHP', 'SSE', 'handles', 'the', 'conversational', 'streaming!',
                "\n\n",
                'Everything', 'is', 'working', 'perfectly! ✅'
            ];

            foreach ($words as $word) {
                if (connection_aborted()) {
                    break;
                }
                $payload = json_encode([
                    'type' => 'chunk',
                    'content' => $word . ' ',
                ]);
                echo "data: {$payload}\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
                usleep(80000); // 80ms delay per word to simulate AI generation
            }

            echo "data: [DONE]\n\n";
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    });
});

Route::prefix('v1')->middleware(['auth:sanctum', 'customer.not-banned'])->group(function () {
    Route::post('auth/logout', [CustomerAuthController::class, 'logout']);
    Route::get('auth/me', [CustomerAuthController::class, 'me']);
    Route::post('customer/avatar', [CustomerAuthController::class, 'updateAvatar']);
    Route::post('packages/checkout', [PaymentPackageController::class, 'checkout']);

    // Customer Chat Conversations & Messages
    Route::get('chat/conversations', [AIChatController::class, 'index']);
    Route::get('chat/conversations/{conversation}', [AIChatController::class, 'show']);
    Route::delete('chat/conversations/{conversation}', [AIChatController::class, 'destroy']);
    // Customer AI Chat Question (Requires Bearer token authentication & sufficient points)
    Route::post('chat/send', [AIChatController::class, 'send'])->middleware('throttle:30,1');

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
