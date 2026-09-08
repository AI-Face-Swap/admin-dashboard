<?php
$file = 'tests/Feature/AIGenerationDeleteTest.php';
$content = file_get_contents($file);

$content = str_replace('\Laravel\Sanctum\Sanctum::actingAs($admin);', '$this->actingAs($admin);', $content);

// For customer2, let's just make it exact
$content = preg_replace('/\$response = \$this->actingAs\(\$customer2, \'customer\'\).*?->deleteJson/s', '\Laravel\Sanctum\Sanctum::actingAs($customer2); $response = $this->deleteJson', $content);

file_put_contents($file, $content);
