import React, { useEffect, useState } from 'react';
import { adminService, TableDataResponse } from '../api/adminApi';
import { Search, Shield, User, Edit, CheckCircle, XCircle } from 'lucide-react';

export const UsersManager: React.FC = () => {
  const [dataResponse, setDataResponse] = useState<TableDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [message, setMessage] = useState('');

  const fetchUsers = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await adminService.getTableData('lce_user_info', p, q);
      setDataResponse(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, search);
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  const handleToggleAdmin = async (userId: number, currentIsAdmin: number) => {
    const nextVal = currentIsAdmin === 1 ? 0 : 1;
    try {
      await adminService.updateRecord('lce_user_info', userId, { is_admin: nextVal });
      setMessage(`Updated Admin status for User #${userId}.`);
      fetchUsers(page, search);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await adminService.updateRecord('lce_user_info', editingUser.user_id, {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        email: editingUser.email,
        phone: editingUser.phone,
        is_admin: editingUser.is_admin ? 1 : 0
      });
      setMessage(`User #${editingUser.user_id} updated successfully.`);
      setEditingUser(null);
      fetchUsers(page, search);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Users & Customers Manager</h2>
          <p className="text-slate-400 text-sm">Manage user profiles, toggle Admin status (`is_admin`), and edit details.</p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search user ID, email, name..."
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
        <div className="p-8 text-center text-slate-400">Loading users data...</div>
      ) : !dataResponse || dataResponse.data.length === 0 ? (
        <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-xl text-center text-slate-400">
          No users found.
        </div>
      ) : (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Is Admin?</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {dataResponse.data.map((user: any) => (
                  <tr key={user.user_id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-semibold text-white">#{user.user_id}</td>
                    <td className="px-4 py-3 font-medium">{user.first_name} {user.last_name}</td>
                    <td className="px-4 py-3 text-indigo-400">{user.email}</td>
                    <td className="px-4 py-3">{user.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleAdmin(user.user_id, Number(user.is_admin))}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition ${
                          Number(user.is_admin) === 1
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20'
                            : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>{Number(user.is_admin) === 1 ? 'ADMIN (1)' : 'CUSTOMER (0)'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-xs inline-flex items-center space-x-1"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>Showing Page {dataResponse.page} of {dataResponse.last_page} ({dataResponse.total} Users)</span>
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

      {/* User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white">Edit User #{editingUser.user_id}</h3>
            <form onSubmit={handleSaveUser} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 mb-1">First Name</label>
                <input
                  type="text"
                  value={editingUser.first_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editingUser.last_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isAdminCheckbox"
                  checked={Boolean(Number(editingUser.is_admin))}
                  onChange={(e) => setEditingUser({ ...editingUser, is_admin: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                />
                <label htmlFor="isAdminCheckbox" className="text-white font-medium">Grant Admin Access (is_admin = 1)</label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
