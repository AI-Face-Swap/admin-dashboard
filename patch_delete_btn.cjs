const fs = require('fs');

const file = 'resources/js/pages/admin/ai/index.tsx';
let code = fs.readFileSync(file, 'utf8');

const newButtons = `
                            <div className="pt-2 flex items-center gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => router.post(\`/admin/templates/from-generation/\${result.generation.id}\`, {}, { preserveScroll: true })}
                                >
                                    Save to Templates
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        if (confirm('Are you sure you want to delete this generation and its output file?')) {
                                            fetch(\`/api/v1/ai/generations/\${result.generation.id}\`, {
                                                method: 'DELETE',
                                                headers: {
                                                    'X-XSRF-TOKEN': csrfToken(),
                                                    'Accept': 'application/json'
                                                }
                                            }).then(res => {
                                                if (res.ok) {
                                                    setResult(null);
                                                } else {
                                                    alert('Failed to delete generation.');
                                                }
                                            }).catch(() => alert('Failed to delete generation.'));
                                        }
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
`;

code = code.replace(/<div className="pt-2">\s*<Button\s*variant="secondary"\s*onClick=\{\(\) => router.post\(`\/admin\/templates\/from-generation\/\$\{result.generation.id\}`,\s*\{\},\s*\{ preserveScroll: true \}\)\}\s*>\s*Save to Templates\s*<\/Button>\s*<\/div>/, newButtons);

fs.writeFileSync(file, code);
