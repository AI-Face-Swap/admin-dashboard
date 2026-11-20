<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ApiDocsSettings
{
    private const GROUP = 'api_docs';

    public static function isEnabled(): bool
    {
        try {
            return Setting::get(self::GROUP, 'enabled', '0') === '1';
        } catch (\Throwable) {
            return false;
        }
    }

    public static function hasPassword(): bool
    {
        try {
            $hash = Setting::get(self::GROUP, 'password_hash');

            return is_string($hash) && $hash !== '';
        } catch (\Throwable) {
            return false;
        }
    }

    public static function version(): string
    {
        try {
            $version = Setting::get(self::GROUP, 'version');

            return is_string($version) && $version !== '' ? $version : '1';
        } catch (\Throwable) {
            return '1';
        }
    }

    public static function verifyPassword(string $plain): bool
    {
        $hash = Setting::get(self::GROUP, 'password_hash');
        if (! is_string($hash) || $hash === '') {
            return false;
        }

        return Hash::check($plain, $hash);
    }

    public static function updateSettings(bool $enabled, ?string $newPassword = null): void
    {
        $wasEnabled = self::isEnabled();
        $passwordChanged = is_string($newPassword) && $newPassword !== '';

        Setting::set(self::GROUP, 'enabled', $enabled ? '1' : '0');

        if ($passwordChanged) {
            Setting::set(self::GROUP, 'password_hash', Hash::make($newPassword));
        }

        // Bump version whenever disabled or password changed to immediately revoke active sessions.
        if (! $enabled || $passwordChanged || ! $wasEnabled) {
            Setting::set(self::GROUP, 'version', Str::random(16));
        }
    }
}
