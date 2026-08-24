<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    /**
     * Display the settings page.
     */
    public function index(): Response
    {
        $coinCosts = [
            'image_generation' => (int) Setting::get('ai', 'coin_cost_image_generation', 5),
            'image_to_video_480p' => (int) Setting::get('ai', 'coin_cost_image_to_video_480p', 10),
            'image_to_video_720p' => (int) Setting::get('ai', 'coin_cost_image_to_video_720p', 20),
            // Note: face_swap and video_face_swap use template.cost, not global setting
        ];

        return Inertia::render('admin/settings/index', [
            'coinCosts' => $coinCosts,
        ]);
    }

    /**
     * Update the settings.
     */
    public function update(Request $request): Response
    {
        $validated = $request->validate([
            'coin_costs.image_generation' => 'required|integer|min:0|max:1000',
            'coin_costs.image_to_video_480p' => 'required|integer|min:0|max:1000',
            'coin_costs.image_to_video_720p' => 'required|integer|min:0|max:1000',
        ]);

        Setting::set('ai', 'coin_cost_image_generation', $validated['coin_costs']['image_generation']);
        Setting::set('ai', 'coin_cost_image_to_video_480p', $validated['coin_costs']['image_to_video_480p']);
        Setting::set('ai', 'coin_cost_image_to_video_720p', $validated['coin_costs']['image_to_video_720p']);

        // Clear config cache so changes take effect immediately
        if (function_exists('config_cache')) {
            config_cache()->clear();
        }

        $coinCosts = [
            'image_generation' => (int) Setting::get('ai', 'coin_cost_image_generation', 5),
            'image_to_video_480p' => (int) Setting::get('ai', 'coin_cost_image_to_video_480p', 10),
            'image_to_video_720p' => (int) Setting::get('ai', 'coin_cost_image_to_video_720p', 20),
        ];

        return Inertia::render('admin/settings/index', [
            'coinCosts' => $coinCosts,
            'flash' => ['success' => 'Coin costs updated successfully.'],
        ]);
    }
}
