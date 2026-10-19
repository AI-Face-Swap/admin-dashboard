<?php

namespace App\Http\Controllers\Api;

use App\AI\Services\AIChatService;
use App\AI\Skills\ChatSkillFactory;
use App\Http\Controllers\Controller;
use App\Http\Requests\SendChatMessageRequest;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\Customer;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class AIChatController extends Controller
{
    /**
     * List all chat conversations for the authenticated customer.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $conversations = ChatConversation::query()
            ->where('customer_id', $customer->id)
            ->with(['messages' => fn ($q) => $q->orderBy('id', 'asc')])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn (ChatConversation $conv) => $this->formatConversation($conv));

        return response()->json([
            'conversations' => $conversations,
            'categories' => ChatSkillFactory::all(),
        ]);
    }

    /**
     * Get a specific conversation with all messages.
     */
    public function show(Request $request, ChatConversation $conversation): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user();

        if ($conversation->customer_id !== $customer->id) {
            return response()->json(['message' => 'Unauthorized conversation access.'], 403);
        }

        $conversation->load(['messages' => fn ($q) => $q->orderBy('id', 'asc')]);

        return response()->json([
            'conversation' => $this->formatConversation($conversation),
        ]);
    }

    /**
     * Send a question to HTUT AI, invoke Segmind with the selected skill, and deduct points.
     */
    public function send(SendChatMessageRequest $request, AIChatService $chatService): JsonResponse|\Symfony\Component\HttpFoundation\StreamedResponse
    {
        /** @var Customer|null $customer */
        $customer = $request->user('sanctum') ?? $request->user();

        if (! $customer) {
            return response()->json([
                'message' => 'Unauthenticated. Please log in to chat with HTUT AI.',
            ], 401);
        }

        if ($customer->isBanned()) {
            return response()->json(['message' => 'Your account is suspended.'], 403);
        }

        $pointCost = (int) Setting::get('ai', 'point_cost_chat', config('ai.point_costs.chat', 5));

        if (! $customer->hasEnoughPoints($pointCost)) {
            return response()->json([
                'message' => 'Insufficient points. Please top up your points to continue chatting with HTUT AI.',
                'required_points' => $pointCost,
                'current_points' => $customer->points,
            ], 402);
        }

        $prompt = trim($request->input('prompt'));
        $category = (string) $request->input('category', 'general');
        $language = (string) $request->input('language', 'my');
        $model = $request->input('model');
        $conversationId = $request->input('conversation_id');

        // Authenticated Customer mode with DB persistence and Point deduction
        if ($conversationId) {
            $conversation = ChatConversation::where('id', $conversationId)
                ->where('customer_id', $customer->id)
                ->firstOrFail();
        } else {
            $shortTitle = Str::limit($prompt, 55, '...');
            $conversation = ChatConversation::create([
                'customer_id' => $customer->id,
                'title_en' => $shortTitle,
                'title_my' => $shortTitle,
                'category' => $category,
            ]);
        }

        // Save User Message
        $userMessage = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $prompt,
            'category' => $category,
        ]);

        // Load recent history context (up to last 6 messages excluding this new one)
        $history = ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->where('id', '<', $userMessage->id)
            ->orderBy('id', 'desc')
            ->limit(6)
            ->get()
            ->reverse()
            ->map(fn (ChatMessage $m) => [
                'role' => $m->role,
                'content' => $m->content,
            ])
            ->values()
            ->toArray();

        $shouldStream = $request->boolean('stream') || $request->header('Accept') === 'text/event-stream';

        if ($shouldStream) {
            return response()->stream(function () use (
                $chatService,
                $prompt,
                $category,
                $history,
                $language,
                $customer,
                $model,
                $conversation,
                $userMessage,
                $pointCost
            ) {
                if (ob_get_level() > 0) {
                    @ob_flush();
                }
                flush();

                echo 'data: '.json_encode([
                    'type' => 'start',
                    'conversation_id' => $conversation->id,
                    'user_message' => $this->formatMessage($userMessage),
                ])."\n\n";
                flush();

                try {
                    $aiResult = $chatService->streamChat(
                        message: $prompt,
                        category: $category,
                        history: $history,
                        language: $language,
                        requester: $customer,
                        model: $model,
                        onChunk: function (string $chunk) {
                            echo 'data: '.json_encode([
                                'type' => 'chunk',
                                'content' => $chunk,
                            ])."\n\n";
                            flush();
                        }
                    );

                    $assistantMessage = ChatMessage::create([
                        'conversation_id' => $conversation->id,
                        'role' => 'assistant',
                        'content' => $aiResult['content'],
                        'category' => $category,
                        'structured' => $aiResult['structured'],
                        'tokens_used' => $aiResult['tokens_used'],
                        'cost' => $aiResult['cost'],
                    ]);

                    $conversation->touch();

                    $customer->spendPoints(
                        cost: $pointCost,
                        description: "HTUT AI Chat ({$category})",
                        referenceId: "chat_msg_{$assistantMessage->id}",
                        metadata: [
                            'conversation_id' => $conversation->id,
                            'model' => $aiResult['model'],
                        ],
                    );

                    echo 'data: '.json_encode([
                        'type' => 'done',
                        'conversation_id' => $conversation->id,
                        'conversation_title_en' => $conversation->title_en,
                        'conversation_title_my' => $conversation->title_my,
                        'assistant_message' => $this->formatMessage($assistantMessage),
                        'points_deducted' => $pointCost,
                        'points_remaining' => $customer->fresh()->points,
                    ])."\n\n";
                    echo "data: [DONE]\n\n";
                    flush();
                } catch (\Throwable $e) {
                    echo 'data: '.json_encode([
                        'type' => 'error',
                        'message' => $e->getMessage(),
                    ])."\n\n";
                    flush();
                }
            }, 200, [
                'Content-Type' => 'text/event-stream',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Connection' => 'keep-alive',
                'X-Accel-Buffering' => 'no',
            ]);
        }

        // Call Segmind via AIChatService
        $aiResult = $chatService->chat(
            message: $prompt,
            category: $category,
            history: $history,
            language: $language,
            requester: $customer,
            model: $model,
        );

        // Save Assistant Message
        $assistantMessage = ChatMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $aiResult['content'],
            'category' => $category,
            'structured' => $aiResult['structured'],
            'tokens_used' => $aiResult['tokens_used'],
            'cost' => $aiResult['cost'],
        ]);

        // Update conversation metadata
        $conversation->touch();

        // Deduct points from Customer via Central Auth
        $spendResult = $customer->spendPoints(
            cost: $pointCost,
            description: "HTUT AI Chat ({$category})",
            referenceId: (string) $assistantMessage->id,
            metadata: [
                'conversation_id' => $conversation->id,
                'model' => $aiResult['model'],
                'tokens_used' => $aiResult['tokens_used'],
                'cost_usd' => $aiResult['cost'],
            ],
        );

        return response()->json([
            'conversation_id' => $conversation->id,
            'conversation_title_en' => $conversation->title_en,
            'conversation_title_my' => $conversation->title_my,
            'user_message' => $this->formatMessage($userMessage),
            'assistant_message' => $this->formatMessage($assistantMessage),
            'points_deducted' => $pointCost,
            'points_remaining' => $customer->fresh()->points,
            'spend_result' => $spendResult,
        ]);
    }

    /**
     * Delete a conversation.
     */
    public function destroy(Request $request, ChatConversation $conversation): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user();

        if ($conversation->customer_id !== $customer->id) {
            return response()->json(['message' => 'Unauthorized conversation delete.'], 403);
        }

        $conversation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Conversation deleted successfully.',
        ]);
    }

    /**
     * Format a conversation matching frontend expectations.
     *
     * @return array<string, mixed>
     */
    protected function formatConversation(ChatConversation $conv): array
    {
        $updated = $conv->updated_at ?? now();

        return [
            'id' => (string) $conv->id,
            'title_en' => $conv->title_en,
            'title_my' => $conv->title_my,
            'titleEn' => $conv->title_en,
            'titleMy' => $conv->title_my,
            'category' => $conv->category,
            'dateEn' => $this->formatDateEn($updated),
            'dateMy' => $this->formatDateMy($updated),
            'updated_at' => $updated->toIso8601String(),
            'messages' => $conv->messages->map(fn (ChatMessage $m) => $this->formatMessage($m))->values(),
        ];
    }

    /**
     * Format an individual chat message.
     *
     * @return array<string, mixed>
     */
    protected function formatMessage(ChatMessage $message): array
    {
        $created = $message->created_at ?? now();

        return [
            'id' => (string) $message->id,
            'role' => $message->role,
            'content' => $message->content,
            'category' => $message->category,
            'timestamp' => $created->format('g:i A'),
            'structured' => $message->structured,
            'tokens_used' => $message->tokens_used,
            'created_at' => $created->toIso8601String(),
        ];
    }

    protected function formatDateEn(\DateTimeInterface $date): string
    {
        $carbon = Carbon::instance($date);
        if ($carbon->isToday()) {
            return 'Today • '.$carbon->format('g:i A');
        }
        if ($carbon->isYesterday()) {
            return 'Yesterday • '.$carbon->format('M d, Y');
        }

        return $carbon->format('M d, Y');
    }

    protected function formatDateMy(\DateTimeInterface $date): string
    {
        $carbon = Carbon::instance($date);
        if ($carbon->isToday()) {
            return 'ယနေ့ • '.$carbon->format('g:i A');
        }
        if ($carbon->isYesterday()) {
            return 'မနေ့က • '.$carbon->format('M d, Y');
        }

        return $carbon->format('M d, Y');
    }
}
