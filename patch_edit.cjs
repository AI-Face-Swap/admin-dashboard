const fs = require('fs');
const file = 'resources/js/pages/admin/templates/edit.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add to Type
code = code.replace(/tags: \{ id: number; name: string \}\[\];/, `tags: { id: number; name: string }[];
    sort_order: number;
    prompt: string | null;
    negative_prompt: string | null;
    aspect_ratio: string | null;
    resolution: string | null;
    seed: string | null;`);

// Add state variables
code = code.replace(/const \[description, setDescription\] = useState\(template\.description \?\? ''\);/, `const [description, setDescription] = useState(template.description ?? '');
    const [sortOrder, setSortOrder] = useState(String(template.sort_order ?? 1));
    const [prompt, setPrompt] = useState(template.prompt ?? '');
    const [negativePrompt, setNegativePrompt] = useState(template.negative_prompt ?? '');
    const [aspectRatio, setAspectRatio] = useState(template.aspect_ratio ?? '');
    const [resolution, setResolution] = useState(template.resolution ?? '');
    const [seed, setSeed] = useState(template.seed ?? '');`);

// Add to router.put payload
code = code.replace(/tags: selectedTags,/, `tags: selectedTags,
                sort_order: parseInt(sortOrder, 10) || 1,
                prompt: prompt || undefined,
                negative_prompt: negativePrompt || undefined,
                aspect_ratio: aspectRatio || undefined,
                resolution: resolution || undefined,
                seed: seed || undefined,`);

// Add UI fields
const extraFields = `
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="sortOrder">Sort order</Label>
                                    <Input
                                        id="sortOrder"
                                        type="number"
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value)}
                                    />
                                    <InputError message={errors.sort_order} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="seed">Seed (optional)</Label>
                                    <Input
                                        id="seed"
                                        type="number"
                                        value={seed}
                                        onChange={(e) => setSeed(e.target.value)}
                                    />
                                    <InputError message={errors.seed} />
                                </div>
                            </div>
                            
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                                    <Input
                                        id="aspectRatio"
                                        value={aspectRatio}
                                        onChange={(e) => setAspectRatio(e.target.value)}
                                        placeholder="e.g. 16:9"
                                    />
                                    <InputError message={errors.aspect_ratio} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="resolution">Resolution</Label>
                                    <Input
                                        id="resolution"
                                        value={resolution}
                                        onChange={(e) => setResolution(e.target.value)}
                                        placeholder="e.g. 1080p"
                                    />
                                    <InputError message={errors.resolution} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="prompt">Prompt</Label>
                                <Textarea
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    rows={3}
                                />
                                <InputError message={errors.prompt} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="negativePrompt">Negative Prompt</Label>
                                <Textarea
                                    id="negativePrompt"
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                    rows={2}
                                />
                                <InputError message={errors.negative_prompt} />
                            </div>
`;

code = code.replace(/<div className="grid gap-2">\s*<Label htmlFor="model">/, extraFields + '\n                            <div className="grid gap-2">\n                                <Label htmlFor="model">');

fs.writeFileSync(file, code);
