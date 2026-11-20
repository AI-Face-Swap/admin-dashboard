<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerNotificationController extends Controller
{
    /**
     * Store or update the authenticated customer's FCM device token.
     */
    public function storeFcmToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fcm_token' => ['required', 'string', 'max:512'],
        ]);

        $customer = $request->user();
        $customer->update([
            'fcm_token' => $validated['fcm_token'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'FCM token saved successfully.',
        ]);
    }

    /**
     * List the authenticated customer's notification history with read/unread counts.
     */
    public function index(Request $request): JsonResponse
    {
        $customer = $request->user();
        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        $query = CustomerNotification::query()
            ->where('customer_id', $customer->id)
            ->latest('id');

        if ($request->filled('type')) {
            $query->where('type', (string) $request->string('type'));
        }

        if ($request->string('filter')->toString() === 'unread') {
            $query->unread();
        } elseif ($request->string('filter')->toString() === 'read') {
            $query->read();
        }

        $notifications = $query->paginate($perPage);

        $baseQuery = CustomerNotification::query()->where('customer_id', $customer->id);
        $unreadCount = (clone $baseQuery)->unread()->count();
        $readCount = (clone $baseQuery)->read()->count();

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
            'read_count' => $readCount,
            'total_count' => $unreadCount + $readCount,
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    /**
     * Get read and unread notification counts for the authenticated customer.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $customer = $request->user();
        $baseQuery = CustomerNotification::query()->where('customer_id', $customer->id);
        $unreadCount = (clone $baseQuery)->unread()->count();
        $readCount = (clone $baseQuery)->read()->count();

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
            'read_count' => $readCount,
            'total_count' => $unreadCount + $readCount,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Request $request, CustomerNotification $notification): JsonResponse
    {
        if ($notification->customer_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        if (! $notification->read_at) {
            $notification->update([
                'read_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $notification->fresh(),
        ]);
    }

    /**
     * Mark all notifications as read for the authenticated customer.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $updated = CustomerNotification::query()
            ->where('customer_id', $request->user()->id)
            ->unread()
            ->update([
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'updated_count' => $updated,
        ]);
    }

    /**
     * Delete a single notification from history.
     */
    public function destroy(Request $request, CustomerNotification $notification): JsonResponse
    {
        if ($notification->customer_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted.',
        ]);
    }

    /**
     * Delete all notifications from the authenticated customer's history.
     */
    public function destroyAll(Request $request): JsonResponse
    {
        $deleted = CustomerNotification::query()
            ->where('customer_id', $request->user()->id)
            ->delete();

        return response()->json([
            'success' => true,
            'deleted_count' => $deleted,
        ]);
    }
}
