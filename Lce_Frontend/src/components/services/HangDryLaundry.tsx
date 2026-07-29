import { useState } from 'react';

import hangDryImage from "../../assets/authpage/hang-dry.png";

type HangDryLaundryProps = {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    onOpenPricing?: () => void;
}

const HangDryLaundry: React.FC<HangDryLaundryProps> = ({ checked, onCheckedChange, onOpenPricing }) => {
    const [internalChecked, setInternalChecked] = useState<boolean>(false);
    
    
    const isChecked = typeof checked === 'boolean' ? checked : internalChecked;

    const handleCheckedChange = (value: boolean) => {
        if (onCheckedChange) onCheckedChange(value);
        else setInternalChecked(value);
    }

    return (
        <div className={`rounded-2xl mt-4`}>
            <label onClick={() => handleCheckedChange(!isChecked)} className={`flex justify-between gap-3 cursor-pointer border rounded-xl p-4 transition-all duration-200 ${isChecked ? 'bg-[#E6F6FD] border-[#00A7EE]' : 'border-[#EBECEC] bg-white'} `}>
                <div className='flex gap-x-4'>
                    <div className='pt-2'>
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

                    <div className="flex flex-col sm:flex-row">
                        <div className="flex-1">
                            <h1 className="text-[#2F393D] text-lg sm:text-xl font-semibold">
                                Hang Dry Laundry
                            </h1>
                            <p className="text-base max-w-[80%] text-[#4B5457] leading-[150%] roboto-flex mt-1">
                                Hang Dry Laundry pricing based on per items you send.
                            </p>
                            <p className="text-xs mt-2 text-[#4B5457]">
                                See <span onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if(onOpenPricing) onOpenPricing();
                                }} className="text-[#00A7EE] underline cursor-pointer">Pricing here</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-19">
                    <img src={hangDryImage} className="w-full" alt="hang dry laundry image" />
                </div>
            </label>
        </div>
    )
}

export default HangDryLaundry;


