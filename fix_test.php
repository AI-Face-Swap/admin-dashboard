<?php
$file = 'tests/Feature/AIGenerationDeleteTest.php';
$content = file_get_contents($file);

$content = str_replace(
    '$response = \Laravel\Sanctum\Sanctum::actingAs($customer)
                     ->deleteJson',
    '\Laravel\Sanctum\Sanctum::actingAs($customer);
    $response = $this->deleteJson',
    $content
);

$content = str_replace(
    '$response = \Laravel\Sanctum\Sanctum::actingAs($admin)
                     ->delete',
    '\Laravel\Sanctum\Sanctum::actingAs($admin);
    $response = $this->delete',
    $content
);

$content = str_replace(
    '$response = \Laravel\Sanctum\Sanctum::actingAs($customer2)
                     ->deleteJson',
    '\Laravel\Sanctum\Sanctum::actingAs($customer2);
    $response = $this->deleteJson',
    $content
);

file_put_contents($file, $content);
