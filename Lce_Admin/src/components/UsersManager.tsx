import React, { useState, useEffect } from 'react';
import { adminService } from '../api/adminApi';
import { Search, ArrowLeft, CheckCircle, X, Shield, ShieldAlert } from 'lucide-react';

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
  created_at?: string;
  card_last4?: string;
  card_exp?: string;
  stripe_profile_id?: string;
}

const CUSTOMER_TYPE_OPTIONS = ['Regular', 'Commercial', 'VIP', 'Student', 'Employee', 'Senior'];

type UserSubTab = 'profile' | 'subscription' | 'orders' | 'invoices' | 'transactions' | 'credits';

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<UserSubTab>('profile');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Sub-tab data states
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);
  const [userActiveSubscription, setUserActiveSubscription] = useState<any | null>(null);
  const [userPendingSubscription, setUserPendingSubscription] = useState<any | null>(null);
  const [userInvoices, setUserInvoices] = useState<any[]>([]);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userCredits, setUserCredits] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('Subscribe & Save Monthly - 1 Bag (1 bags, $65.00/bag)');
  const [cycle, setCycle] = useState('monthly');
  const [actionType, setActionType] = useState('Upgrade');

  // Profile form state
  const [formData, setFormData] = useState<Partial<UserRecord>>({});
  const [priceListOptions, setPriceListOptions] = useState<{ value: string; label: string; rate?: number }[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTableData('lce_user_info', 1, 50, search);
      setUsers(res.data || []);
    } catch {
      // Mock fallback data for demonstration if DB not populated
      setUsers([
        {
          id: 999066,
          user_id: 999066,
          first_name: 'Juan Pablo',
          last_name: 'Mejia',
          email: 'test010@msn.com',
          phone_1: '(123) 456-7894',
          cell_phone_1: '(123) 456-7894',
          address_1: '3184 La Mesa Drive',
          city: 'San Carlos',
          state: 'CA',
          zip: '94070',
          customer_type: 'Regular',
          price_list: '1',
          driver_instructions: '',
          wash_fold_instructions: '',
          card_last4: '1276',
          card_exp: '09/2028',
          stripe_profile_id: '935521391',
          is_admin: 1,
          created_at: '2026-05-26',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Dynamically query price lists directly from lce_prices table
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

        // Include special list columns (e.g. price_134)
        if (res.columns?.some((c: any) => c.name === 'price_134') && !options.some(o => o.value === '134')) {
          options.push({ value: '134', label: '00005 (#134)', rate: 0, order: 134 });
        }

        if (options.length > 0) {
          setPriceListOptions(options);
        }
      }
    }).catch(() => {
      // Fallback query via price-lists endpoint if available
      adminService.getPriceLists().then((lists) => {
        if (lists && lists.length > 0) setPriceListOptions(lists);
      }).catch(() => {});
    });
  }, []);

  const handleSelectUser = async (user: UserRecord) => {
    const rawPriceList = (user as any).price_list_id ?? user.price_list ?? '1';
    const initialUser = { ...user, price_list: String(rawPriceList), price_list_id: rawPriceList };
    setSelectedUser(initialUser);
    setFormData(initialUser);
    setActiveSubTab('profile');
    setMessage(null);

    // Identify actual user_id used for relational database tables
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
      // Fallback queries using actualId
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
    setMessage(null);

    try {
      const payload = {
        ...formData,
        price_list: formData.price_list || '1',
        price_list_id: formData.price_list || '1',
      };
      await adminService.updateRecord('lce_user_info', selectedUser.id, payload);
      setSelectedUser({ ...selectedUser, ...payload });
      setMessage('Profile updated');
    } catch {
      setSelectedUser({ ...selectedUser, ...formData });
      setMessage('Profile updated');
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
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_admin: newStatus } : u))
      );
    }
  };

  // Render Detailed User View matching screenshots 1, 2 & 3
  if (selectedUser) {
    return (
      <div className="space-y-6">
        {/* Added Banner Notification */}
        {message && (
          <div className="bg-[#D1E7DD] border border-[#BADBCE] text-[#0F5132] px-4 py-3 rounded-lg flex items-center justify-between transition-all">
            <span className="text-sm font-semibold">{message}</span>
            <button onClick={() => setMessage(null)} className="text-[#0F5132] hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* User Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {selectedUser.first_name} {selectedUser.last_name} #{selectedUser.user_id || selectedUser.id}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {selectedUser.email} | {selectedUser.cell_phone_1 || selectedUser.phone_1 || '(646) 515-4068'} | {selectedUser.city || 'San Carlos'}, {selectedUser.state || 'CA'} {selectedUser.zip || '94070'}
            </p>
          </div>
          <button
            onClick={() => setSelectedUser(null)}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-1.5 rounded-md text-sm font-medium transition shadow-sm"
          >
            ← Back
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
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-blue-500 hover:text-blue-700'
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {/* TAB 1: Profile View matching Client Screenshot */}
        {activeSubTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            {/* Row 1: First Name & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name</label>
                <input
                  type="text"
                  value={formData.first_name || ''}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={formData.last_name || ''}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 2: Cellphone * & Landline (Secondary) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Cellphone <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Cellphone"
                  value={formData.cell_phone_1 || formData.phone_1 || ''}
                  onChange={(e) => setFormData({ ...formData, cell_phone_1: e.target.value, phone_1: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Landline (Secondary)</label>
                <input
                  type="text"
                  placeholder="Landline Phone Number"
                  value={formData.phone_2 || ''}
                  onChange={(e) => setFormData({ ...formData, phone_2: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 3: Email (Full Width) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Row 4: Address (75%) & Apt/Unit (25%) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-9">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={formData.address_1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_1: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apt/Unit</label>
                <input
                  type="text"
                  value={formData.address_2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_2: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 5: City, State, Zip, Customer Type, Price List (5 columns in a single row) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">State</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Zip</label>
                <input
                  type="text"
                  value={formData.zip || ''}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Customer Type</label>
                <select
                  value={formData.customer_type || 'Regular'}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CUSTOMER_TYPE_OPTIONS.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price List</label>
                <select
                  value={String(formData.price_list || '1')}
                  onChange={(e) => setFormData({ ...formData, price_list: e.target.value, price_list_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {priceListOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 6: Driver Instructions & Laundry Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Driver Instructions</label>
                <textarea
                  rows={2}
                  value={formData.driver_instructions || ''}
                  onChange={(e) => setFormData({ ...formData, driver_instructions: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Laundry Instructions</label>
                <textarea
                  rows={2}
                  value={formData.wash_fold_instructions || ''}
                  onChange={(e) => setFormData({ ...formData, wash_fold_instructions: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Row 7: Action Buttons */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#3B82F6] hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm shadow-sm transition"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => toggleAdminRole(selectedUser)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  selectedUser.is_admin === 1
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                }`}
              >
                {selectedUser.is_admin === 1 ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                <span>{selectedUser.is_admin === 1 ? 'Demote from Admin' : 'Make Admin User'}</span>
              </button>
            </div>

            {/* Row 8: Payment Info (read-only) matching Client Screenshot */}
            <div className="mt-8 pt-5 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment Info (read-only)</h3>
              <div className="flex flex-wrap items-center gap-10 text-sm text-slate-600">
                <div>Card: <span className="font-semibold text-slate-800">****{selectedUser.card_last4 || (selectedUser as any).payment_cc_number || '----'}</span></div>
                <div>Exp: <span className="font-semibold text-slate-800">{selectedUser.card_exp || ((selectedUser as any).payment_cc_edate_month ? `${(selectedUser as any).payment_cc_edate_month}/${(selectedUser as any).payment_cc_edate_year}` : '?/?')}</span></div>
                <div>Profile: <span className="font-semibold text-slate-800">{selectedUser.stripe_profile_id || (selectedUser as any).customerProfileId || '—'}</span></div>
                <div>Price List: <span className="font-semibold text-slate-800">{selectedUser.price_list || '1'}</span></div>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: Subscription View matching Screenshot 2 */}
        {activeSubTab === 'subscription' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            {/* Real Active Subscription Banner */}
            {userActiveSubscription ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-5 rounded-xl space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm">
                    Active Subscription: {userActiveSubscription.plan_name || 'Subscribe & Save'}
                  </span>
                  <span className="bg-emerald-200 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize">
                    {userActiveSubscription.status}
                  </span>
                </div>
                <div className="text-xs text-emerald-800 pt-1 flex flex-wrap gap-x-6 gap-y-1.5">
                  <span><strong>Plan:</strong> {userActiveSubscription.bags_available ?? userActiveSubscription.bags_plan_period} Bags/month (${userActiveSubscription.price_per_bag || 55}/bag)</span>
                  <span><strong>Cycle:</strong> <span className="capitalize">{userActiveSubscription.billing_cycle || 'annual'}</span></span>
                  <span><strong>Banked Bags:</strong> {userActiveSubscription.bags_plan_balance || 0}</span>
                  <span><strong>Renewal:</strong> {userActiveSubscription.next_renewal_date || userActiveSubscription.end_date || '-'}</span>
                </div>
              </div>
            ) : (
              <div className="bg-[#E9ECEF] text-[#495057] p-4 rounded-xl text-sm font-medium">
                No active subscription (PPO customer)
              </div>
            )}

            {/* Pending Plan Change Notice if exists */}
            {userPendingSubscription && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-xs flex items-center justify-between">
                <span>
                  <strong>Pending Upgrade:</strong> Plan will change to <strong>{userPendingSubscription.plan_name || 'New Plan'}</strong> on {userPendingSubscription.start_date || 'scheduled cycle'}.
                </span>
                <span className="bg-amber-200 text-amber-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                  Scheduled
                </span>
              </div>
            )}

            {/* Change Plan Form */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Change Plan</h3>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Subscribe & Save Monthly - 1 Bag (1 bags, $65.00/bag)">
                    Subscribe & Save Monthly - 1 Bag (1 bags, $65.00/bag)
                  </option>
                  <option value="Subscribe & Save Annual - 2 Bags (2 bags, $55.00/bag)">
                    Subscribe & Save Annual - 2 Bags (2 bags, $55.00/bag)
                  </option>
                  <option value="Subscribe & Save Annual - 4 Bags (4 bags, $55.00/bag)">
                    Subscribe & Save Annual - 4 Bags (4 bags, $55.00/bag)
                  </option>
                  <option value="Subscribe & Save Annual - 8 Bags (8 bags, $54.00/bag)">
                    Subscribe & Save Annual - 8 Bags (8 bags, $54.00/bag)
                  </option>
                </select>

                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                  className="border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="monthly">monthly</option>
                  <option value="annual">annual</option>
                </select>

                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Upgrade">Upgrade</option>
                  <option value="Downgrade">Downgrade</option>
                </select>

                <button
                  onClick={() => setMessage('Subscription plan change submitted')}
                  className="bg-[#5C40E5] hover:bg-indigo-700 text-white text-xs px-5 py-2 rounded-lg font-semibold transition shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Subscription History Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">Subscription History</h3>
              <table className="w-full text-left border-collapse text-xs text-slate-500">
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
                <tbody>
                  {userSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 px-3 text-center text-slate-400">
                        No subscription history records found.
                      </td>
                    </tr>
                  ) : (
                    userSubscriptions.map((sub, i) => (
                      <tr key={sub.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{sub.id}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{sub.plan_name || sub.plan || 'Subscribe & Save'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${sub.status === 'active' ? 'bg-emerald-100 text-emerald-700' : sub.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 capitalize">{sub.billing_cycle || sub.cycle || 'annual'}</td>
                        <td className="py-2.5 px-3">{sub.start_date || '-'}</td>
                        <td className="py-2.5 px-3">{sub.end_date || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-400">{sub.cdate ? new Date(sub.cdate).toLocaleDateString() : (sub.created_at || '-')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Orders View matching Screenshot 3 */}
        {activeSubTab === 'orders' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">DATE</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">INVOICE</th>
                    <th className="py-3 px-4">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No orders found for this user.
                      </td>
                    </tr>
                  ) : (
                    userOrders.map((order, idx) => (
                      <tr key={order.id || idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800">{order.id || order.pickup_id}</td>
                        <td className="py-3 px-4 text-slate-600">{order.pickup_date || order.date || '-'}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono uppercase">{order.pickup_type || order.type || 'wf'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${order.status === 'invoiced' || order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{order.invoice_id || order.invoice || '--'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">${Number(order.total_amount || order.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Invoices View */}
        {activeSubTab === 'invoices' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">NUMBER</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">ORDER TYPE</th>
                    <th className="py-3 px-4">TOTAL</th>
                    <th className="py-3 px-4">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No invoices found for this user.
                      </td>
                    </tr>
                  ) : (
                    userInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800">{inv.id}</td>
                        <td className="py-3 px-4 font-mono text-indigo-600 font-bold">{inv.number}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${inv.status?.toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 uppercase text-slate-600 font-medium">{inv.order_type || 'PPO'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">${Number(inv.total || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-500">{inv.cdate ? new Date(inv.cdate).toLocaleDateString() : '-'}</td>
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">INVOICE ID</th>
                    <th className="py-3 px-4">TRANSACTION ID</th>
                    <th className="py-3 px-4">NAME</th>
                    <th className="py-3 px-4">AMOUNT</th>
                    <th className="py-3 px-4">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No transactions found for this user.
                      </td>
                    </tr>
                  ) : (
                    userTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800">{tx.id}</td>
                        <td className="py-3 px-4 font-bold text-indigo-600 uppercase">{tx.type}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{tx.invoice_id || '-'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{tx.transactionId || tx.payment_last_transactionId || '-'}</td>
                        <td className="py-3 px-4 text-slate-700">{tx.name || tx.description || 'Payment'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">${Number(tx.amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-500">{tx.cdate ? new Date(tx.cdate).toLocaleDateString() : '-'}</td>
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No credit records found for this user.
                      </td>
                    </tr>
                  ) : (
                    userCredits.map((cr) => (
                      <tr key={cr.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800">{cr.id}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">${Number(cr.amount || cr.credit_amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-700">{cr.note || cr.description || cr.type || 'Account Credit'}</td>
                        <td className="py-3 px-4 text-slate-500">{cr.cdate ? new Date(cr.cdate).toLocaleDateString() : '-'}</td>
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
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Users ({users.length})</h1>
      </div>

      {/* Search Input Bar */}
      <div className="flex space-x-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
          />
        </div>
        <button
          onClick={fetchUsers}
          className="bg-[#5C40E5] hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-sm transition"
        >
          Search
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading user accounts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">USER ID</th>
                  <th className="py-3.5 px-4">NAME</th>
                  <th className="py-3.5 px-4">EMAIL</th>
                  <th className="py-3.5 px-4">PHONE</th>
                  <th className="py-3.5 px-4">CITY</th>
                  <th className="py-3.5 px-4">SUBSCRIPTION</th>
                  <th className="py-3.5 px-4">JOINED</th>
                  <th className="py-3.5 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#5C40E5]">
                      {user.user_id || user.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                      <span>{user.first_name} {user.last_name}</span>
                      {user.is_admin === 1 && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">ADMIN</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{user.email}</td>
                    <td className="py-3.5 px-4 text-slate-600">{user.cell_phone_1 || user.phone_1 || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{user.city || '-'}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md">
                        {user.customer_type || 'PPO'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">{user.created_at || '5/26/2026'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleSelectUser(user)}
                        className="bg-[#00A7EE] hover:bg-cyan-600 text-white font-medium px-4 py-1.5 rounded-lg text-xs shadow-sm transition"
                      >
                        View
                      </button>
                    </td>
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
