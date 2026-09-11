<?php

$file = 'app/Http/Controllers/Api/AIGenerationStatusController.php';
$content = file_get_contents($file);

$content = str_replace(
    'public function destroy(AIGeneration $generation, Request $request): JsonResponse',
    'public function destroy(AIGeneration $generation, Request $request)',
    $content
);

file_put_contents($file, $content);
