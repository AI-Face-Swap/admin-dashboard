<?php

namespace Database\Seeders;

use App\Models\GenerationType;
use Illuminate\Database\Seeder;

class GenerationTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            [
                'name' => 'Image Face Swap',
                'slug' => 'image-faceswap',
                'description' => 'Swap faces in a static image.',
                'sort_order' => 1,
            ],
            [
                'name' => 'Video Face Swap',
                'slug' => 'video-faceswap',
                'description' => 'Swap faces in a video.',
                'sort_order' => 2,
            ],
            [
                'name' => 'Image Generation',
                'slug' => 'text-to-image',
                'description' => 'Generate an image from text prompt.',
                'sort_order' => 3,
            ],
            [
                'name' => 'Image to Video',
                'slug' => 'image-to-video',
                'description' => 'Convert a static image into a short video.',
                'sort_order' => 4,
            ],
            [
                'name' => 'Text to Video',
                'slug' => 'text-to-video',
                'description' => 'Generate a video from a text prompt.',
                'sort_order' => 5,
            ],
        ];

        foreach ($types as $type) {
            GenerationType::firstOrCreate(['slug' => $type['slug']], $type);
        }
    }
}
