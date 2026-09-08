// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Index from './index';

// Mock inertia router
vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    router: {
        post: vi.fn(),
        reload: vi.fn(),
    },
    usePage: () => ({
        props: {
            auth: {
                user: { id: 1, name: 'Admin User' }
            }
        }
    })
}));

const defaultProps = {
    generations: [],
    templates: [],
    sliders: [],
    auth: { user: { id: 1, name: 'Admin User', email: 'test@example.com', email_verified_at: '' } },
};

describe('Admin AI Generation Page', () => {
    it('renders the AI Generation page with tabs', () => {
        render(<Index {...defaultProps} />);
        
        // Assert the main tabs exist
        expect(screen.getByText('Image Face Swap')).toBeInTheDocument();
        expect(screen.getByText('Video Face Swap')).toBeInTheDocument();
        expect(screen.getByText('Image Generation')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Image to Video' })[0]).toBeInTheDocument();
    });

    it('switches to Image to Video tab and renders new fields', () => {
        render(<Index {...defaultProps} />);
        
        // Click the Image to Video tab
        const buttons = screen.getAllByRole('button', { name: 'Image to Video' });
        fireEvent.click(buttons[0]);
        
        // Assert the new fields are visible
        expect(screen.getByText('Model')).toBeInTheDocument();
        expect(screen.getByText('Aspect Ratio')).toBeInTheDocument();
    });
});
