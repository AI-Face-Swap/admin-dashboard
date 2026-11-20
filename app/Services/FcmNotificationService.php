<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerNotification;
use App\Models\PushNotification;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmNotificationService
{
    private ?string $cachedAccessToken = null;
    private int $tokenExpiresAt = 0;

    /**
     * Send a push notification to a single customer and persist it in history.
     *
     * @param  array<string, mixed>  $data
     */
    public function notifyCustomer(
        Customer $customer,
        string $type,
        string $title,
        string $body,
        array $data = [],
        ?int $pushNotificationId = null,
        ?string $imageUrl = null,
        ?string $webUrl = null,
        ?string $mobileUrl = null,
    ): array {
        $notification = CustomerNotification::query()->create([
            'customer_id' => $customer->id,
            'push_notification_id' => $pushNotificationId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'image_url' => $imageUrl,
            'web_url' => $webUrl,
            'mobile_url' => $mobileUrl,
            'data' => $data,
        ]);

        if (empty($customer->fcm_token)) {
            return [
                'notification' => $notification,
                'fcm_sent' => false,
                'reason' => 'no_fcm_token',
            ];
        }

        $fcmData = array_merge($data, array_filter([
            'notification_id' => (string) $notification->id,
            'type' => $type,
            'image_url' => $imageUrl,
            'web_url' => $webUrl,
            'mobile_url' => $mobileUrl,
        ], fn ($v) => $v !== null && $v !== ''));

        $sent = $this->sendToToken(
            token: $customer->fcm_token,
            title: $title,
            body: $body,
            data: $fcmData,
            imageUrl: $imageUrl,
        );

        return [
            'notification' => $notification,
            'fcm_sent' => $sent,
        ];
    }

    /**
     * Dispatch a PushNotification campaign (broadcast or single customer).
     */
    public function dispatchCampaign(PushNotification $campaign): PushNotification
    {
        $campaign->update([
            'status' => PushNotification::STATUS_SENDING,
        ]);

        $type = $campaign->scheduled_at
            ? CustomerNotification::TYPE_SCHEDULED
            : ($campaign->target_type === PushNotification::TARGET_SINGLE
                ? CustomerNotification::TYPE_SINGLE
                : CustomerNotification::TYPE_BROADCAST);

        $query = Customer::query()->where('is_banned', false);

        if ($campaign->target_type === PushNotification::TARGET_SINGLE) {
            if (! $campaign->customer_id) {
                $campaign->update([
                    'status' => PushNotification::STATUS_FAILED,
                    'sent_count' => 0,
                    'failed_count' => 1,
                ]);

                return $campaign->fresh();
            }

            $query->where('id', $campaign->customer_id);
        }

        $sentCount = 0;
        $failedCount = 0;
        $data = is_array($campaign->data) ? $campaign->data : [];

        if ($campaign->template_id) {
            $campaign->loadMissing('template:id,slug,name');
            if ($campaign->template) {
                $data['template_id'] = $campaign->template->id;
                $data['template_slug'] = $campaign->template->slug;
                $data['template_name'] = $campaign->template->name;
            }
        }

        $query->chunkById(200, function ($customers) use ($campaign, $type, $data, &$sentCount, &$failedCount) {
            foreach ($customers as $customer) {
                $result = $this->notifyCustomer(
                    customer: $customer,
                    type: $type,
                    title: $campaign->title,
                    body: $campaign->body,
                    data: $data,
                    pushNotificationId: $campaign->id,
                    imageUrl: $campaign->image_url,
                    webUrl: $campaign->web_url,
                    mobileUrl: $campaign->mobile_url,
                );

                if (! empty($customer->fcm_token)) {
                    if ($result['fcm_sent']) {
                        $sentCount++;
                    } else {
                        $failedCount++;
                    }
                } else {
                    $sentCount++;
                }
            }
        });

        $campaign->update([
            'status' => $sentCount > 0 || $failedCount === 0
                ? PushNotification::STATUS_SENT
                : PushNotification::STATUS_FAILED,
            'sent_count' => $sentCount,
            'failed_count' => $failedCount,
            'sent_at' => now(),
        ]);

        return $campaign->fresh();
    }

    /**
     * Send an FCM HTTP v1 message to a device token.
     *
     * @param  array<string, mixed>  $data
     */
    public function sendToToken(string $token, string $title, string $body, array $data = [], ?string $imageUrl = null): bool
    {
        $projectId = $this->resolveProjectId();
        $accessToken = $this->getAccessToken();

        if (! $projectId || ! $accessToken) {
            return false;
        }

        $stringData = [];
        foreach ($data as $key => $value) {
            $stringData[(string) $key] = is_scalar($value) || $value === null
                ? (string) $value
                : json_encode($value);
        }

        $notificationPayload = [
            'title' => $title,
            'body' => $body,
        ];
        if (! empty($imageUrl)) {
            $notificationPayload['image'] = $imageUrl;
        }

        try {
            $response = Http::withToken($accessToken)
                ->timeout(10)
                ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                    'message' => [
                        'token' => $token,
                        'notification' => $notificationPayload,
                        'data' => $stringData,
                    ],
                ]);

            if (! $response->successful()) {
                Log::warning('FCM send failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::warning('FCM send exception: '.$e->getMessage());

            return false;
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function resolveCredentialsArray(): ?array
    {
        $raw = config('services.firebase.credentials_json');
        if (is_string($raw) && trim($raw) !== '') {
            $trimmed = trim($raw);
            $decoded = json_decode($trimmed, true);
            if (! is_array($decoded)) {
                $b64 = base64_decode($trimmed, true);
                if (is_string($b64)) {
                    $decoded = json_decode($b64, true);
                }
            }

            if (is_array($decoded) && ! empty($decoded['client_email']) && ! empty($decoded['private_key'])) {
                return $decoded;
            }
        }

        $path = $this->resolveCredentialsPath();
        if (! $path) {
            return null;
        }

        $decoded = json_decode((string) file_get_contents($path), true);

        return is_array($decoded) ? $decoded : null;
    }

    private function resolveCredentialsPath(): ?string
    {
        $configured = config('services.firebase.credentials');
        if (! $configured || ! is_string($configured)) {
            return null;
        }

        if (str_starts_with($configured, '/')) {
            return file_exists($configured) ? $configured : null;
        }

        $basePath = base_path($configured);
        if (file_exists($basePath)) {
            return $basePath;
        }

        $storagePath = storage_path('app/'.$configured);

        return file_exists($storagePath) ? $storagePath : null;
    }

    private function resolveProjectId(): ?string
    {
        $configured = config('services.firebase.project_id');
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        $json = $this->resolveCredentialsArray();

        return is_array($json) ? ($json['project_id'] ?? null) : null;
    }

    private function getAccessToken(): ?string
    {
        if ($this->cachedAccessToken && time() < ($this->tokenExpiresAt - 60)) {
            return $this->cachedAccessToken;
        }

        $credentialsData = $this->resolveCredentialsArray();
        if (! $credentialsData) {
            return null;
        }

        try {
            $credentials = new ServiceAccountCredentials(
                'https://www.googleapis.com/auth/firebase.messaging',
                $credentialsData,
            );

            $token = $credentials->fetchAuthToken(HttpHandlerFactory::build());
            if (! is_array($token) || empty($token['access_token'])) {
                return null;
            }

            $this->cachedAccessToken = $token['access_token'];
            $this->tokenExpiresAt = time() + (int) ($token['expires_in'] ?? 3600);

            return $this->cachedAccessToken;
        } catch (\Throwable $e) {
            Log::warning('Failed to fetch Firebase OAuth2 token: '.$e->getMessage());

            return null;
        }
    }
}
