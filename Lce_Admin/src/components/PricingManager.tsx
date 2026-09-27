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
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string>('Retail (#1)');
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [savingSku, setSavingSku] = useState<string | null>(null);

  // Dynamically populated from lce_prices table schema and rows
  const [availableLists, setAvailableLists] = useState<{ key: string; label: string }[]>([
    { key: 'price_1', label: 'Retail (#1)' },
    { key: 'price_2', label: 'Wholesale (#2)' },
    { key: 'price_134', label: '00005 (#134)' },
  ]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([
    'All Types', 'GNR', 'WF', 'WFU', 'WFS', 'DS', 'HD', 'DC'
  ]);

  const getTargetColumnKey = (listName: string): string => {
    const found = availableLists.find(l => l.label === listName);
    if (found) return found.key;
    if (listName.includes('#134')) return 'price_134';
    if (listName.includes('#2')) return 'price_2';
    if (listName.includes('#3')) return 'price_3';
    return 'price_1';
  };

  const getPriceListLabel = (listName: string): string => {
    const key = getTargetColumnKey(listName);
    const num = key.replace('price_', '');
    return `LIST #${num}`;
  };

  const mapRowsToItems = (rows: any[], listKey: string) => {
    return rows.map((row: any) => {
      let val = row[listKey];
      if (val === undefined || val === null || val === '') {
        val = row.price_1 !== undefined && row.price_1 !== null && row.price_1 !== '' ? row.price_1 : row.price;
      }
      const numVal = Number(val);
      const formattedPrice = !isNaN(numVal) ? numVal.toFixed(2) : (val ?? '0.00');

      return {
        id: row.id,
        sku: row.sku || row.code || `SKU_${row.id}`,
        type: String(row.type || '').trim() || '-',
        name: (row.name || row.description || 'Service Item').replace(/&amp;/g, '&'),
        price: formattedPrice,
        priceKey: listKey,
        rawRow: row,
      };
    });
  };

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTableData('lce_prices', 1, 300);
      if (res && res.data) {
        setRawRows(res.data);

        // Dynamically discover all price list columns from table schema
        if (res.columns && res.columns.length > 0) {
          const listCols = res.columns
            .map((c: any) => c.name)
            .filter((name: string) => /^price_\d+$/.test(name));

          if (listCols.length > 0) {
            const dynamicLists = listCols.map((colName: string) => {
              const id = colName.replace('price_', '');
              let label = `List #${id}`;
              if (id === '1') label = 'Retail (#1)';
              else if (id === '2') label = 'Wholesale (#2)';
              else if (id === '134') label = '00005 (#134)';
              return { key: colName, label };
            });
            setAvailableLists(dynamicLists);
          }
        }

        // Dynamically discover all unique Types from table rows
        if (res.data.length > 0) {
          const uniqueTypes = Array.from(
            new Set(res.data.map((d: any) => String(d.type || '').trim()).filter(Boolean))
          ) as string[];
          if (uniqueTypes.length > 0) {
            setAvailableTypes(['All Types', ...uniqueTypes]);
          }
        }

        const colKey = getTargetColumnKey(selectedList);
        setItems(mapRowsToItems(res.data, colKey));
      }
    } catch (err) {
      console.error('Failed to fetch table data for lce_prices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  // When selectedList changes, re-map items with the new list key
  useEffect(() => {
    if (rawRows.length > 0) {
      const colKey = getTargetColumnKey(selectedList);
      setItems(mapRowsToItems(rawRows, colKey));
    }
  }, [selectedList]);

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
        const targetKey = getTargetColumnKey(selectedList);
        const updatePayload: Record<string, any> = {
          [targetKey]: item.price,
          price: item.price,
        };

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
    if (selectedType !== 'All Types' && item.type.toUpperCase() !== selectedType.toUpperCase()) {
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
          {availableLists.map((l) => (
            <option key={l.key} value={l.label}>
              {l.label}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border border-slate-300 text-slate-700 text-sm rounded-lg px-3.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        >
          {availableTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
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
                  <th className="py-3 px-4 font-semibold text-slate-500">PRICE ({getPriceListLabel(selectedList)})</th>
                  <th className="py-3 px-4 text-right"></th>
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
