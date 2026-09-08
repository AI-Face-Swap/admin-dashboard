const fs = require('fs');
const file = 'resources/js/pages/admin/ai/index.tsx';
let code = fs.readFileSync(file, 'utf8');

// I will add a Delete button to GenerationDetailModal, next to the Timestamps
const target = `<div className="text-xs text-muted-foreground">
                    Created: {new Date(generation.created_at).toLocaleString()}
                </div>
            </div>`;

const replacement = `<div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                        Created: {new Date(generation.created_at).toLocaleString()}
                    </div>
                    <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this generation and its output file?')) {
                                router.delete(\`/api/v1/ai/generations/\${generation.id}\`, {
                                    preserveScroll: true,
                                    onSuccess: () => onClose(),
                                });
                            }
                        }}
                    >
                        Delete
                    </Button>
                </div>
            </div>`;

code = code.replace(target, replacement);

fs.writeFileSync(file, code);
