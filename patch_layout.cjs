const fs = require('fs');

function patch(file) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Ensure max-w-5xl
    code = code.replace(/max-w-[a-z0-9]+/, 'max-w-5xl w-full mx-auto');
    code = code.replace(/className="space-y-6"/, 'className="grid gap-8 md:grid-cols-2"');
    
    // Group 1: General Info
    code = code.replace(/<div className="grid gap-2">\s*<Label htmlFor="name">/, '<div className="space-y-6">\n                                <div className="grid gap-2">\n                                    <Label htmlFor="name">');
    
    // End of group 1: after negative_prompt
    code = code.replace(/<InputError message=\{errors.negative_prompt\} \/>\n {28}<\/div>/, '<InputError message={errors.negative_prompt} />\n                            </div>\n                            </div>');
    
    // Group 2: Files & Settings
    code = code.replace(/<div className="grid gap-2">\s*<Label htmlFor="model">/, '<div className="space-y-6">\n                            <div className="grid gap-2">\n                                <Label htmlFor="model">');
    
    // End of group 2: after AnimatedButton
    code = code.replace(/<\/AnimatedButton>/, '</AnimatedButton>\n                            </div>');

    fs.writeFileSync(file, code);
}

patch('resources/js/pages/admin/templates/create.tsx');
patch('resources/js/pages/admin/templates/edit.tsx');
