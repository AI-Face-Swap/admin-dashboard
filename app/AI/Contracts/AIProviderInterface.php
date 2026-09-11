<?php

namespace App\AI\Contracts;

use App\AI\DTOs\AIResponse;
use App\AI\DTOs\GenerationRequest;
use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Exceptions\UnsupportedOperationException;

interface AIProviderInterface
{
    /**
     * The unique provider slug (e.g. "segmind").
     */
    public function name(): string;

    /**
     * Whether this provider supports the given operation.
     */
    public function supports(string $operation): bool;

    /**
     * Generate an image from a text prompt.
     *
     * @throws UnsupportedOperationException
     * @throws AIGenerationFailedException
     */
    public function generateImage(GenerationRequest $request): AIResponse;

    /**
     * Swap the face from the source image onto the target image.
     *
     * @throws UnsupportedOperationException
     * @throws AIGenerationFailedException
     */
    public function faceSwap(GenerationRequest $request): AIResponse;

    /**
     * Swap the face from the source image onto a target video.
     *
     * @throws UnsupportedOperationException
     * @throws AIGenerationFailedException
     */
    public function videoFaceSwap(GenerationRequest $request): AIResponse;

    /**
     * Generate a video from an image.
     *
     * @throws UnsupportedOperationException
     * @throws AIGenerationFailedException
     */
    public function imageToVideo(GenerationRequest $request): AIResponse;
}
