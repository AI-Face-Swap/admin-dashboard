<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Requests\Api\RegisterRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class CustomerAuthController extends Controller
{
    /**
     * Register a new customer.
     *
     * Creates a new customer account with 100 free coins.
     * Returns a Bearer token for subsequent API calls.
     *
     * @response 201 {"customer": {"id": 1, "name": "John", "email": "john@example.com", "coins": 100}, "token": "1|abc..."}
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $customer = Customer::create([
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'password' => $request->string('password')->toString(),
        ])->refresh(); // load DB defaults (customer_type, coins)

        $token = $customer->createToken('mobile')->plainTextToken;

        return response()->json([
            'customer' => $customer,
            'token' => $token,
        ], 201);
    }

    /**
     * Log in an existing customer.
     *
     * Returns a Bearer token for subsequent API calls.
     * Updates last_active_at timestamp.
     *
     * @response 200 {"customer": {"id": 1, "name": "John", "coins": 50}, "token": "2|xyz..."}
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $customer = Customer::where('email', $request->string('email'))->first();

        if (! $customer || ! Hash::check($request->string('password'), $customer->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        $customer->update(['last_active_at' => now()]);

        $token = $customer->createToken('mobile')->plainTextToken;

        return response()->json([
            'customer' => $customer,
            'token' => $token,
        ]);
    }

    /**
     * Log out the current customer.
     *
     * Revokes the current Bearer token. The token will no longer work.
     *
     * @response 200 {"message": "Logged out."}
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user instanceof Customer) {
            $user->currentAccessToken()->delete();
        }

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * Get the authenticated customer's profile.
     *
     * Returns customer info including coins, type, and generation count.
     *
     * @response 200 {"customer": {"id": 1, "name": "John", "email": "john@example.com", "coins": 50, "customer_type": "free"}}
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['customer' => $request->user()]);
    }
}
