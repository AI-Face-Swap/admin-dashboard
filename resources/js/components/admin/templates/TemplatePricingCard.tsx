import { Coins, Percent } from 'lucide-react';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TemplatePricingCardProps {
    cost: string;
    onCostChange: (value: string) => void;
    discountCost: string;
    onDiscountCostChange: (value: string) => void;
    hasManualCost: boolean;
    modelBaseCost: number;
    numCost: number;
    numDiscount: number;
    effectiveCost: number;
    discountPercent: number;
    errors: Record<string, string>;
}

export function TemplatePricingCard({
    cost,
    onCostChange,
    discountCost,
    onDiscountCostChange,
    hasManualCost,
    modelBaseCost,
    numCost,
    numDiscount,
    effectiveCost,
    discountPercent,
    errors,
}: TemplatePricingCardProps) {
    return (
        <AnimatedCard className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card shadow-sm">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-amber-400" />
                        <span>Point Pricing & Discount</span>
                    </div>
                    {discountPercent > 0 && (
                        <Badge className="border-emerald-500/30 bg-emerald-500/20 font-semibold text-emerald-400 hover:bg-emerald-500/30">
                            <Percent className="mr-1 h-3 w-3" />
                            {discountPercent}% OFF
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    Adjust base cost and optional discount. Customer pays the
                    calculated net cost.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="cost" className="font-medium">
                                Base Cost Override (Optional)
                            </Label>
                            {hasManualCost ? (
                                <button
                                    type="button"
                                    onClick={() => onCostChange('')}
                                    className="text-xs font-medium text-amber-400 hover:underline"
                                >
                                    Reset to AI Model ({modelBaseCost} pts)
                                </button>
                            ) : (
                                <span className="text-xs text-emerald-400">
                                    Auto: AI Model ({modelBaseCost} pts)
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Input
                                id="cost"
                                type="number"
                                min={0}
                                value={cost}
                                onChange={(e) => onCostChange(e.target.value)}
                                className="pl-8"
                                placeholder={`Auto from AI Model (${modelBaseCost} pts)`}
                            />
                            <Coins className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            အလွတ်ထားပါက ရွေးချယ်ထားသော AI Model ၏ Point အတိုင်း
                            အလိုအလျောက် ယူသုံးပါမည်။
                        </p>
                        <InputError message={errors.cost} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="discountCost" className="font-medium">
                            Discount Points
                        </Label>
                        <div className="relative">
                            <Input
                                id="discountCost"
                                type="number"
                                min={0}
                                value={discountCost}
                                onChange={(e) =>
                                    onDiscountCostChange(e.target.value)
                                }
                                className="pl-8"
                                placeholder="0"
                            />
                            <Percent className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <InputError message={errors.discount_cost} />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <div className="space-y-0.5">
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Customer Final Price
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-amber-300">
                                {effectiveCost} points
                            </span>
                            {numDiscount > 0 && (
                                <span className="text-sm text-muted-foreground line-through">
                                    {numCost} points
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                        {numDiscount > 0 ? (
                            <div className="space-y-0.5">
                                <div className="font-medium text-emerald-400">
                                    Save {numDiscount} points ({discountPercent}
                                    % discount)
                                </div>
                                <div>
                                    Calculation: {numCost} - {numDiscount} ={' '}
                                    {effectiveCost}
                                </div>
                            </div>
                        ) : (
                            <span className="italic">No discount applied</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </AnimatedCard>
    );
}
