const fs = require('fs');

const file = 'resources/js/pages/admin/ai/index.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the fetch call I just added with router.delete
code = code.replace(/fetch\(\`\/api\/v1\/ai\/generations\/\$\{result\.generation\.id\}\`[\s\S]*?\}\)\.catch\(\(\) => alert\('Failed to delete generation\.'\)\);/, `router.delete(\`/api/v1/ai/generations/\${result.generation.id}\`, {
                                                preserveScroll: true,
                                                onSuccess: () => setResult(null),
                                            });`);

fs.writeFileSync(file, code);
