import React, { useEffect, useState } from 'react';
import { adminService, TableItem, TableDataResponse, SqlExecutionResponse } from '../api/adminApi';
import {
  Database,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Terminal,
  Play,
  RotateCcw,
  Download,
  Copy,
  Check,
  Clock,
  Code2,
  FileCode2
} from 'lucide-react';

export const DatabaseInspector: React.FC = () => {
  // Mode selection: 'console' (SQL Query Editor) or 'browser' (Visual Table Inspector)
  const [activeTab, setActiveTab] = useState<'console' | 'browser'>('console');

  // --- SQL Console State ---
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM lce_prices ORDER BY id DESC LIMIT 50;');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<SqlExecutionResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- Table Inspector State ---
  const [tables, setTables] = useState<TableItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('lce_prices');
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
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable && activeTab === 'browser') {
      setPage(1);
      fetchTableData(selectedTable, 1, search);
    }
  }, [selectedTable, activeTab]);

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
      const res = await adminService.getTableData(table, p, 25, q);
      setTableData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- SQL Execution Handler ---
  const handleExecuteSql = async (overrideSql?: string) => {
    const q = (overrideSql ?? sqlQuery).trim();
    if (!q) return;

    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const res = await adminService.executeSql(q);
      setQueryResult(res);
      if (res.type === 'execute') {
        fetchTables();
      }
    } catch (err: any) {
      console.error(err);
      setQueryError(err.response?.data?.error || err.message || 'Execution failed.');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteSql();
    }
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = () => {
    if (!queryResult?.rows || queryResult.rows.length === 0) return;
    const cols = queryResult.columns || Object.keys(queryResult.rows[0]);
    const header = cols.join(',');
    const rows = queryResult.rows.map((r: any) =>
      cols
        .map((c) => {
          const val = r[c];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sql_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const PRESET_QUERIES = [
    { label: 'All Prices (Limit 50)', sql: 'SELECT * FROM lce_prices ORDER BY id DESC LIMIT 50;' },
    { label: 'Distinct Price Types', sql: 'SELECT DISTINCT type FROM lce_prices;' },
    { label: 'Configurations Table', sql: 'SELECT * FROM lce_configurations ORDER BY id ASC;' },
    { label: 'Show All Tables', sql: 'SHOW TABLES;' },
    { label: 'Describe lce_prices', sql: 'DESCRIBE lce_prices;' },
    {
      label: 'Insert GNR Pricing (Template)',
      sql: `INSERT INTO \`lce_prices\` (\`sku\`, \`type\`, \`name\`, \`price_1\`, \`deleted\`) VALUES
('G_MIN', 'GNR', 'GNR Minimum charge', 50.00, 'No'),
('G_PD', 'GNR', 'GNR Pickup & Delivery', 10.00, 'No'),
('G_SVC', 'GNR', 'GNR Service Fee', 7.00, 'No');`
    }
  ];

  // --- Table Inspector Handlers ---
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
    <div className="w-full space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Database & SQL Query Console</h2>
              <p className="text-slate-400 text-sm">
                Run raw SQL statements or visually browse, inspect and manage database tables.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'console'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>SQL Query Console</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('browser');
              if (!tableData && selectedTable) {
                fetchTableData(selectedTable, 1);
              }
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'browser'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Table Inspector</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SQL QUERY CONSOLE */}
      {/* ========================================================================= */}
      {activeTab === 'console' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Query Editor Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Editor Toolbar */}
            <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">MySQL Console</span>
                <span className="text-[11px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
                  Ctrl + Enter to run
                </span>
              </div>

              {/* Preset Queries Dropdown */}
              <div className="flex items-center space-x-2">
                <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400">Presets:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setSqlQuery(e.target.value);
                    }
                  }}
                  defaultValue=""
                  className="bg-slate-800 text-slate-200 text-xs border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>Select query snippet...</option>
                  {PRESET_QUERIES.map((p, i) => (
                    <option key={i} value={p.sql}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleCopyQuery}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Copy SQL Query"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSqlQuery('')}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Clear Query"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Input Area */}
            <div className="p-4 bg-slate-900/90">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={6}
                spellCheck={false}
                placeholder="Write your raw SQL query here... e.g. SELECT * FROM lce_prices WHERE type = 'GNR';"
                className="w-full bg-slate-950 font-mono text-sm text-indigo-100 p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 resize-y leading-relaxed selection:bg-indigo-600 selection:text-white"
              />
            </div>

            {/* Action Bar */}
            <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Supports <span className="text-indigo-400 font-mono">SELECT</span>, <span className="text-emerald-400 font-mono">INSERT</span>, <span className="text-amber-400 font-mono">UPDATE</span>, <span className="text-rose-400 font-mono">DELETE</span>, <span className="text-purple-400 font-mono">ALTER</span>, <span className="text-blue-400 font-mono">SHOW</span>.
              </p>

              <button
                onClick={() => handleExecuteSql()}
                disabled={queryLoading || !sqlQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm flex items-center space-x-2 transition shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                {queryLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Execute Query</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {queryError && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-200 text-sm flex items-start space-x-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block text-rose-300">MySQL Execution Error</span>
                <p className="font-mono text-xs bg-slate-950/60 p-2.5 rounded-lg border border-rose-900/50 break-all">
                  {queryError}
                </p>
              </div>
            </div>
          )}

          {/* Execution Result Area */}
          {queryResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
              {/* Result Meta Bar */}
              <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Query OK</span>
                  </div>
                  {queryResult.duration_ms !== undefined && (
                    <div className="flex items-center space-x-1 text-slate-400 text-xs font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{queryResult.duration_ms} ms</span>
                    </div>
                  )}
                  {queryResult.count !== undefined && (
                    <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/60 font-mono">
                      {queryResult.count} {queryResult.count === 1 ? 'row' : 'rows'} returned
                    </span>
                  )}
                  {queryResult.affected_rows !== undefined && (
                    <span className="text-xs text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-700/40 font-mono">
                      {queryResult.affected_rows} rows affected
                    </span>
                  )}
                </div>

                {queryResult.rows && queryResult.rows.length > 0 && (
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {/* Tabular Output (for SELECT) */}
              {queryResult.type === 'select' && (
                <div>
                  {queryResult.rows && queryResult.rows.length > 0 ? (
                    <div className="overflow-x-auto max-h-[550px] divide-y divide-slate-800">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800 backdrop-blur-md">
                          <tr>
                            <th className="px-3 py-3 w-12 text-center text-slate-600 font-mono">#</th>
                            {queryResult.columns?.map((col) => (
                              <th key={col} className="px-4 py-3 whitespace-nowrap font-mono text-indigo-300">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                          {queryResult.rows.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-indigo-950/20 transition">
                              <td className="px-3 py-2.5 text-center text-slate-600 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              {queryResult.columns?.map((col) => (
                                <td key={col} className="px-4 py-2.5 max-w-sm truncate font-mono text-slate-200 text-xs">
                                  {row[col] === null ? (
                                    <span className="text-slate-500 italic">NULL</span>
                                  ) : typeof row[col] === 'object' ? (
                                    JSON.stringify(row[col])
                                  ) : (
                                    String(row[col])
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 font-mono text-sm">
                      Query returned 0 rows.
                    </div>
                  )}
                </div>
              )}

              {/* Mutation / Execution Output (for INSERT/UPDATE/DELETE/ALTER) */}
              {queryResult.type === 'execute' && (
                <div className="p-6 bg-slate-900/40 text-center space-y-2">
                  <div className="inline-flex p-3 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white">{queryResult.message}</h4>
                  <p className="text-xs text-slate-400">
                    Execution took <span className="font-mono text-slate-300">{queryResult.duration_ms} ms</span>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VISUAL TABLE INSPECTOR */}
      {/* ========================================================================= */}
      {activeTab === 'browser' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Table Selector & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Table:</label>
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
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm flex items-center justify-center space-x-1.5 transition font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Record</span>
            </button>
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
                  if (isCreating && isPk) return null;

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
