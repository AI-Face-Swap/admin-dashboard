<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessFaceSwap;
use App\Jobs\ProcessImageEdit;
use App\Jobs\ProcessImageGeneration;
use App\Jobs\ProcessImageToVideo;
use App\Jobs\ProcessVideoFaceSwap;
use App\Models\AIGeneration;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    /**
     * Display the Queue Monitor dashboard and active/recent generations.
     */
    public function index(Request $request): Response
    {
        $statusFilter = $request->input('status', 'all');
        $operationFilter = $request->input('operation', 'all');
        $search = $request->input('search');

        $query = AIGeneration::query()
            ->with(['customer:id,name,email,avatar,central_auth_uuid', 'template:id,name,slug'])
            ->latest('id');

        if ($statusFilter && $statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        if ($operationFilter && $operationFilter !== 'all') {
            $query->where('operation', $operationFilter);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('id', $search)
                    ->orWhere('client_idempotency_token', 'like', "%{$search}%")
                    ->orWhere('error', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('central_auth_uuid', 'like', "%{$search}%");
                    });
            });
        }

        $generations = $query->paginate(20)->withQueryString();

        return Inertia::render('admin/queue/index', [
            'metrics' => $this->collectMetrics(),
            'generations' => $generations,
            'filters' => [
                'status' => $statusFilter,
                'operation' => $operationFilter,
                'search' => $search,
            ],
        ]);
    }

    /**
     * Return live metrics JSON for lightweight polling.
     */
    public function metrics(): JsonResponse
    {
        return response()->json($this->collectMetrics());
    }

    /**
     * Retry a failed generation from the admin dashboard.
     */
    public function retry(AIGeneration $generation): RedirectResponse
    {
        if ($generation->status !== AIGeneration::STATUS_FAILED) {
            return back()->with('error', 'Only failed generations can be re-queued.');
        }

        $generation->update([
            'status' => AIGeneration::STATUS_QUEUED,
            'error' => null,
            'submission_state' => AIGeneration::SUBMISSION_SUBMITTING,
        ]);

        $payload = $generation->input_metadata ?? [];
        $customerId = $generation->customer_id;
        $pointCost = $generation->coins_spent ?? 0;

        match ($generation->operation) {
            'image-generation', 'text-to-image' => ProcessImageGeneration::dispatch(
                $generation->id,
                $payload,
                $customerId,
                $pointCost,
                $payload['model'] ?? null,
            ),
            'face-swap' => ProcessFaceSwap::dispatch(
                $generation->id,
                $payload,
                $generation->template_id,
                $customerId,
                $pointCost,
            ),
            'image-editing', 'image-edit' => ProcessImageEdit::dispatch(
                $generation->id,
                $payload,
                $customerId,
                $pointCost,
                $payload['model'] ?? null,
            ),
            'image-to-video' => ProcessImageToVideo::dispatch(
                $generation->id,
                $payload,
                $customerId,
                $pointCost,
                $payload['model'] ?? null,
            ),
            'video-face-swap' => ProcessVideoFaceSwap::dispatch(
                $generation->id,
                $payload,
                $generation->template_id,
                $customerId,
                $pointCost,
            ),
            default => null,
        };

        return back()->with('success', "Generation #{$generation->id} has been re-queued successfully.");
    }

    /**
     * Collect real-time queue and generation metrics.
     *
     * @return array<string, mixed>
     */
    protected function collectMetrics(): array
    {
        $redisStatus = 'offline';
        $redisQueueSize = null;

        try {
            $redisConnection = config('queue.connections.redis.connection', 'default');
            $queueName = config('queue.connections.redis.queue', 'default');
            $redis = Redis::connection($redisConnection);
            $redis->ping();
            $redisStatus = 'connected';
            $redisQueueSize = (int) $redis->llen("queues:{$queueName}");
        } catch (\Throwable) {
            $redisStatus = 'offline';
        }

        $today = Carbon::today();

        return [
            'queued_count' => AIGeneration::where('status', AIGeneration::STATUS_QUEUED)->count(),
            'processing_count' => AIGeneration::where('status', AIGeneration::STATUS_PROCESSING)->count(),
            'completed_today' => AIGeneration::where('status', AIGeneration::STATUS_COMPLETED)->whereDate('updated_at', $today)->count(),
            'failed_today' => AIGeneration::where('status', AIGeneration::STATUS_FAILED)->whereDate('updated_at', $today)->count(),
            'total_refunded_points_today' => (int) AIGeneration::where('status', AIGeneration::STATUS_FAILED)
                ->whereNotNull('refunded_at')
                ->whereDate('refunded_at', $today)
                ->sum('points_refunded'),
            'redis_status' => $redisStatus,
            'redis_queue_size' => $redisQueueSize,
            'queue_driver' => config('queue.default', 'redis'),
            'refreshed_at' => now()->toIso8601String(),
        ];
    }
}
