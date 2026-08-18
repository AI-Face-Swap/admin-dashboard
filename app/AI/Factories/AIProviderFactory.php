<?php

namespace App\AI\Factories;

use App\AI\Contracts\AIProviderInterface;
use App\AI\Exceptions\UnknownProviderException;
use App\AI\Providers\Segmind\SegmindProvider;
use App\Models\AIProvider;

/**
 * Resolves a provider slug into its concrete implementation.
 *
 * Adding a new provider = one new provider class + one case here.
 * Nothing else in the app changes.
 */
class AIProviderFactory
{
    /**
     * Resolve a provider implementation by slug.
     *
     * @throws UnknownProviderException
     */
    public function make(string $slug): AIProviderInterface
    {
        $provider = AIProvider::where('slug', $slug)->first()
            ?? throw new UnknownProviderException("Unknown AI provider: {$slug}");

        return $this->fromModel($provider);
    }

    /**
     * Resolve a provider implementation from its database record.
     * Non-secret settings come from the row's config; the API key
     * comes from the environment, never the database.
     *
     * @throws UnknownProviderException
     */
    public function fromModel(AIProvider $provider): AIProviderInterface
    {
        return match ($provider->slug) {
            'segmind' => new SegmindProvider(
                baseUrl: $provider->config['base_url'] ?? SegmindProvider::DEFAULT_BASE_URL,
                operations: $provider->config['operations'] ?? [],
                apiKey: (string) config('ai.providers.segmind.api_key'),
                storageDisk: (string) config('ai.providers.segmind.storage_disk', 'spaces'),
            ),
            default => throw new UnknownProviderException("Unknown AI provider: {$provider->slug}"),
        };
    }
}
