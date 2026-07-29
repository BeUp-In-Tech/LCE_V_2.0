import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DryCleaningPriceModal from '../../components/shared/modal/price/DryCleaningPriceModal';


vi.mock('../../../../services/api', () => ({
    utilityAPI: {
        getPriceItems: vi.fn().mockResolvedValue({
            data: {
                categories: [
                    {
                        name: 'Dress Shirt',
                        items: [
                            { id: '1', name: 'Dress Shirt - DC', price: 7.99, category: 'Dress Shirt' },
                        ]
                    }
                ]
            }
        })
    }
}));


vi.mock('../../../../assets/dashboard/shirt.webp', () => ({ default: 'shirt.jpg' }));
vi.mock('../../../../assets/dashboard/tops.webp', () => ({ default: 'tops.jpg' }));
vi.mock('../../../../assets/dashboard/comfoter.webp', () => ({ default: 'comfoter.jpg' }));
vi.mock('../../../../assets/dashboard/bottom.webp', () => ({ default: 'bottom.jpg' }));
vi.mock('../../../../assets/dashboard/body.webp', () => ({ default: 'body.jpg' }));
vi.mock('../../../../assets/dashboard/household.webp', () => ({ default: 'household.jpg' }));

describe('DryCleaningPriceModal', () => {
    it('does not render when isOpen is false', () => {
        const { container } = render(
            <DryCleaningPriceModal
                isOpen={false}
                setIsOpen={vi.fn()}
                handleDryCleaningPrice={vi.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders PAYG info banner when open', () => {
        render(
            <DryCleaningPriceModal
                isOpen={true}
                setIsOpen={vi.fn()}
                handleDryCleaningPrice={vi.fn()}
            />
        );
        expect(screen.getByText(/Pay As You Go/i)).toBeInTheDocument();
    });

    it('shows reference-only footer', () => {
        render(
            <DryCleaningPriceModal
                isOpen={true}
                setIsOpen={vi.fn()}
                handleDryCleaningPrice={vi.fn()}
            />
        );
        expect(screen.getByText(/Pricing for reference only/i)).toBeInTheDocument();
        expect(screen.queryByText(/Total Amount/i)).not.toBeInTheDocument();
    });

    it('does NOT render checkboxes (view-only)', () => {
        render(
            <DryCleaningPriceModal
                isOpen={true}
                setIsOpen={vi.fn()}
                handleDryCleaningPrice={vi.fn()}
            />
        );
        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('renders correct modal title', () => {
        render(
            <DryCleaningPriceModal
                isOpen={true}
                setIsOpen={vi.fn()}
                handleDryCleaningPrice={vi.fn()}
            />
        );
        expect(screen.getByText('Dry Cleaning/Launder & Press')).toBeInTheDocument();
    });
});
