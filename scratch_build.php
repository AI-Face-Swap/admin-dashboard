<?php

$controllers = [
    'HomeShowcase' => [
        'model' => 'HomeShowcase',
        'var' => 'showcases',
        'single' => 'showcase',
        'view' => 'admin/home-showcases',
    ],
    'HomeFeature' => [
        'model' => 'HomeFeature',
        'var' => 'features',
        'single' => 'feature',
        'view' => 'admin/home-features',
    ],
    'Partner' => [
        'model' => 'Partner',
        'var' => 'partners',
        'single' => 'partner',
        'view' => 'admin/partners',
    ],
];

foreach ($controllers as $name => $c) {
    $code = "<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\\{$c['model']};
use Illuminate\Http\Request;
use Inertia\Inertia;

class {$name}Controller extends Controller
{
    public function index()
    {
        return Inertia::render('{$c['view']}/index', [
            '{$c['var']}' => {$c['model']}::orderBy('order')->paginate(15)
        ]);
    }

    public function create()
    {
        return Inertia::render('{$c['view']}/create');
    }

    public function store(Request \$request)
    {
        {$c['model']}::create(\$request->all());
        return redirect()->route('admin.{$c['view']}.index')->with('success', 'Created successfully.');
    }

    public function edit({$c['model']} \${$c['single']})
    {
        return Inertia::render('{$c['view']}/edit', [
            '{$c['single']}' => \${$c['single']}
        ]);
    }

    public function update(Request \$request, {$c['model']} \${$c['single']})
    {
        \${$c['single']}->update(\$request->all());
        return redirect()->route('admin.{$c['view']}.index')->with('success', 'Updated successfully.');
    }

    public function destroy({$c['model']} \${$c['single']})
    {
        \${$c['single']}->delete();
        return redirect()->route('admin.{$c['view']}.index')->with('success', 'Deleted successfully.');
    }
}
";
    file_put_contents("app/Http/Controllers/Admin/{$name}Controller.php", $code);
}
