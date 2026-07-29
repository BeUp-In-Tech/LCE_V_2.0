import { useState } from 'react';
import hangDryImage from "../../assets/dashboard/handDray.webp";
import dryCleaningImage from "../../assets/dashboard/dryCleaning.webp";

export interface ServiceData {
    code: string;
    name: string;
    description: string;
    pricing_type: string;
    base_price?: number;
    item_count?: number;
}

type ServiceCardProps = {
    service: ServiceData;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    onOpenPricing?: () => void;
}

const imageMap: Record<string, string> = {
    hang_dry: hangDryImage,
    dc: dryCleaningImage,
};

const ServiceCard: React.FC<ServiceCardProps> = ({ service, checked, onCheckedChange, onOpenPricing }) => {
    const [internalChecked, setInternalChecked] = useState<boolean>(false);
    const isChecked = typeof checked === 'boolean' ? checked : internalChecked;

    const handleCheckedChange = (value: boolean) => {
        if (onCheckedChange) onCheckedChange(value);
        else setInternalChecked(value);
    };

    const serviceImage = imageMap[service.code] || hangDryImage;

    return (
        <div className="rounded-2xl">
            <label
                onClick={() => handleCheckedChange(!isChecked)}
                className={`flex justify-between gap-3 cursor-pointer border rounded-xl p-4 transition-all duration-200 ${isChecked ? 'bg-[#E6F6FD] border-[#00A7EE]' : 'border-[#EBECEC] bg-white'}`}
            >
                <div className="flex gap-x-4">
                    <div className="pt-2">
                        {isChecked ? (
                            <div className="w-5 h-5 bg-[#00A7EE] rounded-md flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-5 h-5 border-2 rounded-md border-[#00A7EE]" />
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row">
                        <div className="flex-1">
                            <h1 className="text-[#2F393D] text-lg sm:text-xl font-semibold">
                                {service.name}
                            </h1>
                            <p className="text-base text-[#4B5457] leading-[150%] roboto-flex mt-1">
                                {service.description}
                            </p>
                            {onOpenPricing && (
                                <p className="text-xs mt-2 text-[#4B5457]">
                                    See <span
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onOpenPricing();
                                        }}
                                        className="text-[#00A7EE] underline cursor-pointer"
                                    >Pricing here</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-20 shrink-0 flex items-center justify-center">
                    <img src={serviceImage} className="w-full h-full object-contain" alt={`${service.name} image`} />
                </div>
            </label>
        </div>
    );
};

export default ServiceCard;
