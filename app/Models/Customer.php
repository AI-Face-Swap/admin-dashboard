<?php

namespace App\Models;

use App\Services\CentralAuthPointService;
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
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string|null $central_auth_uuid
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property string|null $password
 * @property string|null $avatar
 * @property string|null $auth_provider
 * @property string|null $auth_provider_id
 * @property string $customer_type
 * @property Carbon|null $expired_at
 * @property int $points
 * @property int $coins
 * @property bool $is_banned
 * @property Carbon|null $email_verified_at
 * @property Carbon|null $last_active_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['central_auth_uuid', 'name', 'email', 'phone', 'password', 'avatar', 'auth_provider', 'auth_provider_id', 'customer_type', 'expired_at', 'is_banned', 'email_verified_at', 'last_active_at'])]
#[Hidden(['password', 'remember_token'])]
class Customer extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<CustomerFactory> */
    use CanResetPassword, HasApiTokens, HasFactory, Notifiable;

    protected $appends = ['points'];

    public const TYPE_FREE = 'free';

    public const TYPE_PREMIUM = 'premium';

    /**
     * Get the customer's AI generations.
     *
     * @return HasMany<AIGeneration, $this>
     */
    public function generations(): HasMany
    {
        return $this->hasMany(AIGeneration::class);
    }

    /**
     * Get the customer's chat conversations.
     *
     * @return HasMany<ChatConversation, $this>
     */
    public function conversations(): HasMany
    {
        return $this->hasMany(ChatConversation::class)->orderBy('updated_at', 'desc');
    }

    /**
     * Scope: only banned customers.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeBanned(Builder $query): Builder
    {
        return $query->where('is_banned', true);
    }

    /**
     * Scope: only active (non-banned) customers.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
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
     * Get unified point balance from HTUT Central Auth.
     */
    public function getPointsAttribute(): int
    {
        $uuid = $this->central_auth_uuid ?: CentralAuthPointService::ensureCentralAuthUuid($this);

        if (! empty($uuid)) {
            return CentralAuthPointService::getPoints($uuid);
        }

        return 0;
    }

    /**
     * Compatibility accessor for legacy coin references.
     */
    public function getCoinsAttribute(): int
    {
        return $this->getPointsAttribute();
    }

    /**
     * Compatibility mutator for points (stored in Central Auth cache).
     */
    public function setPointsAttribute($value): void
    {
        $uuid = $this->central_auth_uuid ?: 'test-uuid-'.($this->id ?: uniqid());
        $this->central_auth_uuid = $uuid;
        Cache::put("customer_points_{$uuid}", (int) $value, 300);
    }

    /**
     * Compatibility mutator for legacy coin references.
     */
    public function setCoinsAttribute($value): void
    {
        $this->setPointsAttribute($value);
    }

    /**
     * Check if SSO project access has expired.
     */
    public function syncProjectExpiry(?bool $isSsoExpired = null, ?Carbon $ssoExpiredAt = null): void
    {
        if ($ssoExpiredAt && (! $this->expired_at || $this->expired_at->ne($ssoExpiredAt))) {
            $this->expired_at = $ssoExpiredAt;
            $this->save();
        }
    }

    /**
     * Backward-compatible alias for syncProjectExpiry.
     */
    public function syncCoinExpiry(?bool $isSsoExpired = null, ?Carbon $ssoExpiredAt = null): void
    {
        $this->syncProjectExpiry($isSsoExpired, $ssoExpiredAt);
    }

    /**
     * Determine if customer has enough points for an operation.
     */
    public function hasEnoughPoints(int $cost): bool
    {
        return $this->points >= $cost;
    }

    /**
     * Atomically deduct points from customer via Central Auth S2S.
     *
     * @return array{success: bool, points: int, deducted?: int, message?: string}
     */
    public function spendPoints(
        int $cost,
        string $description = 'AI Generation on HTUT AI',
        ?string $referenceId = null,
        array $metadata = []
    ): array {
        $uuid = $this->central_auth_uuid ?: CentralAuthPointService::ensureCentralAuthUuid($this);

        if (empty($uuid)) {
            return [
                'success' => false,
                'message' => 'Customer is not linked to HTUT Central Auth.',
                'points' => 0,
            ];
        }

        return CentralAuthPointService::deductPoints(
            $uuid,
            $cost,
            $description,
            $referenceId,
            $metadata
        );
    }

    /**
     * Atomically credit points to customer via Central Auth S2S.
     *
     * @return array{success: bool, points: int, added?: int, message?: string}
     */
    public function addPoints(
        int $amount,
        string $description = 'Point top-up on HTUT AI',
        ?string $referenceId = null,
        array $metadata = []
    ): array {
        $uuid = $this->central_auth_uuid ?: CentralAuthPointService::ensureCentralAuthUuid($this);

        if (empty($uuid)) {
            return [
                'success' => false,
                'message' => 'Customer is not linked to HTUT Central Auth.',
                'points' => 0,
            ];
        }

        return CentralAuthPointService::addPoints(
            $uuid,
            $amount,
            $description,
            $referenceId,
            $metadata
        );
    }

    /**
     * Backward-compatible alias for hasEnoughCoins.
     */
    public function hasEnoughCoins(int $cost): bool
    {
        return $this->hasEnoughPoints($cost);
    }

    /**
     * Backward-compatible alias for spendCoins.
     */
    public function spendCoins(int $cost): array
    {
        return $this->spendPoints($cost);
    }

    /**
     * Backward-compatible alias for addCoins.
     */
    public function addCoins(int $amount): array
    {
        return $this->addPoints($amount);
    }

    /**
     * Get authenticated login account details, subscription, and credentials info.
     */
    public function getLoginAccountInfo(
        ?string $loginMethodOverride = null,
        ?bool $hasPasswordOverride = null,
        ?string $packageSlug = null
    ): array {
        $hasPassword = $hasPasswordOverride ?? ! empty($this->password);
        $isPremium = $this->isPremium();
        $isExpired = $isPremium && $this->expired_at && $this->expired_at->isPast();

        $phone = $this->phone;
        $phoneDisplay = null;
        if ($phone) {
            if (str_starts_with($phone, '959')) {
                $phoneDisplay = '09'.substr($phone, 3);
            } elseif (str_starts_with($phone, '+959')) {
                $phoneDisplay = '09'.substr($phone, 4);
            } elseif (str_starts_with($phone, '9') && strlen($phone) >= 8 && strlen($phone) <= 10) {
                $phoneDisplay = '0'.$phone;
            } else {
                $phoneDisplay = $phone;
            }
        }

        $loginMethod = $loginMethodOverride
            ?? ($this->auth_provider ?? ($this->email ? 'email' : ($phone ? 'phone' : 'direct')));

        $packageName = $packageSlug ?? ($this->isPremium() ? 'htut-ai-pro-monthly' : 'free');
        $typeName = $this->customer_type ?: ($this->isPremium() ? 'premium' : 'free');

        return [
            'email' => $this->email,
            'phone' => $phone,
            'phone_display' => $phoneDisplay,
            'login_method' => $loginMethod,
            'package' => $packageName,
            'type' => $typeName,
            'is_premium' => (bool) $isPremium,
            'is_expired' => (bool) $isExpired,
            'has_password' => (bool) $hasPassword,
            'expired_date' => $this->expired_at?->format('Y-m-d'),
            'expired_at' => $this->expired_at?->toIso8601String(),
            'central_auth_uuid' => $this->central_auth_uuid,
        ];
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
            'expired_at' => 'datetime',
            'password' => 'hashed',
            'last_active_at' => 'datetime',
            'is_banned' => 'boolean',
        ];
    }
}
