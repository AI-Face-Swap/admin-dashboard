<?php

namespace Database\Seeders;

use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Template;
use App\Models\TemplateCategory;
use App\Models\TemplateTag;
use Illuminate\Database\Seeder;

class ExampleDataSeeder extends Seeder
{
    /**
     * Seed example data for demo/testing.
     *
     * Run with: php artisan db:seed --class=ExampleDataSeeder
     */
    public function run(): void
    {
        // --- Template Categories ---
        $superhero = TemplateCategory::firstOrCreate(
            ['slug' => 'superhero'],
            ['name' => 'Superhero', 'description' => 'Superhero themed templates']
        );
        $anime = TemplateCategory::firstOrCreate(
            ['slug' => 'anime'],
            ['name' => 'Anime', 'description' => 'Anime character templates']
        );
        $football = TemplateCategory::firstOrCreate(
            ['slug' => 'football'],
            ['name' => 'Football', 'description' => 'Football player templates']
        );
        $movie = TemplateCategory::firstOrCreate(
            ['slug' => 'movie'],
            ['name' => 'Movie', 'description' => 'Movie character templates']
        );

        // --- Template Tags ---
        $tags = ['face-swap', 'premium', 'popular', 'new', 'trending', 'video-capable'];
        foreach ($tags as $tagName) {
            TemplateTag::firstOrCreate(
                ['slug' => $tagName],
                ['name' => ucfirst(str_replace('-', ' ', $tagName))]
            );
        }

        // --- Image Templates ---
        $imageTemplates = [
            [
                'name' => 'Superman Face Swap',
                'slug' => 'superman-faceswap',
                'description' => 'Swap your face onto Superman. Feel like the Man of Steel!',
                'category_id' => $superhero->id,
                'type' => 'image',
                'file_path' => 'templates/superman-faceswap.jpg',
                'model' => 'faceswap-v5',
                'cost' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Batman Face Swap',
                'slug' => 'batman-faceswap',
                'description' => 'Become the Dark Knight with this Batman template.',
                'category_id' => $superhero->id,
                'type' => 'image',
                'file_path' => 'templates/batman-faceswap.jpg',
                'model' => 'faceswap-v5',
                'cost' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Spider-Man Face Swap',
                'slug' => 'spiderman-faceswap',
                'description' => 'Swing into action as Spider-Man!',
                'category_id' => $superhero->id,
                'type' => 'image',
                'file_path' => 'templates/spiderman-faceswap.jpg',
                'model' => 'faceswap-v5',
                'cost' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Naruto Face Swap',
                'slug' => 'naruto-faceswap',
                'description' => 'Become Naruto Uzumaki and embrace the ninja way.',
                'category_id' => $anime->id,
                'type' => 'image',
                'file_path' => 'templates/naruto-faceswap.jpg',
                'model' => 'faceswap-v5',
                'cost' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Goku Face Swap',
                'slug' => 'goku-faceswap',
                'description' => 'Power up and become Goku from Dragon Ball.',
                'category_id' => $anime->id,
                'type' => 'image',
                'file_path' => 'templates/goku-faceswap.jpg',
                'model' => 'faceswap-v5',
                'cost' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Messi Face Swap',
                'slug' => 'messi-faceswap',
                'description' => 'Step onto the pitch as Lionel Messi.',
                'category_id' => $football->id,
                'type' => 'image',
                'file_path' => 'templates/messi-faceswap.jpg',
                'model' => 'faceswap-v5',
                'cost' => 10,
                'is_active' => true,
            ],
            [
                'name' => 'Ronaldo Face Swap',
                'slug' => 'ronaldo-faceswap',
                'description' => 'Siuuu! Become Cristiano Ronaldo.',
                'category_id' => $football->id,
                'type' => 'image',
                'file_path' => 'templates/ronaldo-faceswap.jpg',
                'model' => 'faceswap-v5',
                'cost' => 10,
                'is_active' => true,
            ],
        ];

        // --- Video Templates ---
        $videoTemplates = [
            [
                'name' => 'Superhero Video Face Swap',
                'slug' => 'superhero-video',
                'description' => 'Swap your face into a superhero action video.',
                'category_id' => $superhero->id,
                'type' => 'video',
                'file_path' => 'templates/superhero-video.mp4',
                'thumbnail_path' => 'templates/superhero-video-thumb.jpg',
                'model' => 'hyperswap_1b',
                'cost' => 20,
                'is_active' => true,
            ],
            [
                'name' => 'Anime Dance Video',
                'slug' => 'anime-dance-video',
                'description' => 'Face swap into an anime dance sequence.',
                'category_id' => $anime->id,
                'type' => 'video',
                'file_path' => 'templates/anime-dance-video.mp4',
                'thumbnail_path' => 'templates/anime-dance-video-thumb.jpg',
                'model' => 'hyperswap_1b',
                'cost' => 25,
                'is_active' => true,
            ],
            [
                'name' => 'Football Goal Celebration',
                'slug' => 'football-goal-video',
                'description' => 'Celebrate a goal like the pros.',
                'category_id' => $football->id,
                'type' => 'video',
                'file_path' => 'templates/football-goal-video.mp4',
                'thumbnail_path' => 'templates/football-goal-video-thumb.jpg',
                'model' => 'hyperswap_1a',
                'cost' => 20,
                'is_active' => true,
            ],
        ];

        $allTemplates = array_merge($imageTemplates, $videoTemplates);
        foreach ($allTemplates as $data) {
            $template = Template::firstOrCreate(
                ['slug' => $data['slug']],
                $data
            );

            // Attach random tags
            $tagIds = TemplateTag::inRandomOrder()->limit(rand(1, 3))->pluck('id');
            $template->tags()->syncWithoutDetaching($tagIds);
        }

        // --- Customers ---
        $customers = [];

        // Free customers
        $customers[] = Customer::firstOrCreate(
            ['email' => 'aung@example.com'],
            [
                'name' => 'Aung Aung',
                'password' => 'password',
                'customer_type' => 'free',
                'coins' => 85,
                'email_verified_at' => now(),
            ]
        );
        $customers[] = Customer::firstOrCreate(
            ['email' => 'mya@example.com'],
            [
                'name' => 'Mya Mya',
                'password' => 'password',
                'customer_type' => 'free',
                'coins' => 42,
                'email_verified_at' => now(),
            ]
        );
        $customers[] = Customer::firstOrCreate(
            ['email' => 'kyaw@example.com'],
            [
                'name' => 'Kyaw Kyaw',
                'password' => 'password',
                'customer_type' => 'free',
                'coins' => 100,
                'email_verified_at' => now(),
            ]
        );

        // Premium customers
        $customers[] = Customer::firstOrCreate(
            ['email' => 'zaw@example.com'],
            [
                'name' => 'Zaw Zaw',
                'password' => 'password',
                'customer_type' => 'premium',
                'coins' => 500,
                'email_verified_at' => now(),
            ]
        );
        $customers[] = Customer::firstOrCreate(
            ['email' => 'thin@example.com'],
            [
                'name' => 'Thin Thin',
                'password' => 'password',
                'customer_type' => 'premium',
                'coins' => 1200,
                'email_verified_at' => now(),
            ]
        );

        // Banned customer
        Customer::firstOrCreate(
            ['email' => 'banned@example.com'],
            [
                'name' => 'Banned User',
                'password' => 'password',
                'customer_type' => 'free',
                'coins' => 30,
                'is_banned' => true,
                'email_verified_at' => now(),
            ]
        );

        // --- AI Generations (sample history) ---
        $templates = Template::all();
        $statuses = ['completed', 'completed', 'completed', 'completed', 'failed', 'processing'];

        foreach ($customers as $customer) {
            $count = rand(3, 12);
            for ($i = 0; $i < $count; $i++) {
                $template = $templates->random();
                $status = $statuses[array_rand($statuses)];

                AIGeneration::create([
                    'customer_id' => $customer->id,
                    'provider_id' => AIProvider::first()->id,
                    'template_id' => $template->id,
                    'operation' => $template->type === 'video' ? 'video-face-swap' : 'face-swap',
                    'status' => $status,
                    'request_id' => $status === 'completed' || $status === 'failed'
                        ? 'req_'.bin2hex(random_bytes(8))
                        : null,
                    'cost' => $status === 'completed' ? $template->cost : null,
                    'currency' => 'USD',
                    'duration_ms' => $status === 'completed'
                        ? rand(2000, 120000)
                        : null,
                    'output_metadata' => $status === 'completed'
                        ? ['url' => '/generations/'.bin2hex(random_bytes(8)).($template->type === 'video' ? '.mp4' : '.png')]
                        : null,
                    'error' => $status === 'failed' ? 'Simulated generation failure' : null,
                    'created_at' => now()->subHours(rand(0, 720)),
                ]);
            }
        }

        $this->command?->info('Example data seeded successfully!');
        $this->command?->info('  • '.Customer::count().' customers');
        $this->command?->info('  • '.Template::count().' templates');
        $this->command?->info('  • '.TemplateCategory::count().' categories');
        $this->command?->info('  • '.TemplateTag::count().' tags');
        $this->command?->info('  • '.AIGeneration::count().' AI generations');
    }
}
