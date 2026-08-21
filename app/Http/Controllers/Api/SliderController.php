<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Slider;
use Illuminate\Http\JsonResponse;

class SliderController extends Controller
{
    /**
     * Get active sliders for the mobile app.
     *
     * Public endpoint — no authentication required.
     * Returns active sliders sorted by sorting DESC, created_at DESC.
     */
    public function index(): JsonResponse
    {
        $sliders = Slider::active()
            ->get()
            ->map(fn (Slider $slider) => [
                'id' => $slider->id,
                'title' => $slider->title,
                'description' => $slider->description,
                'cta_text' => $slider->cta_text,
                'cta_url' => $slider->cta_url,
                'file_url' => $slider->file_url,
                'type' => $slider->type,
                'badge' => $slider->badge,
                'sorting' => $slider->sorting,
            ]);

        return response()->json($sliders);
    }
}
