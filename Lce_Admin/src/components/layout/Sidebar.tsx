import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Repeat, 
  Package, 
  ShoppingBag, 
  FileSpreadsheet, 
  DollarSign, 
  Tag, 
  MapPin, 
  CalendarOff, 
  BadgeDollarSign, 
  Database,
  Droplet,
  LogOut
} from 'lucide-react';

export type AdminTabType = 
  | 'dashboard'
  | 'users'
  | 'subscriptions'
  | 'plans'
  | 'orders'
  | 'invoices'
  | 'transactions'
  | 'promo-codes'
  | 'zones'
  | 'non-working-days'
  | 'pricing'
  | 'sql-tool';

interface SidebarProps {
  activeTab: AdminTabType;
  setActiveTab: (tab: AdminTabType) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems: { id: AdminTabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
    { id: 'plans', label: 'Plans', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'invoices', label: 'Invoices', icon: FileSpreadsheet },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'promo-codes', label: 'Promo Codes', icon: Tag },
    { id: 'zones', label: 'Zones', icon: MapPin },
    { id: 'non-working-days', label: 'Non-Working Days', icon: CalendarOff },
    { id: 'pricing', label: 'Pricing', icon: BadgeDollarSign },
    { id: 'sql-tool', label: 'SQL Tool', icon: Database },
  ];

  return (
    <aside className="w-64 bg-[#5C40E5] text-white min-h-screen flex flex-col shrink-0 shadow-xl transition-all duration-200">
      {/* Brand Header */}
      <div className="p-6 border-b border-indigo-400/30 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
          <Droplet className="w-6 h-6 text-white fill-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-wide leading-tight">LCE Admin</h1>
          <p className="text-xs text-indigo-200 font-medium">Laundry Care Express</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white text-[#5C40E5] font-semibold shadow-md shadow-indigo-900/20'
                  : 'text-indigo-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#5C40E5]' : 'text-indigo-200'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-indigo-400/30">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-indigo-200 hover:bg-red-500/20 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 text-indigo-200" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
