<?php

use App\Models\User;

test('the database seeder creates the super admin user', function () {
    $this->seed();

    $admin = User::where('email', 'admin@gmail.com')->first();

    expect($admin)->not->toBeNull()
        ->and($admin->name)->toBe('Admin')
        ->and(Hash::check('internet', $admin->password))->toBeTrue()
        ->and($admin->isSuperAdmin())->toBeTrue();
});

test('re-seeding does not duplicate the super admin user', function () {
    $this->seed();
    $this->seed();

    expect(User::where('email', 'admin@gmail.com')->count())->toBe(1);
});
