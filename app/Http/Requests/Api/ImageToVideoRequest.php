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
        return [
            'prompt' => ['required', 'string', 'max:2000'],
            'image' => ['required_without:image_url', 'file', 'image', 'max:10240'],
            'image_url' => ['required_without:image', 'url'],
            'negative_prompt' => ['nullable', 'string', 'max:1000'],
            'model' => ['nullable', 'string', 'max:255'],
            'aspect_ratio' => ['nullable', 'string', 'in:1:1,9:16,16:9,4:3,3:4'],
            'resolution' => ['nullable', 'string', 'in:480p,720p,1080p'],
            'duration' => ['nullable', 'string', 'max:50'],
            'prompt_extend' => ['nullable', 'string', 'in:true,false,0,1'],
            'seed' => ['nullable', 'integer', 'min:0'],
            'watermark' => ['nullable', 'string', 'in:true,false,0,1'],
            'client_idempotency_token' => ['nullable', 'string', 'max:255'],
        ];
    }
}
