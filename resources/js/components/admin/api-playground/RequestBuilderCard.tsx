import { motion } from 'framer-motion';
import { Loader2, Plus, Send, Trash2, Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedInput } from '@/components/animated/AnimatedInput';
import { AnimatedTextarea } from '@/components/animated/AnimatedTextarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    METHOD_COLORS,
    type BodyType,
    type FileEntry,
    type HttpMethod,
    type KeyValuePair,
    type PlaygroundTemplate,
} from './types';

interface RequestBuilderCardProps {
    method: HttpMethod;
    onMethodChange: (method: HttpMethod) => void;
    url: string;
    onUrlChange: (url: string) => void;
    headers: KeyValuePair[];
    onAddHeader: () => void;
    onRemoveHeader: (index: number) => void;
    onUpdateHeader: (
        index: number,
        field: 'key' | 'value',
        value: string,
    ) => void;
    bodyType: BodyType;
    onBodyTypeChange: (bodyType: BodyType) => void;
    body: string;
    onBodyChange: (body: string) => void;
    formDataFields: KeyValuePair[];
    onAddFormField: () => void;
    onRemoveFormField: (index: number) => void;
    onUpdateFormField: (
        index: number,
        field: 'key' | 'value',
        value: string,
    ) => void;
    onSetFormDataFields: React.Dispatch<React.SetStateAction<KeyValuePair[]>>;
    formFileFields: FileEntry[];
    onAddFileField: () => void;
    onRemoveFileField: (index: number) => void;
    onUpdateFileFieldKey: (index: number, key: string) => void;
    onUpdateFileFieldValue: (index: number, file: File | null) => void;
    loading: boolean;
    onSendRequest: () => void;
    templates?: PlaygroundTemplate[];
}

export function RequestBuilderCard({
    method,
    onMethodChange,
    url,
    onUrlChange,
    headers,
    onAddHeader,
    onRemoveHeader,
    onUpdateHeader,
    bodyType,
    onBodyTypeChange,
    body,
    onBodyChange,
    formDataFields,
    onAddFormField,
    onRemoveFormField,
    onUpdateFormField,
    onSetFormDataFields,
    formFileFields,
    onAddFileField,
    onRemoveFileField,
    onUpdateFileFieldKey,
    onUpdateFileFieldValue,
    loading,
    onSendRequest,
    templates = [],
}: RequestBuilderCardProps) {
    const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
    const showBodyEditor = ['POST', 'PUT', 'PATCH'].includes(method);

    const handleSelectTemplateSlug = (selectedSlug: string) => {
        if (url.includes('/templates/') && url.endsWith('/generate')) {
            onUrlChange(`/api/v1/templates/${selectedSlug}/generate`);
        } else if (url.startsWith('/api/v1/templates/')) {
            onUrlChange(`/api/v1/templates/${selectedSlug}`);
        } else if (url.includes('/template-generate')) {
            if (bodyType === 'json') {
                try {
                    const parsed = body.trim() ? JSON.parse(body) : {};
                    parsed.template_slug = selectedSlug;
                    onBodyChange(JSON.stringify(parsed, null, 2));
                } catch {
                    onBodyChange(
                        JSON.stringify(
                            {
                                template_slug: selectedSlug,
                                image_url: 'https://example.com/face.jpg',
                            },
                            null,
                            2,
                        ),
                    );
                }
            } else if (bodyType === 'form-data') {
                onSetFormDataFields((prev) => {
                    const exists = prev.some((f) => f.key === 'template_slug');
                    if (exists) {
                        return prev.map((f) =>
                            f.key === 'template_slug'
                                ? { ...f, value: selectedSlug }
                                : f,
                        );
                    }
                    return [
                        { key: 'template_slug', value: selectedSlug },
                        ...prev,
                    ];
                });
            }
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Method + URL */}
                <div className="flex gap-2">
                    <Select
                        value={method}
                        onValueChange={(v) => onMethodChange(v as HttpMethod)}
                    >
                        <SelectTrigger
                            className={`w-[110px] font-mono text-sm font-semibold ${METHOD_COLORS[method]}`}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(
                                [
                                    'GET',
                                    'POST',
                                    'PUT',
                                    'PATCH',
                                    'DELETE',
                                ] as const
                            ).map((m) => (
                                <SelectItem
                                    key={m}
                                    value={m}
                                    className="font-mono text-sm"
                                >
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <AnimatedInput
                        value={url}
                        onChange={(e) => onUrlChange(e.target.value)}
                        placeholder="/api/v1/..."
                        className="flex-1 font-mono text-sm"
                    />
                </div>

                {/* Template Selector helper when testing Template endpoints */}
                {templates.length > 0 &&
                    (url.includes('/templates/') ||
                        url.includes('/template-generate')) && (
                        <div className="rounded-md border border-sky-500/20 bg-sky-500/5 p-3">
                            <Label className="mb-1.5 block text-xs font-medium text-sky-400">
                                Select Template (auto-fills slug)
                            </Label>
                            <Select onValueChange={handleSelectTemplateSlug}>
                                <SelectTrigger className="font-mono text-xs">
                                    <SelectValue placeholder="Choose a template to insert its slug..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((tpl) => (
                                        <SelectItem
                                            key={tpl.id}
                                            value={tpl.slug}
                                            className="font-mono text-xs"
                                        >
                                            #{tpl.id} — {tpl.name} ({tpl.slug})
                                            [
                                            {tpl.generation_type?.slug ??
                                                tpl.type}{' '}
                                            /{' '}
                                            {tpl.ai_model?.model_name ??
                                                tpl.model ??
                                                'default'}
                                            ]
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                {/* Headers */}
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Headers
                        </Label>
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={onAddHeader}
                            className="h-7 text-xs"
                        >
                            <Plus className="mr-1 h-3 w-3" /> Add
                        </AnimatedButton>
                    </div>
                    <div className="space-y-1">
                        {headers.map((header, index) => (
                            <div key={index} className="flex gap-1">
                                <AnimatedInput
                                    value={header.key}
                                    onChange={(e) =>
                                        onUpdateHeader(
                                            index,
                                            'key',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Key"
                                    className="flex-1 font-mono text-xs"
                                />
                                <AnimatedInput
                                    value={header.value}
                                    onChange={(e) =>
                                        onUpdateHeader(
                                            index,
                                            'value',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Value"
                                    className="flex-1 font-mono text-xs"
                                />
                                <AnimatedButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemoveHeader(index)}
                                    className="h-8 w-8 px-0 text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </AnimatedButton>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body Type Selector */}
                {showBodyEditor && (
                    <div>
                        <Label className="mb-2 block text-xs font-medium text-muted-foreground">
                            Body Type
                        </Label>
                        <div className="flex gap-2">
                            {(['none', 'json', 'form-data'] as const).map(
                                (bt) => (
                                    <AnimatedButton
                                        key={bt}
                                        variant={
                                            bodyType === bt
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        onClick={() => onBodyTypeChange(bt)}
                                        className="font-mono text-xs"
                                    >
                                        {bt === 'form-data'
                                            ? 'form-data (files)'
                                            : bt}
                                    </AnimatedButton>
                                ),
                            )}
                        </div>
                    </div>
                )}

                {/* JSON Body */}
                {showBodyEditor && bodyType === 'json' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Label className="mb-2 block text-xs font-medium text-muted-foreground">
                            Body (JSON)
                        </Label>
                        <AnimatedTextarea
                            value={body}
                            onChange={(e) => onBodyChange(e.target.value)}
                            placeholder='{\n  "key": "value"\n}'
                            className="min-h-[150px] resize-y font-mono text-xs"
                        />
                    </motion.div>
                )}

                {/* Form Data Body */}
                {showBodyEditor && bodyType === 'form-data' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                    >
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Text Fields
                                </Label>
                                <AnimatedButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={onAddFormField}
                                    className="h-7 text-xs"
                                >
                                    <Plus className="mr-1 h-3 w-3" /> Add
                                </AnimatedButton>
                            </div>
                            <div className="space-y-1">
                                {formDataFields.map((field, index) => (
                                    <div key={index} className="flex gap-1">
                                        <AnimatedInput
                                            value={field.key}
                                            onChange={(e) =>
                                                onUpdateFormField(
                                                    index,
                                                    'key',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Field name"
                                            className="flex-1 font-mono text-xs"
                                        />
                                        <AnimatedInput
                                            value={field.value}
                                            onChange={(e) =>
                                                onUpdateFormField(
                                                    index,
                                                    'value',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Value"
                                            className="flex-1 font-mono text-xs"
                                        />
                                        <AnimatedButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                onRemoveFormField(index)
                                            }
                                            className="h-8 w-8 px-0 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </AnimatedButton>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    File Fields
                                </Label>
                                <AnimatedButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={onAddFileField}
                                    className="h-7 text-xs"
                                >
                                    <Upload className="mr-1 h-3 w-3" /> Add File
                                </AnimatedButton>
                            </div>
                            <div className="space-y-2">
                                {formFileFields.map((field, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-1"
                                    >
                                        <AnimatedInput
                                            value={field.key}
                                            onChange={(e) =>
                                                onUpdateFileFieldKey(
                                                    index,
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Field name (e.g. image)"
                                            className="w-[180px] font-mono text-xs"
                                        />
                                        <div className="flex flex-1 items-center gap-2">
                                            <input
                                                ref={(el) => {
                                                    if (el) {
                                                        fileInputRefs.current.set(
                                                            index,
                                                            el,
                                                        );
                                                    }
                                                }}
                                                type="file"
                                                accept="image/*,video/*"
                                                onChange={(e) =>
                                                    onUpdateFileFieldValue(
                                                        index,
                                                        e.target.files?.[0] ??
                                                            null,
                                                    )
                                                }
                                                className="hidden"
                                            />
                                            <AnimatedButton
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    fileInputRefs.current
                                                        .get(index)
                                                        ?.click()
                                                }
                                                className="h-8 text-xs"
                                            >
                                                <Upload className="mr-1 h-3 w-3" />
                                                {field.file
                                                    ? field.file.name
                                                    : 'Choose file'}
                                            </AnimatedButton>
                                            {field.file && (
                                                <span className="max-w-[150px] truncate text-xs text-muted-foreground">
                                                    {(
                                                        field.file.size / 1024
                                                    ).toFixed(0)}{' '}
                                                    KB
                                                </span>
                                            )}
                                        </div>
                                        <AnimatedButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                onRemoveFileField(index)
                                            }
                                            className="h-8 w-8 px-0 text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="h-3 w-3" />
                                        </AnimatedButton>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Send Button */}
                <AnimatedButton
                    onClick={onSendRequest}
                    disabled={loading || !url.trim()}
                    className="w-full"
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Sending...' : 'Send Request'}
                </AnimatedButton>
            </CardContent>
        </Card>
    );
}
