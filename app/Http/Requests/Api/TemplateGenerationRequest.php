<?php

namespace App\Http\Requests\Api;

use App\Models\Template;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class TemplateGenerationRequest extends FormRequest
{
    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->route('slug') && ! $this->filled('template_slug')) {
            $merge['template_slug'] = $this->route('slug');
        }

        if (! $this->filled('image_url') && $this->filled('face_image_url')) {
            $merge['image_url'] = $this->input('face_image_url');
        }

        if (! $this->filled('second_image_url') && $this->filled('image_2_url')) {
            $merge['second_image_url'] = $this->input('image_2_url');
        }

        if (! $this->hasFile('image') && $this->hasFile('face_image')) {
            $this->files->set('image', $this->file('face_image'));
        }

        if (! $this->hasFile('second_image') && $this->hasFile('image_2')) {
            $this->files->set('second_image', $this->file('image_2'));
        }

        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            /** Primary input image file (Photo 1). */
            'image' => ['nullable', 'image', 'max:20480'],
            /** Second input image file (Photo 2 — only required when `template.required_images === 2`). */
            'second_image' => ['nullable', 'image', 'max:20480'],
            /** Primary input image URL (alternative to `image` file). @example https://example.com/person1.jpg */
            'image_url' => ['nullable', 'url', 'max:2048'],
            /** Second input image URL (alternative to `second_image` file, when `required_images === 2`). @example https://example.com/person2.jpg */
            'second_image_url' => ['nullable', 'url', 'max:2048'],
            /** Template slug (auto-filled from `{slug}` in URL on `/v1/templates/{slug}/generate`). @example video-216 */
            'template_slug' => ['required', 'string', 'max:255', 'exists:templates,slug'],
            /** Optional idempotency key to prevent duplicate charges on retries. */
            'client_idempotency_token' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Ensure an input image (file or URL) is provided when required by the template's generation type.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $slug = $this->input('template_slug');
                $template = $slug
                    ? Template::with(['generationType', 'aiModel.generationType'])->where('slug', $slug)->first()
                    : null;

                $genTypeSlug = $template?->aiModel?->generationType?->slug
                    ?? $template?->generationType?->slug;

                if ($genTypeSlug === 'text-to-image') {
                    return;
                }

                $hasImage = $this->hasFile('image')
                    || $this->hasFile('face_image')
                    || $this->filled('image_url')
                    || $this->filled('face_image_url');

                if (! $hasImage) {
                    $validator->errors()->add('image', 'Please upload an image to generate with this template.');
                }

                if (($template?->required_images ?? 1) >= 2) {
                    $hasSecondImage = $this->hasFile('second_image')
                        || $this->hasFile('image_2')
                        || $this->filled('second_image_url')
                        || $this->filled('image_2_url');

                    if (! $hasSecondImage) {
                        $validator->errors()->add('second_image', 'Please upload the second image required by this template.');
                    }
                }
            },
        ];
    }
}
