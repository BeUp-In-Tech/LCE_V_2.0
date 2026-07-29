import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DryCleaning from '../../components/services/DryCleaning';

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('DryCleaning', () => {
    it('displays PAYG messaging', () => {
        renderWithRouter(<DryCleaning />);
        expect(screen.getByText(/Pay As You Go/i)).toBeInTheDocument();
        expect(screen.getByText(/charged after we process your items/i)).toBeInTheDocument();
    });

    it('does NOT display old "pricing based on items" text', () => {
        renderWithRouter(<DryCleaning />);
        expect(screen.queryByText(/Dry cleaning \/ Launder & Press pricing based on items/i)).not.toBeInTheDocument();
    });

    it('toggles checked state', () => {
        const onCheckedChange = vi.fn();
        renderWithRouter(<DryCleaning checked={false} onCheckedChange={onCheckedChange} />);

        const label = screen.getByText('Dry Cleaning/Launder & Press').closest('label');
        if (label) fireEvent.click(label);

        expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('calls onOpenPricing when pricing link clicked', () => {
        const onOpenPricing = vi.fn();
        renderWithRouter(<DryCleaning onOpenPricing={onOpenPricing} />);

        fireEvent.click(screen.getByText('Pricing here'));
        expect(onOpenPricing).toHaveBeenCalled();
    });
});
