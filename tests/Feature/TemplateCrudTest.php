<?php

use App\Models\Role;
use App\Models\Template;
use App\Models\TemplateCategory;
use App\Models\TemplateTag;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('spaces');

    $this->seed(RolePermissionSeeder::class);

    $this->admin = User::factory()->create();
    $this->admin->roles()->attach(Role::where('slug', 'super-admin')->first());
});

test('an admin can create, view, update, and delete a template category', function () {
    $this->actingAs($this->admin);

    $this->post(route('admin.template-categories.store'), [
        'name' => 'Superhero',
        'description' => 'Superhero templates',
    ])->assertRedirect(route('admin.template-categories.index'));

    $category = TemplateCategory::where('name', 'Superhero')->first();
    expect($category)->not->toBeNull()
        ->and($category->slug)->toBe('superhero')
        ->and($category->is_active)->toBeTrue();

    $this->get(route('admin.template-categories.index'))->assertOk();
    $this->get(route('admin.template-categories.edit', $category))->assertOk();

    $this->put(route('admin.template-categories.update', $category), [
        'name' => 'Super Hero',
        'is_active' => false,
    ])->assertRedirect(route('admin.template-categories.index'));

    expect($category->fresh()->name)->toBe('Super Hero')
        ->and($category->fresh()->is_active)->toBeFalse();

    $this->delete(route('admin.template-categories.destroy', $category))
        ->assertRedirect(route('admin.template-categories.index'));

    expect(TemplateCategory::find($category->id))->toBeNull();
});

test('an admin can create and rename a template tag', function () {
    $this->actingAs($this->admin);

    $this->post(route('admin.template-tags.store'), ['name' => 'Superman'])
        ->assertRedirect(route('admin.template-tags.index'));

    $tag = TemplateTag::where('name', 'Superman')->first();
    expect($tag)->not->toBeNull()
        ->and($tag->slug)->toBe('superman');

    $this->put(route('admin.template-tags.update', $tag), ['name' => 'Super Man'])
        ->assertRedirect(route('admin.template-tags.index'));

    // Slugs are API identifiers and stay stable once created.
    expect($tag->fresh()->slug)->toBe('superman');
});

test('an admin can upload an image template with category and tags', function () {
    $this->actingAs($this->admin);

    $category = TemplateCategory::create(['name' => 'Anime']);
    $tag = TemplateTag::create(['name' => 'hd']);

    $this->post(route('admin.templates.store'), [
        'name' => 'Superman Suit',
        'category_id' => $category->id,
        'type' => Template::TYPE_IMAGE,
        'file' => UploadedFile::fake()->image('superman.jpg', 600, 800),
        'thumbnail' => UploadedFile::fake()->image('thumb.jpg', 320, 180),
        'tags' => [$tag->id],
    ])->assertRedirect(route('admin.templates.index'));

    $template = Template::where('slug', 'superman-suit')->first();
    expect($template)->not->toBeNull()
        ->and($template->category_id)->toBe($category->id)
        ->and($template->is_active)->toBeTrue()
        ->and($template->tags()->pluck('template_tags.id'))->toContain($tag->id);

    Storage::disk('spaces')->assertExists($template->file_path);
    Storage::disk('spaces')->assertExists($template->thumbnail_path);
});

test('an admin can update a template and replace its file', function () {
    $this->actingAs($this->admin);

    $template = Template::create([
        'name' => 'Old Template',
        'type' => Template::TYPE_IMAGE,
        'file_path' => 'templates/old.jpg',
    ]);

    $this->put(route('admin.templates.update', $template), [
        'name' => 'New Template',
        'type' => Template::TYPE_IMAGE,
        'file' => UploadedFile::fake()->image('new.jpg', 600, 800),
        'is_active' => false,
    ])->assertRedirect(route('admin.templates.index'));

    $template->refresh();
    expect($template->name)->toBe('New Template')
        ->and($template->slug)->toBe('old-template') // slugs stay stable on rename
        ->and($template->is_active)->toBeFalse()
        ->and($template->file_path)->not->toBe('templates/old.jpg');

    Storage::disk('spaces')->assertExists($template->file_path);
});

test('templates expose full public urls for the file and thumbnail', function () {
    $this->actingAs($this->admin);

    Storage::fake('spaces', ['url' => 'https://bucket.example.com']);

    $this->post(route('admin.templates.store'), [
        'name' => 'URL Test',
        'type' => Template::TYPE_IMAGE,
        'file' => UploadedFile::fake()->image('url-test.jpg'),
        'thumbnail' => UploadedFile::fake()->image('thumb.jpg'),
    ]);

    $template = Template::where('slug', 'url-test')->first();

    expect($template->file_url)->toBe('https://bucket.example.com/'.$template->file_path)
        ->and($template->thumbnail_url)->toBe('https://bucket.example.com/'.$template->thumbnail_path);
});

test('a template without a thumbnail exposes a null thumbnail url', function () {
    $this->actingAs($this->admin);

    $template = Template::create([
        'name' => 'No Thumb',
        'type' => Template::TYPE_IMAGE,
        'file_path' => 'templates/no-thumb.jpg',
    ]);

    expect($template->thumbnail_url)->toBeNull()
        ->and($template->file_url)->toContain('templates/no-thumb.jpg');
});

test('deleting a template removes its files from storage', function () {
    $this->actingAs($this->admin);

    $file = UploadedFile::fake()->image('delete-me.jpg');

    $this->post(route('admin.templates.store'), [
        'name' => 'Delete Me',
        'type' => Template::TYPE_IMAGE,
        'file' => $file,
    ]);

    $template = Template::where('slug', 'delete-me')->first();
    Storage::disk('spaces')->assertExists($template->file_path);

    $this->delete(route('admin.templates.destroy', $template))
        ->assertRedirect(route('admin.templates.index'));

    expect(Template::find($template->id))->toBeNull();
    Storage::disk('spaces')->assertMissing($template->file_path);
});

test('template listing filters by category and search', function () {
    $this->actingAs($this->admin);

    $superhero = TemplateCategory::create(['name' => 'Superhero']);
    $anime = TemplateCategory::create(['name' => 'Anime']);

    Template::create([
        'name' => 'Superman Suit',
        'type' => Template::TYPE_IMAGE,
        'file_path' => 'templates/a.jpg',
        'category_id' => $superhero->id,
    ]);
    Template::create([
        'name' => 'Naruto',
        'type' => Template::TYPE_IMAGE,
        'file_path' => 'templates/b.jpg',
        'category_id' => $anime->id,
    ]);

    $this->get(route('admin.templates.index', ['category' => $superhero->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/templates/index')
            ->has('templates.data', 1));

    $this->get(route('admin.templates.index', ['search' => 'naruto']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/templates/index')
            ->has('templates.data', 1));
});

test('duplicate template names get auto-suffixed slugs', function () {
    $this->actingAs($this->admin);

    $this->post(route('admin.templates.store'), [
        'name' => 'Testing',
        'type' => Template::TYPE_IMAGE,
        'file' => UploadedFile::fake()->image('testing-1.jpg'),
    ]);

    $this->post(route('admin.templates.store'), [
        'name' => 'Testing',
        'type' => Template::TYPE_IMAGE,
        'file' => UploadedFile::fake()->image('testing-2.jpg'),
    ]);

    expect(Template::pluck('slug')->sort()->values()->all())->toBe(['testing', 'testing-2']);
});

test('duplicate category and tag names get auto-suffixed slugs', function () {
    $this->actingAs($this->admin);

    $this->post(route('admin.template-categories.store'), ['name' => 'Superhero']);
    $this->post(route('admin.template-categories.store'), ['name' => 'Superhero']);
    $this->post(route('admin.template-tags.store'), ['name' => 'hd']);
    $this->post(route('admin.template-tags.store'), ['name' => 'hd']);

    expect(TemplateCategory::pluck('slug')->sort()->values()->all())
        ->toBe(['superhero', 'superhero-2'])
        ->and(TemplateTag::pluck('slug')->sort()->values()->all())
        ->toBe(['hd', 'hd-2']);
});

test('an explicitly provided duplicate slug is auto-suffixed', function () {
    $this->actingAs($this->admin);

    $this->post(route('admin.templates.store'), [
        'name' => 'First',
        'slug' => 'testing',
        'type' => Template::TYPE_IMAGE,
        'file' => UploadedFile::fake()->image('first.jpg'),
    ]);

    $this->post(route('admin.templates.store'), [
        'name' => 'Second',
        'slug' => 'testing',
        'type' => Template::TYPE_IMAGE,
        'file' => UploadedFile::fake()->image('second.jpg'),
    ]);

    expect(Template::where('name', 'First')->first()->slug)->toBe('testing')
        ->and(Template::where('name', 'Second')->first()->slug)->toBe('testing-2');
});

test('editing a template keeps its slug stable', function () {
    $this->actingAs($this->admin);

    $template = Template::create([
        'name' => 'Stable Slug',
        'type' => Template::TYPE_IMAGE,
        'file_path' => 'templates/stable.jpg',
    ]);

    $this->put(route('admin.templates.update', $template), [
        'name' => 'Renamed Template',
        'type' => Template::TYPE_IMAGE,
    ]);

    expect($template->fresh()->slug)->toBe('stable-slug');
});

test('templates routes require the templates permission', function () {
    $this->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('admin.templates.index'))->assertForbidden();
});

test('an admin can save a template from a completed generation', function () {
    $this->actingAs($this->admin);
    Storage::fake('spaces');

    // Create a dummy generation output file on the disk
    Storage::disk('spaces')->put('generations/dummy.mp4', 'dummy content');

    $provider = \App\Models\AIProvider::create(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);
    $generation = App\Models\AIGeneration::create([
        'provider_id' => $provider->id,
        'operation' => App\Models\AIGeneration::OPERATION_IMAGE_TO_VIDEO,
        'status' => App\Models\AIGeneration::STATUS_COMPLETED,
        'output_metadata' => ['generations/dummy.mp4'],
        'input_metadata' => [
            'prompt' => 'Test prompt',
            'negative_prompt' => 'No blur',
            'aspect_ratio' => '16:9',
            'resolution' => '1080p',
            'seed' => 12345,
        ],
    ]);

    $this->post(route('admin.templates.from-generation', $generation))
        ->assertRedirect()
        ->assertSessionHas('success', 'Generation saved to templates successfully.');

    $template = Template::where('type', Template::TYPE_VIDEO)->first();

    expect($template)->not->toBeNull()
        ->and($template->prompt)->toBe('Test prompt')
        ->and($template->negative_prompt)->toBe('No blur')
        ->and($template->aspect_ratio)->toBe('16:9')
        ->and($template->resolution)->toBe('1080p')
        ->and($template->seed)->toBe('12345')
        ->and($template->sort_order)->toBe(1)
        ->and($template->name)->toContain('Video Template');

    // Check that the file was copied to templates/
    Storage::disk('spaces')->assertExists($template->file_path);
    expect($template->file_path)->toStartWith('templates/')
        ->and($template->file_path)->not->toBe('generations/dummy.mp4');
});
