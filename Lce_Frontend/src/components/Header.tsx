import { Menu } from 'lucide-react';
import profilePic from '../assets/authpage/king-jong.jpg'
type HeaderProps = {
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const Header = ({ setSidebarOpen }: HeaderProps) => {
    return (
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 py-2 bg-white/80 backdrop-blur-md">
            <div className="flex items-center gap-4 flex-1">
                {}
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    aria-label="Open sidebar"
                >
                    <Menu size={20} />
                </button>

                <div className="relative w-full max-w-md hidden sm:block">
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <img 
                    className='w-10 h-10 rounded-full object-fill' 
                    src={profilePic} 
                    alt="User Profile" 
                    width="40"
                    height="40"
                />
            </div>
        </header>
    );
};

export default Header;
