<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ImageGenerationRequest extends FormRequest
{
    /**
     * Image generation request.
     *
     * Generate an image from a text prompt using Segmind AI models.
     * Cost: 5 coins per generation.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'prompt' => ['required', 'string', 'max:2000'],
            'negative_prompt' => ['nullable', 'string', 'max:1000'],
            'model' => ['nullable', 'string', 'max:255'],
            'width' => ['nullable', 'integer', 'in:512,768,1024,1536,2048'],
            'height' => ['nullable', 'integer', 'in:512,768,1024,1536,2048'],
            'seed' => ['nullable', 'integer', 'min:0'],
            'image_format' => ['nullable', 'string', 'in:png,jpg,webp'],
            'quality' => ['nullable', 'integer', 'in:80,85,90,95'],
        ];
    }
}
