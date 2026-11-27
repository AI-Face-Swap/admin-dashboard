<?php

namespace App\AI\Factories;

use App\AI\Contracts\ChatTransportInterface;
use App\AI\Transports\OpenCodeChatTransport;
use App\AI\Transports\SegmindChatTransport;

class ChatTransportFactory
{
    public function __construct(
        private readonly SegmindChatTransport $segmindTransport,
        private readonly OpenCodeChatTransport $openCodeTransport,
    ) {}

    /**
     * Route Astrology (text) chat to OpenCode Go; all other categories and image chats use Segmind.
     */
    public function forCategory(string $category, ?string $imageUrl = null): ChatTransportInterface
    {
        $normalizedCategory = strtolower(trim($category)) ?: 'general';

        if ($normalizedCategory === 'astrology' && empty($imageUrl)) {
            return $this->openCodeTransport;
        }

        return $this->segmindTransport;
    }
}
