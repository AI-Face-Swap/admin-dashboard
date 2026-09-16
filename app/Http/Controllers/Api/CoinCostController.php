<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIModel;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class CoinCostController extends Controller
{
    /**
     * Get all coin costs from database.
     *
     * This endpoint is used by the frontend to display accurate costs.
     * Never hardcode costs in the frontend — always fetch from here.
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
            $modelsMap[$m->model_name] = [
                'name' => $m->name ?? $m->model_name,
                'model_name' => $m->model_name,
                'type' => $m->generationType?->slug,
                'coin_cost' => $m->coin_cost,
                'resolution_costs' => $m->resolution_costs,
                'duration_costs' => $m->duration_costs,
                'is_default' => $m->is_default,
                'description' => $m->description,
            ];
        }

        return response()->json([
            // Backward-compatible general costs
            'image_generation' => (int) Setting::get('ai', 'coin_cost_image_generation', config('ai.coin_costs.image_generation', 5)),
            'image_to_video_480p' => (int) Setting::get('ai', 'coin_cost_image_to_video_480p', config('ai.coin_costs.image_to_video_480p', 10)),
            'image_to_video_720p' => (int) Setting::get('ai', 'coin_cost_image_to_video_720p', config('ai.coin_costs.image_to_video_720p', 20)),
            'image_edit' => (int) Setting::get('ai', 'coin_cost_image_edit', config('ai.coin_costs.image_edit', 10)),

            // Dynamic model-specific pricing and configurations
            'models' => $modelsMap,
        ]);
    }
}
