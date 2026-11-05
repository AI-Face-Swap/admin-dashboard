export type TemplateCategory = {
    id: number;
    name: string;
    slug: string;
};

export type TemplateItem = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    type: 'image' | 'video';
    file_url: string;
    thumbnail_url: string | null;
    model?: string | null;
    prompt?: string | null;
    negative_prompt?: string | null;
    aspect_ratio?: string | null;
    resolution?: string | null;
    seed?: string | null;
    sort_order?: number;
    cost: number;
    manual_cost?: number | null;
    discount_cost?: number;
    effective_cost?: number;
    is_active: boolean;
    category: { id: number; name: string; slug?: string } | null;
    generation_type?: { id: number; name: string; slug: string } | null;
    ai_model?: {
        id: number;
        name: string;
        provider_name: string;
        model_name: string;
        coin_cost: number;
    } | null;
    tags: { id: number; name: string }[];
};

export type PaginatedTemplates = {
    data: TemplateItem[];
    current_page: number;
    last_page: number;
    total: number;
    next_page_url: string | null;
};
