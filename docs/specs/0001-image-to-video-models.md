# 0001 Image-to-Video Models and UI Enhancements

**Status**: Accepted

## Summary

Expand the Image-to-Video generation API and Admin AI page to support selectable AI models, additional resolutions, screen aspect ratios, and a UI placeholder for saving results as templates.

## Requirements

- **AC-1**: The `POST /api/v1/ai/image-to-video` API endpoint must accept a `model` parameter. Allowed models: `seedance-2.5`, `wan2.7-r2v`, `kling-o1-reference-image-to-video`. Default is `kling-o1-reference-image-to-video`.
- **AC-2**: The API must accept an `aspect_ratio` parameter (e.g., `1:1`, `9:16`, `16:9`, `4:3`, `3:4`).
- **AC-3**: The `resolution` parameter validation must be updated to support `1080p` alongside `480p` and `720p`.
- **AC-4**: The Admin Dashboard `ImageToVideo` component (`resources/js/pages/admin/ai/index.tsx`) and the API Playground must be updated to feature dropdowns/selects for the new `model`, `aspect_ratio`, and `1080p` `resolution`.
- **AC-5**: Add a "Save to Templates" button to the result UI in the Admin Dashboard. This button will currently do nothing (or show a coming-soon toast), as the backend logic for saving video templates will be built in a future phase.

## Decision

We will update the `AIService` integration to pass the new `model` and `aspect_ratio` variables. For `1080p` resolution, we will introduce a new coin cost configuration (`coin_cost_image_to_video_1080p`) mirroring the existing structure. The default model will be changed to `kling-o1-reference-image-to-video` to reflect the new primary choice.

## Build plan

1. **API Validation & Cost Logic**: 
   - Update `AIImageToVideoController@store` validation to accept `model` (defaulting to `kling-o1-reference-image-to-video`), `aspect_ratio` (e.g., `16:9`, `9:16`, `1:1`, etc.), and allow `1080p` in `resolution`.
   - Update the cost mapping block to support `1080p` (using `coin_cost_image_to_video_1080p` setting, with a default cost of e.g. 30 coins).
2. **Controller Logic**: Pass `model` and `aspect_ratio` down to the `GenerationRequest` payload.
3. **Admin Component**: Update `resources/js/pages/admin/ai/index.tsx` `ImageToVideo` component to include the new selects (Model, Aspect Ratio, Resolution with 1080p) and bind them to the form submission.
4. **Result UI**: In `resources/js/pages/admin/ai/index.tsx`, when a video generation result is shown, add a "Save to Templates" button next to the result badges.
5. **API Playground Component**: Replicate the new form fields in `resources/js/pages/admin/api-playground/index.tsx`.

## Consequences

- The default model change will impact users not explicitly passing a model slug.
- A new `1080p` cost configuration will be added to the fallback logic.

## Rationale
(basis: user request)

The user requested adding new model selections (defaulting to Kling), screen sizes/aspect ratios, 1080p resolution support, and a placeholder UI button for an upcoming "Save to Templates" feature.
