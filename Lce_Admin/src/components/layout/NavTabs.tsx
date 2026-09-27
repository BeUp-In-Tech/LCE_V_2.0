import React from 'react';
import { LayoutDashboard, ShoppingBag, Users, Database } from 'lucide-react';

export type TabType = 'overview' | 'pickups' | 'users' | 'database';

interface NavTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const NavTabs: React.FC<NavTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="bg-slate-900/60 border-b border-slate-800/80">
      <div className="w-full px-6 lg:px-8 flex space-x-2 overflow-x-auto py-2">
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
  );
};
