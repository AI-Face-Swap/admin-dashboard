<?php
$file = 'app/Http/Controllers/Api/AIGenerationStatusController.php';
$content = file_get_contents($file);

$imports = <<<'IMPORTS'
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\Customer;
use App\Models\User;
IMPORTS;

// Add imports
if (!str_contains($content, 'use Illuminate\Http\Request;')) {
    $content = str_replace("use Illuminate\Http\JsonResponse;", "use Illuminate\Http\JsonResponse;\n" . $imports, $content);
}

$destroyMethod = <<<'METHOD'

    /**
     * Delete an AI generation and its stored output file.
     *
     * Customers can delete their own generations.
     * Admins can delete any generation.
     */
    public function destroy(AIGeneration $generation, Request $request): JsonResponse
    {
        $user = $request->user();
        
        $isOwner = $user instanceof Customer && $generation->customer_id === $user->id;
        $isAdmin = $user instanceof User; // Assuming User model is the Admin model

        if (!$isOwner && !$isAdmin) {
            abort(403, 'Unauthorized to delete this generation.');
        }

        // Delete output files from DO Spaces if they exist
        if (!empty($generation->output_metadata) && is_array($generation->output_metadata)) {
            foreach ($generation->output_metadata as $sourceUrl) {
                if (is_string($sourceUrl)) {
                    if (filter_var($sourceUrl, FILTER_VALIDATE_URL)) {
                        $sourcePath = ltrim(parse_url($sourceUrl, PHP_URL_PATH), '/');
                    } else {
                        $sourcePath = ltrim($sourceUrl, '/');
                    }

                    if (Storage::disk('spaces')->exists($sourcePath)) {
                        Storage::disk('spaces')->delete($sourcePath);
                    }
                }
            }
        }

        $generation->delete();

        return response()->json([
            'message' => 'Generation deleted successfully.'
        ]);
    }
}
METHOD;

$content = preg_replace('/}\s*$/', $destroyMethod, $content);
file_put_contents($file, $content);
