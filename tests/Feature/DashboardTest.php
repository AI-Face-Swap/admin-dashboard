<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('home route redirects guests to login and authenticated users to dashboard', function () {
    $this->get('/')->assertRedirect(route('login'));

    $user = User::factory()->create();
    $this->actingAs($user)->get('/')->assertRedirect(route('dashboard'));
});

test('public registration routes are disabled', function () {
    $this->get('/register')->assertNotFound();
    $this->post('/register', [
        'name' => 'Hacker',
        'email' => 'hacker@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertNotFound();
});
