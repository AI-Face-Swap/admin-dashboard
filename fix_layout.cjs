const fs = require('fs');

function fix(file) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Change max-w-2xl to max-w-5xl
    code = code.replace(/className="max-w-2xl"/, 'className="max-w-5xl mx-auto w-full"');
    
    // Change form layout to 2 columns
    code = code.replace(/<form onSubmit=\{submit\} className="space-y-6">/, '<form onSubmit={submit} className="grid md:grid-cols-2 gap-8">');
    
    // Group 1: General Info
    code = code.replace(/<div className="grid gap-2">\s*<Label htmlFor="name">/, '<div className="space-y-6">\n                                <div className="grid gap-2">\n                                    <Label htmlFor="name">');
    
    // End Group 1: after negative_prompt
    code = code.replace(/<InputError message=\{errors.negative_prompt\} \/>\n {28}<\/div>/, '<InputError message={errors.negative_prompt} />\n                            </div>\n                            </div>');
    
    // Group 2: Files & Settings
    code = code.replace(/<div className="grid gap-2">\s*<Label htmlFor="model">/, '<div className="space-y-6">\n                            <div className="grid gap-2">\n                                <Label htmlFor="model">');
    
    // End Group 2: after the submit button
    code = code.replace(/<\/form>/, '</div>\n                        </form>');

    fs.writeFileSync(file, code);
}

fix('resources/js/pages/admin/templates/create.tsx');
fix('resources/js/pages/admin/templates/edit.tsx');
