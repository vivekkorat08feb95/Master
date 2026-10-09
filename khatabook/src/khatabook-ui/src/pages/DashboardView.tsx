import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  Receipt, 
  UserPlus, 
  PlusCircle, 
  Layers 
} from 'lucide-react';
import { DashboardStats, Tenant } from '../types';
import { api } from '../services/api';

interface DashboardViewProps {
  activeTenant: Tenant | null;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ activeTenant, onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenant) return;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.getDashboard();
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [activeTenant]);

  const currency = activeTenant?.currencySymbol || '₹';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            {activeTenant?.businessType || 'Store Dashboard'}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            {activeTenant?.name || 'My Store'}
          </h1>
          <p className="text-sm text-slate-500">
            Real-time business ledger, inventory, and sales overview
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          <button
            onClick={() => onNavigate('billing')}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
          >
            <Receipt className="w-4 h-4" />
            <span>New Sale / POS</span>
          </button>
          <button
            onClick={() => onNavigate('khata')}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center space-x-2 border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Sales</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {currency}{stats?.todaysSales?.toLocaleString() ?? '0.00'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{stats?.todaysInvoicesCount ?? 0} bills generated today</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">You Will Get (Udhaar)</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">
              {currency}{stats?.totalReceivables?.toLocaleString() ?? '0.00'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">From {stats?.totalCustomers ?? 0} customers</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">You Will Give (Payable)</p>
            <h3 className="text-2xl font-bold text-rose-700 mt-1">
              {currency}{stats?.totalPayables?.toLocaleString() ?? '0.00'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">To {stats?.totalSuppliers ?? 0} suppliers</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
        >
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.lowStockCount ?? 0} Items</h3>
            <p className="text-xs text-amber-700 font-medium mt-1">Needs reordering</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigate('khata')}
          className="bg-gradient-to-br from-indigo-50 to-slate-50 p-6 rounded-2xl border border-indigo-100 cursor-pointer hover:shadow-md transition"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3">
            <UserPlus className="w-5 h-5" />
          </div>
          <h4 className="font-semibold text-slate-900 text-base">Customer & Supplier Khata</h4>
          <p className="text-sm text-slate-600 mt-1">
            Maintain complete credit & debit ledgers. Track who owes you money and send WhatsApp receipts.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-gradient-to-br from-amber-50 to-slate-50 p-6 rounded-2xl border border-amber-100 cursor-pointer hover:shadow-md transition"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="font-semibold text-slate-900 text-base">Stock & Inventory Control</h4>
          <p className="text-sm text-slate-600 mt-1">
            Track stock in real-time. Make adjustments for damage, expiration, or recount with full audit trails.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('billing')}
          className="bg-gradient-to-br from-emerald-50 to-slate-50 p-6 rounded-2xl border border-emerald-100 cursor-pointer hover:shadow-md transition"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
            <Receipt className="w-5 h-5" />
          </div>
          <h4 className="font-semibold text-slate-900 text-base">POS Billing & Print</h4>
          <p className="text-sm text-slate-600 mt-1">
            Super fast counter billing. Supports cash, UPI, partial payments, credit udhaar, and thermal printing.
          </p>
        </div>
      </div>
    </div>
  );
};
