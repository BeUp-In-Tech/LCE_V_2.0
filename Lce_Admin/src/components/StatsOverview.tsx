import React, { useEffect, useState } from 'react';
import { adminService, SystemStats } from '../api/adminApi';
import { Users, ShoppingBag, CreditCard, DollarSign, Clock, RefreshCw } from 'lucide-react';

export const StatsOverview: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load system stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Overview & Metrics</h2>
          <p className="text-slate-400 text-sm">Real-time statistics across Laundry Care Express databases.</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/40 border border-red-500/50 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800/50 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Registered Users</p>
              <h3 className="text-2xl font-bold text-white">{stats?.total_users ?? 0}</h3>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Pickup Orders</p>
              <h3 className="text-2xl font-bold text-white">{stats?.total_pickups ?? 0}</h3>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scheduled Pickups</p>
              <h3 className="text-2xl font-bold text-white">{stats?.pending_pickups ?? 0}</h3>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Subscriptions</p>
              <h3 className="text-2xl font-bold text-white">{stats?.active_subscriptions ?? 0}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
