<?php

namespace App\Http\Controllers\Admin;

use App\Actions\CalendarAction;
use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Services\AIChatService;
use App\AI\Skills\AstrologySkill;
use App\Http\Controllers\Controller;
use App\Models\AdminChatConversation;
use App\Models\AdminChatMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminAIChatController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $conversations = AdminChatConversation::query()
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->limit(40)
            ->get()
            ->map(fn (AdminChatConversation $c): array => $this->formatConversationSummary($c))
            ->values();

        return Inertia::render('admin/ai-chat/index', [
            'conversations' => $conversations,
        ]);
    }

    public function calculateDob(Request $request, CalendarAction $calendarAction): JsonResponse
    {
        $validated = $request->validate([
            'birthday' => ['required', 'date'],
        ]);

        $dob = date('Y-m-d', strtotime($validated['birthday']));

        return response()->json([
            'birthday' => $dob,
            'astrology' => $this->resolveAstrologyFromDob($dob, $calendarAction),
        ]);
    }

    public function show(Request $request, AdminChatConversation $conversation): JsonResponse
    {
        abort_unless($conversation->user_id === $request->user()->id, 403);

        $conversation->load('messages');

        return response()->json([
            'conversation' => $this->formatConversationSummary($conversation),
            'messages' => $conversation->messages
                ->map(fn (AdminChatMessage $m): array => $this->formatMessage($m))
                ->values(),
        ]);
    }

    public function send(
        Request $request,
        AIChatService $chatService,
        CalendarAction $calendarAction,
    ): JsonResponse {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'min:1', 'max:5000'],
            'category' => ['required', 'string', Rule::in(['astrology', 'general', 'health', 'education'])],
            'response_type' => ['nullable', 'string', Rule::in(AstrologySkill::RESPONSE_TYPES)],
            'language' => ['nullable', 'string', Rule::in(['my', 'en'])],
            'conversation_id' => ['nullable', 'integer'],
            'client_name' => ['nullable', 'string', 'max:120'],
            'client_gender' => ['nullable', 'string', Rule::in(['male', 'female'])],
            'client_birthday' => ['nullable', 'date'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $prompt = trim($validated['prompt']);
        $category = $validated['category'];
        $language = $validated['language'] ?? 'my';
        $responseType = $category === 'astrology'
            ? AstrologySkill::normalizeResponseType($validated['response_type'] ?? null)
            : null;

        $clientName = filled($validated['client_name'] ?? null) ? trim((string) $validated['client_name']) : null;
        $clientGender = $validated['client_gender'] ?? null;
        $clientBirthday = filled($validated['client_birthday'] ?? null)
            ? date('Y-m-d', strtotime((string) $validated['client_birthday']))
            : null;

        $astrology = $clientBirthday
            ? $this->resolveAstrologyFromDob($clientBirthday, $calendarAction)
            : null;

        if (! empty($validated['conversation_id'])) {
            $conversation = AdminChatConversation::query()
                ->where('id', $validated['conversation_id'])
                ->where('user_id', $user->id)
                ->firstOrFail();

            $conversation->update([
                'category' => $category,
                'client_name' => $clientName,
                'client_gender' => $clientGender,
                'client_birthday' => $clientBirthday,
                'client_astrology' => $astrology,
            ]);
        } else {
            $conversation = AdminChatConversation::create([
                'user_id' => $user->id,
                'category' => $category,
                'title' => Str::limit($prompt, 70),
                'client_name' => $clientName,
                'client_gender' => $clientGender,
                'client_birthday' => $clientBirthday,
                'client_astrology' => $astrology,
            ]);
        }

        $history = AdminChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->orderByDesc('id')
            ->limit(6)
            ->get()
            ->reverse()
            ->map(fn (AdminChatMessage $m): array => [
                'role' => $m->role,
                'content' => $m->content,
            ])
            ->values()
            ->all();

        $promptForAi = $prompt;
        if ($category === 'astrology' && $clientBirthday) {
            $astroContext = sprintf(
                "[User Astrology Profile: Name=%s, Gender=%s, Birthday=%s, Myanmar Birthday=%s, Day=%s, Zodiac=%s, Mahabote=%s, Nakhat=%s, San-Yand-Nakhat=%s]\n",
                $clientName ?: 'Client',
                $clientGender ?: 'unspecified',
                $clientBirthday,
                $astrology['myanmar_birthday'] ?? '',
                $astrology['day'] ?? '',
                $astrology['zodiac'] ?? '',
                $astrology['mahabote'] ?? '',
                $astrology['nakhat'] ?? '',
                $astrology['san_yat_natkhat'] ?? '',
            );
            $promptForAi = $astroContext.$prompt;
        }

        try {
            $aiResult = $chatService->chat(
                message: $promptForAi,
                category: $category,
                history: $history,
                language: $language,
                requester: $user,
                responseType: $responseType,
            );
        } catch (AIGenerationFailedException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 502);
        }

        $userMessage = AdminChatMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $prompt,
        ]);

        $assistantMessage = AdminChatMessage::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $aiResult['content'],
            'structured' => $aiResult['structured'],
            'rag_sources' => $aiResult['rag_sources'] ?? [],
            'model' => $aiResult['model'],
            'response_type' => $responseType,
            'duration_ms' => $aiResult['duration_ms'],
        ]);

        $conversation->touch();

        return response()->json([
            'conversation' => $this->formatConversationSummary($conversation->fresh()),
            'user_message' => $this->formatMessage($userMessage),
            'assistant_message' => $this->formatMessage($assistantMessage),
        ]);
    }

    public function destroy(Request $request, AdminChatConversation $conversation): JsonResponse
    {
        abort_unless($conversation->user_id === $request->user()->id, 403);

        $conversation->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * @return array<string, string|null>
     */
    private function resolveAstrologyFromDob(string $dob, CalendarAction $calendarAction): array
    {
        $calendar = $calendarAction->handle($dob, $dob);
        $calendarData = json_decode((string) json_encode($calendar));
        $calInfo = $calendarData->info[0] ?? null;
        $detail = $calInfo->detail ?? null;

        $myanmarBirthday = $calInfo
            ? trim(($calInfo->formatted->year_my ?? '').', '.($calInfo->formatted->month_my ?? '').' '.($calInfo->formatted->day_my ?? '').' '.($calInfo->formatted->date_my ?? ''))
            : null;

        return [
            'day' => $calInfo->formatted->weekday_my ?? null,
            'myanmar_birthday' => $myanmarBirthday,
            'zodiac' => $detail->zodiac ?? null,
            'mahabote' => $detail->mahabote ?? null,
            'nakhat' => $detail->nakhat ?? null,
            'san_yat_natkhat' => $detail->san_yat_natkhat ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatConversationSummary(AdminChatConversation $conversation): array
    {
        return [
            'id' => $conversation->id,
            'category' => $conversation->category,
            'title' => $conversation->title,
            'client_name' => $conversation->client_name,
            'client_gender' => $conversation->client_gender,
            'client_birthday' => $conversation->client_birthday?->format('Y-m-d'),
            'client_astrology' => $conversation->client_astrology,
            'updated_at' => $conversation->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatMessage(AdminChatMessage $message): array
    {
        return [
            'id' => $message->id,
            'role' => $message->role,
            'content' => $message->content,
            'structured' => $message->structured,
            'rag_sources' => $message->rag_sources ?? [],
            'model' => $message->model,
            'response_type' => $message->response_type,
            'duration_ms' => $message->duration_ms,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }
}
