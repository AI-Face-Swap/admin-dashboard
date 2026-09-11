<?php

namespace App\Notifications;

use App\Models\Customer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class VerifyEmail extends Notification implements ShouldQueue
{
    use Queueable;

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
        /** @var Customer $notifiable */
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verify Your Email Address')
            ->greeting("Hello {$notifiable->name},")
            ->line('Thank you for registering with HTUT AI!')
            ->line('Please click the button below to verify your email address.')
            ->action('Verify Email Address', $verificationUrl)
            ->line('If you did not create an account, no further action is required.')
            ->line('This link will expire in 60 minutes.');
    }

    /**
     * Build the verification URL for the mobile app.
     *
     * Uses a signed route so the token is cryptographically verified.
     * The frontend app intercepts this URL and calls the API to complete verification.
     */
    protected function verificationUrl(Customer $notifiable): string
    {
        return URL::temporarySignedRoute(
            'api.v1.email.verify',
            now()->addMinutes(60),
            [
                'id' => $notifiable->id,
                'hash' => sha1($notifiable->email),
            ]
        );
    }
}
