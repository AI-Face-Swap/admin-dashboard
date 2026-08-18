<?php

namespace Database\Factories;

use App\Models\AIGeneration;
use App\Models\AIProvider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AIGeneration>
 */
class AIGenerationFactory extends Factory
{
    protected $model = AIGeneration::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'provider_id' => AIProvider::factory(),
            'operation' => AIGeneration::OPERATION_FACE_SWAP,
            'status' => AIGeneration::STATUS_COMPLETED,
            'request_id' => fake()->uuid(),
            'cost' => null,
            'currency' => null,
            'duration_ms' => fake()->numberBetween(500, 10000),
            'input_metadata' => ['source_image' => 'https://example.com/face.jpg', 'target_image' => 'https://example.com/target.jpg'],
            'output_metadata' => ['https://example.com/result.png'],
        ];
    }
}
