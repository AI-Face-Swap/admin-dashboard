<?php

use App\Models\AIGeneration;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('customer.{id}', function ($user, $id) {
    if ($user instanceof Customer) {
        return (int) $user->id === (int) $id;
    }

    return false;
}, ['guards' => ['sanctum', 'web']]);

Broadcast::channel('user.{id}', function ($user, $id) {
    if ($user instanceof User) {
        return (int) $user->id === (int) $id;
    }

    return false;
}, ['guards' => ['sanctum', 'web']]);

Broadcast::channel('generation.{id}', function ($user, $id) {
    $generation = AIGeneration::find($id);
    if (! $generation) {
        return false;
    }

    if ($user instanceof Customer) {
        return (int) $generation->customer_id === (int) $user->id;
    }

    if ($user instanceof User) {
        return (int) $generation->user_id === (int) $user->id;
    }

    return false;
}, ['guards' => ['sanctum', 'web']]);
