<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ImageToVideoRequest extends FormRequest
{
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
        $model = (string) $this->input('model', '');
        $isKlingMotionControl = in_array($model, [
            'kling-2.6-standard-motion-control',
            'kling-2.6-pro-motion-control',
            'kling-3-motion-control-standard',
            'kling-3-motion-control-pro',
        ], true);

        return [
            'prompt' => [$isKlingMotionControl ? 'nullable' : 'required', 'string', 'max:5000'],
            'image' => ['required_without:image_url', 'file', 'image', 'max:10240'],
            'image_url' => ['required_without:image', 'url'],
            'image_mode' => ['nullable', 'string', 'in:reference,reference_images,first_frame_url'],
            'last_frame_image' => ['nullable', 'file', 'image', 'max:10240'],
            'last_frame_url' => ['nullable', 'url'],
            'reference_video' => ['nullable', 'file', 'mimetypes:video/mp4,video/quicktime,video/webm', 'max:5120000'],
            'reference_video_url' => ['nullable', 'url'],
            'video_url' => ['nullable', 'url'],
            'reference_audio' => ['nullable', 'file', 'mimetypes:audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg', 'max:20480'],
            'reference_audio_url' => ['nullable', 'url'],
            'character_orientation' => ['nullable', 'string', 'in:video,image'],
            'keep_original_sound' => ['nullable', 'string', 'in:true,false,0,1'],
            'negative_prompt' => ['nullable', 'string', 'max:2000'],
            'model' => ['nullable', 'string', 'max:255'],
            'aspect_ratio' => ['nullable', 'string', 'in:1:1,9:16,16:9,4:3,3:4,adaptive'],
            'resolution' => ['nullable', 'string', 'in:480p,720p,1080p'],
            'duration' => ['nullable', 'string', 'max:50'],
            'prompt_extend' => ['nullable', 'string', 'in:true,false,0,1'],
            'generate_audio' => ['nullable', 'string', 'in:true,false,0,1'],
            'bitrate_mode' => ['nullable', 'string', 'in:standard,high'],
            'auto_resize' => ['nullable', 'string', 'in:true,false,0,1'],
            'seed' => ['nullable', 'integer', 'min:-1'],
            'watermark' => ['nullable', 'string', 'in:true,false,0,1'],
            'client_idempotency_token' => ['nullable', 'string', 'max:255'],
        ];
    }
}
