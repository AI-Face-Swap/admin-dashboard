<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class TestBroadcastEvent implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly string $message = 'Hello from Laravel Reverb! WebSocket is working 100%!',
        public readonly array $meta = []
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('test-channel'),
        ];
    }

    /**
     * Broadcast event name.
     */
    public function broadcastAs(): string
    {
        return 'test.ping';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
            'timestamp' => now()->toIso8601String(),
            'meta' => array_merge([
                'server' => 'Laravel Reverb',
                'port' => 8080,
                'status' => 'operational',
            ], $this->meta),
        ];
    }
}
