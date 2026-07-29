import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShowPriceModal from '../../components/shared/modal/price/ShowPriceModal';


vi.mock('../../../../services/api', () => ({
    utilityAPI: {
        getPriceItems: vi.fn().mockResolvedValue({
            data: {
                categories: [
                    {
                        name: 'Dress Shirt',
                        items: [
                            { id: '1', name: 'Regular Shirt', price: 5.99, category: 'Dress Shirt' },
                            { id: '2', name: 'Silk Shirt', price: 8.99, category: 'Dress Shirt' },
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

describe('ShowPriceModal (Hang Dry)', () => {
    it('does not render when isOpen is false', () => {
        const { container } = render(
            <ShowPriceModal
                isOpen={false}
                setIsOpen={vi.fn()}
                handleDryLaundeyPrice={vi.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders PAYG info banner when open', () => {
        render(
            <ShowPriceModal
                isOpen={true}
                setIsOpen={vi.fn()}
                handleDryLaundeyPrice={vi.fn()}
            />
        );
        expect(screen.getByText(/Pay As You Go/i)).toBeInTheDocument();
        expect(screen.getByText(/charged after we receive and process/i)).toBeInTheDocument();
    });

    it('shows reference-only footer instead of total', () => {
        render(
            <ShowPriceModal
                isOpen={true}
                setIsOpen={vi.fn()}
                handleDryLaundeyPrice={vi.fn()}
            />
        );
        expect(screen.getByText(/Pricing for reference only/i)).toBeInTheDocument();
        expect(screen.queryByText(/Total Amount/i)).not.toBeInTheDocument();
    });

    it('does NOT render checkboxes (view-only)', () => {
        render(
            <ShowPriceModal
                isOpen={true}
                setIsOpen={vi.fn()}
                handleDryLaundeyPrice={vi.fn()}
            />
        );
        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes).toHaveLength(0);
    });

    it('closes when X button is clicked', () => {
        const setIsOpen = vi.fn();
        render(
            <ShowPriceModal
                isOpen={true}
                setIsOpen={setIsOpen}
                handleDryLaundeyPrice={vi.fn()}
            />
        );
        
        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);
        expect(setIsOpen).toHaveBeenCalledWith(false);
    });
});
