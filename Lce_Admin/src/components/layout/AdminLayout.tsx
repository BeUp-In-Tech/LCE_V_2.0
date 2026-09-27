import React from 'react';
import { Sidebar, AdminTabType } from './Sidebar';
import { User, Bell, LogOut } from 'lucide-react';

interface AdminLayoutProps {
  activeTab: AdminTabType;
  setActiveTab: (tab: AdminTabType) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  children,
}) => {
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
  const userName = adminUser.first_name && adminUser.last_name 
    ? `${adminUser.first_name} ${adminUser.last_name}` 
    : 'Juan Pablo Mejia';

  return (
    <div className="min-h-screen bg-slate-50 flex w-full font-sans antialiased text-slate-800">
      {/* Purple Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Juan Pablo Mejia</h2>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
              <Bell className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#5C40E5] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                JP
              </div>
              <span className="text-xs font-semibold text-slate-700">{userName}</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Body */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
