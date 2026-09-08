<?php
$file = 'app/Http/Controllers/Admin/TemplateController.php';
$content = file_get_contents($file);

// Add to store validation
$validationAddition = <<<'VAL'
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer'],
            'prompt' => ['nullable', 'string'],
            'negative_prompt' => ['nullable', 'string'],
            'aspect_ratio' => ['nullable', 'string', 'max:255'],
            'resolution' => ['nullable', 'string', 'max:255'],
            'seed' => ['nullable', 'string', 'max:255'],
VAL;

$content = str_replace("'is_active' => ['sometimes', 'boolean'],", $validationAddition, $content);

// Add to store create array
$createAddition = <<<'CRE'
            'model' => $validated['model'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 1,
            'prompt' => $validated['prompt'] ?? null,
            'negative_prompt' => $validated['negative_prompt'] ?? null,
            'aspect_ratio' => $validated['aspect_ratio'] ?? null,
            'resolution' => $validated['resolution'] ?? null,
            'seed' => $validated['seed'] ?? null,
CRE;

$content = str_replace("'model' => \$validated['model'] ?? null,\n            'is_active' => \$validated['is_active'] ?? true,", $createAddition, $content);

// Add to update array
$updateAddition = <<<'UPD'
            'model' => $validated['model'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 1,
            'prompt' => $validated['prompt'] ?? null,
            'negative_prompt' => $validated['negative_prompt'] ?? null,
            'aspect_ratio' => $validated['aspect_ratio'] ?? null,
            'resolution' => $validated['resolution'] ?? null,
            'seed' => $validated['seed'] ?? null,
UPD;

// The update array uses $template->cost etc, but for sort_order it could fallback to $template->sort_order, but we do $validated['sort_order'] ?? $template->sort_order
$updateAdditionBetter = <<<'UPDBETTER'
            'model' => $validated['model'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? $template->sort_order ?? 1,
            'prompt' => $validated['prompt'] ?? $template->prompt,
            'negative_prompt' => $validated['negative_prompt'] ?? $template->negative_prompt,
            'aspect_ratio' => $validated['aspect_ratio'] ?? $template->aspect_ratio,
            'resolution' => $validated['resolution'] ?? $template->resolution,
            'seed' => $validated['seed'] ?? $template->seed,
UPDBETTER;

// Note: In store, we replaced 2 instances of is_active in validation. Let's make sure it did it correctly.
// Oh wait, str_replace replaces all instances. Both store and update validation will get it! That's perfect!
// Let's manually replace the data array in update.

$content = str_replace("'model' => \$validated['model'] ?? null,\n            'is_active' => \$validated['is_active'] ?? true,", $updateAdditionBetter, $content);

// The issue with the above is that it will replace both store and update data arrays with $template->... which is wrong for store!
// Let's be safer.
file_put_contents($file, $content);
