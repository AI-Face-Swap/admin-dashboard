<?php

namespace App\AI\Exceptions;

use BadMethodCallException;

/**
 * Thrown when a provider does not (yet) implement an operation.
 * Face swap is implemented in Phase 3; image generation and video face
 * swap are declared on the contract and come in later phases.
 */
class UnsupportedOperationException extends BadMethodCallException {}
