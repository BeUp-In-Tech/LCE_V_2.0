import React, { useEffect, useState, useMemo } from 'react';
import { adminService, TableDataResponse } from '../api/adminApi';
import {
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  Calendar,
  Package,
  Clock,
  Truck,
  FileText,
  User,
  Scale
} from 'lucide-react';

interface PickupRow {
  id: number;
  pickup_id?: number;
  user_id: number;
  pickup_type: string;
  pickup_date: string;
  status: string;
  order_type: string;
  pickup_time?: string | null;
  delivery_time?: string | null;
  cancelled_time?: string | null;
  wf_items?: number | null;
  wf_bags_items?: number | null;
  wf_hanger_items?: number | null;
  wf_weight?: number | null;
  wf_site_id?: number | null;
  wf_slip_number?: string | null;
  wf_washer_cost?: number | null;
  wf_dryer_cost?: number | null;
  dc_items?: number | null;
  dc_bags_items?: number | null;
  dc_hanger_items?: number | null;
  dc_site_id?: number | null;
  dc_slip_number?: string | null;
  invoice_id?: number | null;
  customerPaymentTransId?: string | null;
  customerPaymentTransAmount?: number | null;
  pickup_driver_id?: number;
  deliver_driver_id?: number;
  log?: string | null;
  cdate?: string | null;
  [key: string]: any;
}

export const PickupsManager: React.FC = () => {
  const [dataResponse, setDataResponse] = useState<TableDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<PickupRow | null>(null);

  const fetchPickups = async (
    targetPage = page,
    targetSearch = search,
    targetSortCol = sortColumn,
    targetSortDir = sortDirection,
    targetPerPage = perPage
  ) => {
    setLoading(true);
    try {
      const res = await adminService.getTableData(
        'lce_user_pickup',
        targetPage,
        targetPerPage,
        targetSearch,
        targetSortCol,
        targetSortDir
      );
      setDataResponse(res);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to load pickup orders data.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups(page, search, sortColumn, sortDirection, perPage);
  }, [page, perPage, sortColumn, sortDirection]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPickups(1, search, sortColumn, sortDirection, perPage);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    fetchPickups(1, '', sortColumn, sortDirection, perPage);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const handleStatusChange = async (pickupId: number, newStatus: string) => {
    setUpdatingId(pickupId);
    setNotification(null);
    try {
      await adminService.updatePickupStatus(pickupId, newStatus);
      setNotification({
        type: 'success',
        message: `Pickup #${pickupId} status successfully updated to "${newStatus.toUpperCase()}".`
      });
      fetchPickups(page, search, sortColumn, sortDirection, perPage);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update pickup status.'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter rows locally if status filter selected
  const displayedRows: PickupRow[] = useMemo(() => {
    if (!dataResponse?.data) return [];
    if (!statusFilter) return dataResponse.data;
    return dataResponse.data.filter((row: any) =>
      row.status?.toLowerCase() === statusFilter.toLowerCase()
    );
  }, [dataResponse, statusFilter]);

  const getStatusBadge = (status?: string) => {
    const s = status?.toLowerCase() || 'pickup';
    if (s === 'delivered') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Delivered
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          Completed
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Pickup Scheduled
      </span>
    );
  };

  const getPickupTypeLabel = (type?: string) => {
    if (type === 'wf') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
          Wash & Fold
        </span>
      );
    }
    if (type === 'hd_dc') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100">
          Dry Cleaning
        </span>
      );
    }
    return <span className="text-xs text-slate-600 font-mono">{type || '-'}</span>;
  };

  const calculateBagCount = (row: PickupRow) => {
    const total = (Number(row.wf_bags_items) || 0) + (Number(row.dc_bags_items) || 0);
    if (total > 0) return total;
    if (row.wf_items) return Number(row.wf_items);
    return 0;
  };

  const calculateWeight = (row: PickupRow) => {
    if (row.wf_weight !== null && row.wf_weight !== undefined && row.wf_weight > 0) {
      return `${row.wf_weight} lbs`;
    }
    if (row.weight && Number(row.weight) > 0) {
      return `${row.weight} lbs`;
    }
    return '-';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-slate-900">Pickups & Orders Manager</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
              lce_user_pickup
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            View order details, delivery schedules, processing metrics, and manage pickup statuses in real-time.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchPickups()}
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
            title="Refresh Table Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search pickup ID, user ID, status, order type, date..."
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

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="pickup">Scheduled</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Rows Per Page */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <span>Show:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading pickup orders...</p>
          </div>
        ) : displayedRows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">No pickup orders found.</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {/* Pickup ID */}
                  <th
                    onClick={() => handleSort('id')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                    title="Click to sort by Pickup ID"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="text-indigo-600 font-bold">PICKUP ID</span>
                      {sortColumn === 'id' ? (
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

                  {/* User ID */}
                  <th
                    onClick={() => handleSort('user_id')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                    title="Click to sort by User ID"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>USER ID</span>
                      {sortColumn === 'user_id' ? (
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

                  {/* Type */}
                  <th className="py-3.5 px-4 whitespace-nowrap">TYPE</th>

                  {/* Pickup Date */}
                  <th
                    onClick={() => handleSort('pickup_date')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                    title="Click to sort by Pickup Date"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>PICKUP DATE</span>
                      {sortColumn === 'pickup_date' ? (
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

                  {/* Delivery Date */}
                  <th
                    onClick={() => handleSort('delivery_time')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                    title="Click to sort by Delivery Date"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>DELIVERY DATE</span>
                      {sortColumn === 'delivery_time' ? (
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

                  {/* Bag Count */}
                  <th className="py-3.5 px-4 whitespace-nowrap">BAG COUNT</th>

                  {/* Weight */}
                  <th className="py-3.5 px-4 whitespace-nowrap">WEIGHT</th>

                  {/* Current Status */}
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                    title="Click to sort by Status"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>CURRENT STATUS</span>
                      {sortColumn === 'status' ? (
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

                  {/* Quick Status Action */}
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">QUICK STATUS ACTION</th>

                  {/* Details Action */}
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">DETAILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {displayedRows.map((row) => {
                  const pickupId = Number(row.id || row.pickup_id || 0);
                  const bagCount = calculateBagCount(row);
                  const weightText = calculateWeight(row);
                  const currentStatus = row.status?.toLowerCase() || 'pickup';
                  const deliveryDateText = row.delivery_time
                    ? String(row.delivery_time).slice(0, 10)
                    : (row.delivery_date || '-');

                  return (
                    <tr key={pickupId} className="hover:bg-slate-50/80 transition">
                      {/* Pickup ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-xs text-slate-900">
                        #{pickupId}
                      </td>

                      {/* User ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-xs text-indigo-600">
                          User #{row.user_id}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getPickupTypeLabel(row.pickup_type)}
                      </td>

                      {/* Pickup Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        <span className="inline-flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{row.pickup_date || '-'}</span>
                        </span>
                      </td>

                      {/* Delivery Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        <span className="inline-flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{deliveryDateText}</span>
                        </span>
                      </td>

                      {/* Bag Count */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        <span className="inline-flex items-center space-x-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>{bagCount}</span>
                        </span>
                      </td>

                      {/* Weight */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        <span className="inline-flex items-center space-x-1">
                          <Scale className="w-3.5 h-3.5 text-slate-400" />
                          <span>{weightText}</span>
                        </span>
                      </td>

                      {/* Current Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(row.status)}
                      </td>

                      {/* Quick Status Action Dropdown */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5">
                          <select
                            value={currentStatus}
                            disabled={updatingId === pickupId}
                            onChange={(e) => handleStatusChange(pickupId, e.target.value)}
                            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium transition cursor-pointer disabled:opacity-50"
                          >
                            <option value="pickup">Scheduled</option>
                            <option value="delivered">Delivered</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          {updatingId === pickupId && (
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                          )}
                        </div>
                      </td>

                      {/* View Details Modal Trigger */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedPickup(row)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {dataResponse && dataResponse.total > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * perPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(page * perPage, dataResponse.total)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{dataResponse.total}</span> Orders (Page {page} of{' '}
              {dataResponse.last_page})
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-lg font-medium shadow-sm transition"
              >
                Previous
              </button>
              <button
                disabled={page >= dataResponse.last_page}
                onClick={() => setPage((prev) => prev + 1)}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-lg font-medium shadow-sm transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedPickup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Pickup Order #{selectedPickup.id || selectedPickup.pickup_id}
                  </h3>
                  {getStatusBadge(selectedPickup.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Created on {selectedPickup.cdate || 'N/A'} • Order Type: {selectedPickup.order_type || 'PPO'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPickup(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Customer & General */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Customer & Booking</span>
                </div>
                <div className="space-y-1 font-mono text-slate-600">
                  <p><span className="text-slate-400">Customer ID:</span> #{selectedPickup.user_id}</p>
                  <p><span className="text-slate-400">Pickup Type:</span> {selectedPickup.pickup_type === 'wf' ? 'Wash & Fold' : selectedPickup.pickup_type === 'hd_dc' ? 'Dry Cleaning' : selectedPickup.pickup_type}</p>
                  <p><span className="text-slate-400">Order Category:</span> {selectedPickup.order_type}</p>
                  <p><span className="text-slate-400">Keep Record:</span> {selectedPickup.keep_record ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Schedule & Timing */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Schedules & Timing</span>
                </div>
                <div className="space-y-1 font-mono text-slate-600">
                  <p><span className="text-slate-400">Scheduled Date:</span> {selectedPickup.pickup_date || '-'}</p>
                  <p><span className="text-slate-400">Pickup Time:</span> {selectedPickup.pickup_time || 'Pending'}</p>
                  <p><span className="text-slate-400">Delivery Time:</span> {selectedPickup.delivery_time || 'Pending'}</p>
                  {selectedPickup.cancelled_time && (
                    <p className="text-rose-600"><span className="text-slate-400">Cancelled Time:</span> {selectedPickup.cancelled_time}</p>
                  )}
                </div>
              </div>

              {/* Processing: Wash & Fold */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700 uppercase tracking-wider">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Wash & Fold Metrics</span>
                </div>
                <div className="space-y-1 font-mono text-slate-600">
                  <p><span className="text-slate-400">Weight:</span> {selectedPickup.wf_weight ? `${selectedPickup.wf_weight} lbs` : '-'}</p>
                  <p><span className="text-slate-400">Bag Count:</span> {selectedPickup.wf_bags_items ?? 0}</p>
                  <p><span className="text-slate-400">Hanger Items:</span> {selectedPickup.wf_hanger_items ?? 0}</p>
                  <p><span className="text-slate-400">Plant Site ID:</span> {selectedPickup.wf_site_id ?? '-'}</p>
                  <p><span className="text-slate-400">Slip Number:</span> {selectedPickup.wf_slip_number ?? '-'}</p>
                  <p><span className="text-slate-400">Washer Cost:</span> {selectedPickup.wf_washer_cost ? `$${selectedPickup.wf_washer_cost}` : '-'}</p>
                  <p><span className="text-slate-400">Dryer Cost:</span> {selectedPickup.wf_dryer_cost ? `$${selectedPickup.wf_dryer_cost}` : '-'}</p>
                </div>
              </div>

              {/* Processing: Dry Cleaning */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700 uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dry Cleaning Metrics</span>
                </div>
                <div className="space-y-1 font-mono text-slate-600">
                  <p><span className="text-slate-400">Items Count:</span> {selectedPickup.dc_items ?? 0}</p>
                  <p><span className="text-slate-400">Bags Count:</span> {selectedPickup.dc_bags_items ?? 0}</p>
                  <p><span className="text-slate-400">Hanger Items:</span> {selectedPickup.dc_hanger_items ?? 0}</p>
                  <p><span className="text-slate-400">Plant Site ID:</span> {selectedPickup.dc_site_id ?? '-'}</p>
                  <p><span className="text-slate-400">Slip Number:</span> {selectedPickup.dc_slip_number ?? '-'}</p>
                </div>
              </div>

              {/* Invoicing & Billing */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700 uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Invoicing & Payment</span>
                </div>
                <div className="space-y-1 font-mono text-slate-600">
                  <p><span className="text-slate-400">Invoice ID:</span> {selectedPickup.invoice_id ? `#${selectedPickup.invoice_id}` : 'None'}</p>
                  <p><span className="text-slate-400">Transaction ID:</span> {selectedPickup.customerPaymentTransId || 'None'}</p>
                  <p><span className="text-slate-400">Transaction Amount:</span> ${Number(selectedPickup.customerPaymentTransAmount || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Logistics & Drivers */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700 uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Logistics & Drivers</span>
                </div>
                <div className="space-y-1 font-mono text-slate-600">
                  <p><span className="text-slate-400">Pickup Driver:</span> {selectedPickup.pickup_driver_id ? `Driver #${selectedPickup.pickup_driver_id}` : 'Unassigned'}</p>
                  <p><span className="text-slate-400">Delivery Driver:</span> {selectedPickup.deliver_driver_id ? `Driver #${selectedPickup.deliver_driver_id}` : 'Unassigned'}</p>
                  <p><span className="text-slate-400">Skipped Pickup:</span> {selectedPickup.skipped_pickup ? 'Yes' : 'No'}</p>
                  <p><span className="text-slate-400">On Vacation:</span> {selectedPickup.on_vacation ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            {selectedPickup.log && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Activity & System Logs
                </label>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {selectedPickup.log}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPickup(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
