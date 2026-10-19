<?php

namespace App\Events;

use App\Models\AIGeneration;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class AIGenerationUpdated implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly AIGeneration $generation
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel("generation.{$this->generation->id}"),
        ];

        if ($this->generation->customer_id) {
            $channels[] = new PrivateChannel("customer.{$this->generation->customer_id}");
        } elseif ($this->generation->user_id) {
            $channels[] = new PrivateChannel("user.{$this->generation->user_id}");
        }

        return $channels;
    }

    /**
     * Broadcast event name.
     */
    public function broadcastAs(): string
    {
        return 'generation.updated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->generation->id,
            'operation' => $this->generation->operation,
            'status' => $this->generation->status,
            'submission_state' => $this->generation->submission_state,
            'request_id' => $this->generation->request_id,
            'output' => $this->generation->output_metadata ?? [],
            'error' => $this->generation->status === AIGeneration::STATUS_FAILED ? $this->generation->error : null,
            'points_spent' => $this->generation->points_spent,
            'points_refunded' => $this->generation->points_refunded,
            'duration_ms' => $this->generation->duration_ms,
            'updated_at' => $this->generation->updated_at?->toIso8601String(),
        ];
    }
}
