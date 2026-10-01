<?php

namespace App\Console\Commands;

use App\Models\Customer;
use Illuminate\Console\Command;

class ExpireCustomerCoinsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'customers:expire-coins';

    /**
     * The console command description.
     */
    protected $description = 'Reset coins to 0 for free customers whose SSO trial or access has expired after 1 week';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $expiredCount = Customer::query()
            ->where('customer_type', '!=', Customer::TYPE_PREMIUM)
            ->whereNotNull('expired_at')
            ->where('expired_at', '<=', now())
            ->where('coins', '>', 0)
            ->update(['coins' => 0]);

        $this->info("Successfully reset coins to 0 for {$expiredCount} expired free customers.");

        return Command::SUCCESS;
    }
}
