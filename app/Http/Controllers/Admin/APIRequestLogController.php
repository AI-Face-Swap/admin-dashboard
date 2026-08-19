<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApiRequestLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class APIRequestLogController extends Controller
{
    /**
     * Display the API request logs page.
     */
    public function index(Request $request): Response
    {
        $query = ApiRequestLog::with('user:id,name,email')
            ->with('customer:id,name,email')
            ->latest();

        if ($request->filled('method')) {
            $query->where('method', strtoupper($request->string('method')));
        }

        if ($request->filled('status')) {
            $query->where('response_status', $request->integer('status'));
        }

        if ($request->filled('path')) {
            $query->where('path', 'like', '%'.$request->string('path').'%');
        }

        $logs = $query->paginate(50)->withQueryString();

        return Inertia::render('admin/api-logs/index', [
            'logs' => $logs,
        ]);
    }

    /**
     * Get a single log entry's full details (for expand/view).
     */
    public function show(ApiRequestLog $log): JsonResponse
    {
        $log->load('user:id,name,email', 'customer:id,name,email');

        return response()->json($log);
    }
}
