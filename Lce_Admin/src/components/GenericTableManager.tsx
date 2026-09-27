import React, { useState, useEffect } from 'react';
import { adminService } from '../api/adminApi';
import { Search, Plus, Trash2, Edit, RefreshCw } from 'lucide-react';

interface GenericTableManagerProps {
  title: string;
  tableName: string;
}

export const GenericTableManager: React.FC<GenericTableManagerProps> = ({ title, tableName }) => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [primaryKey, setPrimaryKey] = useState<string>('id');
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTableData(tableName, 1, 50, search);
      setData(res.data || []);
      setColumns(res.columns || []);
      setPrimaryKey(res.primary_key || 'id');
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tableName]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <button
          onClick={fetchData}
          className="border border-slate-300 hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex space-x-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${title}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
            className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
          />
        </div>
        <button
          onClick={fetchData}
          className="bg-[#5C40E5] hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-sm transition"
        >
          Search
        </button>
      </div>

      {/* Table Display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading {title}...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No records found in {tableName}.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {columns.slice(0, 7).map((col) => (
                    <th key={col.name} className="py-3.5 px-4">{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {data.map((row, idx) => (
                  <tr key={row[primaryKey] || idx} className="hover:bg-slate-50/80 transition">
                    {columns.slice(0, 7).map((col) => (
                      <td key={col.name} className="py-3.5 px-4">
                        {row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
