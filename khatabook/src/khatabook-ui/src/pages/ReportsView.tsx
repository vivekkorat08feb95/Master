import React, { useEffect, useState, useMemo } from 'react';
import { 
  Calendar, 
  Package, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Users,
  FileSpreadsheet,
  Download,
  Printer,
  FileJson,
  Search,
  Building2,
  ShoppingBag,
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Tenant } from '../types';
import { api } from '../services/api';
import { 
  exportGstr1ToExcel, 
  exportGstr1ToJson, 
  Gstr1ReportData 
} from '../utils/gstr1ExcelExport';

interface ReportsViewProps {
  activeTenant: Tenant | null;
}

type PeriodPreset = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'CUSTOM';
type Gstr1Section = 'HSN' | 'B2B' | 'B2CS' | 'CDNR' | 'DOCS';

export const ReportsView: React.FC<ReportsViewProps> = ({ activeTenant }) => {
  const [subTab, setSubTab] = useState<'daybook' | 'stock' | 'outstanding' | 'gstr1'>('gstr1');

  // Daybook state
  const [daybookDate, setDaybookDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [daybookData, setDaybookData] = useState<any | null>(null);

  // Stock valuation state
  const [stockValuation, setStockValuation] = useState<any | null>(null);

  // Outstanding state
  const [outstandingList, setOutstandingList] = useState<any[]>([]);

  // GSTR-1 state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('THIS_MONTH');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [gstr1Data, setGstr1Data] = useState<Gstr1ReportData | null>(null);
  const [gstr1Section, setGstr1Section] = useState<Gstr1Section>('HSN');
  const [gstr1Search, setGstr1Search] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const currency = activeTenant?.currencySymbol || '₹';

  // Preset Date Range Changer
  const handlePresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(end.toISOString().split('T')[0]);
    } else if (preset === 'THIS_QUARTER') {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qStartMonth, 1);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    if (!activeTenant) return;
    const fetchReport = async () => {
      setLoading(true);
      try {
        if (subTab === 'daybook') {
          const res = await api.getDaybook(daybookDate);
          setDaybookData(res.data);
        } else if (subTab === 'stock') {
          const res = await api.getStockValuation();
          setStockValuation(res.data);
        } else if (subTab === 'outstanding') {
          const res = await api.getOutstanding();
          setOutstandingList(res.data);
        } else if (subTab === 'gstr1') {
          const res = await api.getGstr1(fromDate, toDate);
          setGstr1Data(res.data);
        }
      } catch (err) {
        console.error('Failed to load report', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [activeTenant, subTab, daybookDate, fromDate, toDate]);

  // Filtered HSN Items
  const filteredHsn = useMemo(() => {
    if (!gstr1Data?.hsn) return [];
    if (!gstr1Search.trim()) return gstr1Data.hsn;
    const term = gstr1Search.trim().toLowerCase();
    return gstr1Data.hsn.filter(
      (h: any) =>
        (h.hsnCode && h.hsnCode.toLowerCase().includes(term)) ||
        (h.description && h.description.toLowerCase().includes(term))
    );
  }, [gstr1Data, gstr1Search]);

  // Filtered B2B Invoices
  const filteredB2b = useMemo(() => {
    if (!gstr1Data?.b2b) return [];
    if (!gstr1Search.trim()) return gstr1Data.b2b;
    const term = gstr1Search.trim().toLowerCase();
    return gstr1Data.b2b.filter(
      (inv: any) =>
        (inv.customerGstin && inv.customerGstin.toLowerCase().includes(term)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(term)) ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(term))
    );
  }, [gstr1Data, gstr1Search]);

  const handlePrintCaStatement = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Subtabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Reports &amp; Tax Center
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              GSTR-1 Ready
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit daily cashflow, inventory asset valuations, and automated GSTR-1 tax filings
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setSubTab('gstr1')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
              subTab === 'gstr1'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>GSTR-1 &amp; HSN Tax Center</span>
          </button>
          <button
            onClick={() => setSubTab('daybook')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              subTab === 'daybook'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daybook (Cashflow)
          </button>
          <button
            onClick={() => setSubTab('stock')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              subTab === 'stock'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Valuation
          </button>
          <button
            onClick={() => setSubTab('outstanding')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              subTab === 'outstanding'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Market Outstanding
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Subtab 0: GSTR-1 & HSN Tax Center */}
      {/* ========================================================================= */}
      {subTab === 'gstr1' && (
        <div className="space-y-6">
          {/* Controls Bar: Date Period & Export Actions */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1">Period:</span>
              <button
                type="button"
                onClick={() => handlePresetChange('THIS_MONTH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  periodPreset === 'THIS_MONTH'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('LAST_MONTH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  periodPreset === 'LAST_MONTH'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('THIS_QUARTER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  periodPreset === 'THIS_QUARTER'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                This Quarter
              </button>

              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPeriodPreset('CUSTOM');
                  }}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-xs text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPeriodPreset('CUSTOM');
                  }}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 1-Click Export Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                disabled={!gstr1Data || loading}
                onClick={() => gstr1Data && exportGstr1ToExcel(gstr1Data)}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
                title="Download formatted multi-sheet Excel file (.xlsx) for your CA"
              >
                <Download className="w-4 h-4" />
                <span>1-Click GSTR-1 Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                disabled={!gstr1Data || loading}
                onClick={() => gstr1Data && exportGstr1ToJson(gstr1Data)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Download GST Portal offline utility JSON"
              >
                <FileJson className="w-4 h-4" />
                <span>Portal JSON</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCaStatement}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Print Official CA Tax Statement"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* Printable Official Statement Header (Visible only on print) */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase">
                  {gstr1Data?.store?.name || activeTenant?.name}
                </h1>
                <p className="text-xs text-slate-600 font-bold mt-1">
                  GSTIN: {gstr1Data?.store?.gstin || activeTenant?.gstin || 'UNREGISTERED'} • State Code: {gstr1Data?.store?.stateCode} ({gstr1Data?.store?.state})
                </p>
                <p className="text-xs text-slate-500">{activeTenant?.address} • Phone: {activeTenant?.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-indigo-700 block">OFFICIAL GSTR-1 TAX STATEMENT</span>
                <span className="text-xs text-slate-600 font-semibold block">Period: {gstr1Data?.period?.month}</span>
                <span className="text-[10px] text-slate-400 block">Generated: {new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Gross Sales */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Gross Outward Turnover
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900">
                {currency}{(gstr1Data?.overview?.grossSales || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 font-medium block">
                {gstr1Data?.overview?.totalInvoicesCount || 0} Total Outward Bills Cut
              </span>
            </div>

            {/* Net Taxable Turnover */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Net Taxable Turnover
              </span>
              <div className="text-xl sm:text-2xl font-black text-indigo-700">
                {currency}{(gstr1Data?.overview?.netTaxable || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-indigo-600/80 font-medium block">
                After ₹{(gstr1Data?.overview?.returnsTaxable || 0).toLocaleString()} Returns Deducted
              </span>
            </div>

            {/* Total GST Output Liability */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-white to-amber-50/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Net GST Output Liability
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600">
                {currency}{(gstr1Data?.overview?.netTaxPayable || 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 pt-0.5">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded">
                  CGST: {currency}{(gstr1Data?.overview?.totalCgst || 0).toLocaleString()}
                </span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded">
                  SGST: {currency}{(gstr1Data?.overview?.totalSgst || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Credit Notes & Return Reversals */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Sales Returns (Credit Notes)
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-600">
                -{currency}{(gstr1Data?.overview?.totalReturns || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-rose-600/80 font-medium block">
                {gstr1Data?.overview?.creditNotesCount || 0} Credit Notes • Tax Reversed
              </span>
            </div>
          </div>

          {/* Section Navigation Tabs & Search Filter */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 print:hidden">
              <div className="flex bg-slate-200/80 p-1 rounded-xl overflow-x-auto gap-1">
                <button
                  type="button"
                  onClick={() => setGstr1Section('HSN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center space-x-1.5 ${
                    gstr1Section === 'HSN'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Table 12: HSN Summary ({gstr1Data?.hsn?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGstr1Section('B2B')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center space-x-1.5 ${
                    gstr1Section === 'B2B'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Table 4: B2B Invoices ({gstr1Data?.b2b?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGstr1Section('B2CS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center space-x-1.5 ${
                    gstr1Section === 'B2CS'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Table 7: B2CS Retail ({gstr1Data?.b2cs?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGstr1Section('CDNR')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center space-x-1.5 ${
                    gstr1Section === 'CDNR'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Table 9B: Credit Notes ({gstr1Data?.creditNotes?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGstr1Section('DOCS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center space-x-1.5 ${
                    gstr1Section === 'DOCS'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Table 13: Documents ({gstr1Data?.docIssue?.length || 0})</span>
                </button>
              </div>

              {/* Quick Search in section */}
              {(gstr1Section === 'HSN' || gstr1Section === 'B2B') && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={gstr1Section === 'HSN' ? 'Search HSN or Item...' : 'Search GSTIN or Customer...'}
                    value={gstr1Search}
                    onChange={(e) => setGstr1Search(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Table 12: HSN Summary View */}
            {/* ------------------------------------------------------------- */}
            {gstr1Section === 'HSN' && (
              <div className="overflow-x-auto">
                <div className="hidden print:block p-3 font-bold text-sm bg-slate-100 border-b">
                  Table 12: HSN-Wise Summary of Outward Supplies
                </div>
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">HSN Code</th>
                      <th className="py-3 px-4">Item Description</th>
                      <th className="py-3 px-3 text-center">UQC</th>
                      <th className="py-3 px-3 text-right">Total Qty</th>
                      <th className="py-3 px-3 text-right">Taxable Val (₹)</th>
                      <th className="py-3 px-3 text-center">Rate</th>
                      <th className="py-3 px-3 text-right">CGST (₹)</th>
                      <th className="py-3 px-3 text-right">SGST (₹)</th>
                      <th className="py-3 px-3 text-right">IGST (₹)</th>
                      <th className="py-3 px-4 text-right">Total Val (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHsn.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400 text-xs">
                          No HSN outward entries found for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredHsn.map((h: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-black text-indigo-700 tracking-wider">
                            {h.hsnCode || '9999'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{h.description}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-500">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">{h.uqc}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium">{h.totalQuantity}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {currency}{h.taxableValue.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">{h.rate}%</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            {currency}{h.cgst.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            {currency}{h.sgst.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-400">
                            {currency}{h.igst.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {currency}{h.totalValue.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredHsn.length > 0 && (
                    <tfoot className="bg-slate-50 font-black text-xs text-slate-900 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 uppercase tracking-wider">HSN Totals</td>
                        <td className="py-3 px-3 text-right">
                          {filteredHsn.reduce((acc: number, h: any) => acc + h.totalQuantity, 0).toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-right text-indigo-700">
                          {currency}
                          {filteredHsn.reduce((acc: number, h: any) => acc + h.taxableValue, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">-</td>
                        <td className="py-3 px-3 text-right">
                          {currency}
                          {filteredHsn.reduce((acc: number, h: any) => acc + h.cgst, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {currency}
                          {filteredHsn.reduce((acc: number, h: any) => acc + h.sgst, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {currency}
                          {filteredHsn.reduce((acc: number, h: any) => acc + h.igst, 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700">
                          {currency}
                          {filteredHsn.reduce((acc: number, h: any) => acc + h.totalValue, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Table 4: B2B Invoices View */}
            {/* ------------------------------------------------------------- */}
            {gstr1Section === 'B2B' && (
              <div className="overflow-x-auto">
                <div className="hidden print:block p-3 font-bold text-sm bg-slate-100 border-b">
                  Table 4: B2B Invoices (Sales to GST Registered Persons)
                </div>
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Recipient GSTIN</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-3">Invoice No</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Place of Supply</th>
                      <th className="py-3 px-3 text-right">Taxable Val (₹)</th>
                      <th className="py-3 px-3 text-right">CGST (₹)</th>
                      <th className="py-3 px-3 text-right">SGST (₹)</th>
                      <th className="py-3 px-4 text-right">Total Invoice (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredB2b.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                          No B2B invoices found. (B2B invoices require customer GSTIN in Khata).
                        </td>
                      </tr>
                    ) : (
                      filteredB2b.map((inv: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                            {inv.customerGstin}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{inv.customerName}</td>
                          <td className="py-3 px-3 font-mono font-medium">{inv.invoiceNumber}</td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{inv.invoiceDate}</td>
                          <td className="py-3 px-3 text-slate-600">{inv.placeOfSupply}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {currency}{inv.taxableValue.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {currency}{inv.cgst.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {currency}{inv.sgst.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {currency}{inv.invoiceValue.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Table 7: B2CS Small Retail Invoices View */}
            {/* ------------------------------------------------------------- */}
            {gstr1Section === 'B2CS' && (
              <div className="overflow-x-auto">
                <div className="hidden print:block p-3 font-bold text-sm bg-slate-100 border-b">
                  Table 7: B2C (Small) Invoices (Aggregated by Tax Rate &amp; Place of Supply)
                </div>
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Place of Supply (State)</th>
                      <th className="py-3 px-4 text-center">Tax Rate</th>
                      <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                      <th className="py-3 px-4 text-right">CGST (₹)</th>
                      <th className="py-3 px-4 text-right">SGST (₹)</th>
                      <th className="py-3 px-4 text-right">IGST (₹)</th>
                      <th className="py-3 px-4 text-right">Total Retail Sales (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!gstr1Data?.b2cs || gstr1Data.b2cs.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                          No B2CS retail sales recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      gstr1Data.b2cs.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-600">{row.type}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{row.placeOfSupply}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-700">{row.rate}%</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {currency}{row.taxableValue.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {currency}{row.cgst.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600">
                            {currency}{row.sgst.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400">
                            {currency}{row.igst.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {currency}{row.totalValue.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Table 9B: Credit Notes (Sales Returns) View */}
            {/* ------------------------------------------------------------- */}
            {gstr1Section === 'CDNR' && (
              <div className="overflow-x-auto">
                <div className="hidden print:block p-3 font-bold text-sm bg-slate-100 border-b">
                  Table 9B: Credit / Debit Notes Issued (Sales Returns &amp; Tax Reversals)
                </div>
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Credit Note No</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Original Invoice</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-3">GSTIN</th>
                      <th className="py-3 px-3">Reason</th>
                      <th className="py-3 px-3 text-right">Taxable Val (₹)</th>
                      <th className="py-3 px-3 text-right">CGST Reversed (₹)</th>
                      <th className="py-3 px-3 text-right">SGST Reversed (₹)</th>
                      <th className="py-3 px-4 text-right">Total Refund (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!gstr1Data?.creditNotes || gstr1Data.creditNotes.length === 0) ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400 text-xs">
                          No credit notes / sales returns issued in this period.
                        </td>
                      </tr>
                    ) : (
                      gstr1Data.creditNotes.map((cn: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-rose-600">
                            {cn.creditNoteNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{cn.creditNoteDate}</td>
                          <td className="py-3 px-3 font-mono text-slate-600">{cn.originalInvoiceNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{cn.customerName}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">{cn.customerGstin}</td>
                          <td className="py-3 px-3 text-slate-500">{cn.reason}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            -{currency}{cn.taxableValue.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right text-rose-600">
                            -{currency}{cn.cgstReversed.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right text-rose-600">
                            -{currency}{cn.sgstReversed.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-700">
                            -{currency}{cn.totalRefund.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Table 13: Documents Summary View */}
            {/* ------------------------------------------------------------- */}
            {gstr1Section === 'DOCS' && (
              <div className="overflow-x-auto">
                <div className="hidden print:block p-3 font-bold text-sm bg-slate-100 border-b">
                  Table 13: Documents Issued Summary (Invoices &amp; Credit Notes Serial Register)
                </div>
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nature of Document</th>
                      <th className="py-3 px-4">From Serial No</th>
                      <th className="py-3 px-4">To Serial No</th>
                      <th className="py-3 px-4 text-center">Total Number</th>
                      <th className="py-3 px-4 text-center">Cancelled</th>
                      <th className="py-3 px-4 text-center">Net Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!gstr1Data?.docIssue || gstr1Data.docIssue.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                          No document series issued in this period.
                        </td>
                      </tr>
                    ) : (
                      gstr1Data.docIssue.map((d: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">{d.docType}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-indigo-700">{d.fromSerial}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-indigo-700">{d.toSerial}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-900">{d.totalCount}</td>
                          <td className="py-3 px-4 text-center text-slate-400">{d.cancelledCount}</td>
                          <td className="py-3 px-4 text-center font-black text-emerald-600">{d.netIssuedCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CA Sign-Off Box for Print View */}
          <div className="hidden print:block pt-8 border-t border-slate-300 mt-8 text-xs">
            <div className="flex justify-between items-end">
              <div>
                <p className="font-bold text-slate-800">Verified by Tax Consultant / Chartered Accountant:</p>
                <div className="h-16 border-b border-dashed border-slate-400 w-64 mt-4"></div>
                <p className="text-[10px] text-slate-500 mt-1">Signature &amp; Membership No. / Stamp</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">For {gstr1Data?.store?.name}:</p>
                <div className="h-16 border-b border-dashed border-slate-400 w-64 mt-4 ml-auto"></div>
                <p className="text-[10px] text-slate-500 mt-1">Authorized Signatory / Proprietor</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Subtab 1: Daybook (Cashflow) */}
      {/* ========================================================================= */}
      {subTab === 'daybook' && (
        <div className="space-y-5">
          <div className="flex items-center space-x-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-700">Select Date:</span>
            <input
              type="date"
              value={daybookDate}
              onChange={(e) => setDaybookDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400">Total Money Got</span>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                {currency}{daybookData?.totalGot?.toFixed(2) ?? '0.00'}
              </h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400">Total Money Gave</span>
              <h3 className="text-xl font-bold text-rose-600 mt-1">
                {currency}{daybookData?.totalGave?.toFixed(2) ?? '0.00'}
              </h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400">Net Daily Inflow</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {currency}{daybookData?.netCashFlow?.toFixed(2) ?? '0.00'}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
              Transactions for {daybookDate}
            </div>
            <div className="divide-y divide-slate-100">
              {daybookData?.transactions?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No entries for this date.</div>
              ) : (
                daybookData?.transactions?.map((t: any) => (
                  <div key={t.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{t.partyName}</span>
                      <p className="text-slate-500">{t.description || t.paymentMode}</p>
                    </div>
                    <span
                      className={`font-bold text-sm ${
                        t.txnType === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.txnType === 'CREDIT' ? '+' : '-'}{currency}{t.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Subtab 2: Stock Valuation */}
      {/* ========================================================================= */}
      {subTab === 'stock' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400">Total Items in Stock</span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {stockValuation?.totalQuantity?.toFixed(1) ?? '0'} Units
              </h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400">Stock Purchase Valuation</span>
              <h3 className="text-xl font-bold text-indigo-700 mt-1">
                {currency}{stockValuation?.totalPurchaseValue?.toLocaleString() ?? '0.00'}
              </h3>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400">Stock Retail Valuation</span>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">
                {currency}{stockValuation?.totalRetailValue?.toLocaleString() ?? '0.00'}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Total Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {stockValuation?.items?.map((it: any) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{it.name}</td>
                    <td className="py-3 px-4 text-right font-medium">{it.currentStock} {it.unit}</td>
                    <td className="py-3 px-4 text-right">{currency}{it.purchasePrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-700">
                      {currency}{it.stockValue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Subtab 3: Outstanding Receivables */}
      {/* ========================================================================= */}
      {subTab === 'outstanding' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
            Pending Market Dues (Customers Who Owe You)
          </div>
          <div className="divide-y divide-slate-100">
            {outstandingList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No pending dues! All clear.</div>
            ) : (
              outstandingList.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">{p.name}</h5>
                    {p.phone && <p className="text-slate-500">Phone: {p.phone}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-base text-rose-600">
                      {currency}{Math.abs(p.currentBalance).toLocaleString()}
                    </span>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Pending Due</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
