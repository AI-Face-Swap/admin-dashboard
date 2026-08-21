<?php

/**
 * Custom PHPUnit bootstrap — runs BEFORE Laravel boots.
 *
 * Uses a file-based SQLite database for testing instead of :memory:.
 * This prevents the "no such table" error when artisan commands
 * (like migrate:fresh) create new connections.
 */

// Use a temporary file-based SQLite database
define('TEST_DB_PATH', sys_get_temp_dir() . '/htut_ai_test.sqlite');

// Clean slate before each test run
if (file_exists(TEST_DB_PATH)) {
    @unlink(TEST_DB_PATH);
}

// Set DB vars BEFORE any Laravel/Dotenv code runs
putenv('DB_CONNECTION=sqlite');
putenv('DB_DATABASE=' . TEST_DB_PATH);

$_ENV['DB_CONNECTION'] = 'sqlite';
$_ENV['DB_DATABASE'] = TEST_DB_PATH;

$_SERVER['DB_CONNECTION'] = 'sqlite';
$_SERVER['DB_DATABASE'] = TEST_DB_PATH;

// Load Composer autoloader
require __DIR__.'/../vendor/autoload.php';
