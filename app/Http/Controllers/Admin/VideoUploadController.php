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
     * Upload a video file to DigitalOcean Spaces and save its public URL.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'video' => ['required', 'file', 'mimes:mp4,mov,webm,avi,m4v', 'max:102400'],
        ]);

        $file = $request->file('video');
        $disk = (string) config('ai.providers.segmind.storage_disk', 'spaces');
        $extension = $file->getClientOriginalExtension() ?: 'mp4';
        $filename = Str::uuid().'.'.$extension;
        $path = $file->storeAs('input-videos', $filename, $disk);

        if ($path === false) {
            return back()->withErrors(['video' => 'Failed to upload video to storage.']);
        }

        UploadedVideo::create([
            'user_id' => $request->user()?->id,
            'title' => filled($validated['title'] ?? null) ? trim((string) $validated['title']) : null,
            'original_filename' => $file->getClientOriginalName(),
            'path' => $path,
            'url' => Storage::disk($disk)->url($path),
            'mime_type' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize() ?: 0,
        ]);

        return to_route('admin.video-uploads.index')->with('success', 'Video uploaded to Spaces.');
    }

    /**
     * Delete an uploaded video from storage and the database.
     */
    public function destroy(UploadedVideo $videoUpload): RedirectResponse
    {
        $disk = (string) config('ai.providers.segmind.storage_disk', 'spaces');

        if ($videoUpload->path && Storage::disk($disk)->exists($videoUpload->path)) {
            Storage::disk($disk)->delete($videoUpload->path);
        }

        $videoUpload->delete();

        return to_route('admin.video-uploads.index')->with('success', 'Video deleted.');
    }
}
