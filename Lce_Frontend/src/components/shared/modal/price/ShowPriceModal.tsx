import { X } from "lucide-react";
import { useEffect, useState } from 'react';
import { utilityAPI } from '../../../../services/api';

export interface LaundryItem {
    id: string;
    name: string;
    price: number;
    category: string;
}

interface PricingCategory {
    name: string;
    items: LaundryItem[];
}

interface ModalProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleDryLaundeyPrice: (item: LaundryItem[]) => void;
    priceType?: 'HD' | 'DC';
}

const ShowPriceModal: React.FC<ModalProps> = ({
    isOpen,
    setIsOpen,
    priceType = 'HD'
}) => {
    const [categories, setCategories] = useState<PricingCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPricing = async () => {
            if (!isOpen) return;

            setLoading(true);
            setError(null);

            try {
                const response = await utilityAPI.getPriceItems(priceType);
                if (response.data?.categories) {
                    setCategories(response.data.categories);
                }
            } catch (err) {
                console.error('Failed to fetch pricing:', err);
                setError('Failed to load pricing. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchPricing();
    }, [isOpen, priceType]);

    if (!isOpen) return null;

    
    const allItems = categories.flatMap(cat => cat.items);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="w-full max-w-[640px] bg-white rounded-[20px] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >

                {}
                <div className="flex justify-between items-start px-8 pt-8 pb-2">
                    <div>
                        <p className="text-[15px] text-[#4B5563] leading-relaxed">
                            Hand Dry items charged per item, not by weight.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors ml-4 mt-0.5"
                    >
                        <X size={22} />
                    </button>
                </div>
  {}
                <div className="mx-8 border-t border-gray-200 pt-4 pb-2">
                    <p className="text-[14px] text-[#4B5563] italic">
                        Standard next business day turnaround for all orders.
                    </p>
                </div>


                {}
                <div className="px-8 pb-8 overflow-y-auto custom-scrollbar max-h-[55vh]">
                    {loading ? (
                        <div className="flex flex-col gap-4 pt-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="animate-pulse flex justify-between items-center py-3 border-b border-gray-100">
                                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">{error}</div>
                    ) : allItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No pricing available at the moment.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {allItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between py-4"
                                >
                                    <span className="text-[15px] text-[#374151]">
                                        {item.name}
                                    </span>
                                    <span className="text-[15px] font-semibold text-[#111827]">
                                        ${item.price.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ShowPriceModal;
