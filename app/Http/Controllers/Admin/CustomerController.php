<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIGeneration;
use App\Models\Customer;
use App\Services\CentralAuthPointService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    /**
     * Display a listing of customers with stats.
     */
    public function index(Request $request): Response
    {
        $query = Customer::query()
            ->withCount(['generations as total_generations'])
            ->when($request->input('search'), fn ($query, $search) => $query
                ->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")))
            ->when($request->input('type'), fn ($query, $type) => $query
                ->where('customer_type', $type))
            ->when($request->input('status'), fn ($query, $status) => match ($status) {
                'banned' => $query->where('is_banned', true),
                'active' => $query->where('is_banned', false),
                default => $query,
            });

        $customers = $query
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        $stats = [
            'total' => Customer::count(),
            'free' => Customer::where('customer_type', Customer::TYPE_FREE)->count(),
            'premium' => Customer::where('customer_type', Customer::TYPE_PREMIUM)->count(),
            'banned' => Customer::where('is_banned', true)->count(),
            'total_points' => (int) (Customer::count() * 10),
        ];

        return Inertia::render('admin/customers/index', [
            'customers' => $customers,
            'stats' => $stats,
            'filters' => $request->only(['search', 'type', 'status']),
        ]);
    }

    /**
     * Display the specified customer with details.
     */
    public function show(Customer $customer): Response
    {
        $customer->loadCount('generations');

        // Load generations with template for point cost display
        $generations = AIGeneration::where('customer_id', $customer->id)
            ->with('template:id,name,slug,cost')
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        $generationStats = AIGeneration::where('customer_id', $customer->id)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Calculate total points spent from template costs (not USD cost)
        $completedGenerations = AIGeneration::where('customer_id', $customer->id)
            ->where('status', 'completed')
            ->with('template:id,cost')
            ->get();

        $totalPointsSpent = 0;
        foreach ($completedGenerations as $gen) {
            $totalPointsSpent += (int) ($gen->template->cost ?? $gen->coins_spent ?? 0);
        }

        // Fetch point transaction history from Central Auth via S2S
        $pointTransactions = ['data' => [], 'total' => 0];
        $uuid = $customer->central_auth_uuid ?: CentralAuthPointService::ensureCentralAuthUuid($customer);
        if ($uuid) {
            $pointTransactions = CentralAuthPointService::getTransactions($uuid, 20);
        }

        return Inertia::render('admin/customers/show', [
            'customer' => $customer,
            'generations' => $generations,
            'pointTransactions' => $pointTransactions,
            'generationStats' => [
                'total' => $customer->generations_count,
                'completed' => $generationStats['completed'] ?? 0,
                'failed' => $generationStats['failed'] ?? 0,
                'processing' => ($generationStats['processing'] ?? 0) + ($generationStats['queued'] ?? 0),
            ],
            'totalPointsSpent' => $totalPointsSpent,
            'totalCoinsSpent' => $totalPointsSpent,
        ]);
    }

    /**
     * Ban a customer.
     */
    public function ban(Customer $customer): RedirectResponse
    {
        $customer->update(['is_banned' => true]);

        return back()->with('success', "Customer \"{$customer->name}\" has been banned.");
    }

    /**
     * Unban a customer.
     */
    public function unban(Customer $customer): RedirectResponse
    {
        $customer->update(['is_banned' => false]);

        return back()->with('success', "Customer \"{$customer->name}\" has been unbanned.");
    }

    /**
     * Add points to a customer (developer role only).
     */
    public function addPoints(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:100000'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $result = $customer->addPoints($validated['amount'], 'Admin manual credit: ' . ($validated['note'] ?? ''));

        $newBalance = $result['points'] ?? $customer->points;

        return back()->with('success', "Added {$validated['amount']} points to \"{$customer->name}\". New balance: {$newBalance} points.");
    }

    /**
     * Backward-compatible alias for addPoints.
     */
    public function addCoins(Request $request, Customer $customer): RedirectResponse
    {
        return $this->addPoints($request, $customer);
    }

    /**
     * Remove the specified customer.
     */
    public function destroy(Customer $customer): RedirectResponse
    {
        $customer->delete();

        return to_route('admin.customers.index')->with('success', "Customer \"{$customer->name}\" has been deleted.");
    }
}
