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
        if ($this->route('slug') && ! $this->filled('template_slug')) {
            $this->merge([
                'template_slug' => $this->route('slug'),
            ]);
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
            /** Template slug (optional when passed via `{slug}` route parameter). @example video-216 */
            'template_slug' => ['required', 'string', 'max:255', 'exists:templates,slug'],
            /** Primary customer input image file (Photo 1). Required unless `image_url` or `face_image*` is provided. */
            'image' => ['nullable', 'image', 'max:20480'],
            /** Alias for `image` (Photo 1 file upload). */
            'face_image' => ['nullable', 'image', 'max:20480'],
            /** Primary customer input image URL (Photo 1). @example https://example.com/person1.jpg */
            'image_url' => ['nullable', 'url', 'max:2048'],
            /** Alias for `image_url` (Photo 1 URL). */
            'face_image_url' => ['nullable', 'url', 'max:2048'],
            /** Second customer input image file (Photo 2). Required when `template.required_images >= 2`. */
            'second_image' => ['nullable', 'image', 'max:20480'],
            /** Alias for `second_image` (Photo 2 file upload). */
            'image_2' => ['nullable', 'image', 'max:20480'],
            /** Second customer input image URL (Photo 2). Required when `template.required_images >= 2`. @example https://example.com/person2.jpg */
            'second_image_url' => ['nullable', 'url', 'max:2048'],
            /** Alias for `second_image_url` (Photo 2 URL). */
            'image_2_url' => ['nullable', 'url', 'max:2048'],
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
