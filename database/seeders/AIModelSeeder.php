<?php

namespace Database\Seeders;

use App\Models\AIModel;
use App\Models\GenerationType;
use Illuminate\Database\Seeder;

class AIModelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $genTypes = GenerationType::all()->keyBy('slug');

        $models = [
            [
                'generation_type_slug' => 'text-to-image',
                'provider_name' => 'segmind',
                'model_name' => 'seedream-v5-lite-text-to-image',
                'name' => 'Seedream 5.0 Lite',
                'coin_cost' => 5,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => true,
                'sort_order' => 1,
                'description' => 'Fast, affordable 4-step generation with natural tones.',
            ],
            [
                'generation_type_slug' => 'text-to-image',
                'provider_name' => 'segmind',
                'model_name' => 'nano-banana-2-lite',
                'name' => 'Nano Banana 2 Lite',
                'coin_cost' => 5,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 2,
                'description' => "Google's ultra-fast ~4 sec generation model.",
            ],
            [
                'generation_type_slug' => 'text-to-image',
                'provider_name' => 'segmind',
                'model_name' => 'qwen-image-3',
                'name' => 'Qwen Image 3',
                'coin_cost' => 6,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 3,
                'description' => 'Superior prompt adherence with legible in-image text typography.',
            ],
            [
                'generation_type_slug' => 'text-to-image',
                'provider_name' => 'segmind',
                'model_name' => 'flux-schnell',
                'name' => 'FLUX.1 Schnell',
                'coin_cost' => 5,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 4,
                'description' => 'Fastest high-quality 4-step generation from Black Forest Labs.',
            ],
            [
                'generation_type_slug' => 'text-to-image',
                'provider_name' => 'segmind',
                'model_name' => 'sdxl',
                'name' => 'Stable Diffusion XL',
                'coin_cost' => 5,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 5,
                'description' => 'Flagship Stable Diffusion XL model with vibrant colors and rich details.',
            ],
            [
                'generation_type_slug' => 'text-to-image',
                'provider_name' => 'segmind',
                'model_name' => 'flux-dev',
                'name' => 'FLUX.1 Dev',
                'coin_cost' => 8,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 6,
                'description' => 'Ultra high quality 28-step model with superior prompt adherence.',
            ],

            // Image Editing (6 Segmind models)
            [
                'generation_type_slug' => 'image-editing',
                'provider_name' => 'segmind',
                'model_name' => 'flux-kontext-dev',
                'name' => 'FLUX Kontext Dev',
                'coin_cost' => 10,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => true,
                'sort_order' => 1,
                'description' => 'Precise single-image editing with adjustable guidance & steps.',
            ],
            [
                'generation_type_slug' => 'image-editing',
                'provider_name' => 'segmind',
                'model_name' => 'multi-image-kontext-max',
                'name' => 'Multi-Image Kontext Max',
                'coin_cost' => 12,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 2,
                'description' => 'Multi-image reference context (up to 4 images) with safety tolerance control.',
            ],
            [
                'generation_type_slug' => 'image-editing',
                'provider_name' => 'segmind',
                'model_name' => 'seedream-v5-lite-image-to-image',
                'name' => 'Seedream V5 Lite',
                'coin_cost' => 8,
                'resolution_costs' => [
                    '1K' => 8,
                    '2K' => 12,
                    '3K' => 16,
                ],
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 3,
                'description' => 'High-resolution image restyling up to 3K with cinematic lighting.',
            ],
            [
                'generation_type_slug' => 'image-editing',
                'provider_name' => 'segmind',
                'model_name' => 'gpt-image-1.5-edit',
                'name' => 'GPT Image 1.5 Edit',
                'coin_cost' => 15,
                'resolution_costs' => [
                    'standard' => 15,
                    'high' => 20,
                ],
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 4,
                'description' => 'OpenAI GPT Image 1.5 with support for standard/high quality & transparent backgrounds.',
            ],
            [
                'generation_type_slug' => 'image-editing',
                'provider_name' => 'segmind',
                'model_name' => 'kling-3-image2image',
                'name' => 'Kling 3 Image to Image',
                'coin_cost' => 15,
                'resolution_costs' => [
                    '720p' => 15,
                    '1K' => 20,
                ],
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 5,
                'description' => 'Advanced image transformation powered by Kling 3.',
            ],
            [
                'generation_type_slug' => 'image-editing',
                'provider_name' => 'segmind',
                'model_name' => 'nano-banana-pro',
                'name' => 'Nano Banana Pro',
                'coin_cost' => 10,
                'resolution_costs' => [
                    '1K' => 10,
                    '2K' => 15,
                    '4K' => 25,
                ],
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 6,
                'description' => 'Ultra-sharp image generation up to 4K Ultra with custom system prompt instructions.',
            ],

            // Image to Video
            [
                'generation_type_slug' => 'image-to-video',
                'provider_name' => 'segmind',
                'model_name' => 'wan-2.2-i2v-flash',
                'name' => 'Wan 2.2 I2V Flash',
                'coin_cost' => 10,
                'resolution_costs' => [
                    '480p' => 10,
                    '720p' => 20,
                ],
                'duration_costs' => [
                    '5s' => 10,
                    '10s' => 20,
                ],
                'is_active' => true,
                'is_default' => true,
                'sort_order' => 1,
                'description' => 'Wan 2.2 Image-to-Video Flash model with 480p/720p and duration controls.',
            ],
            [
                'generation_type_slug' => 'image-to-video',
                'provider_name' => 'segmind',
                'model_name' => 'kling-o1-reference-image-to-video',
                'name' => 'Kling Reference I2V',
                'coin_cost' => 20,
                'resolution_costs' => [
                    '480p' => 20,
                    '720p' => 30,
                ],
                'duration_costs' => [
                    '5s' => 20,
                    '10s' => 35,
                ],
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 2,
                'description' => 'Cinematic reference image-to-video generation powered by Kling AI.',
            ],
            [
                'generation_type_slug' => 'image-to-video',
                'provider_name' => 'segmind',
                'model_name' => 'seedance-2.5',
                'name' => 'Seedance 2.5',
                'coin_cost' => 15,
                'resolution_costs' => [
                    '480p' => 15,
                    '720p' => 25,
                ],
                'duration_costs' => [
                    '5s' => 15,
                    '10s' => 25,
                ],
                'is_active' => true,
                'is_default' => false,
                'sort_order' => 3,
                'description' => 'Expressive motion and high temporal consistency video animation.',
            ],

            // Face Swap
            [
                'generation_type_slug' => 'image-faceswap',
                'provider_name' => 'segmind',
                'model_name' => 'face-swap',
                'name' => 'Face Swap (Segmind)',
                'coin_cost' => 5,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => true,
                'sort_order' => 1,
                'description' => 'High-fidelity face replacement for static images.',
            ],

            // Video Face Swap
            [
                'generation_type_slug' => 'video-faceswap',
                'provider_name' => 'segmind',
                'model_name' => 'video-face-swap',
                'name' => 'Video Face Swap (Segmind)',
                'coin_cost' => 20,
                'resolution_costs' => null,
                'duration_costs' => [
                    '5s' => 20,
                    '10s' => 35,
                ],
                'is_active' => true,
                'is_default' => true,
                'sort_order' => 1,
                'description' => 'Queued video face swap pipeline with temporal consistency.',
            ],
        ];

        foreach ($models as $item) {
            $genTypeSlug = $item['generation_type_slug'];
            unset($item['generation_type_slug']);

            $item['generation_type_id'] = $genTypes[$genTypeSlug]->id ?? null;

            AIModel::updateOrCreate(
                [
                    'provider_name' => $item['provider_name'],
                    'model_name' => $item['model_name'],
                ],
                $item
            );
        }
    }
}
