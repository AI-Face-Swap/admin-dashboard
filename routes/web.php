<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Placeholder sections — real pages land in later phases.
    Route::inertia('ai', 'coming-soon', ['title' => 'AI Generation'])->name('ai');
    Route::inertia('providers', 'coming-soon', ['title' => 'Providers'])->name('providers');
    Route::inertia('users', 'coming-soon', ['title' => 'Users'])->name('users');
    Route::inertia('roles', 'coming-soon', ['title' => 'Roles & Permissions'])->name('roles');
    Route::inertia('api-playground', 'coming-soon', ['title' => 'API Playground'])->name('api-playground');
});

require __DIR__.'/settings.php';
