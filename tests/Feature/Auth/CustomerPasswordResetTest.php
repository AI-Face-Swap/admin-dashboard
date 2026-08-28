<?php

use App\Models\Customer;
use App\Notifications\CustomerResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

test('forgot password sends reset link for existing customer', function () {
    Notification::fake();

    $customer = Customer::factory()->create();

    $this->postJson('/api/v1/auth/forgot-password', [
        'email' => $customer->email,
    ])->assertOk();

    Notification::assertSentTo($customer, CustomerResetPassword::class);
});

test('forgot password returns success even for non-existing email', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'nonexistent@example.com',
    ])->assertOk();

    Notification::assertNothingSent();
});

test('forgot password validates email field', function () {
    $this->postJson('/api/v1/auth/forgot-password', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('password can be reset with valid token', function () {
    $customer = Customer::factory()->create();

    $token = Password::broker('customers')->createToken($customer);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $customer->email,
        'token' => $token,
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ])->assertOk()
        ->assertJson(['message' => 'Password has been reset successfully.']);

    // Verify the password was actually changed
    $customer->refresh();
    expect(Hash::check('newpassword123', $customer->password))->toBeTrue();
});

test('password cannot be reset with invalid token', function () {
    $customer = Customer::factory()->create();

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $customer->email,
        'token' => 'invalid-token',
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ])->assertBadRequest();
});

test('password reset validates required fields', function () {
    $this->postJson('/api/v1/auth/reset-password', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'token', 'password']);
});

test('password reset validates password confirmation', function () {
    $customer = Customer::factory()->create();

    $token = Password::broker('customers')->createToken($customer);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $customer->email,
        'token' => $token,
        'password' => 'newpassword123',
        'password_confirmation' => 'differentpassword',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

test('login works with new password after reset', function () {
    $customer = Customer::factory()->create();

    $token = Password::broker('customers')->createToken($customer);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $customer->email,
        'token' => $token,
        'password' => 'newpassword123',
        'password_confirmation' => 'newpassword123',
    ])->assertOk();

    // Login with the new password
    $this->postJson('/api/v1/auth/login', [
        'email' => $customer->email,
        'password' => 'newpassword123',
    ])->assertOk()
        ->assertJsonStructure(['customer', 'token']);
});
