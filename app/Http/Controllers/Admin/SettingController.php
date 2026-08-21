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
            'face_swap' => (int) Setting::get('ai', 'coin_cost_face_swap', 5),
            'video_face_swap' => (int) Setting::get('ai', 'coin_cost_video_face_swap', 20),
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
            'coin_costs.face_swap' => 'required|integer|min:0|max:1000',
            'coin_costs.video_face_swap' => 'required|integer|min:0|max:1000',
        ]);

        Setting::set('ai', 'coin_cost_image_generation', $validated['coin_costs']['image_generation']);
        Setting::set('ai', 'coin_cost_face_swap', $validated['coin_costs']['face_swap']);
        Setting::set('ai', 'coin_cost_video_face_swap', $validated['coin_costs']['video_face_swap']);

        // Clear config cache so changes take effect immediately
        if (function_exists('config_cache')) {
            config_cache()->clear();
        }

        $coinCosts = [
            'image_generation' => (int) Setting::get('ai', 'coin_cost_image_generation', 5),
            'face_swap' => (int) Setting::get('ai', 'coin_cost_face_swap', 5),
            'video_face_swap' => (int) Setting::get('ai', 'coin_cost_video_face_swap', 20),
        ];

        return Inertia::render('admin/settings/index', [
            'coinCosts' => $coinCosts,
            'flash' => ['success' => 'Coin costs updated successfully.'],
        ]);
    }
}
