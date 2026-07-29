import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Services from '../../../pages/services/Services';


vi.mock('../../../components/services/WashFold', () => ({
    default: ({ checked, onCheckedChange }: any) => (
        <div data-testid="wash-fold">
            <label>
                Wash Fold
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onCheckedChange(e.target.checked)}
                />
            </label>
        </div>
    )
}));

vi.mock('../../../components/services/HangDryLaundry', () => ({
    default: ({ checked, onCheckedChange, onOpenPricing }: any) => (
        <div data-testid="hang-dry">
            <label>
                Hang Dry
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onCheckedChange(e.target.checked)}
                />
            </label>
            <button onClick={onOpenPricing}>Open Hang Dry Pricing</button>
        </div>
    )
}));

vi.mock('../../../components/services/DryCleaning', () => ({
    default: ({ checked, onCheckedChange, onOpenPricing }: any) => (
        <div data-testid="dry-cleaning">
            <label>
                Dry Cleaning
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onCheckedChange(e.target.checked)}
                />
            </label>
            <button onClick={onOpenPricing}>Open Dry Cleaning Pricing</button>
        </div>
    )
}));

vi.mock('../../../components/shared/modal/price/ShowPriceModal', () => ({
    default: ({ isOpen }: any) => isOpen ? <div data-testid="hang-dry-modal">Hang Dry Modal</div> : null
}));

vi.mock('../../../components/shared/modal/price/DryCleaningPriceModal', () => ({
    default: ({ isOpen }: any) => isOpen ? <div data-testid="dry-cleaning-modal">Dry Cleaning Modal</div> : null
}));

vi.mock('../../../components/navbar/AuthHeader', () => ({
    default: () => <div data-testid="auth-header">Header</div>
}));





describe('Services Page', () => {
    it('disables Schedule button initially (no service selected)', () => {
        render(
            <MemoryRouter>
                <Services />
            </MemoryRouter>
        );
        const button = screen.getByText(/Schedule Your Pickup/i).closest('button');
        expect(button).toBeDisabled();
    });

    it('enables Schedule button when a service is selected', () => {
        render(
            <MemoryRouter>
                <Services />
            </MemoryRouter>
        );
        
        
        const checkbox = screen.getByLabelText(/Wash Fold/i);
        fireEvent.click(checkbox);

        const button = screen.getByText(/Schedule Your Pickup/i).closest('button');
        expect(button).not.toBeDisabled();
    });

    it('shows Pay As You Go section when Hang Dry is selected', () => {
        render(
            <MemoryRouter>
                <Services />
            </MemoryRouter>
        );

        
        const checkbox = screen.getByLabelText(/Hang Dry/i);
        fireEvent.click(checkbox);

        expect(screen.getByText('Hang Dry - Pay As-You-Go')).toBeInTheDocument();
        expect(screen.getByText('See Pricing')).toBeInTheDocument();
    });

    it('shows Pay As You Go section when Dry Cleaning is selected', () => {
        render(
            <MemoryRouter>
                <Services />
            </MemoryRouter>
        );

        
        const checkbox = screen.getByLabelText(/Dry Cleaning/i);
        fireEvent.click(checkbox);

        expect(screen.getByText('Dry Cleaning - Pay As-You-Go')).toBeInTheDocument();
        expect(screen.getByText('See Pricing')).toBeInTheDocument();
    });

    it('opens pricing modal when "See Pricing" is clicked', () => {
        render(
            <MemoryRouter>
                <Services />
            </MemoryRouter>
        );

        
        const checkbox = screen.getByLabelText(/Hang Dry/i);
        fireEvent.click(checkbox);

        
        const pricingBtn = screen.getByText('See Pricing');
        fireEvent.click(pricingBtn);

        expect(screen.getByTestId('hang-dry-modal')).toBeInTheDocument();
    });
});
