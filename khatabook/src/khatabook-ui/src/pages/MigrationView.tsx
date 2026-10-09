import React, { useState } from 'react';
import { 
  Database, 
  UploadCloud, 
  Users, 
  Package, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  FileText,
  Sparkles
} from 'lucide-react';
import { Tenant } from '../types';
import { api } from '../services/api';

interface MigrationViewProps {
  activeTenant: Tenant | null;
}

export const MigrationView: React.FC<MigrationViewProps> = ({ activeTenant }) => {
  const [activeSubTab, setActiveSubTab] = useState<'PARTIES' | 'ITEMS' | 'INVOICES'>('PARTIES');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sampleParties = [
    {
      name: "Rameshwar Patel",
      nativeName: "रामेश्वर पटेल",
      phone: "9876543210",
      address: "Krishi Mandi, Plot 4",
      partyType: "CUSTOMER",
      openingBalance: 12500.00,
      openingDate: "2026-01-01T00:00:00Z"
    },
    {
      name: "Kisan Fertilizer Syndicate",
      nativeName: "किसान फर्टिलाइजर सिंडिकेट",
      phone: "9822114455",
      address: "MIDC Phase 2",
      partyType: "SUPPLIER",
      openingBalance: -45000.00,
      openingDate: "2026-01-01T00:00:00Z"
    },
    {
      name: "Ganesh Kirana Store",
      nativeName: "गणेश किराणा स्टोअर्स",
      phone: "9988776655",
      address: "Station Road",
      partyType: "CUSTOMER",
      openingBalance: 3200.00,
      openingDate: "2026-01-15T00:00:00Z"
    }
  ];

  const sampleItems = [
    {
      name: "Wheat Sharbati 50kg",
      nativeName: "गेहूं शरबती ५० किग्रा",
      barcode: "8901234567890",
      category: "Grains",
      unit: "Bag",
      purchasePrice: 1850.00,
      sellingPrice: 2150.00,
      mrp: 2250.00,
      taxRate: 0.00,
      hsnCode: "1001",
      batchNumber: "WHEAT-2026-B1",
      openingStock: 45.0,
      minStockAlert: 10.0
    },
    {
      name: "Urea Fertilizer Bag 45kg",
      nativeName: "यूरिया खाद ४५ किग्रा",
      barcode: "8909876543210",
      category: "Fertilizers",
      unit: "Bag",
      purchasePrice: 266.50,
      sellingPrice: 295.00,
      mrp: 300.00,
      taxRate: 5.00,
      hsnCode: "3102",
      batchNumber: "UREA-26-AUG",
      openingStock: 120.0,
      minStockAlert: 20.0
    },
    {
      name: "Parle-G Biscuit 250g",
      nativeName: "पारले-जी बिस्किट",
      barcode: "8901030012345",
      category: "Biscuits",
      unit: "Packet",
      purchasePrice: 24.00,
      sellingPrice: 28.00,
      mrp: 30.00,
      taxRate: 18.00,
      hsnCode: "1905",
      openingStock: 80.0,
      minStockAlert: 15.0
    }
  ];

  const sampleInvoices = [
    {
      invoiceNumber: "OLD-INV-001",
      invoiceType: "SALE",
      partyName: "Rameshwar Patel",
      partyPhone: "9876543210",
      invoiceDate: "2026-02-10T11:30:00Z",
      totalAmount: 4300.00,
      paidAmount: 3000.00,
      paymentMode: "CASH",
      notes: "Imported from Vyapar manual ledger",
      items: [
        {
          itemName: "Wheat Sharbati 50kg",
          nativeName: "गेहूं शरबती ५० किग्रा",
          unit: "Bag",
          quantity: 2,
          unitPrice: 2150.00
        }
      ]
    }
  ];

  const handleLoadSample = () => {
    setStatusMessage(null);
    if (activeSubTab === 'PARTIES') {
      setJsonInput(JSON.stringify(sampleParties, null, 2));
    } else if (activeSubTab === 'ITEMS') {
      setJsonInput(JSON.stringify(sampleItems, null, 2));
    } else {
      setJsonInput(JSON.stringify(sampleInvoices, null, 2));
    }
  };

  const handleRunImport = async () => {
    setStatusMessage(null);
    if (!jsonInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter JSON data to import.' });
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput.trim());
      if (!Array.isArray(parsed)) {
        setStatusMessage({ type: 'error', text: 'JSON root must be an array of records [ { ... }, { ... } ].' });
        return;
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: `Invalid JSON syntax: ${e.message}` });
      return;
    }

    setImporting(true);
    try {
      let res: any;
      if (activeSubTab === 'PARTIES') {
        res = await api.importParties(parsed);
      } else if (activeSubTab === 'ITEMS') {
        res = await api.importItems(parsed);
      } else {
        res = await api.importInvoices(parsed);
      }

      setStatusMessage({
        type: 'success',
        text: res.data.message || 'Data successfully imported into database!'
      });
      setJsonInput('');
    } catch (err: any) {
      console.error('Import failed', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || err.response?.data || 'Failed to import data. Please check schema.'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Legacy Data Migration & Onboarding</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Import Previous Software & Ledger Data</h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            Switching from Vyapar, Tally, Marg, or manual paper khata registers? Easily import your previous customers with opening dues, item catalogs with starting stock, and past invoice histories.
          </p>
        </div>

        <button
          onClick={handleLoadSample}
          className="self-start md:self-auto px-4 py-2 bg-indigo-500/30 hover:bg-indigo-500/50 border border-indigo-400/40 rounded-xl text-xs font-bold transition flex items-center space-x-2"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Load Sample Template</span>
        </button>
      </div>

      {/* Main Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Sub-Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
          <button
            onClick={() => { setActiveSubTab('PARTIES'); setStatusMessage(null); }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'PARTIES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Customers & Suppliers (Opening Balance)</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('ITEMS'); setStatusMessage(null); }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'ITEMS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>2. Inventory Items (Opening Stock)</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('INVOICES'); setStatusMessage(null); }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'INVOICES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>3. Historical Bills & Invoices</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-4">
          {statusMessage && (
            <div
              className={`p-4 rounded-xl flex items-center space-x-3 text-xs font-semibold ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Paste JSON Data (or click 'Load Sample Template' above)
            </label>
            <span className="text-[11px] text-slate-400">
              Supports native names, backdated opening dates & opening stock movements
            </span>
          </div>

          <textarea
            rows={14}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`[\n  {\n    "name": "Customer or Item Name",\n    "nativeName": "स्थानीय नाम",\n    ...\n  }\n]`}
            className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              💡 <strong>Tip:</strong> Opening balances and initial stocks automatically create ledger transactions and stock movements with the specified historical dates.
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Reset to Sample
              </button>

              <button
                type="button"
                onClick={handleRunImport}
                disabled={importing || !jsonInput.trim()}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center space-x-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{importing ? 'Importing Data...' : 'Import Into Database'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
