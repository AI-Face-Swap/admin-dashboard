<?php

namespace App\AI\Exceptions;

use RuntimeException;

/**
 * Thrown when a generation does not reach a terminal state within the
 * configured deadline. The job may still be running on the provider —
 * the request id is kept so it can be re-polled later.
 */
class AIGenerationTimeoutException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $requestId,
    ) {
        parent::__construct($message);
    }
}
