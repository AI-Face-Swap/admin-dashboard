<?php

use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\TemplateCategoryController;
use App\Http\Controllers\Admin\TemplateController;
use App\Http\Controllers\Admin\TemplateTagController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Placeholder sections — real pages land in later phases.
    Route::inertia('ai', 'coming-soon', ['title' => 'AI Generation'])->name('ai');
    Route::inertia('providers', 'coming-soon', ['title' => 'Providers'])->name('providers');
    Route::inertia('api-playground', 'coming-soon', ['title' => 'API Playground'])->name('api-playground');
});

Route::middleware(['auth', 'verified'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('users', [UserController::class, 'index'])->middleware('permission:users.view')->name('users.index');
    Route::get('users/create', [UserController::class, 'create'])->middleware('permission:users.manage')->name('users.create');
    Route::post('users', [UserController::class, 'store'])->middleware('permission:users.manage')->name('users.store');
    Route::get('users/{user}/edit', [UserController::class, 'edit'])->middleware('permission:users.manage')->name('users.edit');
    Route::put('users/{user}', [UserController::class, 'update'])->middleware('permission:users.manage')->name('users.update');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.manage')->name('users.destroy');

    Route::get('roles', [RoleController::class, 'index'])->middleware('permission:roles.view')->name('roles.index');
    Route::get('roles/create', [RoleController::class, 'create'])->middleware('permission:roles.manage')->name('roles.create');
    Route::post('roles', [RoleController::class, 'store'])->middleware('permission:roles.manage')->name('roles.store');
    Route::get('roles/{role}/edit', [RoleController::class, 'edit'])->middleware('permission:roles.manage')->name('roles.edit');
    Route::put('roles/{role}', [RoleController::class, 'update'])->middleware('permission:roles.manage')->name('roles.update');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.manage')->name('roles.destroy');

    Route::get('permissions', [PermissionController::class, 'index'])->middleware('permission:roles.view')->name('permissions.index');

    Route::get('templates', [TemplateController::class, 'index'])->middleware('permission:templates.view')->name('templates.index');
    Route::get('templates/create', [TemplateController::class, 'create'])->middleware('permission:templates.manage')->name('templates.create');
    Route::post('templates', [TemplateController::class, 'store'])->middleware('permission:templates.manage')->name('templates.store');
    Route::get('templates/{template}/edit', [TemplateController::class, 'edit'])->middleware('permission:templates.manage')->name('templates.edit');
    Route::put('templates/{template}', [TemplateController::class, 'update'])->middleware('permission:templates.manage')->name('templates.update');
    Route::delete('templates/{template}', [TemplateController::class, 'destroy'])->middleware('permission:templates.manage')->name('templates.destroy');

    Route::get('template-categories', [TemplateCategoryController::class, 'index'])->middleware('permission:templates.view')->name('template-categories.index');
    Route::get('template-categories/create', [TemplateCategoryController::class, 'create'])->middleware('permission:templates.manage')->name('template-categories.create');
    Route::post('template-categories', [TemplateCategoryController::class, 'store'])->middleware('permission:templates.manage')->name('template-categories.store');
    Route::get('template-categories/{category}/edit', [TemplateCategoryController::class, 'edit'])->middleware('permission:templates.manage')->name('template-categories.edit');
    Route::put('template-categories/{category}', [TemplateCategoryController::class, 'update'])->middleware('permission:templates.manage')->name('template-categories.update');
    Route::delete('template-categories/{category}', [TemplateCategoryController::class, 'destroy'])->middleware('permission:templates.manage')->name('template-categories.destroy');

    Route::get('template-tags', [TemplateTagController::class, 'index'])->middleware('permission:templates.view')->name('template-tags.index');
    Route::get('template-tags/create', [TemplateTagController::class, 'create'])->middleware('permission:templates.manage')->name('template-tags.create');
    Route::post('template-tags', [TemplateTagController::class, 'store'])->middleware('permission:templates.manage')->name('template-tags.store');
    Route::get('template-tags/{tag}/edit', [TemplateTagController::class, 'edit'])->middleware('permission:templates.manage')->name('template-tags.edit');
    Route::put('template-tags/{tag}', [TemplateTagController::class, 'update'])->middleware('permission:templates.manage')->name('template-tags.update');
    Route::delete('template-tags/{tag}', [TemplateTagController::class, 'destroy'])->middleware('permission:templates.manage')->name('template-tags.destroy');
});

require __DIR__.'/settings.php';
