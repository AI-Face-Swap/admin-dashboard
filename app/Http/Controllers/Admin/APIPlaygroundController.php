<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class APIPlaygroundController extends Controller
{
    /**
     * Display the API testing playground.
     */
    public function index(): Response
    {
        return Inertia::render('admin/api-playground/index');
    }
}
