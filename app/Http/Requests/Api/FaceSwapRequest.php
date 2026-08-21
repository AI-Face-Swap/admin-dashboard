<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class FaceSwapRequest extends FormRequest
{
    /**
     * Face swap request.
     *
     * Provide exactly ONE face source (face_image OR face_image_url)
     * and exactly ONE target (template_slug OR target_image_url).
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
            'face_image' => ['nullable', 'image', 'max:10240'], // 10 MB
            'face_image_url' => ['nullable', 'url', 'max:2048'],
            'template_slug' => ['nullable', 'string', 'max:255'],
            'target_image_url' => ['nullable', 'url', 'max:2048'],
        ];
    }

    /**
     * Ensure exactly one face source and one target are provided.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $hasFaceFile = $this->hasFile('face_image');
            $hasFaceUrl = $this->filled('face_image_url');

            if ($hasFaceFile === $hasFaceUrl) {
                $validator->errors()->add(
                    'face_image',
                    'Provide exactly one of face_image or face_image_url.',
                );
            }

            $hasTemplate = $this->filled('template_slug');
            $hasTargetUrl = $this->filled('target_image_url');

            if ($hasTemplate === $hasTargetUrl) {
                $validator->errors()->add(
                    'template_slug',
                    'Provide exactly one of template_slug or target_image_url.',
                );
            }
        });
    }
}
