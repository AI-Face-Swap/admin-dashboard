<?php

namespace App\Console\Commands;

use App\Models\PushNotification;
use App\Services\FcmNotificationService;
use Illuminate\Console\Command;

class SendScheduledNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:send-scheduled-notifications';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatch due scheduled push notification campaigns';

    /**
     * Execute the console command.
     */
    public function handle(FcmNotificationService $fcmService): int
    {
        $campaigns = PushNotification::dueScheduled()->get();

        if ($campaigns->isEmpty()) {
            return self::SUCCESS;
        }

        foreach ($campaigns as $campaign) {
            $fcmService->dispatchCampaign($campaign);
            $this->info("Dispatched scheduled notification #{$campaign->id} ({$campaign->title})");
        }

        return self::SUCCESS;
    }
}
