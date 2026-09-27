import React, { useEffect, useState } from 'react';
import { adminService, TableDataResponse } from '../api/adminApi';
import { RefreshCw, Search, Edit2, CheckCircle, AlertCircle } from 'lucide-react';

export const PickupsManager: React.FC = () => {
  const [dataResponse, setDataResponse] = useState<TableDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const fetchPickups = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await adminService.getTableData('lce_user_pickup', p, 25, q);
      setDataResponse(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups(page, search);
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPickups(1, search);
  };

  const handleStatusChange = async (pickupId: number, newStatus: string) => {
    setUpdatingId(pickupId);
    setMessage('');
    try {
      await adminService.updatePickupStatus(pickupId, newStatus);
      setMessage(`Pickup #${pickupId} updated to ${newStatus}`);
      fetchPickups(page, search);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update pickup status');
    } finally {
      setUpdatingId(null);
    }
  };

  const statuses = ['Scheduled', 'Driver En Route', 'Picked Up', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Pickups & Orders Manager</h2>
          <p className="text-slate-400 text-sm">View order details and update pickup status in real-time.</p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search pickup ID, user ID, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition">
            Search
          </button>
        </form>
      </div>

      {message && (
        <div className="p-3 bg-emerald-900/40 border border-emerald-500/50 rounded-lg text-emerald-200 text-sm flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading pickups table data...</div>
      ) : !dataResponse || dataResponse.data.length === 0 ? (
        <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-xl text-center text-slate-400">
          No pickup orders found.
        </div>
      ) : (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-4 py-3">Pickup ID</th>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Pickup Date</th>
                  <th className="px-4 py-3">Delivery Date</th>
                  <th className="px-4 py-3">Bag Count</th>
                  <th className="px-4 py-3">Weight (lbs)</th>
                  <th className="px-4 py-3">Current Status</th>
                  <th className="px-4 py-3 text-right">Quick Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {dataResponse.data.map((row: any) => (
                  <tr key={row.pickup_id || row.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-semibold text-white">#{row.pickup_id || row.id}</td>
                    <td className="px-4 py-3 text-indigo-400">User #{row.user_id}</td>
                    <td className="px-4 py-3">{row.pickup_date || '-'}</td>
                    <td className="px-4 py-3">{row.delivery_date || '-'}</td>
                    <td className="px-4 py-3">{row.bag_count ?? 0}</td>
                    <td className="px-4 py-3">{row.weight ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                        row.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        row.status === 'Cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {row.status || 'Scheduled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={row.status || 'Scheduled'}
                        disabled={updatingId === (row.pickup_id || row.id)}
                        onChange={(e) => handleStatusChange(row.pickup_id || row.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>Showing Page {dataResponse.page} of {dataResponse.last_page} ({dataResponse.total} Total Pickups)</span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded"
              >
                Previous
              </button>
              <button
                disabled={page >= dataResponse.last_page}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
