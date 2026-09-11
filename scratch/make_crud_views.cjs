const fs = require('fs');
const path = require('path');

const fileFields = ['video_url', 'image_fallback_url', 'icon_url', 'logo_url'];

const models = [
    {
        name: 'HomeShowcase',
        plural: 'Home Showcases',
        route: 'home-showcases',
        varName: 'showcases',
        singleVarName: 'showcase',
        fields: [
            { name: 'section_name', label: 'Section Name', type: 'text' },
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'video_url', label: 'Video (MP4, WebM)', type: 'file', previewType: 'video' },
            { name: 'image_fallback_url', label: 'Image Fallback', type: 'file', previewType: 'image' },
            { name: 'alignment', label: 'Alignment', type: 'select', options: ['left', 'right'] },
            { name: 'order', label: 'Order', type: 'number' },
            { name: 'is_active', label: 'Active', type: 'boolean' }
        ]
    },
    {
        name: 'HomeFeature',
        plural: 'Home Features',
        route: 'home-features',
        varName: 'features',
        singleVarName: 'feature',
        fields: [
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'icon_url', label: 'Icon Image', type: 'file', previewType: 'image' },
            { name: 'link', label: 'Link', type: 'text' },
            { name: 'order', label: 'Order', type: 'number' },
            { name: 'is_active', label: 'Active', type: 'boolean' }
        ]
    },
    {
        name: 'Partner',
        plural: 'Partners',
        route: 'partners',
        varName: 'partners',
        singleVarName: 'partner',
        fields: [
            { name: 'name', label: 'Name', type: 'text' },
            { name: 'logo_url', label: 'Logo Image', type: 'file', previewType: 'image' },
            { name: 'website_url', label: 'Website URL', type: 'text' },
            { name: 'order', label: 'Order', type: 'number' },
            { name: 'is_active', label: 'Active', type: 'boolean' }
        ]
    }
];

// Index remains the same, we'll just regenerate it to be safe, but wait, I can just skip index and only generate create and edit.
// Let's generate all 3 just in case, but using the latest correct paths and TS fixes.

function generateIndex(model) {
    let headers = model.fields.map(f => `<TableHead>${f.label}</TableHead>`).join('\n                                        ');
    let cells = model.fields.map(f => {
        if (f.type === 'boolean') {
            return `<TableCell><Badge variant={item.${f.name} ? 'default' : 'secondary'}>{item.${f.name} ? 'Active' : 'Inactive'}</Badge></TableCell>`;
        }
        if (f.type === 'file') {
            if (f.previewType === 'image') {
                return `<TableCell>{item.${f.name} ? <img src={item.${f.name}} alt="img" className="h-10 w-10 object-contain rounded" /> : 'None'}</TableCell>`;
            } else {
                return `<TableCell>{item.${f.name} ? 'Video Uploaded' : 'None'}</TableCell>`;
            }
        }
        return `<TableCell>{item.${f.name}}</TableCell>`;
    }).join('\n                                        ');

    return `import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function Index({ ${model.varName} }: { ${model.varName}: any }) {
    const handleDelete = (item: any) => {
        if (confirm('Are you sure you want to delete this item?')) {
            router.delete(\`/admin/${model.route}/\${item.id}\`, {
                preserveScroll: true,
                onSuccess: () => toast.success('Deleted successfully'),
            });
        }
    };

    return (
        <>
            <Head title="${model.plural}" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">${model.plural}</h1>
                        <p className="text-muted-foreground">Manage your ${model.plural.toLowerCase()}.</p>
                    </div>
                    <Link href={\`/admin/${model.route}/create\`}>
                        <AnimatedButton>
                            <Plus className="mr-2 size-4" />
                            Add New
                        </AnimatedButton>
                    </Link>
                </div>

                <AnimatedCard>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    ${headers}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {${model.varName}.data.map((item: any) => (
                                    <TableRow key={item.id}>
                                        ${cells}
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={\`/admin/${model.route}/\${item.id}/edit\`}>
                                                    <AnimatedButton variant="outline" size="sm">
                                                        <Pencil className="size-4" />
                                                    </AnimatedButton>
                                                </Link>
                                                <AnimatedButton variant="destructive" size="sm" onClick={() => handleDelete(item)}>
                                                    <Trash2 className="size-4" />
                                                </AnimatedButton>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {${model.varName}.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={${model.fields.length + 1}} className="text-center h-24">
                                            No ${model.plural.toLowerCase()} found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: '${model.plural}', href: '/admin/${model.route}' }],
};`;
}

function generateFormFields(fields) {
    return fields.map(f => {
        if (f.type === 'text') {
            return `
                            <div className="space-y-2">
                                <Label htmlFor="${f.name}">${f.label}</Label>
                                <Input
                                    id="${f.name}"
                                    type="${f.type}"
                                    value={data.${f.name}}
                                    onChange={(e) => setData('${f.name}', e.target.value)}
                                />
                                {errors.${f.name} && <p className="text-sm text-destructive">{errors.${f.name}}</p>}
                            </div>`;
        }
        if (f.type === 'number') {
            return `
                            <div className="space-y-2">
                                <Label htmlFor="${f.name}">${f.label}</Label>
                                <Input
                                    id="${f.name}"
                                    type="${f.type}"
                                    value={data.${f.name}}
                                    onChange={(e) => setData('${f.name}', parseInt(e.target.value) || 0)}
                                />
                                {errors.${f.name} && <p className="text-sm text-destructive">{errors.${f.name}}</p>}
                            </div>`;
        }
        if (f.type === 'textarea') {
            return `
                            <div className="space-y-2">
                                <Label htmlFor="${f.name}">${f.label}</Label>
                                <textarea
                                    id="${f.name}"
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={data.${f.name}}
                                    onChange={(e) => setData('${f.name}', e.target.value)}
                                    rows={3}
                                />
                                {errors.${f.name} && <p className="text-sm text-destructive">{errors.${f.name}}</p>}
                            </div>`;
        }
        if (f.type === 'select') {
            return `
                            <div className="space-y-2">
                                <Label>${f.label}</Label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={data.${f.name}}
                                    onChange={(e) => setData('${f.name}', e.target.value)}
                                >
                                    ${f.options.map(o => `<option value="${o}">${o}</option>`).join('\n                                    ')}
                                </select>
                                {errors.${f.name} && <p className="text-sm text-destructive">{errors.${f.name}}</p>}
                            </div>`;
        }
        if (f.type === 'boolean') {
            return `
                            <div className="space-y-2">
                                <Label>${f.label}</Label>
                                <div className="flex h-10 items-center">
                                    <Switch
                                        checked={data.${f.name}}
                                        onCheckedChange={(checked) => setData('${f.name}', checked)}
                                    />
                                </div>
                                {errors.${f.name} && <p className="text-sm text-destructive">{errors.${f.name}}</p>}
                            </div>`;
        }
        if (f.type === 'file') {
            return `
                            <div className="space-y-2">
                                <Label htmlFor="${f.name}">${f.label}</Label>
                                <Input
                                    id="${f.name}"
                                    type="file"
                                    accept="${f.previewType === 'video' ? 'video/*' : 'image/*'}"
                                    onChange={(e) => setData('${f.name}', e.target.files ? e.target.files[0] : null)}
                                />
                                {typeof data.${f.name} === 'string' && data.${f.name} && (
                                    <div className="mt-2">
                                        <p className="text-xs text-muted-foreground mb-1">Current file:</p>
                                        ${f.previewType === 'video' 
                                            ? `<video src={data.${f.name} as string} className="h-32 rounded object-contain" controls />` 
                                            : `<img src={data.${f.name} as string} className="h-32 rounded object-contain" alt="Current" />`}
                                    </div>
                                )}
                                {errors.${f.name} && <p className="text-sm text-destructive">{errors.${f.name}}</p>}
                            </div>`;
        }
        return '';
    }).join('');
}

function generateCreate(model) {
    let initialData = {};
    model.fields.forEach(f => {
        if (f.type === 'file') {
            initialData[f.name] = null;
        } else {
            initialData[f.name] = f.type === 'boolean' ? true : (f.type === 'number' ? 0 : '');
            if (f.type === 'select') initialData[f.name] = f.options[0];
        }
    });

    return `import { Head, Link, useForm } from '@inertiajs/react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm<any>(${JSON.stringify(initialData, null, 8).replace(/}/g, '    }')});

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/${model.route}', {
            forceFormData: true,
            onSuccess: () => toast.success('Created successfully'),
        });
    };

    return (
        <>
            <Head title="Create ${model.name}" />
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create ${model.name}</h1>
                </div>

                <form onSubmit={submit}>
                    <AnimatedCard>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            ${generateFormFields(model.fields)}
                            
                            <div className="flex items-center gap-3 border-t pt-4">
                                <AnimatedButton type="submit" disabled={processing}>
                                    {processing ? 'Saving...' : 'Save'}
                                </AnimatedButton>
                                <Link href="/admin/${model.route}">
                                    <AnimatedButton type="button" variant="outline">
                                        Cancel
                                    </AnimatedButton>
                                </Link>
                            </div>
                        </CardContent>
                    </AnimatedCard>
                </form>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        { title: '${model.plural}', href: '/admin/${model.route}' },
        { title: 'Create', href: '/admin/${model.route}/create' },
    ],
};`;
}

function generateEdit(model) {
    let initialData = {};
    model.fields.forEach(f => {
        if (f.type === 'file') {
            initialData[f.name] = `\${model.singleVarName}.\${f.name} || null`;
        } else if (f.type === 'boolean') {
            initialData[f.name] = `!!\${model.singleVarName}.\${f.name}`;
        } else {
            initialData[f.name] = `\${model.singleVarName}.\${f.name} || ''`;
        }
    });

    let initStr = '{\n';
    for (let key in initialData) {
        let field = model.fields.find(fi=>fi.name===key);
        if (field.type === 'boolean') {
            initStr += `        ${key}: !!${model.singleVarName}.${key},\n`;
        } else if (field.type === 'file') {
            initStr += `        ${key}: ${model.singleVarName}.${key} || null,\n`;
        } else {
            initStr += `        ${key}: ${model.singleVarName}.${key} || '',\n`;
        }
    }
    initStr += '    }';

    return `import { Head, Link, useForm } from '@inertiajs/react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function Edit({ ${model.singleVarName} }: { ${model.singleVarName}: any }) {
    const { data, setData, post, processing, errors } = useForm<any>(${initStr});

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // Since we are uploading files, we use POST with _method=PUT for Laravel
        post(\`/admin/${model.route}/\${${model.singleVarName}.id}?_method=PUT\`, {
            forceFormData: true,
            onSuccess: () => toast.success('Updated successfully'),
        });
    };

    return (
        <>
            <Head title="Edit ${model.name}" />
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit ${model.name}</h1>
                </div>

                <form onSubmit={submit}>
                    <AnimatedCard>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            ${generateFormFields(model.fields)}
                            
                            <div className="flex items-center gap-3 border-t pt-4">
                                <AnimatedButton type="submit" disabled={processing}>
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </AnimatedButton>
                                <Link href="/admin/${model.route}">
                                    <AnimatedButton type="button" variant="outline">
                                        Cancel
                                    </AnimatedButton>
                                </Link>
                            </div>
                        </CardContent>
                    </AnimatedCard>
                </form>
            </div>
        </>
    );
}

Edit.layout = {
    breadcrumbs: [
        { title: '${model.plural}', href: '/admin/${model.route}' },
        { title: 'Edit', href: '#' },
    ],
};`;
}

models.forEach(model => {
    const dir = `resources/js/pages/admin/${model.route}`;
    fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(path.join(dir, 'index.tsx'), generateIndex(model));
    fs.writeFileSync(path.join(dir, 'create.tsx'), generateCreate(model));
    fs.writeFileSync(path.join(dir, 'edit.tsx'), generateEdit(model));
    console.log(`Generated CRUD for ${model.name}`);
});
