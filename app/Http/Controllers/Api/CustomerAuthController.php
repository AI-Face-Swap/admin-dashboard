<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ForgotPasswordRequest;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Requests\Api\RegisterRequest;
use App\Http\Requests\Api\ResetPasswordRequest;
use App\Http\Requests\Api\SendVerificationEmailRequest;
use App\Models\Customer;
use App\Notifications\CustomerResetPassword;
use App\Notifications\VerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
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

        // Send email verification notification
        $customer->notify(new VerifyEmail);

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

    /**
     * Send an email verification notification to the authenticated customer.
     *
     * @response 200 {"message": "Verification email sent."}
     * @response 403 {"message": "Your email is already verified."}
     */
    public function sendVerificationEmail(SendVerificationEmailRequest $request): JsonResponse
    {
        $request->user()->notify(new VerifyEmail);

        return response()->json([
            'message' => 'Verification email sent.',
        ]);
    }

    /**
     * Verify the customer's email address using a signed URL.
     *
     * The frontend app opens the signed URL from the email, extracts the
     * parameters, and calls this endpoint to complete verification.
     *
     * @response 200 {"message": "Email verified successfully."}
     * @response 400 {"message": "Invalid verification link."}
     */
    public function verifyEmail(Request $request, int $id, string $hash): JsonResponse
    {
        if (! $request->hasValidSignature()) {
            return response()->json([
                'message' => 'Invalid or expired verification link.',
            ], 400);
        }

        $customer = Customer::findOrFail($id);

        if (sha1($customer->email) !== $hash) {
            return response()->json([
                'message' => 'Invalid verification link.',
            ], 400);
        }

        if ($customer->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email is already verified.',
            ]);
        }

        $customer->markEmailAsVerified();

        return response()->json([
            'message' => 'Email verified successfully.',
        ]);
    }

    /**
     * Send a password reset link to the customer's email.
     *
     * Always returns a success response to prevent email enumeration.
     *
     * @response 200 {"message": "If an account with that email exists, a password reset link has been sent."}
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::broker('customers')->sendResetLink(
            $request->only('email'),
            function (Customer $user, string $token) {
                $user->notify(new CustomerResetPassword($token));
            }
        );

        return response()->json([
            'message' => trans($status),
        ]);
    }

    /**
     * Reset the customer's password using a valid token.
     *
     * @response 200 {"message": "Password has been reset successfully."}
     * @response 400 {"message": "...", "errors": {"email": [...]}}
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::broker('customers')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (Customer $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password has been reset successfully.',
            ]);
        }

        return response()->json([
            'message' => trans($status),
        ], 400);
    }
}
