<?php

namespace App\AI\Exceptions;

use RuntimeException;

/**
 * Thrown when a generation reaches a terminal FAILED state (including
 * content/RAI blocks and insufficient-credit responses).
 */
class AIGenerationFailedException extends RuntimeException
{
    /**
     * @param  array<string, mixed>|null  $statusBody
     */
    public function __construct(
        string $message,
        public readonly ?string $requestId = null,
        public readonly ?array $statusBody = null,
    ) {
        parent::__construct($message);
    }
}
