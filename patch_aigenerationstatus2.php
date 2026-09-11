<?php

$file = 'app/Http/Controllers/Api/AIGenerationStatusController.php';
$content = file_get_contents($file);

$oldReturn = "return response()->json([\n            'message' => 'Generation deleted successfully.'\n        ]);";

$newReturn = <<<'RETURN'
        if ($request->wantsJson() && !$request->hasHeader('X-Inertia')) {
            return response()->json(['message' => 'Generation deleted successfully.']);
        }
        
        return back()->with('success', 'Generation deleted successfully.');
RETURN;

$content = str_replace($oldReturn, $newReturn, $content);
file_put_contents($file, $content);
