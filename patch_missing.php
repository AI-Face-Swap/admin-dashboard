<?php
$file = 'app/Http/Controllers/Admin/TemplateController.php';
$content = file_get_contents($file);

if (!str_contains($content, 'use App\Models\AIGeneration;')) {
    $content = str_replace("use App\Models\Template;", "use App\Models\AIGeneration;\nuse App\Models\Template;", $content);
}

$method = <<<'METHOD'

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
            $sourcePath = parse_url($sourceUrl, PHP_URL_PATH);
            $sourcePath = ltrim($sourcePath, '/');
        } else {
            $sourcePath = ltrim($sourceUrl, '/');
        }

        // Check if the file exists
        if (! Storage::disk($this->disk)->exists($sourcePath)) {
            return back()->with('error', 'Source file does not exist on storage.');
        }

        // Create new unique path for the template
        $extension = pathinfo($sourcePath, PATHINFO_EXTENSION);
        $newPath = 'templates/'.Str::uuid().'.'.($extension ?: 'mp4');

        // Copy file
        Storage::disk($this->disk)->copy($sourcePath, $newPath);

        $input = $generation->input_metadata ?? [];

        // Create the template
        $template = Template::create([
            'name' => 'Video Template '.$generation->id,
            'slug' => 'video-'.$generation->id, // HasAutoSlug will suffix if needed
            'description' => 'Generated from Image-to-Video',
            'type' => Template::TYPE_VIDEO,
            'cost' => 20,
            'file_path' => $newPath,
            'thumbnail_path' => null,
            'is_active' => false,
            'sort_order' => 1,
            'prompt' => $input['prompt'] ?? null,
            'negative_prompt' => $input['negative_prompt'] ?? null,
            'aspect_ratio' => $input['aspect_ratio'] ?? null,
            'resolution' => $input['resolution'] ?? null,
            'seed' => isset($input['seed']) ? (string) $input['seed'] : null,
        ]);

        return back()->with('success', 'Generation saved to templates successfully.');
    }
}
METHOD;

$content = preg_replace('/}\s*$/', $method, $content);
file_put_contents($file, $content);
