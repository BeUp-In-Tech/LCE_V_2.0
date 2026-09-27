import React from 'react';
import { Shield, LogOut } from 'lucide-react';
import { adminService } from '../../api/adminApi';

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const userJson = localStorage.getItem('admin_user');
  const adminUser = userJson ? JSON.parse(userJson) : null;

  const handleLogoutClick = () => {
    adminService.logout();
    onLogout();
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="w-full px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">LCE Admin Dashboard</h1>
            <p className="text-xs text-slate-400">Standalone Management Portal</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">
              {adminUser?.first_name || 'Admin'} {adminUser?.last_name || ''}
            </p>
            <p className="text-[10px] text-indigo-400 font-mono">{adminUser?.email || 'admin@lce.com'}</p>
          </div>
          <button
            onClick={handleLogoutClick}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
