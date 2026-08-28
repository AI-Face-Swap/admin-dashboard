<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Password;

class CustomerResetPassword extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $token,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $resetUrl = $this->resetUrl($notifiable);

        return (new MailMessage)
            ->subject('Reset Your Password')
            ->greeting("Hello {$notifiable->name},")
            ->line('You are receiving this email because we received a password reset request for your account.')
            ->action('Reset Password', $resetUrl)
            ->line('If you did not request a password reset, no further action is required.')
            ->line('This link will expire in 60 minutes.');
    }

    /**
     * Build the password reset URL for the mobile app.
     *
     * Uses a deep link that the frontend app can intercept.
     * The token is included as a query parameter so the app can
     * call the API to complete the password reset.
     */
    protected function resetUrl(object $notifiable): string
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:5173');

        return "{$frontendUrl}/reset-password?token={$this->token}&email=".urlencode($notifiable->email);
    }
}
