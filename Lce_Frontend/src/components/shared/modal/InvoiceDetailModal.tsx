import React, { useEffect, useState } from 'react';
import { X, Loader2, Printer } from 'lucide-react';
import { invoiceAPI } from '../../../services/api';
import { formatDateCA } from '../../../utils/dateHelpers';

interface LineItem {
  id: number;
  sku: string;
  type: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
  note: string | null;
}

interface InvoiceDetail {
  id: number;
  number: number;
  status: string;
  services: string;
  subtotal: { wf: number; dc: number; total: number };
  pickup_charge: number;
  total: number;
  promo: { code: string | null; amount: number };
  billing_date: string;
  created_at: string;
}

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number | null;
  customerName?: string;
}

const decodeHtmlEntities = (text: string | null) => {
  if (!text) return '';
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ isOpen, onClose, invoiceId, customerName }) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoiceDetail(invoiceId);
    }
    return () => {
      setInvoice(null);
      setLineItems([]);
      setError(null);
    };
  }, [isOpen, invoiceId]);

  const fetchInvoiceDetail = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await invoiceAPI.get(id);
      setInvoice(response.data.invoice);
      setLineItems(response.data.line_items || []);
    } catch (err) {
      console.error('Failed to fetch invoice details:', err);
      setError('Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const invoiceDate = invoice?.billing_date
    ? formatDateCA(invoice.billing_date)
    : 'N/A';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative">
        {}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Invoice Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin w-8 h-8 text-sky-500" />
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100 mb-4">
              {error}
            </div>
          )}

          {!loading && invoice && (
            <>
              {}
              <div className="mb-6 space-y-1 text-sm text-gray-700">
                <div className="flex gap-4">
                  <span className="font-semibold text-gray-500 w-24">Invoice #:</span>
                  <span className="font-bold text-gray-800">{invoice.number}</span>
                </div>
                <div className="flex gap-4">
                  <span className="font-semibold text-gray-500 w-24">Date:</span>
                  <span>{invoiceDate}</span>
                </div>
                {customerName && (
                  <div className="flex gap-4">
                    <span className="font-semibold text-gray-500 w-24">Customer:</span>
                    <span>{customerName}</span>
                  </div>
                )}
              </div>

              {}
              <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#00aeef] text-white text-left">
                      <th className="px-4 py-2.5 font-semibold">Product</th>
                      <th className="px-4 py-2.5 font-semibold text-center">Quantity</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Price</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.length > 0 ? (
                      lineItems.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-sky-50/50' : 'bg-white'}>
                          <td className="px-4 py-2.5 text-gray-700">{decodeHtmlEntities(item.name || item.type)}</td>
                          <td className="px-4 py-2.5 text-center text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">
                            {item.price > 0 ? `$${item.price.toFixed(2)}` : ''}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                            ${item.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                          No line items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="flex justify-between px-4 py-2 bg-gray-50 text-sm">
                  <span className="font-semibold text-gray-600">Sub-Total*</span>
                  <span className="font-medium text-gray-800">${invoice.subtotal.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-2 text-sm border-t border-gray-100">
                  <span className="text-gray-600">Pickup & Delivery</span>
                  <span className="text-gray-600">
                    {invoice.pickup_charge > 0 ? `$${invoice.pickup_charge.toFixed(2)}` : 'No charge'}
                  </span>
                </div>
                {invoice.promo.code && invoice.promo.amount > 0 && (
                  <div className="flex justify-between px-4 py-2 text-sm border-t border-gray-100">
                    <span className="text-green-600">Promo ({invoice.promo.code})</span>
                    <span className="text-green-600">-${invoice.promo.amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <span className="text-base font-bold text-gray-800">Total</span>
                  <span className="text-base font-bold text-gray-800">${invoice.total.toFixed(2)}</span>
                </div>
              </div>

              {}
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <Printer size={16} />
                  Print Invoice
                </button>
               
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
