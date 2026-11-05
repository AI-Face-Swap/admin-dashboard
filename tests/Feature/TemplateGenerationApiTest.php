<?php

use App\Jobs\ProcessFaceSwap;
use App\Jobs\ProcessImageEdit;
use App\Jobs\ProcessImageToVideo;
use App\Jobs\ProcessVideoFaceSwap;
use App\Models\AIGeneration;
use App\Models\AIModel;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\GenerationType;
use App\Models\Role;
use App\Models\Template;
use App\Models\User;
use Database\Seeders\AIModelSeeder;
use Database\Seeders\GenerationTypeSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('spaces', ['url' => 'https://bucket.example.com']);
    AIProvider::factory()->create(['slug' => 'segmind', 'name' => 'Segmind', 'is_active' => true]);
    $this->seed(GenerationTypeSeeder::class);
    $this->seed(AIModelSeeder::class);
});

test('a Seedance 2.0 Fast template with reference video routes to ProcessImageToVideo with prompt, reference_videos, and only customer reference_images', function () {
    Queue::fake();

    $i2vType = GenerationType::where('slug', 'image-to-video')->firstOrFail();
    $seedanceModel = AIModel::where('model_name', 'seedance-2.0-fast')->firstOrFail();

    $template = Template::create([
        'name' => 'Football Replace Template #47',
        'slug' => 'football-replace-47',
        'type' => Template::TYPE_VIDEO,
        'generation_type_id' => $i2vType->id,
        'ai_model_id' => $seedanceModel->id,
        'model' => 'seedance-2.0-fast',
        'file_path' => 'templates/preview-output.mp4',
        'reference_video_path' => 'https://bucket.example.com/inputs/original-football.mp4',
        'prompt' => 'Replace the main man wearing green in Video1 with the man from image 1 Image1.',
        'aspect_ratio' => '16:9',
        'resolution' => '720p',
        'seed' => '-1',
        'parameters' => [
            'image_mode' => 'reference',
            'duration' => 5,
            'generate_audio' => false,
            'bitrate_mode' => 'standard',
            'auto_resize' => true,
        ],
        'is_active' => true,
    ]);

    $customer = Customer::factory()->create(['coins' => 100]);
    $token = $customer->createToken('test')->plainTextToken;

    $response = $this->withToken($token)
        ->postJson("/api/v1/templates/{$template->slug}/generate", [
            'image' => UploadedFile::fake()->image('customer-photo.jpg'),
        ]);

    $response->assertStatus(202)
        ->assertJsonPath('status', 'queued')
        ->assertJsonPath('generation.operation', 'image-to-video')
        ->assertJsonPath('generation.model', 'seedance-2.0-fast')
        ->assertJsonPath('generation.template_id', $template->id);

    Queue::assertPushed(ProcessImageToVideo::class);
    Queue::assertNotPushed(ProcessVideoFaceSwap::class);

    $generation = AIGeneration::firstOrFail();
    expect($generation->operation)->toBe('image-to-video')
        ->and($generation->template_id)->toBe($template->id)
        ->and($generation->input_metadata['model'])->toBe('seedance-2.0-fast')
        ->and($generation->input_metadata['prompt'])->toContain('Replace the main man wearing green')
        ->and($generation->input_metadata['reference_videos'])->toBe(['https://bucket.example.com/inputs/original-football.mp4'])
        ->and($generation->input_metadata['reference_images'])->toHaveCount(1)
        ->and($generation->input_metadata['generate_audio'])->toBeFalse()
        ->and($generation->input_metadata['duration'])->toBe(5);
});

test('a Seedance 2.0 Fast template without reference_video_path does NOT attach the template preview video as reference_videos', function () {
    Queue::fake();

    $i2vType = GenerationType::where('slug', 'image-to-video')->firstOrFail();
    $seedanceModel = AIModel::where('model_name', 'seedance-2.0-fast')->firstOrFail();

    $template = Template::create([
        'name' => 'Airline Captain Walk #46',
        'slug' => 'airline-captain-46',
        'type' => Template::TYPE_VIDEO,
        'generation_type_id' => $i2vType->id,
        'ai_model_id' => $seedanceModel->id,
        'model' => 'seedance-2.0-fast',
        'file_path' => 'templates/captain-preview.mp4',
        'reference_video_path' => null,
        'prompt' => 'Cinematic video, 8 seconds. Slow motion, continuous forward walking. @Image 1',
        'negative_prompt' => 'Sun glass',
        'aspect_ratio' => '9:16',
        'resolution' => '720p',
        'seed' => '-1',
        'is_active' => true,
    ]);

    $customer = Customer::factory()->create(['coins' => 100]);
    $token = $customer->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->postJson("/api/v1/templates/{$template->slug}/generate", [
            'image' => UploadedFile::fake()->image('customer-face.png'),
        ])
        ->assertStatus(202);

    $generation = AIGeneration::firstOrFail();
    expect($generation->operation)->toBe('image-to-video')
        ->and($generation->input_metadata['reference_images'])->toHaveCount(1)
        ->and($generation->input_metadata)->not->toHaveKey('reference_videos')
        ->and($generation->input_metadata['negative_prompt'])->toBe('Sun glass');
});

test('a P-Image-Edit template routes to ProcessImageEdit with prompt and image_urls array containing only customer image', function () {
    Queue::fake();

    $editType = GenerationType::where('slug', 'image-editing')->firstOrFail();
    $pEditModel = AIModel::where('model_name', 'p-image-edit')->firstOrFail();

    $template = Template::create([
        'name' => 'Cyberpunk Portrait Restyle',
        'slug' => 'cyberpunk-restyle',
        'type' => Template::TYPE_IMAGE,
        'generation_type_id' => $editType->id,
        'ai_model_id' => $pEditModel->id,
        'model' => 'p-image-edit',
        'file_path' => 'templates/cyberpunk-preview.jpg',
        'prompt' => 'Transform the person into a neon cyberpunk character.',
        'aspect_ratio' => '9:16',
        'parameters' => [
            'disable_safety_checker' => false,
        ],
        'is_active' => true,
    ]);

    $customer = Customer::factory()->create(['coins' => 100]);
    $token = $customer->createToken('test')->plainTextToken;

    $response = $this->withToken($token)
        ->postJson("/api/v1/templates/{$template->slug}/generate", [
            'image' => UploadedFile::fake()->image('user.jpg'),
        ]);

    $response->assertStatus(202)
        ->assertJsonPath('generation.operation', 'image-editing')
        ->assertJsonPath('generation.model', 'p-image-edit');

    Queue::assertPushed(ProcessImageEdit::class);
    Queue::assertNotPushed(ProcessFaceSwap::class);

    $generation = AIGeneration::firstOrFail();
    expect($generation->input_metadata['model'])->toBe('p-image-edit')
        ->and($generation->input_metadata['prompt'])->toBe('Transform the person into a neon cyberpunk character.')
        ->and($generation->input_metadata['image_urls'])->toHaveCount(1);
});

test('image-faceswap and video-faceswap templates route to ProcessFaceSwap and ProcessVideoFaceSwap via the unified endpoint', function () {
    Queue::fake();

    $imageTemplate = Template::create([
        'name' => 'Classic Suit Face Swap',
        'slug' => 'classic-suit',
        'type' => Template::TYPE_IMAGE,
        'file_path' => 'templates/suit.jpg',
        'is_active' => true,
    ]);

    $videoTemplate = Template::create([
        'name' => 'Action Hero Video Swap',
        'slug' => 'action-hero-video',
        'type' => Template::TYPE_VIDEO,
        'file_path' => 'templates/hero.mp4',
        'is_active' => true,
    ]);

    $customer = Customer::factory()->create(['coins' => 200]);
    $token = $customer->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->postJson("/api/v1/templates/{$imageTemplate->slug}/generate", [
            'image' => UploadedFile::fake()->image('face1.jpg'),
        ])
        ->assertStatus(202)
        ->assertJsonPath('generation.operation', 'face-swap');

    Queue::assertPushed(ProcessFaceSwap::class);

    $this->withToken($token)
        ->postJson("/api/v1/templates/{$videoTemplate->slug}/generate", [
            'image' => UploadedFile::fake()->image('face2.jpg'),
        ])
        ->assertStatus(202)
        ->assertJsonPath('generation.operation', 'video-face-swap');

    Queue::assertPushed(ProcessVideoFaceSwap::class);
});

test('saving an image-to-video generation to a template only saves reference_video_path when reference_videos was present and never saves reference_images', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'admin')->first());
    $this->actingAs($admin);

    Storage::disk('spaces')->put('generations/seedance-out.mp4', 'video bytes');

    $provider = AIProvider::where('slug', 'segmind')->firstOrFail();

    // 1. Generation with ONLY prompt + reference_images (no reference_videos)
    $genPromptAndImageOnly = AIGeneration::create([
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
        'status' => AIGeneration::STATUS_COMPLETED,
        'output_metadata' => ['generations/seedance-out.mp4'],
        'input_metadata' => [
            'model' => 'seedance-2.0-fast',
            'prompt' => 'Cinematic walking captain @Image 1',
            'reference_images' => [
                'https://bucket.example.com/inputs/subject.jpg',
            ],
            'image_mode' => 'reference',
            'resolution' => '720p',
            'aspect_ratio' => '9:16',
            'duration' => 5,
            'generate_audio' => true,
            'bitrate_mode' => 'standard',
            'auto_resize' => true,
            'seed' => -1,
        ],
    ]);

    $this->post(route('admin.templates.from-generation', $genPromptAndImageOnly))
        ->assertRedirect();

    $templateWithoutRefVid = Template::latest('id')->firstOrFail();

    expect($templateWithoutRefVid->model)->toBe('seedance-2.0-fast')
        ->and($templateWithoutRefVid->generationType?->slug)->toBe('image-to-video')
        ->and($templateWithoutRefVid->reference_video_path)->toBeNull()
        ->and($templateWithoutRefVid->reference_images)->toBeNull()
        ->and($templateWithoutRefVid->parameters['image_mode'])->toBe('reference')
        ->and($templateWithoutRefVid->parameters['duration'])->toBe(5)
        ->and($templateWithoutRefVid->parameters['generate_audio'])->toBeTrue();

    // 2. Generation WITH reference_videos
    $genWithRefVideo = AIGeneration::create([
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
        'status' => AIGeneration::STATUS_COMPLETED,
        'output_metadata' => ['generations/seedance-out.mp4'],
        'input_metadata' => [
            'model' => 'seedance-2.0-fast',
            'prompt' => 'Replace the main man wearing green in Video1 with the man from image 1 Image1.',
            'reference_images' => [
                'https://bucket.example.com/inputs/subject.jpg',
            ],
            'reference_videos' => [
                'https://bucket.example.com/inputs/ref-football.mp4',
            ],
            'image_mode' => 'reference',
            'resolution' => '720p',
            'aspect_ratio' => '16:9',
            'duration' => 5,
            'generate_audio' => false,
            'bitrate_mode' => 'standard',
            'auto_resize' => true,
            'seed' => -1,
        ],
    ]);

    $this->post(route('admin.templates.from-generation', $genWithRefVideo))
        ->assertRedirect();

    $templateWithRefVid = Template::latest('id')->firstOrFail();

    expect($templateWithRefVid->model)->toBe('seedance-2.0-fast')
        ->and($templateWithRefVid->generationType?->slug)->toBe('image-to-video')
        ->and($templateWithRefVid->reference_video_path)->toBe('https://bucket.example.com/inputs/ref-football.mp4')
        ->and($templateWithRefVid->reference_images)->toBeNull()
        ->and($templateWithRefVid->parameters['generate_audio'])->toBeFalse();
});
