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
            'template_slug' => ['required', 'string', 'max:255', 'exists:templates,slug'],
            'image' => ['nullable', 'image', 'max:20480'],
            'face_image' => ['nullable', 'image', 'max:20480'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'face_image_url' => ['nullable', 'url', 'max:2048'],
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
                $hasImage = $this->hasFile('image')
                    || $this->hasFile('face_image')
                    || $this->filled('image_url')
                    || $this->filled('face_image_url');

                if ($hasImage) {
                    return;
                }

                $slug = $this->input('template_slug');
                $template = $slug
                    ? Template::with(['generationType', 'aiModel.generationType'])->where('slug', $slug)->first()
                    : null;

                $genTypeSlug = $template?->aiModel?->generationType?->slug
                    ?? $template?->generationType?->slug;

                if ($genTypeSlug === 'text-to-image') {
                    return;
                }

                $validator->errors()->add('image', 'Please upload an image to generate with this template.');
            },
        ];
    }
}
