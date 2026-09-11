<?php

use App\Models\User;

test('admin can view generation types', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin'); // Adjust role if needed

    $response = $this->actingAs($user)->get('/admin/generation-types');

    $response->assertStatus(200);
});

test('admin can create generation type', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->post('/admin/generation-types', [
        'name' => 'Test Generation',
        'is_active' => true,
    ]);

    $response->assertRedirect('/admin/generation-types');
    $this->assertDatabaseHas('generation_types', [
        'name' => 'Test Generation',
    ]);
});
