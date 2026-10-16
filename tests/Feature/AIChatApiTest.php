<?php

namespace Tests\Feature;

use App\AI\Skills\ChatSkillFactory;
use App\AI\Skills\EducationSkill;
use App\AI\Skills\GeneralSkill;
use App\AI\Skills\HealthSkill;
use App\Models\AIProvider;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AIChatApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        AIProvider::firstOrCreate(
            ['slug' => 'segmind'],
            [
                'name' => 'Segmind',
                'is_active' => true,
                'config' => ['base_url' => 'https://api.segmind.com/v2'],
            ]
        );
    }

    public function test_skills_return_correct_metadata_and_prompts(): void
    {
        $general = ChatSkillFactory::make('general');
        $this->assertInstanceOf(GeneralSkill::class, $general);
        $this->assertEquals('general', $general->category());
        $this->assertStringContainsString('HTUT AI', $general->systemPrompt('my'));
        $this->assertStringContainsString('HTUT AI', $general->systemPrompt('en'));

        $health = ChatSkillFactory::make('health');
        $this->assertInstanceOf(HealthSkill::class, $health);
        $this->assertEquals('health', $health->category());
        $this->assertStringContainsString('ကျန်းမာရေး', $health->label()['my']);
        $this->assertStringContainsString('disclaimer', $health->systemPrompt('my'));

        $education = ChatSkillFactory::make('education');
        $this->assertInstanceOf(EducationSkill::class, $education);
        $this->assertEquals('education', $education->category());
        $this->assertStringContainsString('ပညာရေး', $education->label()['my']);

        $all = ChatSkillFactory::all();
        $this->assertCount(3, $all);
        $keys = array_column($all, 'key');
        $this->assertContains('general', $keys);
        $this->assertContains('health', $keys);
        $this->assertContains('education', $keys);
    }

    public function test_skills_format_structured_json_and_plain_text(): void
    {
        $skill = ChatSkillFactory::make('health');

        // Valid JSON string
        $rawJson = json_encode([
            'content' => 'Daily health guidance.',
            'structured' => [
                'sections' => [
                    ['title' => '1. Nutrition 🥗', 'description' => 'Eat whole foods.'],
                ],
                'checklist' => [
                    ['item' => 'Water', 'detail' => '2.5L per day.'],
                ],
            ],
        ]);

        $formatted = $skill->formatResponse($rawJson);
        $this->assertEquals('Daily health guidance.', $formatted['content']);
        $this->assertCount(1, $formatted['structured']['sections']);
        $this->assertEquals('1. Nutrition 🥗', $formatted['structured']['sections'][0]['title']);
        $this->assertEquals('Water', $formatted['structured']['checklist'][0]['item']);

        // Markdown code block wrapped JSON
        $wrapped = "```json\n".$rawJson."\n```";
        $formattedWrapped = $skill->formatResponse($wrapped);
        $this->assertEquals('Daily health guidance.', $formattedWrapped['content']);

        // Plain text fallback
        $plain = 'Just plain text response from AI.';
        $formattedPlain = $skill->formatResponse($plain);
        $this->assertEquals('Just plain text response from AI.', $formattedPlain['content']);
        $this->assertEmpty($formattedPlain['structured']['sections']);
    }

    public function test_unauthenticated_user_cannot_send_chat_question(): void
    {
        $response = $this->postJson('/api/v1/chat/send', [
            'prompt' => 'မင်္ဂလာပါ',
            'category' => 'general',
            'language' => 'my',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_customer_sends_chat_and_deducts_5_points(): void
    {
        /** @var Customer $customer */
        $customer = Customer::factory()->create([
            'central_auth_uuid' => 'test-uuid-123',
        ]);

        Sanctum::actingAs($customer);

        Http::fake([
            'https://api.segmind.com/v1/*' => Http::response([
                'id' => 'chatcmpl-test-customer',
                'choices' => [
                    [
                        'message' => [
                            'content' => json_encode([
                                'content' => 'Here is your health plan.',
                                'structured' => [
                                    'sections' => [
                                        ['title' => 'Cardio Routine', 'description' => '30 mins brisk walking.'],
                                    ],
                                    'checklist' => [
                                        ['item' => 'Hydration', 'detail' => 'Drink enough water.'],
                                    ],
                                ],
                            ]),
                        ],
                    ],
                ],
                'usage' => ['total_tokens' => 120, 'prompt_tokens' => 40, 'completion_tokens' => 80],
            ], 200),
            // Central Auth point balance check mock
            '*/api/v1/s2s/points/deduct' => Http::response([
                'success' => true,
                'points' => 95,
                'deducted' => 5,
            ], 200),
            '*/api/v1/s2s/points/*' => Http::response([
                'success' => true,
                'points' => 100,
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/chat/send', [
            'prompt' => 'Best workout for heart health',
            'category' => 'health',
            'language' => 'en',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('points_deducted', 5)
            ->assertJsonStructure([
                'conversation_id',
                'user_message' => ['id', 'role', 'content', 'category'],
                'assistant_message' => ['id', 'role', 'content', 'category', 'structured'],
                'points_deducted',
            ]);

        $this->assertDatabaseHas('chat_conversations', [
            'customer_id' => $customer->id,
            'category' => 'health',
        ]);

        $this->assertDatabaseHas('chat_messages', [
            'role' => 'user',
            'content' => 'Best workout for heart health',
        ]);

        $this->assertDatabaseHas('chat_messages', [
            'role' => 'assistant',
            'content' => 'Here is your health plan.',
        ]);

        $this->assertDatabaseHas('ai_generations', [
            'customer_id' => $customer->id,
            'operation' => 'chat',
            'coins_spent' => 5,
            'status' => 'completed',
        ]);
    }

    public function test_customer_can_list_and_delete_conversations(): void
    {
        /** @var Customer $customer */
        $customer = Customer::factory()->create();
        Sanctum::actingAs($customer);

        $conv = ChatConversation::create([
            'customer_id' => $customer->id,
            'title_en' => 'Test Conversation',
            'title_my' => 'စမ်းသပ် စကားဝိုင်း',
            'category' => 'general',
        ]);

        ChatMessage::create([
            'conversation_id' => $conv->id,
            'role' => 'user',
            'content' => 'Hello AI',
            'category' => 'general',
        ]);

        $listResp = $this->getJson('/api/v1/chat/conversations');
        $listResp->assertStatus(200)
            ->assertJsonCount(1, 'conversations')
            ->assertJsonPath('conversations.0.titleEn', 'Test Conversation');

        $showResp = $this->getJson("/api/v1/chat/conversations/{$conv->id}");
        $showResp->assertStatus(200)
            ->assertJsonPath('conversation.id', (string) $conv->id);

        $deleteResp = $this->deleteJson("/api/v1/chat/conversations/{$conv->id}");
        $deleteResp->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('chat_conversations', ['id' => $conv->id]);
    }

    public function test_insufficient_points_returns_402(): void
    {
        /** @var Customer $customer */
        $customer = Customer::factory()->create([
            'central_auth_uuid' => 'test-uuid-zero-points',
        ]);

        Sanctum::actingAs($customer);

        Http::fake([
            '*/api/v1/s2s/points/*' => Http::response([
                'success' => true,
                'points' => 0,
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/chat/send', [
            'prompt' => 'Tell me a story',
            'category' => 'general',
        ]);

        $response->assertStatus(402)
            ->assertJsonPath('required_points', 5)
            ->assertJsonPath('current_points', 0);
    }
}
