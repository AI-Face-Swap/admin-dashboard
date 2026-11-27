<?php

namespace App\Http\Controllers\Admin;

use App\AI\Skills\AstrologySkill;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\VideoStorage;
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
        return Inertia::render('admin/settings/index', [
            'coinCosts' => $this->coinCostsPayload(),
            'astrologyPrompts' => $this->astrologyPromptsPayload(),
            'footerSettings' => Setting::group('footer'),
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
            'coin_costs.astrology_short' => 'nullable|integer|min:0|max:1000',
            'coin_costs.astrology_normal' => 'nullable|integer|min:0|max:1000',
            'coin_costs.astrology_long' => 'nullable|integer|min:0|max:1000',

            'astrology_prompts.short' => 'nullable|string|max:5000',
            'astrology_prompts.normal' => 'nullable|string|max:5000',
            'astrology_prompts.long' => 'nullable|string|max:5000',

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

        if (isset($validated['coin_costs']['astrology_short'])) {
            Setting::set('ai', 'point_cost_astrology_short', $validated['coin_costs']['astrology_short']);
        }
        if (isset($validated['coin_costs']['astrology_normal'])) {
            Setting::set('ai', 'point_cost_astrology_normal', $validated['coin_costs']['astrology_normal']);
        }
        if (isset($validated['coin_costs']['astrology_long'])) {
            Setting::set('ai', 'point_cost_astrology_long', $validated['coin_costs']['astrology_long']);
        }

        if (isset($validated['astrology_prompts'])) {
            foreach (AstrologySkill::RESPONSE_TYPES as $type) {
                if (array_key_exists($type, $validated['astrology_prompts'])) {
                    Setting::set('ai', "astrology_prompt_{$type}", trim((string) ($validated['astrology_prompts'][$type] ?? '')));
                }
            }
        }

        if (isset($validated['footer_settings'])) {
            foreach ($validated['footer_settings'] as $key => $value) {
                Setting::set('footer', $key, $value);
            }
        }

        if ($request->hasFile('ecosystem_video')) {
            $file = $request->file('ecosystem_video');
            $stored = VideoStorage::storeUploadedFile($file, 'ecosystem');
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

        return Inertia::render('admin/settings/index', [
            'coinCosts' => $this->coinCostsPayload(),
            'astrologyPrompts' => $this->astrologyPromptsPayload(),
            'footerSettings' => Setting::group('footer'),
            'ecosystemVideoUrl' => (string) Setting::get('ecosystem', 'video_url', ''),
            'ecosystemBannerImageUrl' => (string) Setting::get('ecosystem', 'banner_image_url', ''),
            'ecosystemMembershipImageUrl' => (string) Setting::get('ecosystem', 'membership_image_url', ''),
            'flash' => ['success' => 'Settings updated successfully.'],
        ]);
    }

    /**
     * @return array{image_generation: int, image_to_video_480p: int, image_to_video_720p: int, astrology_short: int, astrology_normal: int, astrology_long: int}
     */
    protected function coinCostsPayload(): array
    {
        return [
            'image_generation' => (int) Setting::get('ai', 'coin_cost_image_generation', 5),
            'image_to_video_480p' => (int) Setting::get('ai', 'coin_cost_image_to_video_480p', 10),
            'image_to_video_720p' => (int) Setting::get('ai', 'coin_cost_image_to_video_720p', 20),
            'astrology_short' => (int) Setting::get('ai', 'point_cost_astrology_short', config('ai.point_costs.astrology_short', 10)),
            'astrology_normal' => (int) Setting::get('ai', 'point_cost_astrology_normal', config('ai.point_costs.astrology_normal', 50)),
            'astrology_long' => (int) Setting::get('ai', 'point_cost_astrology_long', config('ai.point_costs.astrology_long', 100)),
        ];
    }

    /**
     * @return array{short: string, normal: string, long: string}
     */
    protected function astrologyPromptsPayload(): array
    {
        return [
            'short' => AstrologySkill::configuredPromptForType(AstrologySkill::TYPE_SHORT),
            'normal' => AstrologySkill::configuredPromptForType(AstrologySkill::TYPE_NORMAL),
            'long' => AstrologySkill::configuredPromptForType(AstrologySkill::TYPE_LONG),
        ];
    }
}
