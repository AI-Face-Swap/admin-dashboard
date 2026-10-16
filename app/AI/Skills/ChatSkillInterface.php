<?php

namespace App\AI\Skills;

interface ChatSkillInterface
{
    /**
     * Unique category identifier ('general', 'health', 'education').
     */
    public function category(): string;

    /**
     * Human-readable label in English and Myanmar.
     *
     * @return array{en: string, my: string}
     */
    public function label(): array;

    /**
     * System instructions defining the agent's persona, constraints, and expertise.
     */
    public function systemPrompt(string $language = 'my'): string;

    /**
     * Build the optimized, token-efficient full prompt for the LLM.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     */
    public function buildPrompt(string $userMessage, array $history = [], string $language = 'my'): string;

    /**
     * Normalize the parsed LLM response into the format expected by the frontend.
     *
     * @param  array<string, mixed>|string  $rawResponse
     * @return array{content: string, structured: array{sections: array<int, array{title: string, description: string}>, checklist: array<int, array{item: string, detail: string}>}}
     */
    public function formatResponse(array|string $rawResponse, string $language = 'my'): array;
}
