<?php

use App\Models\Customer;
use App\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

test('unverified customer can request verification email', function () {
    Notification::fake();

    $customer = Customer::factory()->unverified()->create();

    $this->postJson('/api/v1/auth/email/verify/resend', [
        'email' => $customer->email,
    ])->assertOk();

    Notification::assertSentTo($customer, VerifyEmail::class);
});

test('resend returns success even for verified email', function () {
    Notification::fake();

    $customer = Customer::factory()->create(); // already verified

    $this->postJson('/api/v1/auth/email/verify/resend', [
        'email' => $customer->email,
    ])->assertOk();

    Notification::assertNothingSent();
});

test('resend requires email field', function () {
    $this->postJson('/api/v1/auth/email/verify/resend')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('customer email can be verified with signed URL', function () {
    $customer = Customer::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'api.v1.email.verify',
        now()->addMinutes(60),
        [
            'id' => $customer->id,
            'hash' => sha1($customer->email),
        ]
    );

    $this->getJson($verificationUrl)
        ->assertOk()
        ->assertJson(['message' => 'Email verified successfully.']);

    $customer->refresh();
    expect($customer->email_verified_at)->not->toBeNull();
});

test('email cannot be verified with expired signed URL', function () {
    $customer = Customer::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'api.v1.email.verify',
        now()->subMinutes(61), // expired
        [
            'id' => $customer->id,
            'hash' => sha1($customer->email),
        ]
    );

    $this->getJson($verificationUrl)
        ->assertForbidden();
});

test('email cannot be verified with wrong hash', function () {
    $customer = Customer::factory()->unverified()->create();

    $verificationUrl = URL::temporarySignedRoute(
        'api.v1.email.verify',
        now()->addMinutes(60),
        [
            'id' => $customer->id,
            'hash' => 'wrong-hash',
        ]
    );

    $this->getJson($verificationUrl)
        ->assertBadRequest(); // signed URL is valid, but hash mismatch returns error in JSON
});

test('already verified email returns success without re-verifying', function () {
    $customer = Customer::factory()->create(); // already verified

    $verificationUrl = URL::temporarySignedRoute(
        'api.v1.email.verify',
        now()->addMinutes(60),
        [
            'id' => $customer->id,
            'hash' => sha1($customer->email),
        ]
    );

    $this->getJson($verificationUrl)
        ->assertOk()
        ->assertJson(['message' => 'Email is already verified.']);
});

test('registration sends verification email', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertCreated();

    $customer = Customer::where('email', 'test@example.com')->first();

    Notification::assertSentTo($customer, VerifyEmail::class);
});
