import { Link } from '@inertiajs/react';
import { Check, Copy, Edit3, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { TemplateItem } from './types';

interface TemplateLightboxModalProps {
    selectedTemplate: TemplateItem | null;
    canManage: boolean;
    copiedSlugId: number | null;
    onClose: () => void;
    onCopySlug: (e: React.MouseEvent, template: TemplateItem) => void;
    onDelete: (e: React.MouseEvent, template: TemplateItem) => void;
}

export function TemplateLightboxModal({
    selectedTemplate,
    canManage,
    copiedSlugId,
    onClose,
    onCopySlug,
    onDelete,
}: TemplateLightboxModalProps) {
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    const handleCopyPrompt = (promptText: string) => {
        navigator.clipboard.writeText(promptText);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 1600);
    };

    return (
        <Dialog
            open={!!selectedTemplate}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
                {selectedTemplate && (
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="flex items-center justify-center bg-black/90 p-4 md:min-h-[420px]">
                            {selectedTemplate.type === 'video' ? (
                                <video
                                    src={selectedTemplate.file_url}
                                    controls
                                    autoPlay
                                    loop
                                    className="max-h-[70vh] w-full rounded-lg object-contain"
                                />
                            ) : (
                                <img
                                    src={selectedTemplate.file_url}
                                    alt={selectedTemplate.name}
                                    className="max-h-[70vh] w-full rounded-lg object-contain"
                                />
                            )}
                        </div>

                        <div className="flex flex-col justify-between p-6">
                            <div className="space-y-4">
                                <DialogHeader>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                selectedTemplate.is_active
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {selectedTemplate.is_active
                                                ? 'Active'
                                                : 'Hidden'}
                                        </Badge>
                                        <Badge variant="outline">
                                            {selectedTemplate.type}
                                        </Badge>
                                        {selectedTemplate.category && (
                                            <Badge variant="secondary">
                                                {selectedTemplate.category.name}
                                            </Badge>
                                        )}
                                    </div>
                                    <DialogTitle className="mt-2 text-xl font-bold">
                                        {selectedTemplate.name}
                                    </DialogTitle>
                                    <DialogDescription className="flex items-center gap-2 font-mono text-xs">
                                        <span>
                                            slug: {selectedTemplate.slug}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) =>
                                                onCopySlug(e, selectedTemplate)
                                            }
                                            className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] text-foreground hover:bg-muted"
                                        >
                                            {copiedSlugId ===
                                            selectedTemplate.id ? (
                                                <>
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3 w-3" />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid grid-cols-2 gap-2.5 rounded-xl border bg-muted/30 p-3 text-xs">
                                    <div>
                                        <span className="block text-[10px] text-muted-foreground uppercase">
                                            Point Cost
                                        </span>
                                        <span className="font-bold text-foreground">
                                            🪙{' '}
                                            {selectedTemplate.effective_cost ??
                                                selectedTemplate.cost}{' '}
                                            pts
                                        </span>
                                        <span className="ml-1 text-[10px] text-muted-foreground">
                                            (
                                            {selectedTemplate.manual_cost !==
                                                null &&
                                            selectedTemplate.manual_cost !==
                                                undefined
                                                ? 'Manual'
                                                : 'Model'}
                                            )
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-muted-foreground uppercase">
                                            AI Model
                                        </span>
                                        <span className="font-mono font-semibold text-primary">
                                            {selectedTemplate.ai_model?.name ??
                                                selectedTemplate.model ??
                                                'Default'}
                                        </span>
                                    </div>
                                    {selectedTemplate.aspect_ratio && (
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground uppercase">
                                                Aspect Ratio
                                            </span>
                                            <span className="font-mono font-semibold">
                                                {selectedTemplate.aspect_ratio}
                                            </span>
                                        </div>
                                    )}
                                    {selectedTemplate.resolution && (
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground uppercase">
                                                Resolution
                                            </span>
                                            <span className="font-mono font-semibold">
                                                {selectedTemplate.resolution}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {selectedTemplate.prompt && (
                                    <div className="rounded-xl border bg-muted/20 p-3">
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                                Prompt
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleCopyPrompt(
                                                        selectedTemplate.prompt!,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                            >
                                                {copiedPrompt ? (
                                                    <>
                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3" />
                                                        Copy Prompt
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <p className="max-h-36 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                                            {selectedTemplate.prompt}
                                        </p>
                                    </div>
                                )}

                                {selectedTemplate.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedTemplate.tags.map((tag) => (
                                            <span
                                                key={tag.id}
                                                className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                                            >
                                                #{tag.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {canManage && (
                                <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4">
                                    <Link
                                        href={`/admin/templates/${selectedTemplate.id}/edit`}
                                    >
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="gap-1.5"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                            Edit Template
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={(e) =>
                                            onDelete(e, selectedTemplate)
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
