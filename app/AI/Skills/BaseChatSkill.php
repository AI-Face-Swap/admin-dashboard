<?php

namespace App\AI\Skills;

abstract class BaseChatSkill implements ChatSkillInterface
{
    /**
     * Build the token-optimized prompt instructing the LLM to return valid JSON.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     */
    public function buildPrompt(
        string $userMessage,
        array $history = [],
        string $language = 'my',
        ?string $responseType = null,
        ?string $ragContext = null,
    ): string {
        $systemInstructions = $this->systemPrompt($language, $responseType);

        // Keep conversation history balanced (last 4 messages) to maintain natural conversational context
        $historyText = '';
        if (! empty($history)) {
            $recent = array_slice($history, -4);
            $historyLines = [];
            foreach ($recent as $msg) {
                $role = $msg['role'] === 'user' ? 'User' : 'Assistant';
                $content = trim(mb_substr($msg['content'], 0, 250));
                $historyLines[] = "{$role}: {$content}";
            }
            $historyText = "Conversation Context:\n".implode("\n", $historyLines)."\n\n";
        }

        $contextBlock = '';
        if ($ragContext !== null && trim($ragContext) !== '') {
            $contextBlock = "Knowledge Base Context:\n"
                ."Use the verified reference context below as your primary source. "
                ."Quote numbers, ages, dates, and names accurately as written in the context; never distort them. "
                ."Do not add citation markers such as [1] to the answer.\n"
                ."<context>\n{$ragContext}\n</context>\n\n";
        }

        $jsonFormatSpec = $this->jsonFormatSpec($language, $responseType);

        return "{$systemInstructions}\n\n{$contextBlock}{$historyText}Question:\n{$userMessage}\n\n{$jsonFormatSpec}";
    }

    /**
     * Build the JSON output format specification for the LLM.
     */
    protected function jsonFormatSpec(string $language = 'my', ?string $responseType = null): string
    {
        $targetLang = $language === 'my' ? 'natural Myanmar Unicode' : 'English';

        return <<<PROMPT
Return strictly raw JSON (no markdown):
{
  "content": "A clear, engaging overview in {$targetLang} (2 to 3 sentences).",
  "structured": {
    "sections": [
      {"title": "Section Title with Emoji", "description": "Concise 2-to-3 sentence explanation."}
    ],
    "checklist": [
      {"item": "Key Point", "detail": "Actionable recommendation"}
    ]
  }
}
Structure guidelines: Provide 2 to 3 informative sections and 2 to 4 checklist items. Keep the entire response rich, well-formatted, and under 250 Burmese words.
PROMPT;
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

        $content = $this->stripCitationMarkers((string) ($parsed['content'] ?? ($language === 'my' ? 'အချက်အလက်များကို အောက်တွင် ဖော်ပြပေးထားပါသည်။' : 'Here are the details:')));

        $structured = is_array($parsed['structured'] ?? null) ? $parsed['structured'] : [];
        $sections = [];
        if (! empty($structured['sections']) && is_array($structured['sections'])) {
            foreach ($structured['sections'] as $sec) {
                if (is_array($sec) && ! empty($sec['title'])) {
                    $sections[] = [
                        'title' => $this->stripCitationMarkers((string) $sec['title']),
                        'description' => $this->stripCitationMarkers((string) ($sec['description'] ?? '')),
                    ];
                }
            }
        }

        $checklist = [];
        if (! empty($structured['checklist']) && is_array($structured['checklist'])) {
            foreach ($structured['checklist'] as $item) {
                if (is_array($item) && ! empty($item['item'])) {
                    $checklist[] = [
                        'item' => $this->stripCitationMarkers((string) $item['item']),
                        'detail' => $this->stripCitationMarkers((string) ($item['detail'] ?? '')),
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

    /**
     * Strip [1]-style citation markers the model may include from RAG context.
     */
    protected function stripCitationMarkers(string $text): string
    {
        return trim((string) preg_replace('/[ \t]*\[\d+\]/u', '', $text));
    }

    protected function getLanguageName(string $lang): string
    {
        return $lang === 'my' ? 'Myanmar (Burmese Unicode)' : 'English';
    }
}
