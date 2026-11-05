import { Sliders } from 'lucide-react';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import InputError from '@/components/input-error';
import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface TemplatePromptsParametersCardProps {
    aspectRatio: string;
    onAspectRatioChange: (value: string) => void;
    resolution: string;
    onResolutionChange: (value: string) => void;
    seed: string;
    onSeedChange: (value: string) => void;
    prompt: string;
    onPromptChange: (value: string) => void;
    negativePrompt: string;
    onNegativePromptChange: (value: string) => void;
    imageMode: string;
    onImageModeChange: (value: string) => void;
    duration: string;
    onDurationChange: (value: string) => void;
    bitrateMode: string;
    onBitrateModeChange: (value: string) => void;
    generateAudio: boolean;
    onGenerateAudioChange: (checked: boolean) => void;
    autoResize: boolean;
    onAutoResizeChange: (checked: boolean) => void;
    errors: Record<string, string>;
}

export function TemplatePromptsParametersCard({
    aspectRatio,
    onAspectRatioChange,
    resolution,
    onResolutionChange,
    seed,
    onSeedChange,
    prompt,
    onPromptChange,
    negativePrompt,
    onNegativePromptChange,
    imageMode,
    onImageModeChange,
    duration,
    onDurationChange,
    bitrateMode,
    onBitrateModeChange,
    generateAudio,
    onGenerateAudioChange,
    autoResize,
    onAutoResizeChange,
    errors,
}: TemplatePromptsParametersCardProps) {
    return (
        <AnimatedCard>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Sliders className="h-5 w-5 text-primary" />
                    AI Prompts & Parameters
                </CardTitle>
                <CardDescription>
                    Fine-tune guidance prompts, output dimensions, and model
                    runtime parameters.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                        <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                        <Input
                            id="aspectRatio"
                            value={aspectRatio}
                            onChange={(e) =>
                                onAspectRatioChange(e.target.value)
                            }
                            placeholder="e.g. 16:9, 1:1"
                        />
                        <InputError message={errors.aspect_ratio} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="resolution">Resolution</Label>
                        <Input
                            id="resolution"
                            value={resolution}
                            onChange={(e) => onResolutionChange(e.target.value)}
                            placeholder="e.g. 720p, 1080p"
                        />
                        <InputError message={errors.resolution} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="seed">Seed</Label>
                        <Input
                            id="seed"
                            type="number"
                            value={seed}
                            onChange={(e) => onSeedChange(e.target.value)}
                            placeholder="Random"
                        />
                        <InputError message={errors.seed} />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="prompt">Prompt (optional)</Label>
                    <Textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                        placeholder="Specific prompt template..."
                        rows={3}
                    />
                    <InputError message={errors.prompt} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="negativePrompt">
                        Negative Prompt (optional)
                    </Label>
                    <Textarea
                        id="negativePrompt"
                        value={negativePrompt}
                        onChange={(e) => onNegativePromptChange(e.target.value)}
                        placeholder="Things to avoid..."
                        rows={2}
                    />
                    <InputError message={errors.negative_prompt} />
                </div>

                <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Model Runtime Parameters (Image-to-Video / Seedance
                            / Editing)
                        </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="imageMode" className="text-xs">
                                Image Mode
                            </Label>
                            <Select
                                value={imageMode}
                                onValueChange={onImageModeChange}
                            >
                                <SelectTrigger id="imageMode">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="reference">
                                        Reference (Character / Subject)
                                    </SelectItem>
                                    <SelectItem value="first_frame_url">
                                        First Frame URL
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="duration" className="text-xs">
                                Duration (Seconds)
                            </Label>
                            <Input
                                id="duration"
                                type="number"
                                min={4}
                                max={15}
                                value={duration}
                                onChange={(e) =>
                                    onDurationChange(e.target.value)
                                }
                                placeholder="5"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="bitrateMode" className="text-xs">
                                Bitrate Mode
                            </Label>
                            <Select
                                value={bitrateMode}
                                onValueChange={onBitrateModeChange}
                            >
                                <SelectTrigger id="bitrateMode">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">
                                        Standard
                                    </SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-3">
                            <div>
                                <Label
                                    htmlFor="generateAudio"
                                    className="text-xs font-medium"
                                >
                                    Generate Audio
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Copyright block မထိစေရန် Off ထားနိုင်သည်
                                </p>
                            </div>
                            <Switch
                                id="generateAudio"
                                checked={generateAudio}
                                onCheckedChange={onGenerateAudioChange}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-3">
                            <div>
                                <Label
                                    htmlFor="autoResize"
                                    className="text-xs font-medium"
                                >
                                    Auto Resize
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Automatically resize input media
                                </p>
                            </div>
                            <Switch
                                id="autoResize"
                                checked={autoResize}
                                onCheckedChange={onAutoResizeChange}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </AnimatedCard>
    );
}
