<?php

namespace App\Console\Commands;

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
        $this->info('Customer points and expiry are centrally managed by HTUT Central Auth.');

        return Command::SUCCESS;
    }
}
