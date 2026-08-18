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
     * Register a new customer (starts free with 100 coins) and return a token.
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
     * Log a customer in and return a fresh token.
     *
     * @throws ValidationException
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
     * Revoke the current token.
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
     * Return the authenticated customer's profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['customer' => $request->user()]);
    }
}
