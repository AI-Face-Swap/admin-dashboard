<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ImageEditRequest extends FormRequest
{
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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'model' => [
                'required',
                'string',
                'in:multi-image-kontext-max,flux-kontext-dev,seedream-v5-lite-image-to-image,gpt-image-1.5-edit,kling-3-image2image,nano-banana-pro',
            ],
            'prompt' => ['required', 'string', 'max:5000'],
            'seed' => ['nullable', 'integer', 'min:0'],

            // Common or model-specific fields
            'aspect_ratio' => ['nullable', 'string', 'max:30'],
            'output_format' => ['nullable', 'string', 'in:jpg,png,webp'],

            // Direct or multi-image inputs
            'input_image' => ['nullable', 'file', 'image', 'max:10240'],
            'input_image_url' => ['nullable', 'url', 'max:2048'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'input_image_1' => ['nullable', 'file', 'image', 'max:10240'],
            'input_image_1_url' => ['nullable', 'url', 'max:2048'],
            'input_image_2' => ['nullable', 'file', 'image', 'max:10240'],
            'input_image_2_url' => ['nullable', 'url', 'max:2048'],
            'image_input' => ['nullable', 'array'],
            'image_input.*' => ['string'],
            'image_urls' => ['nullable', 'array'],
            'image_urls.*' => ['string'],

            // Multi-image fields
            'safety_tolerance' => ['nullable', 'integer', 'between:1,6'],

            // Flux fields
            'guidance' => ['nullable', 'numeric', 'between:1,20'],
            'num_inference_steps' => ['nullable', 'integer', 'between:1,50'],
            'output_quality' => ['nullable', 'integer', 'between:1,100'],
            'disable_safety_checker' => ['nullable', 'string', 'in:true,false,0,1'],

            // Seedream fields
            'size' => ['nullable', 'string', 'max:20'],
            'max_images' => ['nullable', 'integer', 'min:1', 'max:4'],
            'optimize_prompt' => ['nullable', 'string', 'max:20'],
            'watermark' => ['nullable', 'string', 'in:true,false,0,1'],

            // GPT Image fields
            'quality' => ['nullable', 'string', 'max:20'],
            'background' => ['nullable', 'string', 'max:20'],
            'output_compression' => ['nullable', 'integer', 'between:1,100'],
            'moderation' => ['nullable', 'string', 'max:20'],

            // Kling fields
            'resolution' => ['nullable', 'string', 'max:20'],

            // Nano Banana fields
            'system_prompt' => ['nullable', 'string', 'max:2000'],
            'output_resolution' => ['nullable', 'string', 'max:20'],
            'response_modalities' => ['nullable', 'string', 'max:30'],
        ];
    }

    /**
     * Validate image source inputs based on the chosen model.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $model = $this->string('model')->toString();

            $hasImg1 = $this->hasFile('input_image_1')
                || $this->filled('input_image_1_url')
                || $this->hasFile('input_image')
                || $this->filled('input_image_url')
                || $this->filled('image_url')
                || ! empty($this->input('image_input'))
                || ! empty($this->input('image_urls'));

            if ($model === 'multi-image-kontext-max') {
                $hasExplicitImg1 = $this->hasFile('input_image_1') || $this->filled('input_image_1_url');
                if (! $hasExplicitImg1) {
                    $validator->errors()->add(
                        'input_image_1',
                        'Please provide input_image_1 as a file or URL for multi-image editing.',
                    );
                }

                $hasExplicitImg2 = $this->hasFile('input_image_2') || $this->filled('input_image_2_url');
                if (! $hasExplicitImg2) {
                    $validator->errors()->add(
                        'input_image_2',
                        'Please provide input_image_2 as a file or URL for multi-image editing.',
                    );
                }
            } elseif ($model === 'flux-kontext-dev') {
                $hasFluxImg = $this->hasFile('input_image') || $this->filled('input_image_url');
                if (! $hasFluxImg) {
                    $validator->errors()->add(
                        'input_image',
                        'Please provide input_image as a file or URL for flux kontext editing.',
                    );
                }
            } else {
                // Seedream, GPT Image, Kling, Nano Banana
                if (! $hasImg1) {
                    $validator->errors()->add(
                        'input_image_1',
                        'Please provide at least one reference image as a file or URL.',
                    );
                }
            }
        });
    }
}
