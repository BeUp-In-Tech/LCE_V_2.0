import React, { useState } from 'react';
import { adminService } from '../api/adminApi';
import { StatsOverview } from '../components/StatsOverview';
import { PickupsManager } from '../components/PickupsManager';
import { UsersManager } from '../components/UsersManager';
import { DatabaseInspector } from '../components/DatabaseInspector';
import { LayoutDashboard, ShoppingBag, Users, Database, LogOut, Shield } from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pickups' | 'users' | 'database'>('overview');
  const userJson = localStorage.getItem('admin_user');
  const adminUser = userJson ? JSON.parse(userJson) : null;

  const handleLogoutClick = () => {
    adminService.logout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
              <p className="text-xs font-semibold text-white">{adminUser?.first_name || 'Admin'} {adminUser?.last_name || ''}</p>
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

      {/* Navigation Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('pickups')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'pickups'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Pickups & Orders</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users Manager</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === 'database'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Inspector (All Tables)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <StatsOverview />}
        {activeTab === 'pickups' && <PickupsManager />}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'database' && <DatabaseInspector />}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Laundry Care Express — Subdomain Admin Panel • All DB Table Relations & Cascade Actions Enabled
      </footer>
    </div>
  );
};
