<?php

namespace App\AI\Providers\Segmind;

use App\AI\Contracts\AIProviderInterface;
use App\AI\DTOs\AIResponse;
use App\AI\DTOs\GenerationRequest;
use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Exceptions\AIGenerationTimeoutException;
use App\AI\Exceptions\UnsupportedOperationException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Segmind provider implementation (v2 async submit + poll flow).
 *
 * Flow (verified against segmind.com model docs + the official SDK):
 *  1. POST /v2/{endpoint} -> { request_id, status_url, response_url }
 *  2. Poll GET {status_url} -> QUEUED | PROCESSING | COMPLETED | FAILED
 *     (FAILED is served as HTTP 422 with the error detail still in the body)
 *  3. GET {response_url} -> final result body (retained ~1 hour)
 *
 * Output normalization: the docs claim `output` is a media URL, but real
 * responses have been observed as base64 — both are handled here. Base64
 * output is decoded and stored on the configured disk, and the persistent
 * URL is returned instead.
 */
class SegmindProvider implements AIProviderInterface
{
    public const DEFAULT_BASE_URL = 'https://api.segmind.com/v2';

    public const DEFAULT_POLL_INTERVAL_SECONDS = 1;

    public const DEFAULT_POLL_TIMEOUT_SECONDS = 600;

    /**
     * @param  array<string, string>  $operations  Operation -> endpoint slug map (e.g. ['face-swap' => 'faceswap-v5'])
     */
    public function __construct(
        private readonly string $baseUrl,
        private readonly array $operations,
        private readonly string $apiKey,
        private readonly string $storageDisk = 'spaces',
        private readonly int $pollTimeoutSeconds = self::DEFAULT_POLL_TIMEOUT_SECONDS,
        private readonly int $pollIntervalSeconds = self::DEFAULT_POLL_INTERVAL_SECONDS,
    ) {}

    /**
     * {@inheritDoc}
     */
    public function name(): string
    {
        return 'segmind';
    }

    /**
     * {@inheritDoc}
     */
    public function supports(string $operation): bool
    {
        return isset($this->operations[$operation]);
    }

    /**
     * {@inheritDoc}
     */
    public function generateImage(GenerationRequest $request): AIResponse
    {
        throw new UnsupportedOperationException('Segmind image generation is not implemented yet.');
    }

    /**
     * {@inheritDoc}
     */
    public function videoFaceSwap(GenerationRequest $request): AIResponse
    {
        $endpoint = $this->operations['video-face-swap']
            ?? throw new UnsupportedOperationException('Segmind video face swap endpoint is not configured.');

        $startedAt = hrtime(true);

        $submit = $this->submit($endpoint, $request->payload);

        $requestId = $submit['request_id'] ?? null;
        $statusUrl = $submit['status_url'] ?? null;
        $responseUrl = $submit['response_url'] ?? null;

        if (! $requestId || ! $statusUrl || ! $responseUrl) {
            throw new AIGenerationFailedException(
                'Segmind v2 submit response was missing request_id/status_url/response_url.',
                null,
                $submit,
            );
        }

        // Video generation takes 5+ minutes — use a longer poll timeout.
        $this->pollUntilTerminal($requestId, $statusUrl, timeoutSeconds: 600);

        $result = $this->fetchResult($requestId, $responseUrl);

        $durationMs = isset($result['metrics']['inference_time'])
            ? (int) round((float) $result['metrics']['inference_time'] * 1000)
            : (int) round((hrtime(true) - $startedAt) / 1e6);

        $cost = isset($result['metrics']['cost'])
            ? (string) $result['metrics']['cost']
            : null;

        return new AIResponse(
            provider: $this->name(),
            operation: 'video-face-swap',
            model: $request->model,
            requestId: $requestId,
            status: 'completed',
            durationMs: $durationMs,
            output: $this->normalizeOutput($result['output'] ?? null),
            usage: is_array($result['metrics'] ?? null) ? $result['metrics'] : null,
            cost: $cost,
            currency: $cost !== null ? 'USD' : null,
            rawResponse: $result,
        );
    }

    /**
     * {@inheritDoc}
     */
    public function faceSwap(GenerationRequest $request): AIResponse
    {
        $endpoint = $this->operations['face-swap']
            ?? throw new UnsupportedOperationException('Segmind face swap endpoint is not configured.');

        $startedAt = hrtime(true);

        $submit = $this->submit($endpoint, $request->payload);

        $requestId = $submit['request_id'] ?? null;
        $statusUrl = $submit['status_url'] ?? null;
        $responseUrl = $submit['response_url'] ?? null;

        if (! $requestId || ! $statusUrl || ! $responseUrl) {
            throw new AIGenerationFailedException(
                'Segmind v2 submit response was missing request_id/status_url/response_url.',
                null,
                $submit,
            );
        }

        $this->pollUntilTerminal($requestId, $statusUrl);

        $result = $this->fetchResult($requestId, $responseUrl);

        $durationMs = isset($result['metrics']['inference_time'])
            ? (int) round((float) $result['metrics']['inference_time'] * 1000)
            : (int) round((hrtime(true) - $startedAt) / 1e6);

        // Segmind reports the real cost in metrics.cost (verified live).
        // Keep null when the provider does not report one — never fake 0.
        $cost = isset($result['metrics']['cost'])
            ? (string) $result['metrics']['cost']
            : null;

        return new AIResponse(
            provider: $this->name(),
            operation: 'face-swap',
            model: $request->model,
            requestId: $requestId,
            status: 'completed',
            durationMs: $durationMs,
            output: $this->normalizeOutput($result['output'] ?? null),
            usage: is_array($result['metrics'] ?? null) ? $result['metrics'] : null,
            cost: $cost,
            currency: $cost !== null ? 'USD' : null,
            rawResponse: $result,
        );
    }

    /**
     * POST to the v2 endpoint and return the submit body.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function submit(string $endpoint, array $payload): array
    {
        $response = $this->client()->post($this->baseUrl.'/'.$endpoint, $payload);

        $body = $response->json();

        if (is_array($body) && ($body['status'] ?? null) === 'FAILED') {
            throw new AIGenerationFailedException(
                'Segmind submit failed: '.($body['error'] ?? 'unknown error'),
                isset($body['request_id']) ? (string) $body['request_id'] : null,
                $body,
            );
        }

        if ($response->successful() && is_array($body)) {
            return $body;
        }

        $this->throwForHttpError($response);
    }

    /**
     * Poll the status endpoint until a terminal state or the deadline.
     *
     * @throws AIGenerationFailedException
     * @throws AIGenerationTimeoutException
     */
    private function pollUntilTerminal(string $requestId, string $statusUrl, ?int $timeoutSeconds = null): void
    {
        $timeout = $timeoutSeconds ?? $this->pollTimeoutSeconds;
        $deadline = microtime(true) + $timeout;

        while (true) {
            $body = $this->getStatus($requestId, $statusUrl);
            $status = strtoupper((string) ($body['status'] ?? ''));

            if ($status === 'COMPLETED') {
                return;
            }

            if ($status === 'FAILED') {
                throw new AIGenerationFailedException(
                    'Segmind generation failed: '.($body['error'] ?? 'unknown error'),
                    $requestId,
                    $body,
                );
            }

            if (microtime(true) >= $deadline) {
                throw new AIGenerationTimeoutException(
                    "Segmind generation timed out after {$timeout}s.",
                    $requestId,
                );
            }

            sleep($this->pollIntervalSeconds);
        }
    }

    /**
     * GET the status endpoint. Tolerates the FAILED-as-422 response.
     *
     * @return array<string, mixed>
     */
    private function getStatus(string $requestId, string $statusUrl): array
    {
        $response = $this->client()->get($statusUrl);

        $body = $response->json();

        if (is_array($body) && isset($body['status'])) {
            return $body;
        }

        if ($response->successful()) {
            return is_array($body) ? $body : [];
        }

        $this->throwForHttpError($response, $requestId);
    }

    /**
     * GET the final result body.
     *
     * @return array<string, mixed>
     */
    private function fetchResult(string $requestId, string $responseUrl): array
    {
        $response = $this->client()->get($responseUrl);

        $body = $response->json();

        if (is_array($body)) {
            return $body;
        }

        if ($response->successful()) {
            return [];
        }

        $this->throwForHttpError($response, $requestId);
    }

    /**
     * Convert whatever the provider put in `output` into a list of
     * persistent public URLs.
     *
     * @return list<string>
     */
    private function normalizeOutput(mixed $output): array
    {
        $values = [];

        if (is_string($output)) {
            $values[] = $output;
        } elseif (is_array($output)) {
            foreach ($output as $item) {
                if (is_string($item)) {
                    $values[] = $item;
                } elseif (is_array($item) && isset($item['data'])) {
                    // PixelFlow-style shape: { data: ..., type: ... }
                    $values[] = (string) $item['data'];
                }
            }
        }

        $urls = [];

        foreach ($values as $value) {
            $url = $this->persistOutput($value);

            if ($url !== null) {
                $urls[] = $url;
            }
        }

        return $urls;
    }

    /**
     * Normalize a single output value into a persistent URL. URLs pass
     * through; base64 payloads (data URIs or raw base64) are decoded and
     * stored on the configured disk.
     */
    private function persistOutput(string $value): ?string
    {
        if (Str::startsWith($value, 'http://') || Str::startsWith($value, 'https://')) {
            return $value;
        }

        if (Str::startsWith($value, 'data:')) {
            $mime = Str::of($value)->after('data:')->before(';')->toString();
            $base64 = Str::of($value)->after(',')->toString();

            if ($base64 === '') {
                return null;
            }

            return $this->storeBytes($base64, $mime);
        }

        // Raw base64 (strict decode fails on URLs and other non-base64 text).
        if (base64_decode($value, true) !== false) {
            return $this->storeBytes($value, null);
        }

        return null;
    }

    /**
     * Decode base64 bytes, store them on the disk, and return the URL.
     */
    private function storeBytes(string $base64, ?string $mime): string
    {
        $decoded = base64_decode($base64, true);

        if ($decoded === false) {
            throw new RuntimeException('Segmind returned invalid base64 output.');
        }

        $extension = match ($mime) {
            'image/png' => 'png',
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            'video/mp4' => 'mp4',
            default => $mime !== null && $mime !== '' ? Str::after($mime, '/') : 'bin',
        };

        $path = 'generations/'.Str::uuid().'.'.$extension;

        Storage::disk($this->storageDisk)->put($path, $decoded, 'public');

        return Storage::disk($this->storageDisk)->url($path);
    }

    /**
     * Shared HTTP client with the API key header.
     */
    private function client(): PendingRequest
    {
        return Http::withHeaders(['x-api-key' => $this->apiKey])->acceptJson();
    }

    /**
     * Convert a failed HTTP response into a typed exception.
     */
    private function throwForHttpError(Response $response, ?string $requestId = null): never
    {
        $body = $response->json();

        if (is_array($body) && ($body['status'] ?? null) === 'FAILED') {
            throw new AIGenerationFailedException(
                'Segmind generation failed: '.($body['error'] ?? 'unknown error'),
                $requestId,
                $body,
            );
        }

        $detail = is_array($body) ? json_encode($body, JSON_THROW_ON_ERROR) : (string) $response->body();

        throw new RuntimeException("Segmind request failed (HTTP {$response->status()}): {$detail}", $response->status());
    }
}
