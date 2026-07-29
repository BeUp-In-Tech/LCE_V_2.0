import { Menu, X } from "lucide-react";
import { useState } from "react";

import logo from '../../assets/LCE logo - v2 transparent 2.png'

export const  RedeemNavber = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <nav className="bg-white sticky top-0 z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
                <div className="flex flex-col">
                  <img className="-rotate-11" src={logo} alt="Laundry Care Express Logo" />
                </div>

                <div className="hidden md:flex space-x-8 text-gray-600 font-medium text-sm sm:text-[16px]">
                    <a href="#" className="hover:text-[#00AEEF]">Services and Pricing</a>
                    <a href="#" className="hover:text-[#00AEEF]">For Business</a>
                    <a href="#" className="hover:text-[#00AEEF]">Areas Served</a>
                    <a href="#" className="hover:text-[#00AEEF]">Contact</a>
                </div>

                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                        <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=faces" alt="profile" />
                    </div>
                    <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <X/> : <Menu />}
                    </button>
                </div>
            </div>
            {}
            {isOpen && (
                <div className="md:hidden bg-white p-4 space-y-4 border-t">
                    <a href="#" className="block text-gray-600">Services and Pricing</a>
                    <a href="#" className="block text-gray-600">For Business</a>
                    <a href="#" className="block text-gray-600">Areas Served</a>
                    <a href="#" className="block text-gray-600">Contact</a>
                </div>
            )}
        </nav>
    );
};