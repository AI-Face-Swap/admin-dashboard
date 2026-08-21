<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class VideoFaceSwapRequest extends FormRequest
{
    /**
     * Video face swap request.
     *
     * Provide exactly ONE face source (face_image OR face_image_url)
     * and exactly ONE target (template_slug OR target_video_url).
     * Processing takes 30s to 5+ minutes (async/queued).
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
            'face_image' => 'nullable|file|image|max:10240',
            'face_image_url' => 'nullable|url|max:2048',
            'template_slug' => 'nullable|string|max:255',
            'target_video_url' => 'nullable|url|max:2048',
            'model_name' => 'nullable|string|max:255',
            'face_detector_score' => 'nullable|numeric|min:0|max:1',
            'target_face_index' => 'nullable|integer|min:0',
        ];
    }

    /**
     * Get custom messages for validation errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'face_image.max' => 'Face image must not be larger than 10 MB.',
            'face_image.image' => 'The face upload must be an image file.',
            'face_image_url.url' => 'The face image URL must be a valid URL.',
            'target_video_url.url' => 'The target video URL must be a valid URL.',
        ];
    }
}
