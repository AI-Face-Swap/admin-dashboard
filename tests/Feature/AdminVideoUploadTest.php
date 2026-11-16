<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\UploadedVideo;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminVideoUploadTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        Storage::fake('spaces');

        $this->admin = User::factory()->create();
        $role = Role::where('slug', 'super-admin')->first() ?? Role::first();
        if ($role) {
            $this->admin->roles()->attach($role);
        }
    }

    public function test_admin_can_view_video_uploads_page(): void
    {
        $response = $this->actingAs($this->admin)->get('/admin/video-uploads');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/video-uploads/index')
                ->has('videos.data', 0)
            );
    }

    public function test_admin_can_upload_and_delete_video_on_spaces(): void
    {
        $file = UploadedFile::fake()->create('demo-clip.mp4', 1024, 'video/mp4');

        $storeResponse = $this->actingAs($this->admin)
            ->post('/admin/video-uploads', [
                'title' => 'Runway Reference',
                'video' => $file,
            ]);

        $storeResponse->assertRedirect(route('admin.video-uploads.index'));

        $video = UploadedVideo::first();
        $this->assertNotNull($video);
        $this->assertSame('Runway Reference', $video->title);
        $this->assertSame('demo-clip.mp4', $video->original_filename);
        $this->assertStringStartsWith('input-videos/', $video->path);
        Storage::disk('spaces')->assertExists($video->path);

        $deleteResponse = $this->actingAs($this->admin)
            ->delete("/admin/video-uploads/{$video->id}");

        $deleteResponse->assertRedirect(route('admin.video-uploads.index'));
        $this->assertDatabaseMissing('uploaded_videos', ['id' => $video->id]);
        Storage::disk('spaces')->assertMissing($video->path);
    }

    public function test_guest_cannot_access_video_uploads(): void
    {
        $this->get('/admin/video-uploads')->assertRedirect('/login');
    }
}
