<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIModel;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class PointCostController extends Controller
{
    /**
     * Get all point costs from database.
     *
     * This endpoint is used by the frontend to display accurate point costs.
     *
     * @response 200 {"image_generation": 5, "face_swap": 5, "video_face_swap": 20, "image_to_video_480p": 10, "image_to_video_720p": 20, "models": {...}}
     */
    public function index(): JsonResponse
    {
        $activeModels = AIModel::query()
            ->with('generationType')
            ->where('is_active', true)
            ->ordered()
            ->get();

        $modelsMap = [];
        foreach ($activeModels as $m) {
            $cost = (int) ($m->point_cost ?? 5);
            $modelsMap[$m->model_name] = [
                'name' => $m->name ?? $m->model_name,
                'model_name' => $m->model_name,
                'type' => $m->generationType?->slug,
                'point_cost' => $cost,
                'resolution_costs' => $m->resolution_costs,
                'duration_costs' => $m->duration_costs,
                'is_default' => $m->is_default,
                'description' => $m->description,
            ];
        }

        return response()->json([
            'image_generation' => (int) Setting::get('ai', 'point_cost_image_generation', Setting::get('ai', 'coin_cost_image_generation', config('ai.point_costs.image_generation', config('ai.coin_costs.image_generation', 5)))),
            'image_to_video_480p' => (int) Setting::get('ai', 'point_cost_image_to_video_480p', Setting::get('ai', 'coin_cost_image_to_video_480p', config('ai.point_costs.image_to_video_480p', config('ai.coin_costs.image_to_video_480p', 10)))),
            'image_to_video_720p' => (int) Setting::get('ai', 'point_cost_image_to_video_720p', Setting::get('ai', 'coin_cost_image_to_video_720p', config('ai.point_costs.image_to_video_720p', config('ai.coin_costs.image_to_video_720p', 20)))),
            'image_to_video_1080p' => (int) Setting::get('ai', 'point_cost_image_to_video_1080p', Setting::get('ai', 'coin_cost_image_to_video_1080p', config('ai.point_costs.image_to_video_1080p', config('ai.coin_costs.image_to_video_1080p', 35)))),
            'image_edit' => (int) Setting::get('ai', 'point_cost_image_edit', Setting::get('ai', 'coin_cost_image_edit', config('ai.point_costs.image_edit', config('ai.coin_costs.image_edit', 10)))),
            'chat' => (int) Setting::get('ai', 'point_cost_chat', config('ai.point_costs.chat', 5)),

            // Dynamic model-specific pricing and configurations
            'models' => $modelsMap,
        ]);
    }
}
