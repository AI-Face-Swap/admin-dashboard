<?php

namespace Tests\Feature;

use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Services\AIChatService;
use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Services\Rag\EmbeddingClient;
use App\Services\Rag\VectorSearch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class RagAstrologyChatTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        AIProvider::firstOrCreate(
            ['slug' => 'segmind'],
            ['name' => 'Segmind', 'is_active' => true, 'config' => ['base_url' => 'https://api.segmind.com/v2']]
        );
        AIProvider::firstOrCreate(
            ['slug' => 'opencode-go'],
            ['name' => 'OpenCode Go', 'is_active' => true, 'config' => ['base_url' => 'https://opencode.test/v1']]
        );

        config()->set('services.rag.collection', 'astrology-kb-id');
        config()->set('services.rag.top_k', 10);
        config()->set('services.rag.vector_length', 1536);
        config()->set('services.rag.embedding.driver', 'openai');
        config()->set('services.rag.embedding.url', 'https://embedding.test/v1');
        config()->set('services.rag.embedding.key', 'cf-test-key');
        config()->set('services.rag.embedding.model', '@cf/baai/bge-m3');

        config()->set('ai.providers.opencode_go.base_url', 'https://opencode.test/v1');
        config()->set('ai.providers.opencode_go.api_key', 'oc-test-key');
        config()->set('ai.providers.opencode_go.model', 'deepseek-v4.1-flash');
        config()->set('ai.providers.opencode_go.session_header', 'x-opencode-session');
    }

    public function test_embedding_client_supports_openai_compatible_and_huggingface(): void
    {
        Http::fake([
            'https://embedding.test/v1/embeddings' => Http::response([
                'data' => [['embedding' => [0.25, 0.5, 0.75]]],
            ], 200),
            'https://router.huggingface.co/*' => Http::response([[0.1, 0.2]], 200),
        ]);

        $client = app(EmbeddingClient::class);
        $this->assertSame([0.25, 0.5, 0.75], $client->embed('တနင်္လာသား'));

        config()->set('services.rag.embedding.driver', 'huggingface');
        config()->set('services.rag.embedding.url', '');
        config()->set('services.rag.embedding.model', 'BAAI/bge-m3');

        $this->assertSame([0.1, 0.2], $client->embed('တနင်္လာသား'));
    }

    public function test_astrology_chat_uses_rag_and_opencode_go_without_touching_segmind(): void
    {
        $this->mock(VectorSearch::class, function ($mock) {
            $mock->shouldReceive('search')
                ->once()
                ->with([0.1, 0.2, 0.3], 'astrology-kb-id', 10)
                ->andReturn(collect([
                    [
                        'id' => 'c1',
                        'text' => 'တနင်္လာသားအတွက် ၂၀၂၆ ခုနှစ်သည် စီးပွားတက်မည့်နှစ်ဖြစ်သည်။',
                        'metadata' => ['name' => 'mahabote-2026.pdf'],
                        'score' => 0.8921,
                    ],
                ]));
        });

        Http::fake([
            'https://embedding.test/v1/embeddings' => Http::response([
                'data' => [['embedding' => [0.1, 0.2, 0.3]]],
            ], 200),
            'https://opencode.test/v1/chat/completions' => Http::response([
                'id' => 'oc-req-123',
                'choices' => [[
                    'message' => [
                        'content' => "### 🌟 ကံဇာတာ\n\n**တနင်္လာသား** အတွက် ၂၀၂၆ ခုနှစ်သည် စီးပွားတက်မည့်နှစ်ဖြစ်သည်။ [1]\n\n- အစိမ်းရောင် ဝတ်ဆင်ပါ။ [1]\n\n[RELATED_QUESTIONS]\n1. အချစ်ရေးကော ဘယ်လိုရှိမလဲ?\n2. ဘယ်လတွေမှာ ကံအကောင်းဆုံးလဲ?\n3. ဘာယတြာ လုပ်သင့်လဲ?\n[/RELATED_QUESTIONS]",
                    ],
                ]],
                'usage' => ['prompt_tokens' => 120, 'completion_tokens' => 80, 'total_tokens' => 200],
            ], 200),
        ]);

        $service = app(AIChatService::class);
        $result = $service->chat(
            message: 'တနင်္လာသား ၂၀၂၆ ကံဇာတာ ပြောပြပါ',
            category: 'astrology',
            language: 'my',
            responseType: 'short',
        );

        $this->assertSame('deepseek-v4.1-flash', $result['model']);
        $this->assertSame('astrology', $result['category']);
        $this->assertStringContainsString('**တနင်္လာသား**', $result['content']);
        $this->assertStringNotContainsString('[1]', $result['content']);
        $this->assertStringNotContainsString('[RELATED_QUESTIONS]', $result['content']);
        $this->assertSame([], $result['structured']['sections']);
        $this->assertSame([], $result['structured']['checklist']);
        $this->assertCount(3, $result['structured']['related_questions']);
        $this->assertSame('အချစ်ရေးကော ဘယ်လိုရှိမလဲ?', $result['structured']['related_questions'][0]);

        Http::assertSent(function (Request $req) {
            if ($req->url() !== 'https://opencode.test/v1/chat/completions') {
                return false;
            }

            $sessionHeader = $req->header('x-opencode-session')[0] ?? '';
            $body = $req->data();

            return str_starts_with($sessionHeader, 'ses_')
                && ($body['model'] ?? null) === 'deepseek-v4.1-flash'
                && str_contains((string) ($body['messages'][0]['content'] ?? ''), '<context>')
                && str_contains((string) ($body['messages'][0]['content'] ?? ''), 'mahabote-2026.pdf');
        });

        Http::assertNotSent(fn (Request $req) => str_contains($req->url(), 'segmind.com'));

        $openCodeProvider = AIProvider::where('slug', 'opencode-go')->firstOrFail();
        $generation = AIGeneration::latest('id')->firstOrFail();
        $this->assertSame($openCodeProvider->id, $generation->provider_id);
        $this->assertSame(AIGeneration::STATUS_COMPLETED, $generation->status);
        $this->assertSame('astrology-kb-id', $generation->output_metadata['rag']['collection'] ?? null);
        $this->assertSame(1, $generation->output_metadata['rag']['sources_count'] ?? null);
    }

    public function test_general_chat_continues_using_segmind_without_rag(): void
    {
        $this->mock(VectorSearch::class, function ($mock) {
            $mock->shouldNotReceive('search');
        });

        Http::fake([
            'https://api.segmind.com/v1/deepseek-chat' => Http::response([
                'id' => 'seg-123',
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'content' => 'General response from Segmind.',
                            'structured' => ['sections' => [], 'checklist' => []],
                        ]),
                    ],
                ]],
                'usage' => ['prompt_tokens' => 20, 'completion_tokens' => 30, 'total_tokens' => 50],
            ], 200),
        ]);

        $service = app(AIChatService::class);
        $result = $service->chat(message: 'Hello general', category: 'general', language: 'en');

        $this->assertSame('deepseek-chat', $result['model']);
        Http::assertSent(fn (Request $req) => str_contains($req->url(), 'api.segmind.com/v1/deepseek-chat'));
        Http::assertNotSent(fn (Request $req) => str_contains($req->url(), 'opencode.test'));
    }

    public function test_astrology_rag_error_propagates_without_falling_back_to_segmind(): void
    {
        $this->mock(VectorSearch::class, function ($mock) {
            $mock->shouldReceive('search')->once()->andThrow(new RuntimeException('pgvector connection refused'));
        });

        Http::fake([
            'https://embedding.test/v1/embeddings' => Http::response([
                'data' => [['embedding' => [0.1, 0.2]]],
            ], 200),
        ]);

        $service = app(AIChatService::class);

        try {
            $service->chat(message: 'ဗေဒင်မေးမယ်', category: 'astrology', language: 'my');
            $this->fail('Expected AIGenerationFailedException was not thrown.');
        } catch (AIGenerationFailedException $e) {
            $this->assertStringContainsString('pgvector connection refused', $e->getMessage());
        }

        Http::assertNotSent(fn (Request $req) => str_contains($req->url(), 'segmind.com'));

        $generation = AIGeneration::latest('id')->firstOrFail();
        $this->assertSame(AIGeneration::STATUS_FAILED, $generation->status);
    }

    public function test_astrology_opencode_error_propagates_without_falling_back_to_segmind(): void
    {
        $this->mock(VectorSearch::class, function ($mock) {
            $mock->shouldReceive('search')->once()->andReturn(collect([]));
        });

        Http::fake([
            'https://embedding.test/v1/embeddings' => Http::response([
                'data' => [['embedding' => [0.1, 0.2]]],
            ], 200),
            'https://opencode.test/v1/chat/completions' => Http::response([
                'error' => ['message' => 'OpenCode Go rate limit'],
            ], 429),
        ]);

        $service = app(AIChatService::class);

        try {
            $service->streamChat(message: 'ဗေဒင်မေးမယ်', category: 'astrology', language: 'my');
            $this->fail('Expected AIGenerationFailedException was not thrown.');
        } catch (AIGenerationFailedException $e) {
            $this->assertStringContainsString('OpenCode Go LLM request failed with HTTP 429', $e->getMessage());
        }

        Http::assertNotSent(fn (Request $req) => str_contains($req->url(), 'segmind.com'));

        $generation = AIGeneration::latest('id')->firstOrFail();
        $this->assertSame(AIGeneration::STATUS_FAILED, $generation->status);
    }
}
