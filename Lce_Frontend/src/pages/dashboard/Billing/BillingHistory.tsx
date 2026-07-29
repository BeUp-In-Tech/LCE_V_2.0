import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { invoiceAPI } from "../../../services/api";
import { useInvoices, useTransactions } from "../../../hooks/useQueries";
import { TableSkeleton } from "../../../components/ui/Skeleton";
import { parseDateSafe, getPTDate } from "../../../utils/dateHelpers";
import InvoiceDetailModal from "../../../components/shared/modal/InvoiceDetailModal";
import { useAuth } from "../../../context/useAuth";

interface BillingRecord {
  id: string;
  sl: string;
  service: string;
  type: string;
  date: string;
  amount: number;
  description: string;
}

interface BillingRecordInternal extends BillingRecord {
  rawDate: string;
  isInvoice: boolean;
}

interface InvoiceResponse {
  id: number;
  number: number;
  status: string;
  pickup_type?: "wf" | "dc" | "both" | "hd";
  pickup_date?: string;
  services?: string;
  services_list?: string[];
  subtotal: { wf: number; dc: number; total: number };
  total: number;
  created_at: string;
}

interface TransactionResponse {
  id: number;
  type: string;
  name: string;
  amount: number;
  description: string;
  note: string | null;
  invoice_id: number | null;
  transaction_id: string | null;
  created_at: string;
}

const decodeHtmlEntities = (text: string | null) => {
  if (!text) return '';
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

const BillingHistory: React.FC = () => {
  const { user } = useAuth();
  const { data: invoiceData, isLoading: invoicesLoading, error: invoicesError } = useInvoices();
  const { data: transactionData, isLoading: transactionsLoading, error: transactionsError } = useTransactions();

  const isLoading = invoicesLoading || transactionsLoading;
  const queryError = invoicesError || transactionsError;

  const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : undefined;

  const [currentPage, setCurrentPage] = useState(1);
  const [sortValue, setSortValue] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    try {
      // Directly parse the YYYY-MM-DD string to completely bypass local timezone shifting.
      // This guarantees that "2026-03-02" always cleanly displays as "3/2/2026" anywhere in the world.
      const datePart = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
      }
    } catch (e) {
      console.error("Date parse error", e);
    }
    return 'N/A';
  };

  const billingData: BillingRecordInternal[] = useMemo(() => {

    
    const rawTransactions: TransactionResponse[] = transactionData?.transactions || [];
    const rawInvoices: InvoiceResponse[] = invoiceData?.invoices || [];
    
    
    const invoiceIdsInList = new Set(rawInvoices.map(inv => inv.id));

    const transactionRecords: BillingRecordInternal[] = rawTransactions
      .filter((txn) => {
          const txnType = txn.type?.toLowerCase();
          
          if (txnType !== "debit" && txnType !== "subscription") return true;
          
          return !txn.invoice_id || !invoiceIdsInList.has(txn.invoice_id);
      })
      .map((txn) => {
        const txnType = txn.type?.toLowerCase();
        
        const isOrphanInvoice = (txnType === "debit" || txnType === "subscription") && txn.invoice_id && !invoiceIdsInList.has(txn.invoice_id);
        const description = isOrphanInvoice
          ? `Invoice - ${txn.invoice_id}`
          : (txn.note || txn.description || txn.name || txn.type);
        
        const displayType = txnType === 'subscription' ? 'Subscription'
          : txnType === 'debit' ? 'Debit'
          : txn.type || 'Credit';
        return {
          id: isOrphanInvoice ? txn.invoice_id!.toString() : `txn-${txn.id}`,
          sl: "",
          service: txn.name || txn.type,
          type: displayType,
          date: formatDate(txn.created_at),
          amount: Math.abs(txn.amount),
          description,
          rawDate: txn.created_at,
          isInvoice: !!isOrphanInvoice, // show as clickable link if it references an invoice
        };
      });

    // 2. Map Invoices — find their corresponding "Debit" transaction to get accurate billing date
    const invoiceRecords: BillingRecordInternal[] = rawInvoices.map((inv) => {
      
      const billingTxn = rawTransactions.find(t => t.invoice_id === inv.id && t.type?.toLowerCase() === 'debit');
      
      
      
      const rawDate = billingTxn?.created_at || inv.pickup_date || inv.created_at;
      const displayDate = formatDate(rawDate);
      
      return {
        id: inv.id.toString(),
        sl: "",
        service: "Invoice",
        type: inv.total < 0 ? "Credit" : "Debit",
        date: displayDate,
        amount: Math.abs(inv.total),
        description: `Invoice - ${inv.number}`,
        rawDate: rawDate,
        isInvoice: true,
      };
    });

    
    const merged = [...invoiceRecords, ...transactionRecords];
    merged.sort((a, b) => {
      const dateA = new Date(a.rawDate || a.date).getTime();
      const dateB = new Date(b.rawDate || b.date).getTime();
      return dateB - dateA;
    });

    
    return merged.map((item, index) => ({
      ...item,
      sl: (index + 1).toString().padStart(2, "0"),
    }));
  }, [invoiceData, transactionData]);

  const handleExport = async () => {
    try {
      const response = await invoiceAPI.export({
        from_date: fromDate,
        to_date: toDate,
      });

      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `invoices_${getPTDate().toISOString().split("T")[0]}.csv`,
      ); 
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export invoices:", err);
      setExportError("Failed to export invoices.");
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortValue(e.target.value);
  };

  const handleFromDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
  };

  const handleToDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
  };

  
  let filteredData = [...billingData];

  if (fromDate) {
    filteredData = filteredData.filter(
      (item) => parseDateSafe(item.date) >= parseDateSafe(fromDate),
    );
  }
  if (toDate) {
    filteredData = filteredData.filter(
      (item) => parseDateSafe(item.date) <= parseDateSafe(toDate),
    );
  }

  
  if (sortValue === "Low to High") {
    filteredData.sort((a, b) => a.amount - b.amount);
  } else if (sortValue === "High to Low") {
    filteredData.sort((a, b) => b.amount - a.amount);
  }

  const itemsPerPage = 8;
  
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const error = queryError ? "Failed to load billing history." : exportError;

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="px-2 sm:px-10">
          <h2 className="text-[32px] sm:text-[36px] font-bold text-[#2F393D] mb-6">
            Billing Overview
          </h2>
          <div className="overflow-x-auto border border-gray-100 rounded-xl mb-6">
            <TableSkeleton rows={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="px-2 sm:px-10">
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#2F393D] mb-6">
          Billing Overview
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        {}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <h2 className="text-xl font-bold text-[#2F393D] whitespace-nowrap">
              Billing History
            </h2>

            <div className="flex items-center gap-2">
              <span className="text-[#676E71] text-sm font-medium">Sort</span>
              <select
                className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 text-sm font-medium outline-none text-[#676E71]"
                value={sortValue}
                onChange={handleSortChange}
              >
                <option className="text-sm font-medium" value="all">
                  ALL
                </option>
                <option className="text-sm font-medium" value="Low to High">
                  Low to High
                </option>
                <option className="text-sm font-medium" value="High to Low">
                  High to Low
                </option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#676E71] text-sm font-medium">Date</span>

              <input
                type="date"
                value={fromDate}
                onChange={handleFromDate}
                className="bg-gray-50 border border-gray-200 text-[#676E71] rounded-lg px-3 py-2 text-sm w-32 outline-none"
              />

              <span className="text-[#676E71]">to</span>

              <input
                type="date"
                value={toDate}
                onChange={handleToDate}
                className="bg-gray-50 border border-gray-200 text-[#676E71] rounded-lg px-3 py-2 text-sm w-32 outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-lg transition-colors font-semibold"
          >
            <Download size={18} />
            Export
          </button>
        </div>

        {}
        <div className="mb-6">
          {}
          <div className="hidden md:grid grid-cols-[20%_20%_20%_40%] gap-4 px-8 py-3 mb-2 text-[#4B5457] text-sm font-bold tracking-wider">
            <div>Date</div>
            <div>Type</div>
            <div>Total</div>
            <div>Description</div>
          </div>

          {}
          <div className="flex flex-col gap-4">
            {currentItems.length > 0 ? (
              currentItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[20%_20%_20%_40%] gap-4 px-8 py-5 items-center bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-[#4B5457]"
                >
                  <div className="flex justify-between items-center md:block text-sm font-medium">
                    <span className="md:hidden text-xs text-slate-400 uppercase tracking-wider font-semibold">Date</span>
                    {item.date}
                  </div>
                  <div className="flex justify-between items-center md:block text-sm">
                    <span className="md:hidden text-xs text-slate-400 uppercase tracking-wider font-semibold">Type</span>
                    {item.type}
                  </div>
                  <div className="flex justify-between items-center md:block text-sm font-semibold">
                    <span className="md:hidden text-xs text-slate-400 uppercase tracking-wider font-semibold">Total</span>
                    <span>{(item.type === "Debit" || item.type === "Subscription") ? "" : "-"}${item.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center md:block text-sm mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-50">
                    <span className="md:hidden text-xs text-slate-400 uppercase tracking-wider font-semibold">Description</span>
                    <div>
                      {item.isInvoice ? (
                        <button
                          onClick={() => {
                            setSelectedInvoiceId(Number(item.id));
                            setIsInvoiceModalOpen(true);
                          }}
                          className="text-[#00AEEF] hover:text-[#0092D1] underline transition-colors cursor-pointer font-medium"
                        >
                          {decodeHtmlEntities(item.description)}
                        </button>
                      ) : (
                        <span className="text-[#4B5457]">{decodeHtmlEntities(item.description)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-10 text-center text-gray-500 bg-white rounded-2xl border border-slate-100 shadow-sm">
                No billing history found.
              </div>
            )}
          </div>
        </div>

        {}
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between pt-3">
            <p className="text-gray-500 text-sm">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {indexOfFirstItem + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-700">
                {Math.min(indexOfLastItem, filteredData.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {filteredData.length}
              </span>{" "}
              entries
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-sky-500 text-white disabled:bg-gray-200 disabled:cursor-not-allowed hover:bg-sky-600 transition-all"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === i + 1
                        ? "bg-sky-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-sky-500 text-white disabled:bg-gray-200 disabled:cursor-not-allowed hover:bg-sky-600 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {}
      <InvoiceDetailModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoiceId(null);
        }}
        invoiceId={selectedInvoiceId}
        customerName={customerName}
      />
    </div>
  );
};

export default BillingHistory;
