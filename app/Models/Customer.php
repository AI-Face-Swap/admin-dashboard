<?php

namespace App\Models;

use Database\Factories\CustomerFactory;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $password
 * @property string|null $avatar
 * @property string|null $auth_provider
 * @property string|null $auth_provider_id
 * @property string $customer_type
 * @property int $coins
 * @property bool $is_banned
 * @property Carbon|null $email_verified_at
 * @property Carbon|null $last_active_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'avatar', 'auth_provider', 'auth_provider_id', 'customer_type', 'coins', 'is_banned', 'email_verified_at', 'last_active_at'])]
#[Hidden(['password', 'remember_token'])]
class Customer extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<CustomerFactory> */
    use CanResetPassword, HasApiTokens, HasFactory, Notifiable;

    public const TYPE_FREE = 'free';

    public const TYPE_PREMIUM = 'premium';

    /**
     * Get the customer's AI generations.
     */
    public function generations(): HasMany
    {
        return $this->hasMany(AIGeneration::class);
    }

    /**
     * Scope: only banned customers.
     */
    public function scopeBanned(Builder $query): Builder
    {
        return $query->where('is_banned', true);
    }

    /**
     * Scope: only active (non-banned) customers.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_banned', false);
    }

    /**
     * Determine if the customer is on the free plan.
     */
    public function isFree(): bool
    {
        return $this->customer_type === self::TYPE_FREE;
    }

    /**
     * Determine if the customer is on a paid plan.
     */
    public function isPremium(): bool
    {
        return $this->customer_type === self::TYPE_PREMIUM;
    }

    /**
     * Determine if the customer is banned.
     */
    public function isBanned(): bool
    {
        return $this->is_banned === true;
    }

    /**
     * Determine if the customer can afford a coin cost.
     */
    public function hasEnoughCoins(int $cost): bool
    {
        return $this->coins >= $cost;
    }

    /**
     * Deduct coins. The caller is responsible for checking the balance.
     */
    public function spendCoins(int $cost): void
    {
        $this->decrement('coins', max(0, $cost));
    }

    /**
     * Add coins to the customer's balance.
     */
    public function addCoins(int $amount): void
    {
        $this->increment('coins', max(0, $amount));
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_active_at' => 'datetime',
            'is_banned' => 'boolean',
        ];
    }
}
