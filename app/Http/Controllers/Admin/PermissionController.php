<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Inertia\Inertia;
use Inertia\Response;

class PermissionController extends Controller
{
    /**
     * Display a read-only listing of all permissions.
     */
    public function index(): Response
    {
        return Inertia::render('admin/permissions/index', [
            'permissions' => Permission::withCount('roles')->orderBy('name')->get(),
        ]);
    }
}
