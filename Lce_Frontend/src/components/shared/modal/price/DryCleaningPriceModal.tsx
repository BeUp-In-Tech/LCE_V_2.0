import { X } from "lucide-react";
import accessoriesImg from "../../../../assets/dashboard/accessories.webp";
import dressShirtImg from "../../../../assets/dashboard/dressShirt.webp";
import imageTwo from "../../../../assets/dashboard/tops.webp";
import imageThree from "../../../../assets/dashboard/comfoter.webp";
import imageFour from "../../../../assets/dashboard/bottom.webp";
import imageFive from "../../../../assets/dashboard/body.webp";
import imageSix from "../../../../assets/dashboard/household.webp";
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


const CATEGORY_IMAGES: Record<string, string> = {
    "Dress Shirt": dressShirtImg,
    "Tops": imageTwo,
    "Bottom": imageFour,
    "Full Body": imageFive,
    "Comforter": imageThree,
    "Household": imageSix,
    "Accessories": accessoriesImg,
    "Other": imageThree,
};

interface ModalProps {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleDryCleaningPrice: (item: LaundryItem[]) => void;
}

const DryCleaningPriceModal: React.FC<ModalProps> = ({ isOpen, setIsOpen }) => {
    const [categories, setCategories] = useState<PricingCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    
    useEffect(() => {
        const fetchPricing = async () => {
            if (!isOpen) return;

            setLoading(true);
            setError(null);

            try {
                const response = await utilityAPI.getPriceItems('DC');
                if (response.data?.categories) {
                    setCategories(response.data.categories);
                }
            } catch (err) {
                console.error('Failed to fetch DC pricing:', err);
                setError('Failed to load pricing. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchPricing();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setIsOpen(false)}
        >
            <div 
                className="max-w-[480px] w-full max-h-[90vh] bg-white rounded-[24px] shadow-2xl font-sans text-gray-800 overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative">
                
                {}
                <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-gray-100">
                    <h1 className="text-[18px] font-bold text-[#1F2937]">Standard next business day turnaround for all orders.</h1>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                        <X size={24} />
                    </button>
                </div>

                {}
                <div className="px-8 py-6">
                    {loading ? (
                        <div className="flex flex-col gap-10">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="animate-pulse">
                                    <div className="h-[160px] bg-gray-200 rounded-[12px] mb-4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
                                    <div className="space-y-3">
                                        <div className="h-3 bg-gray-100 rounded w-full"></div>
                                        <div className="h-3 bg-gray-100 rounded w-full"></div>
                                        <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">{error}</div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No pricing available at the moment.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-10">
                            {categories.map((category) => (
                                <div key={category.name} className="flex flex-col">
                                    <div className="w-full h-[180px] rounded-[12px] overflow-hidden mb-4 bg-gray-100">
                                        <img
                                            src={CATEGORY_IMAGES[category.name] || imageThree}
                                            alt={category.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>

                                    <h2 className="font-bold text-[14px] text-[#111827] mb-3">{category.name}</h2>

                                    <div className="flex flex-col gap-3">
                                        {category.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between"
                                            >
                                                <span className="text-[13px] text-[#4B5563]">
                                                    {item.name}
                                                </span>
                                                {item.price === -1 ? (
                                                     <span className="text-[13px] font-medium text-[#00A7EE] hover:underline cursor-pointer">
                                                        Call Us
                                                     </span>
                                                ) : (
                                                    <span className="text-[13px] text-[#4B5563]">
                                                        ${item.price.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {}
                <div className="px-8 py-5 border-t border-gray-100">
                    <p className="text-[14px] text-[#374151] leading-relaxed">
                        * We love "regular" dress shirts that launder and fit onto our automatic pressing machines. To avoid damage and get good results, some shirts (like synthetics) need dry cleaning. Other shirts need hand pressing because they're extra big or small, have non-standard taper or special buttons, or non-standard sleeve lengths (short sleeves are OK).
                    </p>
                </div>

                </div>
            </div>
        </div>
    );
};

export default DryCleaningPriceModal;