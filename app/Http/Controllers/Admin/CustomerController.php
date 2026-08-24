<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIGeneration;
use App\Models\Customer;
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
            })
            ->when($request->input('coins_min'), fn ($query, $min) => $query
                ->where('coins', '>=', (int) $min))
            ->when($request->input('coins_max'), fn ($query, $max) => $query
                ->where('coins', '<=', (int) $max));

        $customers = $query
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        $stats = [
            'total' => Customer::count(),
            'free' => Customer::where('customer_type', Customer::TYPE_FREE)->count(),
            'premium' => Customer::where('customer_type', Customer::TYPE_PREMIUM)->count(),
            'banned' => Customer::where('is_banned', true)->count(),
            'total_coins' => (int) Customer::sum('coins'),
        ];

        return Inertia::render('admin/customers/index', [
            'customers' => $customers,
            'stats' => $stats,
            'filters' => $request->only(['search', 'type', 'status', 'coins_min', 'coins_max']),
        ]);
    }

    /**
     * Display the specified customer with details.
     */
    public function show(Customer $customer): Response
    {
        $customer->loadCount('generations');

        // Load generations with template for coin cost display
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

        // Calculate total coins spent from template costs (not USD cost)
        $completedGenerations = AIGeneration::where('customer_id', $customer->id)
            ->where('status', 'completed')
            ->with('template:id,cost')
            ->get();

        $totalCoinsSpent = 0;
        foreach ($completedGenerations as $gen) {
            // For face-swap and video-face-swap, use template cost
            // For image-generation and image-to-video, use the configured coin cost
            if (in_array($gen->operation, ['face-swap', 'video-face-swap'])) {
                $totalCoinsSpent += (int) ($gen->template->cost ?? 0);
            } else {
                // For other operations, we don't track coins in the generation record
                // This would need a separate coin_transactions table for accurate tracking
                // For now, use template cost if available
                $totalCoinsSpent += (int) ($gen->template->cost ?? 0);
            }
        }

        return Inertia::render('admin/customers/show', [
            'customer' => $customer,
            'generations' => $generations,
            'generationStats' => [
                'total' => $customer->generations_count,
                'completed' => $generationStats['completed'] ?? 0,
                'failed' => $generationStats['failed'] ?? 0,
                'processing' => ($generationStats['processing'] ?? 0) + ($generationStats['queued'] ?? 0),
            ],
            'totalCoinsSpent' => $totalCoinsSpent,
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
     * Add coins to a customer (developer role only).
     */
    public function addCoins(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:100000'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $customer->addCoins($validated['amount']);

        return back()->with('success', "Added {$validated['amount']} coins to \"{$customer->name}\". New balance: {$customer->fresh()->coins} coins.");
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
