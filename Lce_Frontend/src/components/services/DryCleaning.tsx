import { useState } from "react";
import cleaningLoundrayImage from "../../assets/dashboard/dryCleaning.webp";

type DryCleaningProps = {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    onOpenPricing?: () => void;
}

const DryCleaning: React.FC<DryCleaningProps> = ({ checked, onCheckedChange, onOpenPricing }) => {
    const [internalChecked, setInternalChecked] = useState<boolean>(false);

    const isChecked = typeof checked === 'boolean' ? checked : internalChecked;

    const handleCheckedChange = (value: boolean) => {
        if (onCheckedChange) onCheckedChange(value);
        else setInternalChecked(value);
    }

    return (
        <div>
            <label onClick={() => handleCheckedChange(!isChecked)} className={`flex  justify-between items-start gap-3 border-b p-4 cursor-pointer border transition-all duration-200 mt-4 rounded-xl  ${isChecked ? 'bg-[#E6F6FD] border-[#00A7EE]' : 'border-[#dce4e6] bg-white'}    `}>
                <div className="flex gap-x-4">
                    <div className="pt-2">
                            {isChecked ? (
                            <div className="w-5 h-5 bg-[#00A7EE] rounded-md flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        ) : (
                            <div className='w-5 h-5 border-2 rounded-md border-[#00A7EE]'></div>
                        )}
                    </div>

                    <div className="">
                        <div className="flex flex-col gap-y-4">
                            <h1 className="font-semibold text-lg sm:text-xl text-[#2F393D]">Dry Cleaning/Launder & Press</h1>
                            <div className="text-base text-[#4B5457] leading-[150%]">Dry cleaning / Launder & Press pricing based on the items you send. See                                  
                            <p className="text-xs text-[#4B5457] mt-1">See <span onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if(onOpenPricing) onOpenPricing();
                            }} className="text-[#00A7EE] text-sm underline cursor-pointer">Pricing here</span></p> </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-19 ">
                    <img src={cleaningLoundrayImage} className="w-full" alt="laundry-image" />
                </div>
            </label>
        </div>
    )
}

export default DryCleaning