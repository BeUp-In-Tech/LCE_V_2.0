import React, { useState, useEffect } from 'react';
import { adminService } from '../api/adminApi';
import {
  Search,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  X,
  Calendar,
  Tag
} from 'lucide-react';

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

  // Determine singular label
  const singularLabel = title === 'Invoices'
    ? 'Invoice'
    : title.endsWith('Codes')
    ? 'Promo Code'
    : title.endsWith('ies')
    ? title.slice(0, -3) + 'y'
    : title.endsWith('es') && !title.endsWith('Prices')
    ? title.slice(0, -2)
    : title.endsWith('s')
    ? title.slice(0, -1)
    : title;

  // Pagination & Sorting State
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);
  const [lastPage, setLastPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string | null>(
    tableName.includes('nonworking') || tableName.includes('non_working') ? 'date' : null
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [deleteRow, setDeleteRow] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getSubtitle = () => {
    if (tableName.includes('promo')) {
      return 'Create, configure, and manage promotional discount codes and coupons.';
    }
    if (tableName.includes('nonworking') || tableName.includes('non_working')) {
      return 'Manage, schedule, and view system closures and calendar exceptions.';
    }
    if (tableName.includes('subscription')) {
      return `Manage customer ${title.toLowerCase()} and renewal records.`;
    }
    if (tableName.includes('invoice')) {
      return 'View, search, and manage customer billing invoices.';
    }
    return `Browse, filter, and manage records in ${tableName}.`;
  };

  const fetchData = async (
    targetPage = page,
    targetSearch = search,
    targetSortCol = sortColumn,
    targetSortDir = sortDirection,
    targetPerPage = perPage
  ) => {
    setLoading(true);
    try {
      const res = await adminService.getTableData(
        tableName,
        targetPage,
        targetPerPage,
        targetSearch,
        targetSortCol || '',
        targetSortDir
      );

      let fetchedColumns = res.columns || [];
      if (tableName === 'lce_user_invoice') {
        const priority = [
          'number',
          'cdate',
          'user_id',
          'order_type',
          'total',
          'status',
          'subscription_id',
          'is_subscription_invoice',
          'sub_total',
          'pickup_charge',
          'id'
        ];
        fetchedColumns = [...fetchedColumns].sort((a, b) => {
          const idxA = priority.indexOf(a.name);
          const idxB = priority.indexOf(b.name);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });
      }

      setData(res.data || []);
      setColumns(fetchedColumns);
      setPrimaryKey(res.primary_key || 'id');
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setLastPage(res.last_page || 1);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialSort = tableName.includes('nonworking') || tableName.includes('non_working') ? 'date' : null;
    setSortColumn(initialSort);
    setSortDirection('desc');
    setPage(1);
    setSearch('');
    fetchData(1, '', initialSort, 'desc', perPage);
  }, [tableName]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleSort = (columnName: string) => {
    let nextDir: 'asc' | 'desc' = 'asc';
    if (sortColumn === columnName) {
      nextDir = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    setSortColumn(columnName);
    setSortDirection(nextDir);
    setPage(1);
    fetchData(1, search, columnName, nextDir, perPage);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchData(1, search, sortColumn, sortDirection, perPage);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    fetchData(1, '', sortColumn, sortDirection, perPage);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
    fetchData(1, search, sortColumn, sortDirection, newPerPage);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    const initial: Record<string, any> = {};
    columns.forEach((col) => {
      if (!col.is_primary) {
        initial[col.name] = col.default ?? '';
      }
    });

    if (tableName.includes('nonworking') || tableName.includes('non_working')) {
      initial['date'] = new Date().toISOString().split('T')[0];
      initial['area'] = '';
    } else if (tableName.includes('promo')) {
      initial['promocode'] = '';
      initial['promocode_type'] = 'percentage';
      initial['promocode_value'] = 15;
      initial['publish'] = 1;
      initial['promocode_time_period'] = 'single_order';
      initial['time_period_value'] = '1';
      initial['promo_expiry_date'] = '2030-12-31';
      initial['promocode_for'] = 'new_customers';
      initial['promocode_description'] = '';
    } else if (tableName.includes('transaction')) {
      initial['type'] = 'pickup_charge';
      initial['amount'] = 0.0;
      initial['name'] = 'Pickup Payment';
      initial['group_admin_id'] = 0;
      initial['cdate'] = new Date().toISOString().replace('T', ' ').slice(0, 19);
      initial['mdate'] = new Date().toISOString().replace('T', ' ').slice(0, 19);
    }

    setFormData(initial);
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (row: any) => {
    setEditRow(row);
    setFormData({ ...row });
  };

  // Save (Create or Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isCreateOpen) {
        await adminService.createRecord(tableName, formData);
        showNotification('success', `New ${singularLabel.toLowerCase()} added successfully.`);
      } else if (editRow) {
        const pkVal = editRow[primaryKey];
        await adminService.updateRecord(tableName, pkVal, formData);
        showNotification('success', `${singularLabel} #${pkVal} updated successfully.`);
      }
      setIsCreateOpen(false);
      setEditRow(null);
      fetchData(page, search, sortColumn, sortDirection, perPage);
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Failed to save record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Record
  const handleDelete = async () => {
    if (!deleteRow) return;
    const pkVal = deleteRow[primaryKey];
    setSubmitting(true);
    try {
      await adminService.deleteRecord(tableName, pkVal);
      showNotification('success', `${singularLabel} #${pkVal} deleted successfully.`);
      setDeleteRow(null);
      fetchData(page, search, sortColumn, sortDirection, perPage);
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Failed to delete record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
            <span>{title}</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {total} {total === 1 ? 'record' : 'records'}
            </span>
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">{getSubtitle()}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchData()}
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
            title="Refresh Table Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="bg-[#5C40E5] hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add {singularLabel}</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${title}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-300 rounded-xl pl-10 pr-9 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-[#5C40E5] hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-sm transition"
          >
            Search
          </button>
        </form>

        {/* Rows per page selector */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 self-end sm:self-auto">
          <span>Show:</span>
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table Display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading {title.toLowerCase()}...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">No records found.</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria or add a new entry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {columns.map((col) => (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                      title={`Click to sort by ${col.name}`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className={col.is_primary ? 'text-indigo-600 font-bold' : ''}>{col.name}</span>
                        {sortColumn === col.name ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 hover:opacity-100 flex-shrink-0" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-center w-28 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {data.map((row, idx) => {
                  const pkVal = row[primaryKey] || idx;
                  return (
                    <tr key={pkVal} className="hover:bg-slate-50/80 transition">
                      {columns.map((col) => {
                        const val = row[col.name];

                        // --- Special Formatting for Promo Codes ---
                        if (col.name === 'promocode') {
                          return (
                            <td key={col.name} className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center space-x-1 font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Tag className="w-3 h-3 text-indigo-500" />
                                <span>{val}</span>
                              </span>
                            </td>
                          );
                        }

                        if (col.name === 'publish') {
                          const isPub = Number(val) === 1;
                          return (
                            <td key={col.name} className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  isPub
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {isPub ? 'Active' : 'Draft'}
                              </span>
                            </td>
                          );
                        }

                        if (col.name === 'promocode_value') {
                          const type = row['promocode_type'];
                          const displayVal =
                            type === 'percentage'
                              ? `${val}% OFF`
                              : `$${Number(val).toFixed(2)} OFF`;
                          return (
                            <td key={col.name} className="py-3.5 px-4 font-bold text-xs text-emerald-700 whitespace-nowrap">
                              {displayVal}
                            </td>
                          );
                        }

                        if (col.name === 'promocode_type') {
                          return (
                            <td key={col.name} className="py-3.5 px-4 text-xs font-medium capitalize text-slate-600 whitespace-nowrap">
                              {val}
                            </td>
                          );
                        }

                        if (col.name === 'promocode_for') {
                          const isNew = String(val).toLowerCase().includes('new');
                          const isExisting = String(val).toLowerCase().includes('exist');
                          return (
                            <td key={col.name} className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  isNew
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : isExisting
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {isNew ? 'New Customers' : isExisting ? 'Existing Customers' : val || 'All'}
                              </span>
                            </td>
                          );
                        }

                        if (col.name === 'promo_expiry_date') {
                          const isExpired = val && new Date(val).getTime() < new Date().setHours(0, 0, 0, 0);
                          return (
                            <td key={col.name} className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                              <span className={`inline-flex items-center space-x-1.5 ${isExpired ? 'text-rose-600 line-through' : 'text-slate-700'}`}>
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{val || '-'}</span>
                              </span>
                              {isExpired && <span className="ml-1 text-[10px] text-rose-500 font-semibold">(Expired)</span>}
                            </td>
                          );
                        }

                        if (col.name === 'promocode_description') {
                          return (
                            <td key={col.name} className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate" title={val}>
                              {val || '-'}
                            </td>
                          );
                        }

                        // --- Special Formatting for Non-Working Days ---
                        if (col.name === 'area') {
                          return (
                            <td key={col.name} className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                              {!val || String(val).trim() === '' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  All Areas
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {val}
                                </span>
                              )}
                            </td>
                          );
                        }

                        if (col.name === 'date') {
                          return (
                            <td key={col.name} className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                              <span className="inline-flex items-center space-x-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{val}</span>
                              </span>
                            </td>
                          );
                        }

                        // --- Special Formatting for Invoices ---
                        if (tableName === 'lce_user_invoice' && col.name === 'status') {
                          const s = String(val || '').toLowerCase();
                          const isPaid = s === 'paid';
                          const isPending = s === 'pending';
                          return (
                            <td key={col.name} className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isPending
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {val || 'Unknown'}
                              </span>
                            </td>
                          );
                        }

                        if (tableName === 'lce_user_invoice' && col.name === 'order_type') {
                          const isSub = String(val || '').toLowerCase() === 'subscription';
                          return (
                            <td key={col.name} className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  isSub
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {isSub ? 'Subscription' : 'Pay As You Go'}
                              </span>
                            </td>
                          );
                        }

                        if (
                          tableName === 'lce_user_invoice' &&
                          (col.name === 'total' || col.name === 'sub_total' || col.name === 'pickup_charge')
                        ) {
                          const num = Number(val || 0);
                          return (
                            <td
                              key={col.name}
                              className={`py-3.5 px-4 whitespace-nowrap font-mono ${
                                col.name === 'total' ? 'font-bold text-slate-900 text-sm' : 'text-xs text-slate-600'
                              }`}
                            >
                              ${num.toFixed(2)}
                            </td>
                          );
                        }

                        if (tableName === 'lce_user_invoice' && col.name === 'number') {
                          return (
                            <td key={col.name} className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-xs text-indigo-700">
                              #{val}
                            </td>
                          );
                        }

                        if (col.name === 'cdate') {
                          return (
                            <td key={col.name} className="py-3.5 px-4 font-mono text-xs whitespace-nowrap text-slate-700">
                              <span className="inline-flex items-center space-x-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{val ? String(val).slice(0, 16) : '-'}</span>
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={col.name} className="py-3.5 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                            {val !== null && val !== undefined ? String(val) : '-'}
                          </td>
                        );
                      })}

                      {/* Row Action Buttons */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenEdit(row)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit Record"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteRow(row)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {data.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * perPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">{Math.min(page * perPage, total)}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span> Records (Page {page} of {lastPage})
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1);
                  fetchData(page - 1, search, sortColumn, sortDirection, perPage);
                }}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-lg font-medium shadow-sm transition"
              >
                Previous
              </button>
              <button
                disabled={page >= lastPage}
                onClick={() => {
                  setPage(page + 1);
                  fetchData(page + 1, search, sortColumn, sortDirection, perPage);
                }}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-lg font-medium shadow-sm transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(isCreateOpen || editRow) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {isCreateOpen ? `Add ${singularLabel}` : `Edit ${singularLabel} #${editRow[primaryKey]}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditRow(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-3">
                {columns.map((col) => {
                  const isPk = col.is_primary;
                  if (isCreateOpen && isPk) return null;

                  return (
                    <div key={col.name} className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        {col.name.replace(/_/g, ' ')} {isPk && <span className="text-amber-500 ml-1">(Primary Key)</span>}
                      </label>

                      {/* Promocode specific form fields */}
                      {col.name === 'promocode_type' ? (
                        <select
                          value={formData[col.name] ?? 'percentage'}
                          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="amount">Fixed Amount ($)</option>
                        </select>
                      ) : tableName.includes('transaction') && col.name === 'type' ? (
                        <select
                          value={formData[col.name] ?? 'pickup_charge'}
                          onChange={(e) => {
                            const newType = e.target.value;
                            const defaultName =
                              newType === 'subscription'
                                ? 'Subscription Payment'
                                : newType === 'credit'
                                ? 'Credit Payment'
                                : newType === 'refund'
                                ? 'Refund Payment'
                                : 'Pickup Payment';
                            setFormData({
                              ...formData,
                              type: newType,
                              name: formData['name'] && !formData['name'].includes('Payment') ? formData['name'] : defaultName
                            });
                          }}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="pickup_charge">Pickup Charge (pickup_charge)</option>
                          <option value="subscription">Subscription (subscription)</option>
                          <option value="credit">Store Credit (credit)</option>
                          <option value="refund">Refund (refund)</option>
                        </select>
                      ) : tableName === 'lce_user_invoice' && col.name === 'status' ? (
                        <select
                          value={formData[col.name] ?? 'Paid'}
                          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="Paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : tableName === 'lce_user_invoice' && col.name === 'order_type' ? (
                        <select
                          value={formData[col.name] ?? 'subscription'}
                          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="subscription">Subscription</option>
                          <option value="PPO">Pay As You Go (PPO)</option>
                        </select>
                      ) : col.name === 'publish' ? (
                        <select
                          value={formData[col.name] ?? 1}
                          onChange={(e) => setFormData({ ...formData, [col.name]: Number(e.target.value) })}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value={1}>Active / Published</option>
                          <option value={0}>Draft / Inactive</option>
                        </select>
                      ) : col.name === 'promocode_for' ? (
                        <select
                          value={formData[col.name] ?? 'new_customers'}
                          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="new_customers">New Customers Only</option>
                          <option value="existing_customers">Existing Customers Only</option>
                          <option value="all">All Customers</option>
                        </select>
                      ) : col.name === 'promocode_description' ? (
                        <textarea
                          rows={3}
                          placeholder="Optional internal notes or description about this promo code..."
                          value={formData[col.name] ?? ''}
                          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : col.name === 'date' || col.name === 'promo_expiry_date' || col.name === 'created_date' ? (
                        <input
                          type="date"
                          required={col.name !== 'created_date'}
                          value={formData[col.name] ?? ''}
                          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                      ) : (
                        <input
                          type={col.name === 'promocode_value' || col.name === 'amount' ? 'number' : 'text'}
                          step={col.name === 'promocode_value' || col.name === 'amount' ? '0.01' : undefined}
                          disabled={isPk}
                          placeholder={
                            col.name === 'area'
                              ? 'Leave blank for All Areas, or enter area code (e.g. SCZ, SBY)'
                              : col.name === 'promocode'
                              ? 'e.g. SUMMER25, FIRST15'
                              : col.name === 'promocode_value' || col.name === 'amount'
                              ? '0.00'
                              : ''
                          }
                          value={formData[col.name] ?? ''}
                          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:opacity-60 font-mono"
                        />
                      )}

                      {col.name === 'area' && (
                        <p className="text-[11px] text-slate-400">
                          Leave empty to mark as a system-wide closure for all areas.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditRow(null);
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#5C40E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isCreateOpen ? `Add ${singularLabel}` : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Delete {singularLabel}?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-slate-900">
                "{deleteRow.promocode || deleteRow.name || deleteRow[primaryKey]}"
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
