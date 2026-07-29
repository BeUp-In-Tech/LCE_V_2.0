import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HangDryLaundry from '../../components/services/HangDryLaundry';

describe('HangDryLaundry', () => {
    it('displays PAYG messaging', () => {
        render(<HangDryLaundry />);
        expect(screen.getByText(/Pay As You Go/i)).toBeInTheDocument();
        expect(screen.getByText(/charged after we process your items/i)).toBeInTheDocument();
    });

    it('shows pricing link', () => {
        render(<HangDryLaundry />);
        expect(screen.getByText(/Pricing here/i)).toBeInTheDocument();
    });

    it('toggles checked state', () => {
        const onCheckedChange = vi.fn();
        render(<HangDryLaundry checked={false} onCheckedChange={onCheckedChange} />);

        const label = screen.getByText('Hang Dry Laundry').closest('label');
        if (label) fireEvent.click(label);

        expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('calls onOpenPricing when pricing link clicked', () => {
        const onOpenPricing = vi.fn();
        render(<HangDryLaundry onOpenPricing={onOpenPricing} />);

        fireEvent.click(screen.getByText('Pricing here'));
        expect(onOpenPricing).toHaveBeenCalled();
    });

    it('does NOT display old "pricing based on per items" text', () => {
        render(<HangDryLaundry />);
        expect(screen.queryByText(/pricing based on per items/i)).not.toBeInTheDocument();
    });
});
