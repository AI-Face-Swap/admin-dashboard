# Image Editing Feature (Multi-Image, Flux, Seedream, GPT Image, Kling, Nano Banana)

## Overview

Expand the **Image Editing** section with 4 additional models on both the backend API and the Admin Dashboard (`/admin/ai`):
1. **Multi-Image Kontext Max (`multi-image-kontext-max`)**: Blends 2 reference images guided by a prompt.
2. **Flux Kontext Dev (`flux-kontext-dev`)**: Single reference image editing preserving pose and composition.
3. **Seedream 5.0 Lite I2I (`seedream-v5-lite-image-to-image`)**: High-res fashion/editorial photo editing from 1 or 2 reference images.
4. **GPT Image 1.5 Edit (`gpt-image-1.5-edit`)**: Intelligent photo editing and composition based on reference images.
5. **Kling 3 Image-to-Image (`kling-3-image2image`)**: Highly cinematic and stylized image-to-image transformations.
6. **Nano Banana Pro (`nano-banana-pro`)**: Highly expressive multi-reference comic/illustration and concept art generation.

---

## Supported Models & Parameters

### 1. `multi-image-kontext-max`
- **Endpoint**: `POST https://api.segmind.com/v2/multi-image-kontext-max`
- **Parameters**: `prompt`, `input_image_1`, `input_image_2`, `aspect_ratio`, `seed`, `output_format`, `safety_tolerance`

### 2. `flux-kontext-dev`
- **Endpoint**: `POST https://api.segmind.com/v2/flux-kontext-dev`
- **Parameters**: `prompt`, `input_image`, `aspect_ratio`, `guidance`, `num_inference_steps`, `seed`, `output_format`, `output_quality`, `disable_safety_checker`

### 3. `seedream-v5-lite-image-to-image`
- **Endpoint**: `POST https://api.segmind.com/v2/seedream-v5-lite-image-to-image`
- **Parameters**:
  - `prompt` (string, required)
  - `image_input` (array of image URLs, required: 1 or 2 images)
  - `aspect_ratio` (string, optional, default "16:9"): `16:9`, `1:1`, `9:16`, `4:3`, `3:4`
  - `size` (string, optional, default "3K"): `1K`, `2K`, `3K`, `4K`
  - `max_images` (int, default 1)
  - `optimize_prompt` (string, default "fast"): `fast`, `standard`
  - `watermark` (bool, default false)

### 4. `gpt-image-1.5-edit`
- **Endpoint**: `POST https://api.segmind.com/v2/gpt-image-1.5-edit`
- **Parameters**:
  - `prompt` (string, required)
  - `image_urls` (array of image URLs, required: 1 or 2 images)
  - `size` (string, optional, default "auto"): `auto`, `1024x1024`, `1536x1024`, `1024x1536`
  - `quality` (string, optional, default "high"): `low`, `medium`, `high`
  - `background` (string, optional, default "opaque"): `opaque`, `transparent`
  - `output_compression` (int, optional, default 100): 1 to 100
  - `output_format` (string, optional, default "png"): `png`, `jpg`, `webp`
  - `moderation` (string, optional, default "auto"): `auto`, `low`

### 5. `kling-3-image2image`
- **Endpoint**: `POST https://api.segmind.com/v2/kling-3-image2image`
- **Parameters**:
  - `prompt` (string, required)
  - `image_url` (string URL, required: 1 image)
  - `resolution` (string, optional, default "1K"): `1K`, `2K`
  - `aspect_ratio` (string, optional, default "16:9"): `16:9`, `1:1`, `9:16`, `4:3`, `3:4`
  - `output_format` (string, optional, default "png"): `png`, `jpg`, `webp`

### 6. `nano-banana-pro`
- **Endpoint**: `POST https://api.segmind.com/v2/nano-banana-pro`
- **Parameters**:
  - `prompt` (string, required)
  - `image_urls` (array of image URLs, required: 1 or 2 images)
  - `system_prompt` (string, optional)
  - `aspect_ratio` (string, optional, default "1:1"): `1:1`, `16:9`, `9:16`, `4:3`, `3:4`
  - `output_resolution` (string, optional, default "4K"): `1K`, `2K`, `4K`
  - `output_format` (string, optional, default "jpg"): `jpg`, `png`, `webp`
  - `response_modalities` (string, optional, default "TEXT_AND_IMAGE")

---

## API & Controller Implementation

### Shared Endpoint
```http
POST /api/v1/ai/image-edit
```
- In `ImageEditRequest.php`: Update `model` validation `in:multi-image-kontext-max,flux-kontext-dev,seedream-v5-lite-image-to-image,gpt-image-1.5-edit,kling-3-image2image,nano-banana-pro`.
- In `AIImageEditController.php`:
  - Build payload tailored to each model's expected parameter names (`image_input`, `image_urls`, or `image_url`).
  - Supports file uploads and URLs interchangeably.
  - Automatically submits to `https://api.segmind.com/v2/{model}` and polls until COMPLETED.
  - Downloads and persists output image to DigitalOcean Spaces.

---

## Admin Dashboard (`/admin/ai`)

- Model dropdown expanded to include all 6 models with descriptions.
- Dynamic input controls based on selected model:
  - Multi-image models (`multi-image-kontext-max`, `seedream-v5-lite-image-to-image`, `gpt-image-1.5-edit`, `nano-banana-pro`): Support 1 or 2 reference images with Upload / URL toggles.
  - Single-image models (`flux-kontext-dev`, `kling-3-image2image`): 1 image dropzone with Upload / URL toggle.
  - Model-specific controls (e.g. `size` / `resolution`, `quality`, `background`, `system_prompt`, `optimize_prompt`, `guidance`, `steps`, `safety`).
- Action buttons preserved: "Save to Templates" and "Delete".

---

## API Playground (`/admin/api-playground`)

Add presets for each of the new models in the API playground.
