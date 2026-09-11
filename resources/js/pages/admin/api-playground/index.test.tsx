// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import APIPlayground from './index';

vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    router: {
        post: vi.fn(),
    },
}));

describe('API Playground', () => {
    it('renders the API Playground correctly', () => {
        render(<APIPlayground />);

        // Assert the main elements
        expect(screen.getByText('API Playground')).toBeInTheDocument();
    });
});
