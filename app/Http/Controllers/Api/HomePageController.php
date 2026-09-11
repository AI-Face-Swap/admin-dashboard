<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HomeShowcase;
use App\Models\HomeFeature;
use App\Models\Partner;
use App\Models\Setting;
use Illuminate\Http\Request;

class HomePageController extends Controller
{
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
            ->orderBy('order')
            ->get();

        return response()->json(['data' => $features]);
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
            'copyright_text' => $settings['copyright_text'] ?? '© ' . date('Y') . ' HTUT AI. All rights reserved.',
        ];

        return response()->json(['data' => $data]);
    }
}
