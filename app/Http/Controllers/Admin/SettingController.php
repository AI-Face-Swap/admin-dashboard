<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

        $footerSettings = Setting::group('footer');

        return Inertia::render('admin/settings/index', [
            'coinCosts' => $coinCosts,
            'footerSettings' => $footerSettings,
            'ecosystemVideoUrl' => (string) Setting::get('ecosystem', 'video_url', ''),
            'ecosystemBannerImageUrl' => (string) Setting::get('ecosystem', 'banner_image_url', ''),
            'ecosystemMembershipImageUrl' => (string) Setting::get('ecosystem', 'membership_image_url', ''),
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

            'footer_settings.about_text' => 'nullable|string',
            'footer_settings.contact_email' => 'nullable|string',
            'footer_settings.social_facebook' => 'nullable|string',
            'footer_settings.social_twitter' => 'nullable|string',
            'footer_settings.social_discord' => 'nullable|string',
            'footer_settings.social_youtube' => 'nullable|string',
            'footer_settings.link_terms' => 'nullable|string',
            'footer_settings.link_privacy' => 'nullable|string',
            'footer_settings.link_faq' => 'nullable|string',
            'footer_settings.copyright_text' => 'nullable|string',
            'ecosystem_video_url' => 'nullable|string|max:1000',
            'ecosystem_video' => 'nullable|file|mimes:mp4,webm,mov,m4v|max:102400',
            'ecosystem_banner_image_url' => 'nullable|string|max:1000',
            'ecosystem_membership_image_url' => 'nullable|string|max:1000',
            'ecosystem_banner_image' => 'nullable|image|mimes:jpg,jpeg,png,webp,gif|max:10240',
            'ecosystem_membership_image' => 'nullable|image|mimes:jpg,jpeg,png,webp,gif|max:10240',
        ]);

        Setting::set('ai', 'coin_cost_image_generation', $validated['coin_costs']['image_generation']);
        Setting::set('ai', 'coin_cost_image_to_video_480p', $validated['coin_costs']['image_to_video_480p']);
        Setting::set('ai', 'coin_cost_image_to_video_720p', $validated['coin_costs']['image_to_video_720p']);

        if (isset($validated['footer_settings'])) {
            foreach ($validated['footer_settings'] as $key => $value) {
                Setting::set('footer', $key, $value);
            }
        }

        if ($request->hasFile('ecosystem_video')) {
            $file = $request->file('ecosystem_video');
            $stored = \App\Support\VideoStorage::storeUploadedFile($file, 'ecosystem');
            Setting::set('ecosystem', 'video_url', $stored['url']);
        } elseif (array_key_exists('ecosystem_video_url', $validated)) {
            Setting::set('ecosystem', 'video_url', trim((string) ($validated['ecosystem_video_url'] ?? '')));
        }

        if ($request->hasFile('ecosystem_banner_image')) {
            $file = $request->file('ecosystem_banner_image');
            $path = $file->storeAs('ecosystem', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            Setting::set('ecosystem', 'banner_image_url', Storage::disk('spaces')->url($path));
        } elseif (array_key_exists('ecosystem_banner_image_url', $validated)) {
            Setting::set('ecosystem', 'banner_image_url', trim((string) ($validated['ecosystem_banner_image_url'] ?? '')));
        }

        if ($request->hasFile('ecosystem_membership_image')) {
            $file = $request->file('ecosystem_membership_image');
            $path = $file->storeAs('ecosystem', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            Setting::set('ecosystem', 'membership_image_url', Storage::disk('spaces')->url($path));
        } elseif (array_key_exists('ecosystem_membership_image_url', $validated)) {
            Setting::set('ecosystem', 'membership_image_url', trim((string) ($validated['ecosystem_membership_image_url'] ?? '')));
        }

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
            'footerSettings' => Setting::group('footer'),
            'ecosystemVideoUrl' => (string) Setting::get('ecosystem', 'video_url', ''),
            'ecosystemBannerImageUrl' => (string) Setting::get('ecosystem', 'banner_image_url', ''),
            'ecosystemMembershipImageUrl' => (string) Setting::get('ecosystem', 'membership_image_url', ''),
            'flash' => ['success' => 'Settings updated successfully.'],
        ]);
    }
}
