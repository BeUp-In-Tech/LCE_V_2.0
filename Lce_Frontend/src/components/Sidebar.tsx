import { useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import LogoutModal from './shared/modal/LogoutModal';
import logoImage from '../assets/authpage/logo.png';
import scheduleIcon from '../assets/svg/scheduleIcon.svg';
import preferencIcon from '../assets/svg/preference.svg';
import paymentIcon from '../assets/svg/payment-method.svg';
import billingIcon from '../assets/svg/invoice-03.svg';
import usersIcon from '../assets/svg/user-group.svg';
import giftIcon from '../assets/svg/giftIcon.svg';
import settingIcon from '../assets/svg/settingIcon.svg';
import couponIcon from '../assets/svg/cupon.svg';
import { useAuth } from '../context/useAuth';

type SideberProps = {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const Sidebar = ({ isOpen, setIsOpen }: SideberProps) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleLogout = () => {
        setIsLogoutModalOpen(true);
    };

    const confirmLogout = async () => {
        try {
            await logout();
            navigate("/signin");
        } catch (error) {
            console.error('Logout failed:', error);
            navigate("/signin");
        }
    };

    
    const firstName = user?.first_name || 'User';

    return (
        <>
            <div
                className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2F1E54] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} border-r border-gray-300 flex flex-col`}>
                <div className="flex flex-col h-full py-3 pl-2">
                    <div className="flex items-center justify-between pl-3">
                        <div className='max-w-35 mb-2'>
                            <Link to="/">
                                <img 
                                    className='w-full' 
                                    src={logoImage} 
                                    alt="Laundry Care Express Logo" 
                                    width="140"
                                    height="60"
                                />
                            </Link>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="lg:hidden p-2 text-slate-400 hover:text-white"
                            aria-label="Close sidebar"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div>
                        <h1 className='text-2xl text-[#FFFFFF] font-semibold pl-5'>Hi {firstName},</h1>
                    </div>
                    <nav className="flex-1">
                        <ul className='space-y-2 pr-5 mt-4 pl-2'>
                            <NavLink to='dashboardHome' className={({ isActive }) => `flex items-center gap-1 w-full py-3 transition-all duration-200 text-base text-white ${isActive ? 'bg-[#3D286D] py-2 pl-5 rounded-md' : 'pl-5'}`}>
                                <img src={scheduleIcon} alt="scheduleIcon" />
                                <span>Schedule a Pickup</span>
                            </NavLink>
                            <NavLink to='preference' className={({ isActive }) => `flex items-center gap-1 w-full py-3 transition-all duration-200 text-base text-white ${isActive ? 'bg-[#3D286D] py-2 pl-5 rounded-md' : 'pl-5'}`}>
                                <img src={preferencIcon} alt="preferencIcon" />
                                <span>Preferences</span>
                            </NavLink>
                            <NavLink to='setting' className={({ isActive }) => `flex items-center gap-1 w-full py-3 transition-all duration-200 text-base text-white ${isActive ? 'bg-[#3D286D] py-2 pl-5 rounded-md' : 'pl-5'}`}>
                                <img src={settingIcon} alt="settingIcon" />
                                <span>Account Information</span>
                            </NavLink>
                            <NavLink to='payment' className={({ isActive }) => `flex items-center gap-1 w-full py-3 transition-all duration-200 text-base text-white ${isActive ? 'bg-[#3D286D] py-2 pl-5 rounded-md' : 'pl-5'}`}>
                                <img src={paymentIcon} alt="paymentIcon" />
                                <span>Payment Method</span>
                            </NavLink>
                            <NavLink to='billing' className={({ isActive }) => `flex items-center gap-1 w-full py-3 transition-all duration-200 text-base text-white ${isActive ? 'bg-[#3D286D] py-2 pl-5 rounded-md' : 'pl-5'}`}>
                                <img src={billingIcon} alt="billingIcon" />
                                <span>Billing History</span>
                            </NavLink>
                            <NavLink to='subscriptions' className={({ isActive }) => `flex items-center gap-1 w-full py-3 transition-all duration-200 text-base text-white ${isActive ? 'bg-[#3D286D] py-2 pl-5 rounded-md' : 'pl-5'}`}>
                                <img src={usersIcon} alt="subscriptionsIcon" />
                                <span>Subscriptions</span>
                            </NavLink>
                            <NavLink to='coupon' className={({ isActive }) => `flex items-center gap-1 w-full py-3 transition-all duration-200 text-base text-white ${isActive ? 'bg-[#3D286D] py-2 pl-5 rounded-md' : 'pl-5'}`}>
                                <img src={couponIcon} className='' alt="coupon" />
                                <span>Promotion Code</span>
                            </NavLink>
                            <NavLink to='redeem-gift' className={({ isActive }) => `flex items-center gap-1 w-full py-3 transition-all duration-200 text-base text-white ${isActive ? 'bg-[#3D286D] py-2 pl-5 rounded-md' : 'pl-5'}`}>
                                <img src={giftIcon} alt="giftIcon" />
                                <span>Laundry Care Express Gift Cards</span>
                            </NavLink>
                        </ul>
                    </nav>

                    {}
                    <button onClick={handleLogout} className=" mt-auto py-4 pl-5 flex items-center gap-1 cursor-pointer">
                        <LogOut size={18} className="text-white hover:text-red-400 cursor-pointer transition-colors" />
                        <span className='text-white hover:text-red-400 cursor-pointer transition-colors'>LogOut</span>
                    </button>
                </div>
            </aside>
            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={confirmLogout}
            />
        </>
    );
};

export default Sidebar;
