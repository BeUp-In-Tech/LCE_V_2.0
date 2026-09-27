import React, { useState, useEffect } from 'react';
import { adminService, TableDataResponse } from '../api/adminApi';
import {
  Search,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  X,
  Shield,
  ShieldAlert,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Package
} from 'lucide-react';

interface UserRecord {
  id: number;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_1?: string;
  phone_2?: string;
  phone_3?: string;
  cell_phone_1?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  customer_type?: string;
  price_list?: string | number;
  price_list_id?: string | number;
  wash_fold_instructions?: string;
  driver_instructions?: string;
  is_admin?: number;
  cdate?: string;
  created_at?: string;
  card_last4?: string;
  card_exp?: string;
  stripe_profile_id?: string;
  [key: string]: any;
}

interface PlanOption {
  id: number;
  name: string;
  bags_per_month: number;
  price_per_bag: number;
  billing_cycle: string;
  annual_discount?: number;
}

const CUSTOMER_TYPE_OPTIONS = ['Regular', 'Commercial', 'VIP', 'Student', 'Employee', 'Senior'];

type UserSubTab = 'profile' | 'subscription' | 'orders' | 'invoices' | 'transactions' | 'credits';

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);
  const [lastPage, setLastPage] = useState<number>(1);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<UserSubTab>('profile');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Sub-tab data states
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);
  const [userActiveSubscription, setUserActiveSubscription] = useState<any | null>(null);
  const [userPendingSubscription, setUserPendingSubscription] = useState<any | null>(null);
  const [userInvoices, setUserInvoices] = useState<any[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userCredits, setUserCredits] = useState<any[]>([]);

  // Subscription Plan Change states
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | string>('');
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>('monthly');
  const [submittingPlan, setSubmittingPlan] = useState<boolean>(false);

  // Profile form state
  const [formData, setFormData] = useState<Partial<UserRecord>>({});
  const [priceListOptions, setPriceListOptions] = useState<{ value: string; label: string; rate?: number }[]>([]);

  const fetchUsers = async (
    targetPage = page,
    targetSearch = search,
    targetSortCol = sortColumn,
    targetSortDir = sortDirection,
    targetPerPage = perPage
  ) => {
    setLoading(true);
    try {
      const res = await adminService.getTableData(
        'lce_user_info',
        targetPage,
        targetPerPage,
        targetSearch,
        targetSortCol,
        targetSortDir
      );
      setUsers(res.data || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setLastPage(res.last_page || 1);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to load user accounts.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, search, sortColumn, sortDirection, perPage);
  }, [page, perPage, sortColumn, sortDirection]);

  // Load available plans and price lists on mount
  useEffect(() => {
    // 1. Fetch available subscription plans
    adminService.getTableData('lce_subscription_plans', 1, 50, '', 'id', 'asc')
      .then((res) => {
        if (res && res.data && res.data.length > 0) {
          const plans = res.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            bags_per_month: Number(p.bags_per_month) || 1,
            price_per_bag: Number(p.price_per_bag) || 0,
            billing_cycle: p.billing_cycle || 'monthly',
            annual_discount: Number(p.annual_discount) || 0,
          }));
          setAvailablePlans(plans);
          if (plans.length > 0 && !selectedPlanId) {
            setSelectedPlanId(plans[0].id);
            setSelectedCycle(plans[0].billing_cycle as 'monthly' | 'annual');
          }
        }
      })
      .catch(() => {});

    // 2. Dynamically query price lists directly from lce_prices table
    adminService.getTableData('lce_prices', 1, 300).then((res) => {
      if (res && res.data && res.data.length > 0) {
        const wfItems = res.data.filter((item: any) =>
          item.sku && /^WF\d+_1\+/i.test(item.sku)
        );

        const options = wfItems.map((item: any) => {
          const match = item.sku.match(/^WF(\d+)_/i);
          const listId = match ? match[1] : '1';
          const price = item[`price_${listId}`] ?? item.price_1 ?? item.price ?? 0;
          const rate = Number(price);
          return {
            value: listId,
            label: `${item.sku} - $${!isNaN(rate) ? rate.toFixed(2) : price}`,
            rate: rate,
            order: Number(listId) || 0,
          };
        });

        options.sort((a, b) => a.order - b.order);

        if (res.columns?.some((c: any) => c.name === 'price_134') && !options.some(o => o.value === '134')) {
          options.push({ value: '134', label: '00005 (#134)', rate: 0, order: 134 });
        }

        if (options.length > 0) {
          setPriceListOptions(options);
        }
      }
    }).catch(() => {
      adminService.getPriceLists().then((lists) => {
        if (lists && lists.length > 0) setPriceListOptions(lists);
      }).catch(() => {});
    });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search, sortColumn, sortDirection, perPage);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    fetchUsers(1, '', sortColumn, sortDirection, perPage);
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

  const loadUserDetails = async (user: UserRecord) => {
    const rawPriceList = (user as any).price_list_id ?? user.price_list ?? '1';
    const initialUser = { ...user, price_list: String(rawPriceList), price_list_id: rawPriceList };
    setSelectedUser(initialUser);
    setFormData(initialUser);
    setActiveSubTab('profile');
    setNotification(null);

    const actualId = user.user_id || user.id;

    try {
      const details = await adminService.getUserDetails(actualId);
      if (details.user) {
        const userPriceList = String(details.user.price_list_id ?? details.user.price_list ?? user.price_list ?? '1');
        const mergedUser = {
          ...user,
          ...details.user,
          price_list: userPriceList,
          price_list_id: userPriceList,
        };
        setSelectedUser(mergedUser);
        setFormData(mergedUser);
      }
      setUserOrders(details.orders || []);
      setUserSubscriptions(details.subscriptions || []);
      setUserActiveSubscription(details.active_subscription || null);
      setUserPendingSubscription(details.pending_subscription || null);
      setUserInvoices(details.invoices || []);
      setUserTransactions(details.transactions || []);
      setUserCredits(details.credits || []);
    } catch {
      try {
        const ordersRes = await adminService.getTableData('lce_user_pickup', 1, 50, String(actualId));
        setUserOrders(ordersRes.data || []);
      } catch {
        setUserOrders([]);
      }

      try {
        const subRes = await adminService.getTableData('lce_user_subscriptions', 1, 50, String(actualId));
        setUserSubscriptions(subRes.data || []);
      } catch {
        setUserSubscriptions([]);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setNotification(null);

    try {
      const payload = {
        ...formData,
        price_list: formData.price_list || '1',
        price_list_id: formData.price_list || '1',
      };
      await adminService.updateRecord('lce_user_info', selectedUser.id, payload);
      setSelectedUser({ ...selectedUser, ...payload });
      setNotification({ type: 'success', message: 'User profile updated successfully.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAdminRole = async (user: UserRecord) => {
    const newStatus = user.is_admin === 1 ? 0 : 1;
    try {
      await adminService.updateRecord('lce_user_info', user.id, { is_admin: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_admin: newStatus } : u))
      );
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser({ ...selectedUser, is_admin: newStatus });
      }
      setNotification({
        type: 'success',
        message: newStatus === 1 ? 'User promoted to Admin successfully.' : 'Admin privileges removed.'
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to update admin role.' });
    }
  };

  const handleApplyPlanChange = async () => {
    if (!selectedUser || !selectedPlanId) return;
    const plan = availablePlans.find((p) => String(p.id) === String(selectedPlanId));
    if (!plan) return;

    setSubmittingPlan(true);
    setNotification(null);
    try {
      const today = new Date();
      const nextDate = new Date();
      if (selectedCycle === 'annual') {
        nextDate.setFullYear(today.getFullYear() + 1);
      } else {
        nextDate.setDate(today.getDate() + 30);
      }

      const totalCharge = selectedCycle === 'annual'
        ? Number(plan.bags_per_month * plan.price_per_bag * 12 * (1 - (plan.annual_discount || 0) / 100))
        : Number(plan.bags_per_month * plan.price_per_bag);

      const targetUserId = selectedUser.user_id || selectedUser.id;

      await adminService.createRecord('lce_user_subscriptions', {
        user_id: targetUserId,
        plan_id: plan.id,
        status: 'active',
        billing_cycle: selectedCycle,
        start_date: today.toISOString().split('T')[0],
        end_date: nextDate.toISOString().split('T')[0],
        next_renewal_date: nextDate.toISOString().split('T')[0],
        bags_plan_period: selectedCycle === 'annual' ? plan.bags_per_month * 12 : plan.bags_per_month,
        bags_plan_total: plan.bags_per_month,
        bags_plan_balance: plan.bags_per_month,
        bags_plan_used: 0,
        bags_available: plan.bags_per_month,
        created_via: 'web',
        payment_last: totalCharge.toFixed(2),
        payment_discount: plan.annual_discount ? plan.annual_discount.toFixed(2) : '0.00',
        payment_balance: '0.00',
        notes: `Admin manual subscription assignment: ${plan.name} (${selectedCycle}) on ${today.toISOString().split('T')[0]}`,
        cdate: today.toISOString().replace('T', ' ').slice(0, 19),
        mdate: today.toISOString().replace('T', ' ').slice(0, 19),
      });

      setNotification({
        type: 'success',
        message: `Subscription successfully assigned to ${plan.name} (${selectedCycle}).`
      });

      // Reload user data
      await loadUserDetails(selectedUser);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to apply subscription plan.'
      });
    } finally {
      setSubmittingPlan(false);
    }
  };

  // Render Detailed User View
  if (selectedUser) {
    const contactSubtitle = [
      selectedUser.email,
      selectedUser.cell_phone_1 || selectedUser.phone_1,
      [selectedUser.city, selectedUser.state, selectedUser.zip].filter(Boolean).join(', ')
    ].filter(Boolean).join(' • ') || 'No contact details on file';

    return (
      <div className="space-y-6">
        {/* Banner Notification */}
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

        {/* User Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold text-slate-800">
                {selectedUser.first_name} {selectedUser.last_name}
              </h1>
              <span className="font-mono font-bold text-sm text-indigo-600 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200">
                #{selectedUser.user_id || selectedUser.id}
              </span>
              {selectedUser.is_admin === 1 && (
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-md">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {contactSubtitle}
            </p>
          </div>
          <button
            onClick={() => setSelectedUser(null)}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="border-b border-slate-200 flex space-x-8">
          {(['profile', 'subscription', 'orders', 'invoices', 'transactions', 'credits'] as UserSubTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`pb-3 text-sm font-semibold capitalize border-b-2 transition ${
                  activeSubTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {/* TAB 1: Profile View */}
        {activeSubTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            {/* Row 1: First Name & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">First Name</label>
                <input
                  type="text"
                  value={formData.first_name || ''}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={formData.last_name || ''}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Row 2: Cellphone & Landline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cellphone <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Cellphone"
                  value={formData.cell_phone_1 || formData.phone_1 || ''}
                  onChange={(e) => setFormData({ ...formData, cell_phone_1: e.target.value, phone_1: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Landline (Secondary)</label>
                <input
                  type="text"
                  placeholder="Landline Phone Number"
                  value={formData.phone_2 || ''}
                  onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Row 3: Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Row 4: Address & Apt/Unit */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-9">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Address</label>
                <input
                  type="text"
                  value={formData.address_1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_1: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Apt/Unit</label>
                <input
                  type="text"
                  value={formData.address_2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_2: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Row 5: City, State, Zip, Customer Type, Price List */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">City</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">State</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Zip</label>
                <input
                  type="text"
                  value={formData.zip || ''}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Customer Type</label>
                <select
                  value={formData.customer_type || 'Regular'}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {CUSTOMER_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Price List</label>
                <select
                  value={String(formData.price_list_id ?? formData.price_list ?? '1')}
                  onChange={(e) => setFormData({ ...formData, price_list_id: e.target.value, price_list: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {priceListOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 6: Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Driver Instructions</label>
                <textarea
                  rows={3}
                  value={formData.driver_instructions || ''}
                  onChange={(e) => setFormData({ ...formData, driver_instructions: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Laundry Instructions</label>
                <textarea
                  rows={3}
                  value={formData.wash_fold_instructions || ''}
                  onChange={(e) => setFormData({ ...formData, wash_fold_instructions: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#5C40E5] hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-xl text-xs shadow-sm transition disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => toggleAdminRole(selectedUser)}
                className={`flex items-center space-x-1.5 text-xs font-semibold px-4 py-2 rounded-xl border transition ${
                  selectedUser.is_admin === 1
                    ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {selectedUser.is_admin === 1 ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                <span>{selectedUser.is_admin === 1 ? 'Demote from Admin' : 'Make Admin User'}</span>
              </button>
            </div>

            {/* Payment Info */}
            <div className="mt-8 pt-5 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Payment Info (read-only)</h3>
              <div className="flex flex-wrap items-center gap-8 text-xs text-slate-600 font-mono">
                <div>Card: <span className="font-semibold text-slate-800">****{selectedUser.card_last4 || (selectedUser as any).payment_cc_number || '----'}</span></div>
                <div>Exp: <span className="font-semibold text-slate-800">{selectedUser.card_exp || ((selectedUser as any).payment_cc_edate_month ? `${(selectedUser as any).payment_cc_edate_month}/${(selectedUser as any).payment_cc_edate_year}` : '-/-')}</span></div>
                <div>Profile ID: <span className="font-semibold text-slate-800">{selectedUser.stripe_profile_id || (selectedUser as any).customerProfileId || '—'}</span></div>
                <div>Price List ID: <span className="font-semibold text-slate-800">{selectedUser.price_list_id || selectedUser.price_list || '1'}</span></div>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: Subscription View */}
        {activeSubTab === 'subscription' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            {/* Active Subscription Banner */}
            {userActiveSubscription ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-5 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm">
                    Active Subscription: {userActiveSubscription.plan_name || 'Subscribe & Save'}
                  </span>
                  <span className="bg-emerald-200 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize">
                    {userActiveSubscription.status}
                  </span>
                </div>
                <div className="text-xs text-emerald-800 pt-1 flex flex-wrap gap-x-6 gap-y-1.5 font-medium">
                  <span><strong>Allowance:</strong> {userActiveSubscription.bags_available ?? userActiveSubscription.bags_plan_period} Bags/month (${userActiveSubscription.price_per_bag || 55}/bag)</span>
                  <span><strong>Billing Cycle:</strong> <span className="capitalize">{userActiveSubscription.billing_cycle || 'monthly'}</span></span>
                  <span><strong>Banked Bags:</strong> {userActiveSubscription.bags_plan_balance || 0}</span>
                  <span><strong>Next Renewal:</strong> {userActiveSubscription.next_renewal_date || userActiveSubscription.end_date || '-'}</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 text-slate-600 p-4 rounded-xl text-sm font-medium">
                No active subscription on file (Pay Per Order customer).
              </div>
            )}

            {/* Pending Subscription Banner */}
            {userPendingSubscription && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-xs flex items-center justify-between">
                <span>
                  <strong>Pending Change:</strong> Scheduled change to <strong>{userPendingSubscription.plan_name || 'New Plan'}</strong> on {userPendingSubscription.start_date || 'scheduled cycle'}.
                </span>
                <span className="bg-amber-200 text-amber-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                  Scheduled
                </span>
              </div>
            )}

            {/* Change / Assign Subscription Form */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-800">Assign / Change Subscription Plan</h3>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedPlanId}
                  onChange={(e) => {
                    setSelectedPlanId(e.target.value);
                    const matched = availablePlans.find((p) => String(p.id) === e.target.value);
                    if (matched) setSelectedCycle(matched.billing_cycle as 'monthly' | 'annual');
                  }}
                  className="border border-slate-300 text-slate-700 text-xs rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.bags_per_month} bags, ${Number(p.price_per_bag).toFixed(2)}/bag - {p.billing_cycle})
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCycle}
                  onChange={(e) => setSelectedCycle(e.target.value as 'monthly' | 'annual')}
                  className="border border-slate-300 text-slate-700 text-xs rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium capitalize"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>

                <button
                  onClick={handleApplyPlanChange}
                  disabled={submittingPlan}
                  className="bg-[#5C40E5] hover:bg-indigo-700 text-white text-xs px-5 py-2 rounded-xl font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {submittingPlan ? 'Assigning...' : 'Assign Plan'}
                </button>
              </div>
            </div>

            {/* Subscription History Table */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Subscription History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">PLAN</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3">CYCLE</th>
                      <th className="py-2.5 px-3">START</th>
                      <th className="py-2.5 px-3">END</th>
                      <th className="py-2.5 px-3">CREATED</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 px-3 text-center text-slate-400">
                          No subscription history records found.
                        </td>
                      </tr>
                    ) : (
                      userSubscriptions.map((sub, i) => (
                        <tr key={sub.id || i} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">#{sub.id}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{sub.plan_name || sub.plan || 'Subscribe & Save'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              sub.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              sub.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              sub.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 capitalize">{sub.billing_cycle || sub.cycle || 'monthly'}</td>
                          <td className="py-2.5 px-3 font-mono">{sub.start_date || '-'}</td>
                          <td className="py-2.5 px-3 font-mono">{sub.end_date || '-'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {sub.cdate ? new Date(sub.cdate).toLocaleDateString() : (sub.created_at || '-')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Orders View */}
        {activeSubTab === 'orders' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">PICKUP ID</th>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">INVOICE</th>
                    <th className="py-3 px-4 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No orders found for this user.
                      </td>
                    </tr>
                  ) : (
                    userOrders.map((order, idx) => {
                      const amount = Number(order.customerPaymentTransAmount || order.total_amount || order.amount || 0);
                      return (
                        <tr key={order.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">#{order.id || order.pickup_id}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{order.pickup_date || order.date || '-'}</td>
                          <td className="py-3 px-4 font-mono uppercase text-slate-600">
                            {order.pickup_type === 'wf' ? 'Wash & Fold' : order.pickup_type === 'hd_dc' ? 'Dry Cleaning' : (order.pickup_type || 'wf')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              order.status === 'delivered' || order.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {order.status || 'pickup'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {order.invoice_id ? `#${order.invoice_id}` : '-'}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900 text-right">
                            ${amount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Invoices View */}
        {activeSubTab === 'invoices' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">NUMBER</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">ORDER TYPE</th>
                    <th className="py-3 px-4 text-right">TOTAL</th>
                    <th className="py-3 px-4">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No billing invoices found for this user.
                      </td>
                    </tr>
                  ) : (
                    userInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono text-slate-700">#{inv.id}</td>
                        <td className="py-3 px-4 font-mono text-indigo-600 font-bold">#{inv.number}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            inv.status?.toLowerCase() === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 uppercase text-slate-600 font-medium">{inv.order_type || 'PPO'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right">
                          ${Number(inv.total || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {inv.cdate ? new Date(inv.cdate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: Transactions View */}
        {activeSubTab === 'transactions' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">INVOICE ID</th>
                    <th className="py-3 px-4">TRANSACTION ID</th>
                    <th className="py-3 px-4">NAME</th>
                    <th className="py-3 px-4 text-right">AMOUNT</th>
                    <th className="py-3 px-4">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No transactions found for this user.
                      </td>
                    </tr>
                  ) : (
                    userTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono text-slate-700">#{tx.id}</td>
                        <td className="py-3 px-4 font-bold text-indigo-600 uppercase">{tx.type}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{tx.invoice_id ? `#${tx.invoice_id}` : '-'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{tx.transactionId || tx.payment_last_transactionId || '-'}</td>
                        <td className="py-3 px-4 text-slate-700">{tx.name || tx.description || 'Payment'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right">${Number(tx.amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{tx.cdate ? new Date(tx.cdate).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: Credits View */}
        {activeSubTab === 'credits' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">AMOUNT</th>
                    <th className="py-3 px-4">NOTE / TYPE</th>
                    <th className="py-3 px-4">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userCredits.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No store credit records found for this user.
                      </td>
                    </tr>
                  ) : (
                    userCredits.map((cr) => (
                      <tr key={cr.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono text-slate-700">#{cr.id}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600">${Number(cr.amount || cr.credit_amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-700">{cr.note || cr.description || cr.type || 'Account Credit'}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{cr.cdate ? new Date(cr.cdate).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Main Users Table List View
  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Users</h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {total} {total === 1 ? 'user' : 'users'}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Search, filter, view details, and manage customer accounts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchUsers()}
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
            title="Refresh Users"
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

      {/* Search Bar & Show Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or user ID..."
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

        <div className="flex items-center space-x-2 text-xs text-slate-500 self-end sm:self-auto">
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

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading user accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">No users found.</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th
                    onClick={() => handleSort('user_id')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                    title="Click to sort by User ID"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="text-indigo-600 font-bold">USER ID</span>
                      {sortColumn === 'user_id' || sortColumn === 'id' ? (
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

                  <th
                    onClick={() => handleSort('first_name')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                    title="Click to sort by Name"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>NAME</span>
                      {sortColumn === 'first_name' ? (
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

                  <th
                    onClick={() => handleSort('email')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                    title="Click to sort by Email"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>EMAIL</span>
                      {sortColumn === 'email' ? (
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

                  <th className="py-3.5 px-4 whitespace-nowrap">PHONE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">CITY</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">SUBSCRIPTION</th>

                  <th
                    onClick={() => handleSort('cdate')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/80 transition whitespace-nowrap"
                    title="Click to sort by Joined Date"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>JOINED</span>
                      {sortColumn === 'cdate' ? (
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

                  <th className="py-3.5 px-4 text-right whitespace-nowrap">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {users.map((user) => {
                  const joinedDate = user.cdate
                    ? new Date(user.cdate).toLocaleDateString()
                    : user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : '-';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#5C40E5] whitespace-nowrap">
                        {user.user_id || user.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span>{user.first_name} {user.last_name}</span>
                          {user.is_admin === 1 && (
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              ADMIN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{user.email}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                        {user.cell_phone_1 || user.phone_1 || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{user.city || '-'}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {user.subscription_status === 'Active' ? (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{user.subscription_plan || 'Active Subscription'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {user.subscription_plan || 'PPO'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{joinedDate}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => loadUserDetails(user)}
                          className="bg-[#00A7EE] hover:bg-cyan-600 text-white font-medium px-4 py-1.5 rounded-lg text-xs shadow-sm transition"
                        >
                          View
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
        {total > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * perPage + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">{Math.min(page * perPage, total)}</span> of{' '}
              <span className="font-semibold text-slate-700">{total}</span> Users (Page {page} of {lastPage})
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
                disabled={page >= lastPage}
                onClick={() => setPage((prev) => prev + 1)}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 rounded-lg font-medium shadow-sm transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
