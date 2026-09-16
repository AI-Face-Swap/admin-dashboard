<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIGeneration;
use App\Models\AIModel;
use App\Models\GenerationType;
use App\Models\Template;
use App\Models\TemplateCategory;
use App\Models\TemplateTag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TemplateController extends Controller
{
    /**
     * The storage disk used for template files.
     */
    protected string $disk = 'spaces';

    /**
     * Display a listing of the templates.
     */
    public function index(Request $request): Response
    {
        $templates = Template::query()
            ->with(['category:id,name,slug', 'tags:id,name,slug'])
            ->when($request->category, fn ($query, $category) => $query->where('category_id', $category))
            ->when($request->search, fn ($query, $search) => $query
                ->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhereHas('tags', fn ($tag) => $tag->where('name', 'like', "%{$search}%"))))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('admin/templates/index', [
            'templates' => $templates,
            'categories' => TemplateCategory::orderBy('name')->get(['id', 'name', 'slug']),
            'filters' => $request->only('search', 'category'),
        ]);
    }

    /**
     * Show the form for creating a new template.
     */
    public function create(): Response
    {
        return Inertia::render('admin/templates/create', [
            'categories' => TemplateCategory::orderBy('name')->get(['id', 'name', 'slug']),
            'tags' => TemplateTag::orderBy('name')->get(['id', 'name', 'slug']),
            'aiModels' => AIModel::ordered()->get(['id', 'name', 'provider_name', 'model_name', 'coin_cost', 'generation_type_id']),
            'generationTypes' => GenerationType::orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    /**
     * Store a newly created template.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            // No unique rule: HasAutoSlug appends -2, -3... when the slug exists.
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category_id' => ['nullable', 'integer', 'exists:template_categories,id'],
            'generation_type_id' => ['nullable', 'integer', 'exists:generation_types,id'],
            'ai_model_id' => ['nullable', 'integer', 'exists:ai_models,id'],
            'type' => ['required', Rule::in([Template::TYPE_IMAGE, Template::TYPE_VIDEO])],
            'file' => ['required', 'file', 'max:51200'], // 50 MB
            'thumbnail' => ['nullable', 'image', 'max:5120'],
            'cost' => ['sometimes', 'integer', 'min:0'],
            'discount_cost' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'model' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
            'prompt' => ['nullable', 'string', 'max:5000'],
            'negative_prompt' => ['nullable', 'string', 'max:5000'],
            'aspect_ratio' => ['nullable', 'string', 'max:255'],
            'resolution' => ['nullable', 'string', 'max:255'],
            'seed' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['integer', 'exists:template_tags,id'],
        ]);

        // Auto-populate model string from AIModel when a model is selected
        $modelName = $validated['model'] ?? null;
        if (! empty($validated['ai_model_id'])) {
            /** @var AIModel|null $aiModel */
            $aiModel = AIModel::find((int) $validated['ai_model_id']);
            $modelName = $aiModel ? $aiModel->model_name : $modelName;
        }

        $filePath = $request->file('file')->store('templates', $this->disk);
        $thumbnailPath = $request->file('thumbnail')?->store('templates/thumbnails', $this->disk);

        $template = Template::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'] ?? Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'category_id' => $validated['category_id'] ?? null,
            'generation_type_id' => $validated['generation_type_id'] ?? null,
            'ai_model_id' => $validated['ai_model_id'] ?? null,
            'type' => $validated['type'],
            'cost' => $validated['cost'] ?? 0,
            'discount_cost' => $validated['discount_cost'] ?? 0,
            'file_path' => $filePath,
            'thumbnail_path' => $thumbnailPath,
            'model' => $modelName,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 1,
            'prompt' => $validated['prompt'] ?? null,
            'negative_prompt' => $validated['negative_prompt'] ?? null,
            'aspect_ratio' => $validated['aspect_ratio'] ?? null,
            'resolution' => $validated['resolution'] ?? null,
            'seed' => $validated['seed'] ?? null,
        ]);

        $template->tags()->sync($validated['tags'] ?? []);

        return to_route('admin.templates.index')->with('success', 'Template uploaded.');
    }

    /**
     * Show the form for editing the specified template.
     */
    public function edit(Template $template): Response
    {
        return Inertia::render('admin/templates/edit', [
            'template' => $template->load(['category:id,name,slug', 'tags:id,name,slug', 'aiModel:id,name,provider_name,model_name,coin_cost']),
            'categories' => TemplateCategory::orderBy('name')->get(['id', 'name', 'slug']),
            'tags' => TemplateTag::orderBy('name')->get(['id', 'name', 'slug']),
            'aiModels' => AIModel::ordered()->get(['id', 'name', 'provider_name', 'model_name', 'coin_cost', 'generation_type_id']),
            'generationTypes' => GenerationType::orderBy('sort_order')->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    /**
     * Update the specified template.
     */
    public function update(Request $request, Template $template): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category_id' => ['nullable', 'integer', 'exists:template_categories,id'],
            'generation_type_id' => ['nullable', 'integer', 'exists:generation_types,id'],
            'ai_model_id' => ['nullable', 'integer', 'exists:ai_models,id'],
            'type' => ['required', Rule::in([Template::TYPE_IMAGE, Template::TYPE_VIDEO])],
            'file' => ['nullable', 'file', 'max:51200'],
            'thumbnail' => ['nullable', 'image', 'max:5120'],
            'cost' => ['sometimes', 'integer', 'min:0'],
            'discount_cost' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'model' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
            'prompt' => ['nullable', 'string', 'max:5000'],
            'negative_prompt' => ['nullable', 'string', 'max:5000'],
            'aspect_ratio' => ['nullable', 'string', 'max:255'],
            'resolution' => ['nullable', 'string', 'max:255'],
            'seed' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['integer', 'exists:template_tags,id'],
        ]);

        // Auto-populate model string from AIModel when a model is selected
        $modelName = $validated['model'] ?? null;
        if (! empty($validated['ai_model_id'])) {
            /** @var AIModel|null $aiModel */
            $aiModel = AIModel::find((int) $validated['ai_model_id']);
            $modelName = $aiModel ? $aiModel->model_name : $modelName;
        }

        $data = [
            'name' => $validated['name'],
            // Slugs stay stable once created — only change when explicitly provided.
            'slug' => $validated['slug'] ?? $template->slug,
            'description' => $validated['description'] ?? null,
            'category_id' => $validated['category_id'] ?? null,
            'generation_type_id' => $validated['generation_type_id'] ?? null,
            'ai_model_id' => $validated['ai_model_id'] ?? null,
            'type' => $validated['type'],
            'cost' => $validated['cost'] ?? $template->cost,
            'discount_cost' => $validated['discount_cost'] ?? $template->discount_cost ?? 0,
            'model' => $modelName,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? $template->sort_order ?? 1,
            'prompt' => $validated['prompt'] ?? $template->prompt,
            'negative_prompt' => $validated['negative_prompt'] ?? $template->negative_prompt,
            'aspect_ratio' => $validated['aspect_ratio'] ?? $template->aspect_ratio,
            'resolution' => $validated['resolution'] ?? $template->resolution,
            'seed' => $validated['seed'] ?? $template->seed,
        ];

        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('templates', $this->disk);
        }

        if ($request->hasFile('thumbnail')) {
            $data['thumbnail_path'] = $request->file('thumbnail')->store('templates/thumbnails', $this->disk);
        }

        $template->update($data);
        $template->tags()->sync($validated['tags'] ?? []);

        return to_route('admin.templates.index')->with('success', 'Template updated.');
    }

    /**
     * Remove the specified template.
     */
    public function destroy(Template $template): RedirectResponse
    {
        Storage::disk($this->disk)->delete(array_filter([
            $template->file_path,
            $template->thumbnail_path,
        ]));

        $template->delete();

        return to_route('admin.templates.index')->with('success', 'Template deleted.');
    }

    /**
     * Store a new template from a completed generation.
     */
    public function storeFromGeneration(AIGeneration $generation): RedirectResponse
    {
        if ($generation->status !== 'completed' || empty($generation->output_metadata)) {
            return back()->with('error', 'Generation is not completed or has no output.');
        }

        $sourceUrl = $generation->output_metadata[0] ?? null;

        if (! $sourceUrl) {
            return back()->with('error', 'No output found in generation.');
        }

        // If it's a full URL, parse the path
        if (filter_var($sourceUrl, FILTER_VALIDATE_URL)) {
            $sourcePath = parse_url((string) $sourceUrl, PHP_URL_PATH);
            $sourcePath = ltrim((string) $sourcePath, '/');
        } else {
            $sourcePath = ltrim($sourceUrl, '/');
        }

        if (str_starts_with($sourcePath, 'storage/') && ! Storage::disk($this->disk)->exists($sourcePath)) {
            $sourcePath = substr($sourcePath, 8);
        }

        // Check if the file exists
        if (! Storage::disk($this->disk)->exists($sourcePath)) {
            return back()->with('error', 'Source file does not exist on storage.');
        }

        // Create new unique path for the template
        $extension = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        $isVideo = in_array($extension, ['mp4', 'webm', 'mov'])
            || $generation->operation === AIGeneration::OPERATION_IMAGE_TO_VIDEO
            || $generation->operation === AIGeneration::OPERATION_VIDEO_FACE_SWAP;

        $type = $isVideo ? Template::TYPE_VIDEO : Template::TYPE_IMAGE;
        $defaultExtension = $isVideo ? ($extension ?: 'mp4') : ($extension ?: 'png');
        $newPath = 'templates/'.Str::uuid().'.'.$defaultExtension;

        // Copy file
        Storage::disk($this->disk)->copy($sourcePath, $newPath);

        $input = $generation->input_metadata ?? [];

        $typeName = $isVideo ? 'Video' : 'Image';
        $operationLabel = match ($generation->operation) {
            AIGeneration::OPERATION_IMAGE_EDIT => 'Image Editing',
            AIGeneration::OPERATION_IMAGE => 'Image Generation',
            AIGeneration::OPERATION_IMAGE_TO_VIDEO => 'Image-to-Video',
            AIGeneration::OPERATION_FACE_SWAP => 'Face Swap',
            AIGeneration::OPERATION_VIDEO_FACE_SWAP => 'Video Face Swap',
            default => 'AI Generation',
        };

        // Default generation type: Video Face Swap or Image Face Swap
        $defaultGenTypeSlug = $isVideo ? 'video-faceswap' : 'image-faceswap';
        $generationType = GenerationType::where('slug', $defaultGenTypeSlug)->first();

        // Match AI model from the generation, or fallback to default model
        $aiModel = null;
        if (! empty($generation->model)) {
            $aiModel = AIModel::where('model_name', $generation->model)->first();
        }
        if (! $aiModel && $generationType) {
            $aiModel = AIModel::where('generation_type_id', $generationType->id)
                ->where('is_default', true)
                ->first()
                ?? AIModel::where('generation_type_id', $generationType->id)->first();
        }

        $cost = $aiModel?->coin_cost ?? ($isVideo ? 20 : 5);

        // Create the template
        $template = Template::create([
            'generation_type_id' => $generationType?->id,
            'ai_model_id' => $aiModel?->id,
            'model' => $generation->model ?? $aiModel?->model_name,
            'name' => "{$typeName} Template {$generation->id}",
            'slug' => strtolower($typeName).'-'.$generation->id, // HasAutoSlug will suffix if needed
            'description' => "Generated from {$operationLabel}",
            'type' => $type,
            'cost' => $cost,
            'discount_cost' => 0,
            'file_path' => $newPath,
            'thumbnail_path' => $isVideo ? null : $newPath,
            'is_active' => true,
            'sort_order' => 1,
            'prompt' => $input['prompt'] ?? null,
            'negative_prompt' => $input['negative_prompt'] ?? null,
            'aspect_ratio' => $input['aspect_ratio'] ?? null,
            'resolution' => $input['resolution'] ?? null,
            'seed' => isset($input['seed']) ? (string) $input['seed'] : null,
        ]);

        return to_route('admin.templates.edit', $template->id)
            ->with('success', 'Template created successfully from generation! You can now adjust its details.');
    }
}
