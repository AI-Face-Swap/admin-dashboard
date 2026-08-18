<?php

use App\Models\Customer;
use Illuminate\Database\QueryException;

test('a customer can be created with the factory', function () {
    $customer = Customer::factory()->create();

    expect($customer)->toBeInstanceOf(Customer::class)
        ->and($customer->exists)->toBeTrue()
        ->and($customer->customer_type)->toBe(Customer::TYPE_FREE);
});

test('a customer defaults to the free plan', function () {
    $customer = Customer::factory()->create();

    expect($customer->isFree())->toBeTrue()
        ->and($customer->isPremium())->toBeFalse();
});

test('a premium customer state is applied', function () {
    $customer = Customer::factory()->premium()->create();

    expect($customer->customer_type)->toBe(Customer::TYPE_PREMIUM)
        ->and($customer->isPremium())->toBeTrue()
        ->and($customer->isFree())->toBeFalse();
});

test('a social login customer has no password and stores the provider', function () {
    $customer = Customer::factory()->social('google')->create();

    expect($customer->password)->toBeNull()
        ->and($customer->auth_provider)->toBe('google')
        ->and($customer->auth_provider_id)->not->toBeNull();
});

test('customer emails are unique', function () {
    Customer::factory()->create(['email' => 'same@example.com']);

    expect(fn () => Customer::factory()->create(['email' => 'same@example.com']))
        ->toThrow(QueryException::class);
});

test('the customer password is hashed', function () {
    $customer = Customer::factory()->create(['password' => 'secret-password']);

    expect(Hash::check('secret-password', $customer->password))->toBeTrue();
});
