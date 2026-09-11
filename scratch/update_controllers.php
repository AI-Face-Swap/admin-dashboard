<?php

$controllers = [
    'HomeShowcase' => [
        'varPlural' => 'showcases',
        'varSingle' => 'showcase',
        'files' => [
            'video_url' => 'mimes:mp4,webm,mov|max:51200',
            'image_fallback_url' => 'mimes:jpg,jpeg,png,webp|max:10240',
        ],
        'fields' => [
            "'section_name' => 'nullable|string'",
            "'title' => 'required|string'",
            "'description' => 'required|string'",
            "'alignment' => 'required|in:left,right'",
            "'order' => 'required|integer'",
            "'is_active' => 'boolean'",
        ],
    ],
    'HomeFeature' => [
        'varPlural' => 'features',
        'varSingle' => 'feature',
        'files' => [
            'icon_url' => 'mimes:jpg,jpeg,png,webp,svg|max:5120',
        ],
        'fields' => [
            "'title' => 'required|string'",
            "'description' => 'required|string'",
            "'link' => 'nullable|string'",
            "'order' => 'required|integer'",
            "'is_active' => 'boolean'",
        ],
    ],
    'Partner' => [
        'varPlural' => 'partners',
        'varSingle' => 'partner',
        'files' => [
            'logo_url' => 'mimes:jpg,jpeg,png,webp,svg|max:5120',
        ],
        'fields' => [
            "'name' => 'required|string'",
            "'website_url' => 'nullable|string'",
            "'order' => 'required|integer'",
            "'is_active' => 'boolean'",
        ],
    ],
];

foreach ($controllers as $name => $c) {
    $fileRules = [];
    foreach ($c['files'] as $f => $rule) {
        $fileRules[] = "'{$f}' => 'nullable|file|{$rule}'";
    }

    $validationRules = implode(",\n            ", array_merge($c['fields'], $fileRules));

    $uploadLogicStore = '';
    $uploadLogicUpdate = '';

    foreach ($c['files'] as $f => $rule) {
        $uploadLogicStore .= "
        if (\$request->hasFile('{$f}')) {
            \$file = \$request->file('{$f}');
            \$path = \$file->storeAs('{$name}', \\Illuminate\\Support\\Str::uuid().'.'.\$file->getClientOriginalExtension(), 'spaces');
            \$data['{$f}'] = \\Illuminate\\Support\\Facades\\Storage::disk('spaces')->url(\$path);
        }";

        $uploadLogicUpdate .= "
        if (\$request->hasFile('{$f}')) {
            \$file = \$request->file('{$f}');
            \$path = \$file->storeAs('{$name}', \\Illuminate\\Support\\Str::uuid().'.'.\$file->getClientOriginalExtension(), 'spaces');
            \$data['{$f}'] = \\Illuminate\\Support\\Facades\\Storage::disk('spaces')->url(\$path);
        }";
    }

    $routeBase = strtolower(preg_replace('/(?<!^)[A-Z]/', '-$0', $name));
    $fileFieldsArray = var_export(array_keys($c['files']), true);

    $code = "<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\\{$name};
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class {$name}Controller extends Controller
{
    public function index()
    {
        return Inertia::render('admin/{$routeBase}/index', [
            '{$c['varPlural']}' => {$name}::orderBy('order')->paginate(15)
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/{$routeBase}/create');
    }

    public function store(Request \$request)
    {
        \$validated = \$request->validate([
            {$validationRules}
        ]);

        \$data = \$validated;
        {$uploadLogicStore}

        if (!isset(\$data['is_active'])) {
            \$data['is_active'] = \$request->boolean('is_active');
        }

        {$name}::create(\$data);
        return redirect()->route('admin.{$routeBase}.index')->with('success', 'Created successfully.');
    }

    public function edit({$name} \$item)
    {
        return Inertia::render('admin/{$routeBase}/edit', [
            '{$c['varSingle']}' => \$item
        ]);
    }

    public function update(Request \$request, {$name} \$item)
    {
        \$validated = \$request->validate([
            {$validationRules}
        ]);

        \$data = \$validated;
        // Unset file properties if they weren't updated so we don't overwrite DB string with null
        foreach ({$fileFieldsArray} as \$f) {
            if (!\$request->hasFile(\$f)) {
                unset(\$data[\$f]);
            }
        }
        
        {$uploadLogicUpdate}
        
        if (!isset(\$data['is_active'])) {
            \$data['is_active'] = \$request->boolean('is_active');
        }

        \$item->update(\$data);
        return redirect()->route('admin.{$routeBase}.index')->with('success', 'Updated successfully.');
    }

    public function destroy({$name} \$item)
    {
        \$item->delete();
        return redirect()->route('admin.{$routeBase}.index')->with('success', 'Deleted successfully.');
    }
}
";
    file_put_contents("app/Http/Controllers/Admin/{$name}Controller.php", $code);
}
