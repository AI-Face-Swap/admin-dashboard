<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\CentralAuthPackageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentPackageController extends Controller
{
    /**
     * Get dynamic subscription packages from HTUT Central Auth SSO.
     */
    public function index(Request $request): JsonResponse
    {
        $forceRefresh = $request->boolean('refresh');
        $packages = CentralAuthPackageService::getPackages($forceRefresh);

        return response()->json([
            'status' => 'success',
            'total' => count($packages),
            'packages' => $packages,
        ]);
    }

    /**
     * Initiate checkout for a selected subscription package via WalMae gateway.
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'package_slug' => ['required', 'string'],
            'payment_method' => ['required', 'string', 'in:kbzpay,mmqr'],
        ]);

        /** @var Customer $customer */
        $customer = $request->user();
        $slug = $validated['package_slug'];
        $paymentMethod = $validated['payment_method'];

        $packages = CentralAuthPackageService::getPackages();
        $package = collect($packages)->firstWhere('slug', $slug);

        if (! $package) {
            return response()->json([
                'status' => 'error',
                'message' => "The selected package '{$slug}' was not found.",
            ], 404);
        }

        $orderReference = 'HTUTAI-' . strtoupper(Str::random(10));
        $amount = (int) $package['price'];

        $walmaeUrl = rtrim(config('services.walmae.url', 'https://cp.walmae.net'), '/');
        $walmaeToken = config('services.walmae.token', '');

        $customerData = [
            'id' => $customer->id,
            'customer_uuid' => $customer->central_auth_uuid,
            'name' => $customer->name ?? 'HTUT AI User',
            'email' => $customer->email ?? '',
            'phone' => $customer->phone ?? '',
        ];

        $payload = [
            'customer' => $customerData,
            'merchant' => 'vvip9',
            'product_name' => $slug,
            'request_type' => 'central_auth',
            'amount' => $amount,
        ];

        $headers = [
            'Accept' => 'application/json',
        ];
        if (! empty($walmaeToken)) {
            $headers['X-API-TOKEN'] = $walmaeToken;
        }

        try {
            if ($paymentMethod === 'kbzpay') {
                $response = Http::withHeaders($headers)
                    ->timeout(12)
                    ->post("{$walmaeUrl}/api/merchant/kbzpay/precreate-payment", $payload);

                if ($response->successful()) {
                    $data = $response->json();
                    $rawPaymentUrl = $data['payment_url'] ?? null;

                    if ($rawPaymentUrl) {
                        $checkoutUrl = 'https://walmae.net/kbzpay/checkout?url=' . urlencode($rawPaymentUrl);

                        return response()->json([
                            'status' => 'success',
                            'message' => 'KBZPay checkout session created successfully.',
                            'checkout_url' => $checkoutUrl,
                            'order_reference' => $data['merchant_order_id'] ?? $orderReference,
                            'package' => $package,
                            'payment_method' => 'kbzpay',
                        ]);
                    }
                }

                Log::warning('WalMae KBZPay precreate failed: ', [
                    'status' => $response->status(),
                    'response' => $response->json() ?? $response->body(),
                ]);
            } elseif ($paymentMethod === 'mmqr') {
                $response = Http::withHeaders($headers)
                    ->timeout(12)
                    ->post("{$walmaeUrl}/api/merchant/mmqr/precreate-payment", $payload);

                if ($response->successful()) {
                    $data = $response->json();
                    $qrCode = $data['qr_code'] ?? null;
                    $merchOrderId = $data['merchant_order_id'] ?? $orderReference;
                    $logo = $data['mmqr_logo'] ?? 'https://cp.walmae.net/mmqrLogo.jpg';
                    $receiverName = $data['receiver_name'] ?? 'WalMae Traders';
                    $amountDisplay = $data['amount'] ?? number_format($amount);

                    return response()->json([
                        'status' => 'success',
                        'message' => 'MMQR checkout session created successfully.',
                        'order_reference' => $merchOrderId,
                        'qr_code' => $qrCode,
                        'mmqr_logo' => $logo,
                        'receiver_name' => $receiverName,
                        'amount_display' => $amountDisplay,
                        'package' => $package,
                        'payment_method' => 'mmqr',
                    ]);
                }

                Log::warning('WalMae MMQR precreate failed: ', [
                    'status' => $response->status(),
                    'response' => $response->json() ?? $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('WalMae checkout exception: ' . $e->getMessage());
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Unable to initiate payment with ' . strtoupper($paymentMethod) . '. Please try again later.',
        ], 502);
    }
}
