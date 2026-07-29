import  { useState } from 'react';
import { Menu, X } from 'lucide-react';


const GriftNavber = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Services and Pricing', href: '#' },
    { name: 'For Business', href: '#' },
    { name: 'Areas Served', href: '#' },
    { name: 'Contact', href: '#' },
  ];

  return (
    <nav className="bg-white  border-gray-100">
      <div className="mx-auto ">
        <div className="flex justify-between items-center h-20">
          
          {}
          <div className="flex-shrink-0 flex flex-col items-start leading-tight">
            <span className="text-[#00AEEF] italic font-black text-xl italic leading-none">
              Laundry 
            </span>
            <div className="flex items-center -mt-1">
              <span className="text-[#00AEEF] font-bold text-2xl">Care</span>
              <span className="text-[#A188FF] italic font-medium text-2xl ml-1">Express</span>
              {}
              <svg className="w-6 h-6 ml-1 text-[#A188FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 0a5 5 0 0 1 5 5v1H7v-1a5 5 0 0 1 5-5zM4 17h16" />
              </svg>
            </div>
          </div>

          {}
          <div className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-gray-600 hover:text-[#00AEEF] transition-colors duration-200 font-medium text-sm lg:text-base"
              >
                {link.name}
              </a>
            ))}
            {}
            <div className="ml-4">
              <img
                className="h-10 w-10 rounded-full border-2 border-gray-200 object-cover"
                src="https://via.placeholder.com/40" 
                alt="User Profile"
              />
            </div>
          </div>

          {}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 text-center">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block px-3 py-4 text-gray-600 hover:bg-gray-50 hover:text-[#00AEEF] font-medium"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default GriftNavber;