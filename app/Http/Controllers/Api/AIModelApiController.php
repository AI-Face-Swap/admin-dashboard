<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AIModelApiController extends Controller
{
    /**
     * Get active AI models, optionally filtered by generation type slug.
     *
     * Example: GET /api/v1/ai-models?type=text-to-image
     */
    public function index(Request $request): JsonResponse
    {
        $query = AIModel::query()
            ->with('generationType')
            ->where('is_active', true)
            ->ordered();

        if ($request->filled('type')) {
            $query->forGenerationType($request->string('type')->toString());
        }

        $models = $query->get()->map(fn (AIModel $m) => [
            'id' => $m->id,
            'name' => $m->name ?? $m->model_name,
            'model_name' => $m->model_name,
            'type' => $m->generationType?->slug,
            'provider_name' => $m->provider_name,
            'coin_cost' => $m->coin_cost,
            'resolution_costs' => $m->resolution_costs,
            'duration_costs' => $m->duration_costs,
            'is_default' => (bool) $m->is_default,
            'description' => $m->description,
            'sort_order' => $m->sort_order,
        ]);

        return response()->json([
            'data' => $models,
        ]);
    }
}
