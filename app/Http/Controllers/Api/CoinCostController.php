<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
     * @response 200 {"image_generation": 5, "face_swap": 5, "video_face_swap": 20, "image_to_video_480p": 10, "image_to_video_720p": 20}
     */
    public function index(): JsonResponse
    {
        return response()->json([
            // Image generation: fixed cost per request
            'image_generation' => (int) Setting::get('ai', 'coin_cost_image_generation', config('ai.coin_costs.image_generation', 5)),

            // Image to video: cost varies by resolution
            'image_to_video_480p' => (int) Setting::get('ai', 'coin_cost_image_to_video_480p', config('ai.coin_costs.image_to_video_480p', 10)),
            'image_to_video_720p' => (int) Setting::get('ai', 'coin_cost_image_to_video_720p', config('ai.coin_costs.image_to_video_720p', 20)),

            // Note: face_swap and video_face_swap costs come from template.cost (not here)
        ]);
    }
}
