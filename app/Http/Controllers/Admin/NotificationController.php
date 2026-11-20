<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\PushNotification;
use App\Services\FcmNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(): Response
    {
        $notifications = PushNotification::query()
            ->with('customer:id,name,email,phone')
            ->latest('id')
            ->paginate(20);

        $customers = Customer::query()
            ->where('is_banned', false)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone']);

        return Inertia::render('admin/notifications/index', [
            'notifications' => $notifications,
            'customers' => $customers,
        ]);
    }

    public function store(Request $request, FcmNotificationService $fcmService): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:2000'],
            'target_type' => ['required', 'in:all,single'],
            'customer_id' => ['nullable', 'required_if:target_type,single', 'exists:customers,id'],
            'scheduled_at' => ['nullable', 'date'],
            'send_now' => ['boolean'],
        ]);

        $isScheduled = ! empty($validated['scheduled_at']);
        $sendNow = (bool) ($validated['send_now'] ?? false);

        $campaign = PushNotification::query()->create([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'target_type' => $validated['target_type'],
            'customer_id' => $validated['target_type'] === PushNotification::TARGET_SINGLE
                ? $validated['customer_id']
                : null,
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

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:2000'],
            'target_type' => ['required', 'in:all,single'],
            'customer_id' => ['nullable', 'required_if:target_type,single', 'exists:customers,id'],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        $isScheduled = ! empty($validated['scheduled_at']);

        $notification->update([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'target_type' => $validated['target_type'],
            'customer_id' => $validated['target_type'] === PushNotification::TARGET_SINGLE
                ? $validated['customer_id']
                : null,
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
}
