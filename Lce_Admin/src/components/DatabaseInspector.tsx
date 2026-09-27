import React, { useEffect, useState } from 'react';
import { adminService, TableItem, TableDataResponse, ColumnMeta } from '../api/adminApi';
import { Database, Search, Plus, Edit, Trash2, AlertTriangle, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';

export const DatabaseInspector: React.FC = () => {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('lce_user_info');
  const [tableData, setTableData] = useState<TableDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals & Action States
  const [editRow, setEditRow] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteRow, setDeleteRow] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<{ message: string; suggestion?: string } | null>(null);
  const [message, setMessage] = useState('');

  // Form State for Create/Edit
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      setPage(1);
      fetchTableData(selectedTable, 1, search);
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    try {
      const list = await adminService.getTables();
      setTables(list);
      if (list.length > 0 && !selectedTable) {
        setSelectedTable(list[0].name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTableData = async (table: string, p = 1, q = search) => {
    setLoading(true);
    try {
      const res = await adminService.getTableData(table, p, q);
      setTableData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTableData(selectedTable, 1, search);
  };

  const handleOpenEdit = (row: any) => {
    setEditRow(row);
    setFormData({ ...row });
  };

  const handleOpenCreate = () => {
    setIsCreating(true);
    const initial: Record<string, any> = {};
    tableData?.columns.forEach((col) => {
      if (!col.is_primary) {
        initial[col.name] = col.default ?? '';
      }
    });
    setFormData(initial);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      if (isCreating) {
        await adminService.createRecord(selectedTable, formData);
        setMessage(`New record created in '${selectedTable}'.`);
      } else if (editRow) {
        const pkVal = editRow[tableData?.primary_key || 'id'];
        await adminService.updateRecord(selectedTable, pkVal, formData);
        setMessage(`Record ${pkVal} in '${selectedTable}' updated.`);
      }
      setEditRow(null);
      setIsCreating(false);
      fetchTableData(selectedTable, page, search);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDeleteRecord = async (force = false) => {
    if (!deleteRow || !tableData) return;
    const pkVal = deleteRow[tableData.primary_key || 'id'];
    setDeleteError(null);
    try {
      await adminService.deleteRecord(selectedTable, pkVal, force);
      setMessage(`Record ${pkVal} deleted from '${selectedTable}'.`);
      setDeleteRow(null);
      fetchTableData(selectedTable, page, search);
    } catch (err: any) {
      const errRes = err.response?.data;
      if (errRes && errRes.has_relations) {
        setDeleteError({
          message: errRes.error || 'Cannot delete record due to foreign key relationships.',
          suggestion: errRes.suggestion,
        });
      } else {
        alert(errRes?.error || 'Failed to delete record');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Table Selection */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Database className="w-6 h-6 text-indigo-400" />
            <span>Database Table Inspector & Relation Editor</span>
          </h2>
          <p className="text-slate-400 text-sm">Select any table in the database to inspect schema, edit fields, add rows, or force cascade delete.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              {tables.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.count} rows)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Record</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-900/40 border border-emerald-500/50 rounded-lg text-emerald-200 text-sm flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={`Search across columns in ${selectedTable}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">
          Filter
        </button>
      </form>

      {/* Data Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading table schema & data...</div>
      ) : !tableData || tableData.data.length === 0 ? (
        <div className="p-12 bg-slate-800/40 border border-slate-700/50 rounded-xl text-center text-slate-400">
          No records found in table `{selectedTable}`.
        </div>
      ) : (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-700">
                <tr>
                  <th className="px-3 py-3 text-center">Actions</th>
                  {tableData.columns.map((col) => (
                    <th key={col.name} className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <span className={col.is_primary ? 'text-amber-400 font-bold' : ''}>{col.name}</span>
                        <span className="text-[10px] text-slate-500 lowercase">({col.type})</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {tableData.data.map((row: any, idx: number) => {
                  const pkVal = row[tableData.primary_key || 'id'];
                  return (
                    <tr key={pkVal ?? idx} className="hover:bg-slate-700/40 transition">
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenEdit(row)}
                            className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded"
                            title="Edit Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setDeleteRow(row); setDeleteError(null); }}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {tableData.columns.map((col) => (
                        <td key={col.name} className="px-4 py-2.5 max-w-xs truncate font-mono text-slate-200">
                          {row[col.name] === null ? (
                            <span className="text-slate-500 italic">NULL</span>
                          ) : typeof row[col.name] === 'object' ? (
                            JSON.stringify(row[col.name])
                          ) : (
                            String(row[col.name])
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          <div className="p-4 bg-slate-900/60 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
            <span>Showing Page {tableData.page} of {tableData.last_page} ({tableData.total} Records)</span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => { setPage(page - 1); fetchTableData(selectedTable, page - 1, search); }}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded"
              >
                Previous
              </button>
              <button
                disabled={page >= tableData.last_page}
                onClick={() => { setPage(page + 1); fetchTableData(selectedTable, page + 1, search); }}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {(isCreating || editRow) && tableData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white">
              {isCreating ? `Create New Entry in '${selectedTable}'` : `Edit Record #${editRow[tableData.primary_key]} in '${selectedTable}'`}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tableData.columns.map((col) => {
                  const isPk = col.is_primary;
                  if (isCreating && isPk) return null; // Skip PK on insert if auto-increment

                  return (
                    <div key={col.name} className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-300">
                        {col.name} <span className="text-slate-500 font-normal">({col.type})</span>
                        {isPk && <span className="text-amber-400 ml-1">[PRIMARY KEY]</span>}
                      </label>
                      <input
                        type="text"
                        disabled={isPk}
                        value={formData[col.name] ?? ''}
                        onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setEditRow(null); }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm"
                >
                  {isCreating ? 'Insert Record' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRow && tableData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Delete Record #{deleteRow[tableData.primary_key]}?</h3>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to delete this row from <span className="font-mono text-indigo-300">{selectedTable}</span>?
            </p>

            {deleteError && (
              <div className="p-3 bg-red-900/40 border border-red-500/50 rounded text-xs text-red-200 space-y-2">
                <p className="font-semibold">{deleteError.message}</p>
                {deleteError.suggestion && (
                  <p className="text-red-300 italic">{deleteError.suggestion}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {!deleteError ? (
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setDeleteRow(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteRecord(false)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold"
                  >
                    Confirm Delete
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setDeleteRow(null)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteRecord(true)}
                    className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-bold flex items-center space-x-1"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Force Cascade Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
