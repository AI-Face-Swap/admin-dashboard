<?php

namespace Tests\Feature;

use App\Models\AdminChatConversation;
use App\Models\AIProvider;
use App\Models\Role;
use App\Models\User;
use App\Services\Rag\VectorSearch;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminAIChatTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('slug', 'admin')->first());

        AIProvider::firstOrCreate(
            ['slug' => 'opencode-go'],
            ['name' => 'OpenCode Go', 'is_active' => true, 'config' => ['base_url' => 'https://opencode.test/v1']]
        );

        config()->set('services.rag.collection', 'astrology-kb-id');
        config()->set('services.rag.top_k', 5);
        config()->set('services.rag.embedding.driver', 'openai');
        config()->set('services.rag.embedding.url', 'https://embedding.test/v1');
        config()->set('services.rag.embedding.key', 'cf-key');
        config()->set('services.rag.embedding.model', '@cf/baai/bge-m3');

        config()->set('ai.providers.opencode_go.base_url', 'https://opencode.test/v1');
        config()->set('ai.providers.opencode_go.api_key', 'oc-key');
        config()->set('ai.providers.opencode_go.model', 'deepseek-v4.1-flash');
    }

    public function test_admin_can_send_astrology_chat_with_custom_dob_and_view_history(): void
    {
        $this->mock(VectorSearch::class, function ($mock) {
            $mock->shouldReceive('search')->once()->andReturn(collect([
                [
                    'id' => 'c1',
                    'text' => 'တူရာသီဖွားများသည် စီးပွားရေးကောင်းမွန်မည်။',
                    'metadata' => ['name' => 'mahabote.txt'],
                    'score' => 0.85,
                ],
            ]));
        });

        Http::fake([
            'https://embedding.test/v1/embeddings' => Http::response([
                'data' => [['embedding' => [0.1, 0.2, 0.3]]],
            ], 200),
            'https://opencode.test/v1/chat/completions' => Http::response([
                'id' => 'oc-admin-1',
                'choices' => [[
                    'message' => ['content' => "### 🌟 ဟောစာတမ်း\n\n**ကောင်းမွန်ပါသည်။**"],
                ]],
                'usage' => ['prompt_tokens' => 50, 'completion_tokens' => 40, 'total_tokens' => 90],
            ], 200),
        ]);

        $sendResp = $this->actingAs($this->admin)->postJson('/admin/ai-chat/send', [
            'prompt' => '၂၀၂၆ စီးပွားရေး ဟောပေးပါ',
            'category' => 'astrology',
            'response_type' => 'normal',
            'language' => 'my',
            'client_name' => 'Mg Mg',
            'client_gender' => 'male',
            'client_birthday' => '2005-10-08',
        ]);

        $sendResp->assertStatus(200)
            ->assertJsonPath('conversation.client_name', 'Mg Mg')
            ->assertJsonPath('conversation.client_birthday', '2005-10-08')
            ->assertJsonPath('assistant_message.model', 'deepseek-v4.1-flash')
            ->assertJsonCount(1, 'assistant_message.rag_sources');

        Http::assertSent(fn (Request $req) => $req->url() === 'https://opencode.test/v1/chat/completions'
            && str_contains((string) ($req['messages'][0]['content'] ?? ''), 'Name=Mg Mg')
            && str_contains((string) ($req['messages'][0]['content'] ?? ''), 'Birthday=2005-10-08')
        );

        $conversationId = $sendResp->json('conversation.id');

        $showResp = $this->actingAs($this->admin)->getJson("/admin/ai-chat/conversations/{$conversationId}");
        $showResp->assertStatus(200)
            ->assertJsonPath('conversation.id', $conversationId)
            ->assertJsonCount(2, 'messages');

        $deleteResp = $this->actingAs($this->admin)->deleteJson("/admin/ai-chat/conversations/{$conversationId}");
        $deleteResp->assertStatus(200)->assertJsonPath('deleted', true);
        $this->assertDatabaseMissing('admin_chat_conversations', ['id' => $conversationId]);
    }

    public function test_admin_cannot_access_another_admins_chat_history(): void
    {
        $otherAdmin = User::factory()->create();
        $otherAdmin->roles()->attach(Role::where('slug', 'admin')->first());

        $conversation = AdminChatConversation::create([
            'user_id' => $otherAdmin->id,
            'category' => 'astrology',
            'title' => 'Private reading',
            'client_name' => 'Secret Client',
        ]);

        $this->actingAs($this->admin)
            ->getJson("/admin/ai-chat/conversations/{$conversation->id}")
            ->assertStatus(403);

        $this->actingAs($this->admin)
            ->deleteJson("/admin/ai-chat/conversations/{$conversation->id}")
            ->assertStatus(403);
    }
}
