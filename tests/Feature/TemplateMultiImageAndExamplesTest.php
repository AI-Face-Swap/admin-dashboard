<?php

namespace Tests\Feature;

use App\Models\AIGeneration;
use App\Models\AIModel;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\GenerationType;
use App\Models\Role;
use App\Models\Template;
use App\Models\User;
use Database\Seeders\AIProviderSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TemplateMultiImageAndExamplesTest extends TestCase
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

    public function test_public_template_api_includes_additive_fields(): void
    {
        $template = Template::create([
            'name' => 'Couple Dance',
            'slug' => 'couple-dance',
            'type' => Template::TYPE_VIDEO,
            'required_images' => 2,
            'guideline' => 'Upload Person 1 and Person 2 clear face photos.',
            'example_images' => ['https://example.com/ex1.jpg', 'https://example.com/ex2.jpg'],
            'file_path' => 'templates/couple.mp4',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->getJson("/api/v1/templates/{$template->slug}")
            ->assertOk()
            ->assertJsonPath('slug', 'couple-dance')
            ->assertJsonPath('required_images', 2)
            ->assertJsonPath('guideline', 'Upload Person 1 and Person 2 clear face photos.')
            ->assertJsonPath('example_images.0', 'https://example.com/ex1.jpg')
            ->assertJsonPath('example_images.1', 'https://example.com/ex2.jpg');
    }

    public function test_admin_can_create_template_with_required_images_guideline_and_example_photos(): void
    {
        $mainFile = UploadedFile::fake()->create('demo.mp4', 500, 'video/mp4');
        $thumb = UploadedFile::fake()->image('thumb.jpg');
        $ex1 = UploadedFile::fake()->image('ex1.jpg');
        $ex2 = UploadedFile::fake()->image('ex2.jpg');

        $this->actingAs($this->admin)
            ->post('/admin/templates', [
                'name' => 'Two Person Video',
                'type' => Template::TYPE_VIDEO,
                'required_images' => 2,
                'guideline' => 'Front-facing photos only.',
                'file' => $mainFile,
                'thumbnail' => $thumb,
                'example_image_files' => [$ex1, $ex2],
            ])
            ->assertRedirect(route('admin.templates.index'));

        $template = Template::where('name', 'Two Person Video')->firstOrFail();
        $this->assertSame(2, $template->required_images);
        $this->assertSame('Front-facing photos only.', $template->guideline);
        $this->assertCount(2, $template->example_images ?? []);
    }

    public function test_store_from_generation_auto_extracts_example_images_and_required_count(): void
    {
        $provider = AIProvider::where('slug', 'segmind')->firstOrFail();
        Storage::disk('spaces')->put('generations/out.mp4', 'video-bytes');
        $outUrl = Storage::disk('spaces')->url('generations/out.mp4');

        $generation = AIGeneration::create([
            'user_id' => $this->admin->id,
            'provider_id' => $provider->id,
            'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
            'status' => AIGeneration::STATUS_COMPLETED,
            'input_metadata' => [
                'model' => 'kling-o3-video2video-edit',
                'prompt' => 'Replace characters @Element1 @Element2',
                'elements' => [
                    ['frontal_image_url' => 'https://example.com/person1.png'],
                    ['frontal_image_url' => 'https://example.com/person2.png'],
                ],
            ],
            'output_metadata' => [$outUrl],
        ]);

        $this->actingAs($this->admin)
            ->post("/admin/templates/from-generation/{$generation->id}")
            ->assertRedirect();

        $template = Template::latest('id')->firstOrFail();
        $this->assertSame(2, $template->required_images);
        $this->assertSame(
            ['https://example.com/person1.png', 'https://example.com/person2.png'],
            $template->example_images,
        );
    }

    public function test_two_image_template_requires_second_image_and_forwards_both_to_payload(): void
    {
        Queue::fake();

        $genType = GenerationType::firstOrCreate(
            ['slug' => 'image-to-video'],
            ['name' => 'Image to Video', 'is_active' => true],
        );

        $model = AIModel::firstOrCreate(
            ['model_name' => 'kling-o3-video2video-edit'],
            [
                'name' => 'Kling O3 Video Edit',
                'provider_name' => 'segmind',
                'generation_type_id' => $genType->id,
                'coin_cost' => 10,
                'is_active' => true,
            ],
        );

        $template = Template::create([
            'name' => 'Two Person Edit',
            'slug' => 'two-person-edit',
            'type' => Template::TYPE_VIDEO,
            'required_images' => 2,
            'generation_type_id' => $genType->id,
            'ai_model_id' => $model->id,
            'model' => $model->model_name,
            'prompt' => 'Replace the two people @Element1 @Element2',
            'file_path' => 'templates/two-person.mp4',
            'reference_video_path' => 'https://example.com/ref.mp4',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $customer = Customer::factory()->create(['coins' => 200]);
        Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

        // Missing second_image -> 422
        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/templates/{$template->slug}/generate", [
                'image_url' => 'https://example.com/u1.jpg',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['second_image']);

        // With both images -> 202 and payload contains both elements
        $res = $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/templates/{$template->slug}/generate", [
                'image_url' => 'https://example.com/u1.jpg',
                'second_image_url' => 'https://example.com/u2.jpg',
            ])
            ->assertStatus(202);

        $gen = AIGeneration::findOrFail($res->json('generation.id'));
        $this->assertCount(2, $gen->input_metadata['elements'] ?? []);
        $this->assertSame('https://example.com/u1.jpg', $gen->input_metadata['elements'][0]['frontal_image_url']);
        $this->assertSame('https://example.com/u2.jpg', $gen->input_metadata['elements'][1]['frontal_image_url']);
    }
}
