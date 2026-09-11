<?php

use App\Http\Controllers\Admin\AIController;
use App\Http\Controllers\Admin\AIModelController;
use App\Http\Controllers\Admin\APIPlaygroundController;
use App\Http\Controllers\Admin\APIRequestLogController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\GenerationTypeController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\ProviderController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\SliderController;
use App\Http\Controllers\Admin\TemplateCategoryController;
use App\Http\Controllers\Admin\TemplateController;
use App\Http\Controllers\Admin\TemplateTagController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Placeholder sections — real pages land in later phases.
    Route::inertia('ai', 'coming-soon', ['title' => 'AI Generation'])->name('ai');
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

    Route::get('providers', [ProviderController::class, 'index'])->middleware('permission:providers.view')->name('providers.index');
    Route::patch('providers/{provider}/toggle', [ProviderController::class, 'toggle'])->middleware('permission:providers.manage')->name('providers.toggle');

    Route::get('ai', [AIController::class, 'index'])->middleware('permission:ai.view')->name('ai.index');

    Route::get('api-playground', [APIPlaygroundController::class, 'index'])->middleware('permission:api.playground')->name('api-playground.index');

    Route::get('api-logs', [APIRequestLogController::class, 'index'])->middleware('permission:settings.manage')->name('api-logs.index');
    Route::get('api-logs/{log}', [APIRequestLogController::class, 'show'])->middleware('permission:settings.manage')->name('api-logs.show');

    Route::get('templates', [TemplateController::class, 'index'])->middleware('permission:templates.view')->name('templates.index');
    Route::get('templates/create', [TemplateController::class, 'create'])->middleware('permission:templates.manage')->name('templates.create');
    Route::post('templates', [TemplateController::class, 'store'])->middleware('permission:templates.manage')->name('templates.store');
    Route::post('templates/from-generation/{generation}', [TemplateController::class, 'storeFromGeneration'])->middleware('permission:templates.manage')->name('templates.from-generation');
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

    // Customers
    Route::get('customers', [CustomerController::class, 'index'])->middleware('permission:customers.view')->name('customers.index');
    Route::get('customers/{customer}', [CustomerController::class, 'show'])->middleware('permission:customers.view')->name('customers.show');
    Route::patch('customers/{customer}/ban', [CustomerController::class, 'ban'])->middleware('permission:customers.manage')->name('customers.ban');
    Route::patch('customers/{customer}/unban', [CustomerController::class, 'unban'])->middleware('permission:customers.manage')->name('customers.unban');
    Route::post('customers/{customer}/add-coins', [CustomerController::class, 'addCoins'])->middleware('permission:customers.manage')->name('customers.add-coins');
    Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->middleware('permission:customers.manage')->name('customers.destroy');

    // Settings
    Route::get('settings', [SettingController::class, 'index'])->middleware('permission:settings.manage')->name('settings.index');
    Route::put('settings', [SettingController::class, 'update'])->middleware('permission:settings.manage')->name('settings.update');

    // Sliders
    Route::get('sliders', [SliderController::class, 'index'])->middleware('permission:templates.view')->name('sliders.index');
    Route::get('sliders/create', [SliderController::class, 'create'])->middleware('permission:templates.manage')->name('sliders.create');
    Route::post('sliders', [SliderController::class, 'store'])->middleware('permission:templates.manage')->name('sliders.store');
    Route::get('sliders/{slider}/edit', [SliderController::class, 'edit'])->middleware('permission:templates.manage')->name('sliders.edit');
    Route::put('sliders/{slider}', [SliderController::class, 'update'])->middleware('permission:templates.manage')->name('sliders.update');
    Route::delete('sliders/{slider}', [SliderController::class, 'destroy'])->middleware('permission:templates.manage')->name('sliders.destroy');
    // AI Models
    Route::get('ai-models', [AIModelController::class, 'index'])->middleware('permission:templates.view')->name('ai-models.index');
    Route::get('ai-models/create', [AIModelController::class, 'create'])->middleware('permission:templates.manage')->name('ai-models.create');
    Route::post('ai-models', [AIModelController::class, 'store'])->middleware('permission:templates.manage')->name('ai-models.store');
    Route::get('ai-models/{aiModel}/edit', [AIModelController::class, 'edit'])->middleware('permission:templates.manage')->name('ai-models.edit');
    Route::put('ai-models/{aiModel}', [AIModelController::class, 'update'])->middleware('permission:templates.manage')->name('ai-models.update');
    Route::delete('ai-models/{aiModel}', [AIModelController::class, 'destroy'])->middleware('permission:templates.manage')->name('ai-models.destroy');

    // Generation Types
    Route::get('generation-types', [GenerationTypeController::class, 'index'])->middleware('permission:settings.manage')->name('generation-types.index');
    Route::get('generation-types/create', [GenerationTypeController::class, 'create'])->middleware('permission:settings.manage')->name('generation-types.create');
    Route::post('generation-types', [GenerationTypeController::class, 'store'])->middleware('permission:settings.manage')->name('generation-types.store');
    Route::get('generation-types/{generationType}/edit', [GenerationTypeController::class, 'edit'])->middleware('permission:settings.manage')->name('generation-types.edit');
    Route::put('generation-types/{generationType}', [GenerationTypeController::class, 'update'])->middleware('permission:settings.manage')->name('generation-types.update');
    Route::delete('generation-types/{generationType}', [GenerationTypeController::class, 'destroy'])->middleware('permission:settings.manage')->name('generation-types.destroy');
});

require __DIR__.'/settings.php';
