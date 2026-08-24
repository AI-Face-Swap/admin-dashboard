<?php

namespace App\Console\Commands;

use App\Models\AIGeneration;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:cleanup-stuck-generations')]
#[Description('Mark queued/processing generations older than 10 minutes as failed')]
class CleanupStuckGenerations extends Command
{
    public function handle(): int
    {
        $count = AIGeneration::failStuck();

        if ($count > 0) {
            $this->info("Marked {$count} stuck generation(s) as failed.");
        } else {
            $this->info('No stuck generations found.');
        }

        return self::SUCCESS;
    }
}
