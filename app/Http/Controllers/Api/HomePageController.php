<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HomeFeature;
use App\Models\HomeHero;
use App\Models\HomeShowcase;
use App\Models\Partner;
use App\Models\Setting;
use App\Services\CentralAuthProjectLandingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomePageController extends Controller
{
    /**
     * Get HTUT Ecosystem Project Landings from Central Auth SSO.
     */
    public function projectLandings(Request $request): JsonResponse
    {
        $forceRefresh = $request->boolean('refresh');
        $includeSelf = $request->has('include_self') ? $request->boolean('include_self') : true;

        $landings = CentralAuthProjectLandingService::getProjectLandings($forceRefresh, $includeSelf);

        return response()->json([
            'status' => 'success',
            'total' => count($landings),
            'project_landings' => $landings,
            'data' => $landings,
        ]);
    }

    /**
     * Get Single HTUT Ecosystem Project Landing Detail by Project Slug or Landing ID.
     */
    public function projectLandingDetail(string $identifier): JsonResponse
    {
        $landing = CentralAuthProjectLandingService::getProjectLandingDetail($identifier);

        if (! $landing) {
            return response()->json([
                'status' => 'error',
                'message' => "Project landing '{$identifier}' not found.",
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'project_landing' => $landing,
            'data' => $landing,
        ]);
    }

    public function heroes()
    {
        $heroes = HomeHero::query()
            ->active()
            ->get();

        return response()->json(['data' => $heroes]);
    }

    public function showcases()
    {
        $showcases = HomeShowcase::where('is_active', true)
            ->orderBy('order')
            ->get();

        return response()->json(['data' => $showcases]);
    }

    public function features()
    {
        $features = HomeFeature::where('is_active', true)
            ->with('aiModel')
            ->orderBy('order')
            ->get();

        $grouped = $features->groupBy(fn ($f) => $f->aiModel ? $f->aiModel->model_name : 'uncategorized');

        return response()->json(['data' => $grouped]);
    }

    public function partners()
    {
        $partners = Partner::where('is_active', true)
            ->orderBy('order')
            ->get();

        return response()->json(['data' => $partners]);
    }

    public function footerSettings()
    {
        $settings = Setting::group('footer');

        $data = [
            'about_text' => $settings['about_text'] ?? 'HTUT AI is the leading platform for generating...',
            'contact_email' => $settings['contact_email'] ?? 'support@htut.ai',
            'social_links' => [
                'facebook' => $settings['social_facebook'] ?? null,
                'twitter' => $settings['social_twitter'] ?? null,
                'discord' => $settings['social_discord'] ?? null,
                'youtube' => $settings['social_youtube'] ?? null,
            ],
            'quick_links' => [
                ['label' => 'Terms of Service', 'url' => $settings['link_terms'] ?? '/terms'],
                ['label' => 'Privacy Policy', 'url' => $settings['link_privacy'] ?? '/privacy'],
                ['label' => 'FAQ', 'url' => $settings['link_faq'] ?? '/faq'],
            ],
            'copyright_text' => $settings['copyright_text'] ?? '© '.date('Y').' HTUT AI. All rights reserved.',
        ];

        return response()->json(['data' => $data]);
    }
}
