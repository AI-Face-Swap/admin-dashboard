<?php

namespace App\AI\Skills;

abstract class BaseChatSkill implements ChatSkillInterface
{
    /**
     * Build the token-optimized prompt instructing the LLM to return valid JSON.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     */
    public function buildPrompt(string $userMessage, array $history = [], string $language = 'my'): string
    {
        $systemInstructions = $this->systemPrompt($language);

        // Keep conversation history ultra-compact (last 2 messages only) to save input tokens
        $historyText = '';
        if (! empty($history)) {
            $recent = array_slice($history, -2);
            $historyLines = [];
            foreach ($recent as $msg) {
                $role = $msg['role'] === 'user' ? 'User' : 'Assistant';
                $content = trim(mb_substr($msg['content'], 0, 150));
                $historyLines[] = "{$role}: {$content}";
            }
            $historyText = "Context:\n".implode("\n", $historyLines)."\n\n";
        }

        $targetLang = $language === 'my' ? 'natural Myanmar Unicode' : 'English';
        $jsonFormatSpec = <<<PROMPT
Return strictly raw JSON (no markdown):
{"content":"Short summary in {$targetLang}","structured":{"sections":[{"title":"Title with Emoji","description":"Brief explanation"}],"checklist":[{"item":"Key Point","detail":"Recommendation"}]}}
Keep response concise and under 250 words.
PROMPT;

        return "{$systemInstructions}\n\n{$historyText}Question:\n{$userMessage}\n\n{$jsonFormatSpec}";
    }

    /**
     * Parse and normalize the LLM output into the UI format.
     */
    public function formatResponse(array|string $rawResponse, string $language = 'my'): array
    {
        $parsed = [];

        if (is_array($rawResponse)) {
            $parsed = $rawResponse;
        } elseif (is_string($rawResponse)) {
            // Strip potential markdown code block markers
            $cleaned = trim($rawResponse);
            if (str_starts_with($cleaned, '```json')) {
                $cleaned = substr($cleaned, 7);
            } elseif (str_starts_with($cleaned, '```')) {
                $cleaned = substr($cleaned, 3);
            }
            if (str_ends_with($cleaned, '```')) {
                $cleaned = substr($cleaned, 0, -3);
            }
            $cleaned = trim($cleaned);

            $decoded = json_decode($cleaned, true);
            if (is_array($decoded)) {
                $parsed = $decoded;
            } else {
                $parsed = ['content' => $cleaned];
            }
        }

        $content = (string) ($parsed['content'] ?? ($language === 'my' ? 'အချက်အလက်များကို အောက်တွင် ဖော်ပြပေးထားပါသည်။' : 'Here are the details:'));

        $structured = is_array($parsed['structured'] ?? null) ? $parsed['structured'] : [];
        $sections = [];
        if (! empty($structured['sections']) && is_array($structured['sections'])) {
            foreach ($structured['sections'] as $sec) {
                if (is_array($sec) && ! empty($sec['title'])) {
                    $sections[] = [
                        'title' => (string) $sec['title'],
                        'description' => (string) ($sec['description'] ?? ''),
                    ];
                }
            }
        }

        $checklist = [];
        if (! empty($structured['checklist']) && is_array($structured['checklist'])) {
            foreach ($structured['checklist'] as $item) {
                if (is_array($item) && ! empty($item['item'])) {
                    $checklist[] = [
                        'item' => (string) $item['item'],
                        'detail' => (string) ($item['detail'] ?? ''),
                    ];
                }
            }
        }

        return [
            'content' => $content,
            'structured' => [
                'sections' => $sections,
                'checklist' => $checklist,
            ],
        ];
    }

    protected function getLanguageName(string $lang): string
    {
        return $lang === 'my' ? 'Myanmar (Burmese Unicode)' : 'English';
    }
}
