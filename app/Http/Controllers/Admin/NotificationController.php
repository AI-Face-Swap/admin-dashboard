<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\PushNotification;
use App\Models\Template;
use App\Services\FcmNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(): Response
    {
        $notifications = PushNotification::query()
            ->with([
                'customer:id,name,email,phone',
                'template:id,name,slug',
            ])
            ->latest('id')
            ->paginate(20);

        $customers = Customer::query()
            ->where('is_banned', false)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone']);

        $templates = Template::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        return Inertia::render('admin/notifications/index', [
            'notifications' => $notifications,
            'customers' => $customers,
            'templates' => $templates,
        ]);
    }

    public function store(Request $request, FcmNotificationService $fcmService): RedirectResponse
    {
        $validated = $this->validateNotification($request);

        $imageUrl = $this->resolveImageUrl($request, $validated['image_url'] ?? null);
        [$webUrl, $mobileUrl] = $this->resolveLinks(
            $validated['template_id'] ?? null,
            $validated['web_url'] ?? null,
            $validated['mobile_url'] ?? null,
        );

        $isScheduled = ! empty($validated['scheduled_at']);
        $sendNow = (bool) ($validated['send_now'] ?? false);

        $campaign = PushNotification::query()->create([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'target_type' => $validated['target_type'],
            'customer_id' => $validated['target_type'] === PushNotification::TARGET_SINGLE
                ? $validated['customer_id']
                : null,
            'template_id' => $validated['template_id'] ?? null,
            'image_url' => $imageUrl,
            'web_url' => $webUrl,
            'mobile_url' => $mobileUrl,
            'scheduled_at' => $validated['scheduled_at'] ?? null,
            'status' => $isScheduled ? PushNotification::STATUS_SCHEDULED : PushNotification::STATUS_DRAFT,
            'created_by' => $request->user()?->id,
        ]);

        if ($sendNow && ! $isScheduled) {
            $fcmService->dispatchCampaign($campaign);

            return back()->with('success', 'Notification sent successfully.');
        }

        return back()->with('success', $isScheduled ? 'Notification scheduled successfully.' : 'Notification draft saved.');
    }

    public function update(Request $request, PushNotification $notification): RedirectResponse
    {
        if (in_array($notification->status, [PushNotification::STATUS_SENT, PushNotification::STATUS_SENDING], true)) {
            return back()->with('error', 'Sent notifications cannot be edited.');
        }

        $validated = $this->validateNotification($request);

        $imageUrl = $this->resolveImageUrl($request, $validated['image_url'] ?? null, $notification->image_url);
        [$webUrl, $mobileUrl] = $this->resolveLinks(
            $validated['template_id'] ?? null,
            $validated['web_url'] ?? null,
            $validated['mobile_url'] ?? null,
        );

        $isScheduled = ! empty($validated['scheduled_at']);

        $notification->update([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'target_type' => $validated['target_type'],
            'customer_id' => $validated['target_type'] === PushNotification::TARGET_SINGLE
                ? $validated['customer_id']
                : null,
            'template_id' => $validated['template_id'] ?? null,
            'image_url' => $imageUrl,
            'web_url' => $webUrl,
            'mobile_url' => $mobileUrl,
            'scheduled_at' => $validated['scheduled_at'] ?? null,
            'status' => $isScheduled ? PushNotification::STATUS_SCHEDULED : PushNotification::STATUS_DRAFT,
        ]);

        return back()->with('success', 'Notification updated successfully.');
    }

    public function send(PushNotification $notification, FcmNotificationService $fcmService): RedirectResponse
    {
        if ($notification->status === PushNotification::STATUS_SENDING) {
            return back()->with('error', 'Notification is already sending.');
        }

        $fcmService->dispatchCampaign($notification);

        return back()->with('success', 'Notification dispatched successfully.');
    }

    public function destroy(PushNotification $notification): RedirectResponse
    {
        $notification->delete();

        return back()->with('success', 'Notification deleted successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateNotification(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:2000'],
            'target_type' => ['required', 'in:all,single'],
            'customer_id' => ['nullable', 'required_if:target_type,single', 'exists:customers,id'],
            'template_id' => ['nullable', 'exists:'.Template::class.',id'],
            'image' => ['nullable', 'image', 'max:5120'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'web_url' => ['nullable', 'string', 'max:500'],
            'mobile_url' => ['nullable', 'string', 'max:500'],
            'scheduled_at' => ['nullable', 'date'],
            'send_now' => ['boolean'],
        ]);
    }

    private function resolveImageUrl(Request $request, ?string $imageUrl, ?string $fallback = null): ?string
    {
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('notifications', 'public');

            return url(Storage::url($path));
        }

        if ($imageUrl !== null) {
            $trimmed = trim($imageUrl);

            return $trimmed !== '' ? $trimmed : null;
        }

        return $fallback;
    }

    /**
     * @return array{0: ?string, 1: ?string}
     */
    private function resolveLinks(?int $templateId, ?string $webUrl, ?string $mobileUrl): array
    {
        $resolvedWeb = is_string($webUrl) && trim($webUrl) !== '' ? trim($webUrl) : null;
        $resolvedMobile = is_string($mobileUrl) && trim($mobileUrl) !== '' ? trim($mobileUrl) : null;

        if ($templateId && ($resolvedWeb === null || $resolvedMobile === null)) {
            $slug = Template::query()->whereKey($templateId)->value('slug');
            if ($slug) {
                $resolvedWeb ??= "/templates/{$slug}";
                $resolvedMobile ??= "/templates/{$slug}";
            }
        }

        return [$resolvedWeb, $resolvedMobile];
    }
}
