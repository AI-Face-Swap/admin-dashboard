<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UploadedVideo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class VideoUploadController extends Controller
{
    /**
     * Display uploaded reference videos and upload form.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));

        $videos = UploadedVideo::query()
            ->with('user:id,name')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($sub) use ($search) {
                    $sub->where('title', 'like', "%{$search}%")
                        ->orWhere('original_filename', 'like', "%{$search}%")
                        ->orWhere('url', 'like', "%{$search}%");
                });
            })
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (UploadedVideo $video) => [
                'id' => $video->id,
                'title' => $video->title ?: $video->original_filename,
                'original_filename' => $video->original_filename,
                'url' => $video->url,
                'mime_type' => $video->mime_type,
                'size_bytes' => $video->size_bytes,
                'uploaded_by' => $video->user?->name,
                'created_at' => $video->created_at?->format('M d, Y H:i'),
            ]);

        return Inertia::render('admin/video-uploads/index', [
            'videos' => $videos,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Upload a video file to Cloudflare R2 and save its public URL.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'video' => ['required', 'file', 'mimes:mp4,mov,webm,avi,m4v', 'max:102400'],
        ]);

        $file = $request->file('video');

        try {
            $stored = \App\Support\VideoStorage::storeUploadedFile($file, 'input-videos');
        } catch (\Throwable $e) {
            return back()->withErrors(['video' => 'Failed to upload video to storage.']);
        }

        UploadedVideo::create([
            'user_id' => $request->user()?->id,
            'title' => filled($validated['title'] ?? null) ? trim((string) $validated['title']) : null,
            'original_filename' => $file->getClientOriginalName(),
            'path' => $stored['path'],
            'url' => $stored['url'],
            'mime_type' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize() ?: 0,
        ]);

        return to_route('admin.video-uploads.index')->with('success', 'Video uploaded to Cloudflare R2.');
    }

    /**
     * Delete an uploaded video from storage and the database.
     */
    public function destroy(UploadedVideo $videoUpload): RedirectResponse
    {
        \App\Support\VideoStorage::deleteUrlOrPath($videoUpload->url ?: $videoUpload->path);

        $videoUpload->delete();

        return to_route('admin.video-uploads.index')->with('success', 'Video deleted.');
    }
}
