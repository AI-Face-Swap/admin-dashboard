<?php

namespace App\Http\Middleware;

use App\Models\ApiRequestLog;
use App\Models\Customer;
use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Logs every /api/* request — method, path, headers, body, response,
 * and duration. Response headers are stored in full because they can
 * carry billing/cost information. Request headers exclude sensitive
 * values (Authorization, Cookie).
 */
class LogApiRequests
{
    /**
     * Request headers that are never stored.
     *
     * @var list<string>
     */
    private const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key'];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): SymfonyResponse
    {
        $startedAt = hrtime(true);

        $response = $next($request);

        $authUser = $request->user();

        ApiRequestLog::create([
            'user_id' => $authUser instanceof User ? $authUser->id : null,
            'customer_id' => $authUser instanceof Customer ? $authUser->id : null,
            'method' => $request->method(),
            'path' => $request->path(),
            'request_headers' => $this->safeHeaders($request->headers->all()),
            'request_body' => $this->safeBody($request->except(['password', 'password_confirmation'])),
            'response_status' => $response->getStatusCode(),
            'response_headers' => $this->flattenHeaders($response->headers->all()),
            'response_body' => $this->responseBody($response),
            'duration_ms' => (int) round((hrtime(true) - $startedAt) / 1e6),
        ]);

        return $response;
    }

    /**
     * Filter out sensitive request headers.
     *
     * @param  array<string, array<int, string>>  $headers
     * @return array<string, string>
     */
    private function safeHeaders(array $headers): array
    {
        $safe = [];

        foreach ($headers as $name => $values) {
            if (in_array(strtolower($name), self::SENSITIVE_HEADERS, true)) {
                continue;
            }

            $safe[$name] = implode(', ', $values);
        }

        return $safe;
    }

    /**
     * Reduce a request payload to JSON-safe values (uploaded files become
     * small metadata records instead of raw objects).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function safeBody(array $data): array
    {
        $safe = [];

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $safe[$key] = $this->safeBody($value);
            } elseif (is_scalar($value) || $value === null) {
                $safe[$key] = $value;
            } elseif ($value instanceof UploadedFile) {
                $safe[$key] = [
                    'name' => $value->getClientOriginalName(),
                    'size' => $value->getSize(),
                ];
            }
        }

        return $safe;
    }

    /**
     * Flatten a Symfony headers bag into a simple map.
     *
     * @param  array<string, array<int, string>>  $headers
     * @return array<string, string>
     */
    private function flattenHeaders(array $headers): array
    {
        $flat = [];

        foreach ($headers as $name => $values) {
            $flat[$name] = implode(', ', $values);
        }

        return $flat;
    }

    /**
     * Extract a JSON-serializable response body.
     *
     * @return array<string, mixed>|null
     */
    private function responseBody(SymfonyResponse $response): ?array
    {
        if ($response instanceof JsonResponse) {
            $data = $response->getData(true);

            return is_array($data) ? $data : null;
        }

        if ($response instanceof Response) {
            $decoded = json_decode((string) $response->getContent(), true);

            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }
}
