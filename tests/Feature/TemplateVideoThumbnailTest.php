<?php

namespace Tests\Feature;

use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Role;
use App\Models\Template;
use App\Models\User;
use App\Support\VideoThumbnailExtractor;
use Database\Seeders\AIProviderSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TemplateVideoThumbnailTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(AIProviderSeeder::class);
        Storage::fake('spaces');

        $this->admin = User::factory()->create();
        $role = Role::where('slug', 'super-admin')->first() ?? Role::first();
        if ($role) {
            $this->admin->roles()->attach($role);
        }
    }

    public function test_ai_generation_timeout_minutes_is_ninety(): void
    {
        $this->assertSame(90, AIGeneration::TIMEOUT_MINUTES);
    }

    public function test_video_template_store_auto_extracts_thumbnail_when_not_uploaded(): void
    {
        $this->mock(VideoThumbnailExtractor::class, function ($mock) {
            $mock->shouldReceive('fromLocalFile')
                ->once()
                ->andReturnUsing(function (string $path, string $disk) {
                    Storage::disk($disk)->put('templates/thumbnails/auto-thumb.jpg', 'jpg-bytes', 'public');

                    return 'templates/thumbnails/auto-thumb.jpg';
                });
        });

        $videoFile = UploadedFile::fake()->create('clip.mp4', 512, 'video/mp4');

        $response = $this->actingAs($this->admin)->post('/admin/templates', [
            'name' => 'Auto Thumb Video',
            'type' => Template::TYPE_VIDEO,
            'file' => $videoFile,
        ]);

        $response->assertRedirect(route('admin.templates.index'));

        $template = Template::where('name', 'Auto Thumb Video')->first();
        $this->assertNotNull($template);
        $this->assertSame('templates/thumbnails/auto-thumb.jpg', $template->thumbnail_path);
        Storage::disk('spaces')->assertExists('templates/thumbnails/auto-thumb.jpg');
    }

    public function test_store_from_generation_auto_extracts_thumbnail_for_video_result(): void
    {
        Storage::disk('spaces')->put('generations/result.mp4', 'video-bytes', 'public');

        $this->mock(VideoThumbnailExtractor::class, function ($mock) {
            $mock->shouldReceive('fromDisk')
                ->once()
                ->andReturnUsing(function (string $path, string $disk) {
                    Storage::disk($disk)->put('templates/thumbnails/gen-thumb.jpg', 'jpg-bytes', 'public');

                    return 'templates/thumbnails/gen-thumb.jpg';
                });
        });

        $provider = AIProvider::where('slug', 'segmind')->firstOrFail();

        $generation = AIGeneration::create([
            'user_id' => $this->admin->id,
            'provider_id' => $provider->id,
            'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
            'status' => AIGeneration::STATUS_COMPLETED,
            'input_metadata' => ['prompt' => 'Test prompt'],
            'output_metadata' => [Storage::disk('spaces')->url('generations/result.mp4')],
        ]);

        $response = $this->actingAs($this->admin)
            ->post("/admin/templates/from-generation/{$generation->id}");

        $template = Template::latest('id')->first();
        $this->assertNotNull($template);
        $response->assertRedirect(route('admin.templates.edit', $template->id));
        $this->assertSame('templates/thumbnails/gen-thumb.jpg', $template->thumbnail_path);
    }
}
