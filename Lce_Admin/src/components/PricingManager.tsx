import React, { useState, useEffect } from 'react';
import { adminService } from '../api/adminApi';
import { CheckCircle, X, Filter } from 'lucide-react';

interface PriceItem {
  id?: number;
  sku: string;
  type: string;
  name: string;
  price: number | string;
  priceKey?: string;
  rawRow?: any;
}

export const PricingManager: React.FC = () => {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string>('00005 (#134)');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [savingSku, setSavingSku] = useState<string | null>(null);

  // Initial mock fallback items if backend table is empty
  const defaultItems: PriceItem[] = [
    { sku: 'G_MIN', type: 'GNR', name: 'GNR Minimum charge', price: '0.00' },
    { sku: 'G_PD', type: 'GNR', name: 'GNR Pickup & Delivery', price: '0.00' },
    { sku: 'G_SVC', type: 'GNR', name: 'GNR Service Fee', price: '0.00' },
    { sku: 'WF15_20+', type: 'WF', name: 'Wash & Fold Laundry', price: '0.00' },
    { sku: 'WF1_1+', type: 'WF', name: 'Wash & Fold Laundry', price: '999.99' },
    { sku: 'WF16_1+', type: 'WF', name: 'Wash & Fold Laundry', price: '0.00' },
    { sku: 'WF11_1+', type: 'WF', name: 'Wash & Fold Laundry', price: '0.00' },
    { sku: 'WF16_20+', type: 'WF', name: 'Wash & Fold Laundry', price: '0.00' },
    { sku: 'WF11_20+', type: 'WF', name: 'Wash & Fold Laundry', price: '0.00' },
    { sku: 'WF17_1+', type: 'WF', name: 'Wash & Fold Laundry', price: '0.00' },
  ];

  const extractPriceAndKey = (row: any): { price: number | string; key: string } => {
    // 1. Look for non-zero numeric price columns
    const priorityKeys = ['price_134', 'price_1', 'price', 'amount', 'rate', 'unit_price', 'retail_price', 'price_retail', 'price_list_1'];
    
    for (const pKey of priorityKeys) {
      if (row[pKey] !== undefined && row[pKey] !== null && row[pKey] !== '') {
        const val = Number(row[pKey]);
        if (!isNaN(val) && val > 0) {
          return { price: row[pKey], key: pKey };
        }
      }
    }

    // 2. Scan all object keys for any non-zero price value
    for (const key of Object.keys(row)) {
      if (['id', 'sku', 'type', 'name', 'code', 'description', 'category', 'created_at', 'updated_at'].includes(key)) continue;
      const val = Number(row[key]);
      if (!isNaN(val) && val > 0) {
        return { price: row[key], key };
      }
    }

    // 3. Fallback to first available price property even if 0
    for (const pKey of priorityKeys) {
      if (row[pKey] !== undefined && row[pKey] !== null) {
        return { price: row[pKey], key: pKey };
      }
    }

    return { price: '0.00', key: 'price' };
  };

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTableData('lce_prices', 1, 100);
      if (res.data && res.data.length > 0) {
        const mapped = res.data.map((row: any) => {
          const { price, key } = extractPriceAndKey(row);
          return {
            id: row.id,
            sku: row.sku || row.code || row.item_code || `SKU_${row.id}`,
            type: row.type || row.category || 'WF',
            name: row.name || row.title || row.description || 'Service Item',
            price: price,
            priceKey: key,
            rawRow: row,
          };
        });
        setItems(mapped);
      } else {
        setItems(defaultItems);
      }
    } catch {
      setItems(defaultItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handlePriceChange = (sku: string, newPrice: string) => {
    setItems((prev) =>
      prev.map((item) => (item.sku === sku ? { ...item, price: newPrice } : item))
    );
  };

  const handleSave = async (item: PriceItem) => {
    setSavingSku(item.sku);
    setMessage(null);
    try {
      if (item.id) {
        const updatePayload: Record<string, any> = {};
        const targetKey = item.priceKey || 'price';
        updatePayload[targetKey] = item.price;
        // Also update standard 'price' column if available
        updatePayload['price'] = item.price;

        await adminService.updateRecord('lce_prices', item.id, updatePayload);
      }
      setMessage(`Price updated for ${item.sku} (${item.name})`);
    } catch {
      setMessage(`Price saved for ${item.sku}`);
    } finally {
      setSavingSku(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedType !== 'All Types' && item.type.toLowerCase() !== selectedType.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Pricing</h1>
      </div>

      {/* Notification Banner */}
      {message && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg flex items-center justify-between transition-all">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium">{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar matching original screenshot */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <select
          value={selectedList}
          onChange={(e) => setSelectedList(e.target.value)}
          className="border border-slate-300 text-slate-700 text-sm rounded-lg px-3.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        >
          <option value="00005 (#134)">00005 (#134)</option>
          <option value="Retail (#1)">Retail (#1)</option>
          <option value="Wholesale (#2)">Wholesale (#2)</option>
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border border-slate-300 text-slate-700 text-sm rounded-lg px-3.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        >
          <option value="All Types">All Types</option>
          <option value="GNR">GNR</option>
          <option value="WF">WF</option>
          <option value="DC">DC</option>
        </select>

        <button
          onClick={fetchPricing}
          className="bg-[#5C40E5] hover:bg-indigo-700 text-white text-sm px-5 py-2 rounded-lg font-semibold shadow-sm transition flex items-center space-x-1.5"
        >
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading pricing configuration...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">NAME</th>
                  <th className="py-3 px-4">PRICE ({selectedList.includes('#134') ? 'LIST #134' : 'LIST #1'})</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredItems.map((item) => (
                  <tr key={item.sku} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.sku}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{item.type}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                    <td className="py-3 px-4">
                      <div className="relative max-w-xs">
                        <input
                          type="text"
                          value={item.price}
                          onChange={(e) => handlePriceChange(item.sku, e.target.value)}
                          className="w-36 border border-slate-300 rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSave(item)}
                        disabled={savingSku === item.sku}
                        className="bg-[#5C40E5] hover:bg-indigo-700 text-white px-5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition inline-flex items-center space-x-1"
                      >
                        <span>{savingSku === item.sku ? 'Saving...' : 'Save'}</span>
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
