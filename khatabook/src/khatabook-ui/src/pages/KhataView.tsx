import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X,
  Share2,
  Printer,
  FileText,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Zap,
  Check,
  ExternalLink,
  Split,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Archive,
  RotateCcw,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Party, Tenant, Transaction, Invoice } from '../types';
import { api } from '../services/api';
import { Pagination } from '../components/Pagination';
import { 
  exportPartiesToExcel, 
  exportPartiesToPdf, 
  exportStatementToExcel, 
  exportStatementToPdf 
} from '../utils/exportUtils';
import { assessPartyCreditRisk } from '../utils/creditScorer';
import { 
  formatWhatsAppPaymentReminder, 
  formatWhatsAppSettlementReceipt,
  sendWhatsAppReminderDirect,
  sendWhatsAppSettlementReceiptDirect,
  getWhatsAppTargetPreference,
  setWhatsAppTargetPreference,
  WhatsAppTarget
} from '../utils/whatsappHelper';


interface KhataViewProps {
  activeTenant: Tenant | null;
  activeUser?: any | null;
}

export const KhataView: React.FC<KhataViewProps> = ({ activeTenant, activeUser }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [search, setSearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activePartyTab, setActivePartyTab] = useState<'DAY_BY_DAY' | 'INVOICES' | 'TXN'>('DAY_BY_DAY');
  const [invoiceDueFilter, setInvoiceDueFilter] = useState<'ALL' | 'PENDING'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [partyActiveFilter, setPartyActiveFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [deactivatingParty, setDeactivatingParty] = useState<Party | null>(null);
  const [deactivatingTxn, setDeactivatingTxn] = useState<Transaction | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modal states
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnType, setTxnType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDescription, setTxnDescription] = useState('');
  const [txnMode, setTxnMode] = useState('CASH');

  // Settle Udhaar & Reconcile Bills Modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMode, setSettleMode] = useState('CASH');
  const [settleNotes, setSettleNotes] = useState('');
  const [settling, setSettling] = useState(false);
  const [settlementResult, setSettlementResult] = useState<any | null>(null);
  const [showSettlementReceiptModal, setShowSettlementReceiptModal] = useState(false);
  const [customAllocations, setCustomAllocations] = useState<{ [key: string]: number }>({});
  const [useCustomAllocation, setUseCustomAllocation] = useState(false);

  // WhatsApp auto-send and target preferences
  const [waTarget, setWaTarget] = useState<WhatsAppTarget>(() => getWhatsAppTargetPreference());
  const [autoSendReceipt, setAutoSendReceipt] = useState<boolean>(() => {
    return localStorage.getItem('khatabook_auto_settle_receipt') !== 'false';
  });

  // New Party Form
  const [newName, setNewName] = useState('');
  const [newNativeName, setNewNativeName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');

  const currency = activeTenant?.currencySymbol || '₹';

  // Party Directory Filters, Sorting & Pagination State
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'YOU_WILL_GET' | 'YOU_WILL_GIVE' | 'SETTLED'>('ALL');
  const [partySort, setPartySort] = useState<'NAME_ASC' | 'NAME_DESC' | 'BALANCE_DESC' | 'BALANCE_ASC'>('NAME_ASC');
  const [partyPage, setPartyPage] = useState<number>(1);
  const [partyPageSize, setPartyPageSize] = useState<number>(15);

  // Transactions Ledger Filters, Sorting & Pagination State
  const [txnTypeFilter, setTxnTypeFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const [txnDateRange, setTxnDateRange] = useState<'ALL' | 'THIS_MONTH' | 'LAST_30' | 'LAST_90'>('ALL');
  const [txnSortField, setTxnSortField] = useState<'date' | 'amount' | 'type'>('date');
  const [txnSortDir, setTxnSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [txnPage, setTxnPage] = useState<number>(1);
  const [txnPageSize, setTxnPageSize] = useState<number>(15);

  const filteredParties = useMemo(() => {
    let list = [...parties];

    if (balanceFilter === 'YOU_WILL_GET') {
      list = list.filter((p) => p.currentBalance > 0);
    } else if (balanceFilter === 'YOU_WILL_GIVE') {
      list = list.filter((p) => p.currentBalance < 0);
    } else if (balanceFilter === 'SETTLED') {
      list = list.filter((p) => p.currentBalance === 0);
    }

    return list.sort((a, b) => {
      if (partySort === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
      if (partySort === 'NAME_DESC') return (b.name || '').localeCompare(a.name || '');
      if (partySort === 'BALANCE_DESC') return (b.currentBalance || 0) - (a.currentBalance || 0);
      if (partySort === 'BALANCE_ASC') return (a.currentBalance || 0) - (b.currentBalance || 0);
      return 0;
    });
  }, [parties, balanceFilter, partySort]);

  const paginatedParties = useMemo(() => {
    const start = (partyPage - 1) * partyPageSize;
    return filteredParties.slice(start, start + partyPageSize);
  }, [filteredParties, partyPage, partyPageSize]);

  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    if (txnTypeFilter !== 'ALL') {
      list = list.filter((t) => t.txnType === txnTypeFilter);
    }

    if (txnDateRange !== 'ALL') {
      const now = new Date();
      let threshold = new Date();
      if (txnDateRange === 'THIS_MONTH') {
        threshold = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (txnDateRange === 'LAST_30') {
        threshold.setDate(now.getDate() - 30);
      } else if (txnDateRange === 'LAST_90') {
        threshold.setDate(now.getDate() - 90);
      }
      list = list.filter((t) => new Date(t.txnDate) >= threshold);
    }

    return list.sort((a, b) => {
      let comp = 0;
      if (txnSortField === 'date') {
        comp = new Date(a.txnDate).getTime() - new Date(b.txnDate).getTime();
      } else if (txnSortField === 'amount') {
        comp = a.amount - b.amount;
      } else if (txnSortField === 'type') {
        comp = a.txnType.localeCompare(b.txnType);
      }
      return txnSortDir === 'ASC' ? comp : -comp;
    });
  }, [transactions, txnTypeFilter, txnDateRange, txnSortField, txnSortDir]);

  const paginatedTransactions = useMemo(() => {
    const start = (txnPage - 1) * txnPageSize;
    return filteredTransactions.slice(start, start + txnPageSize);
  }, [filteredTransactions, txnPage, txnPageSize]);

  useEffect(() => {
    setPartyPage(1);
  }, [search, partyType, partyActiveFilter, balanceFilter, partySort]);

  useEffect(() => {
    setTxnPage(1);
  }, [selectedParty, txnTypeFilter, txnDateRange, txnSortField, txnSortDir]);

  const fetchParties = async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      const isActiveParam = partyActiveFilter === 'ALL' ? null : partyActiveFilter === 'ACTIVE' ? true : false;
      const res = await api.getParties({ type: partyType, search, isActive: isActiveParam });
      setParties(res.data);
      if (selectedParty) {
        const updated = res.data.find((p) => p.id === selectedParty.id);
        if (updated) setSelectedParty(updated);
      }
    } catch (err) {
      console.error('Failed to fetch parties', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [activeTenant, partyType, search, partyActiveFilter]);

  const handleTogglePartyActive = async (party: Party) => {
    try {
      setActionLoading(true);
      const res = await api.togglePartyActive(party.id);
      const newActive = res.data.isActive;
      setParties((prev) =>
        prev.map((p) => (p.id === party.id ? { ...p, isActive: newActive } : p))
      );
      if (selectedParty?.id === party.id) {
        setSelectedParty({ ...selectedParty, isActive: newActive });
      }
    } catch (err) {
      console.error('Failed to toggle party status', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateParty = async () => {
    if (!deactivatingParty) return;
    try {
      setActionLoading(true);
      await api.deleteParty(deactivatingParty.id);
      setParties((prev) =>
        prev.map((p) => (p.id === deactivatingParty.id ? { ...p, isActive: false } : p))
      );
      if (selectedParty?.id === deactivatingParty.id) {
        setSelectedParty({ ...selectedParty, isActive: false });
      }
      setDeactivatingParty(null);
    } catch (err) {
      console.error('Failed to deactivate party', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateTxn = async () => {
    if (!deactivatingTxn || !selectedParty) return;
    try {
      setActionLoading(true);
      await api.deleteTransaction(deactivatingTxn.id);
      // Refresh party details to get updated balance and ledger
      const res = await api.getParty(selectedParty.id);
      setSelectedParty(res.data.party);
      setTransactions(res.data.transactions || []);
      setInvoices(res.data.invoices || []);
      await fetchParties();
      setDeactivatingTxn(null);
    } catch (err) {
      console.error('Failed to soft delete transaction', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTxnActive = async (txn: Transaction) => {
    if (!selectedParty) return;
    try {
      setActionLoading(true);
      await api.toggleTransactionActive(txn.id);
      // Refresh party details to get updated balance and ledger
      const res = await api.getParty(selectedParty.id);
      setSelectedParty(res.data.party);
      setTransactions(res.data.transactions || []);
      setInvoices(res.data.invoices || []);
      await fetchParties();
    } catch (err) {
      console.error('Failed to toggle transaction active status', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectParty = async (party: Party) => {
    setSelectedParty(party);
    try {
      const res = await api.getParty(party.id);
      setTransactions(res.data.transactions || []);
      setInvoices(res.data.invoices || []);
    } catch (err) {
      console.error('Failed to load party details', err);
    }
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await api.createParty({
        name: newName.trim(),
        nativeName: newNativeName.trim() || undefined,
        phone: newPhone.trim(),
        partyType,
        openingBalance: parseFloat(newOpeningBalance || '0'),
        creditLimit: parseFloat(newCreditLimit || '0'),
      });
      setShowAddPartyModal(false);
      setNewName('');
      setNewNativeName('');
      setNewPhone('');
      setNewOpeningBalance('');
      setNewCreditLimit('');
      fetchParties();
      handleSelectParty(res.data);
    } catch (err) {
      console.error('Failed to create party', err);
    }
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !txnAmount) return;
    const amount = parseFloat(txnAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await api.createTransaction({
        partyId: selectedParty.id,
        txnType,
        amount,
        paymentMode: txnMode,
        description: txnDescription,
      });
      setShowTxnModal(false);
      setTxnAmount('');
      setTxnDescription('');
      fetchParties();
      handleSelectParty(selectedParty);
    } catch (err) {
      console.error('Failed to record transaction', err);
    }
  };

  const pendingInvoices = invoices
    .filter((i) => i.totalAmount - i.paidAmount > 0)
    .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

  const openSettleModal = (targetInvoice?: Invoice) => {
    if (!selectedParty) return;
    const totalPending = pendingInvoices.reduce((a, b) => a + (b.totalAmount - b.paidAmount), 0);

    if (targetInvoice) {
      const due = Math.max(0, targetInvoice.totalAmount - targetInvoice.paidAmount);
      setSettleAmount(due > 0 ? due.toString() : '');
      setCustomAllocations({ [targetInvoice.id]: due });
      setUseCustomAllocation(false);
    } else {
      const defaultAmt = totalPending > 0 ? totalPending : (selectedParty.currentBalance > 0 ? selectedParty.currentBalance : 0);
      setSettleAmount(defaultAmt > 0 ? defaultAmt.toString() : '');
      setCustomAllocations({});
      setUseCustomAllocation(false);
    }
    setSettleMode('CASH');
    setSettleNotes('');
    setShowSettleModal(true);
  };

  const handleSettleInvoice = (inv: Invoice) => {
    openSettleModal(inv);
  };

  const getFifoAllocationPreview = (inputAmount: number) => {
    let remainingPool = Math.max(0, inputAmount);
    return pendingInvoices.map((inv) => {
      const due = Math.max(0, inv.totalAmount - inv.paidAmount);
      const allocated = Math.min(remainingPool, due);
      remainingPool -= allocated;
      const newPaid = inv.paidAmount + allocated;
      const remainingDue = Math.max(0, inv.totalAmount - newPaid);
      const isFullyPaid = remainingDue === 0;
      const isPartial = allocated > 0 && remainingDue > 0;
      return {
        invoice: inv,
        due,
        allocated,
        remainingDue,
        isFullyPaid,
        isPartial,
        isUnsettled: allocated === 0,
      };
    });
  };

  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount greater than 0');
      return;
    }

    try {
      setSettling(true);
      const payload: any = {
        amount,
        paymentMode: settleMode,
        notes: settleNotes.trim() || undefined,
      };

      if (useCustomAllocation) {
        payload.allocations = Object.entries(customAllocations)
          .filter(([_, alloc]) => alloc > 0)
          .map(([invoiceId, allocatedAmount]) => ({ invoiceId, allocatedAmount }));
      }

      const res = await api.settleUdhaar(selectedParty.id, payload);
      setSettlementResult(res.data);
      setShowSettleModal(false);
      setShowSettlementReceiptModal(true);

      // Auto-send WhatsApp receipt directly upon settlement (No extra browser tab!)
      if (autoSendReceipt && selectedParty.phone && activeTenant) {
        sendWhatsAppSettlementReceiptDirect(res.data, selectedParty, activeTenant, settleMode, waTarget);
      }

      // Refresh data
      await fetchParties();
      const updatedPartyRes = await api.getParty(selectedParty.id);
      setSelectedParty(updatedPartyRes.data.party);
      setTransactions(updatedPartyRes.data.transactions || []);
      setInvoices(updatedPartyRes.data.invoices || []);
    } catch (err: any) {
      console.error('Failed to settle Udhaar', err);
      alert(err?.response?.data?.message || 'Failed to settle Udhaar. Please check the amount.');
    } finally {
      setSettling(false);
    }
  };

  const getDayByDayHistory = () => {
    const dayMap = new Map<string, {
      dateStr: string;
      dateObj: Date;
      displayDate: string;
      totalBilled: number;
      totalPaid: number;
      items: Array<{
        id: string;
        type: 'INVOICE' | 'PAYMENT' | 'UDHAAR';
        title: string;
        subtitle: string;
        totalAmount: number;
        paidAmount?: number;
        pendingAmount?: number;
        time: string;
        badge?: string;
        invoiceObj?: Invoice;
      }>;
    }>();

    // 1. Process Invoices
    invoices.forEach((inv) => {
      const d = new Date(inv.invoiceDate);
      const key = d.toISOString().split('T')[0];
      const pending = Math.max(0, inv.totalAmount - inv.paidAmount);

      if (!dayMap.has(key)) {
        dayMap.set(key, {
          dateStr: key,
          dateObj: d,
          displayDate: d.toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          totalBilled: 0,
          totalPaid: 0,
          items: [],
        });
      }

      const day = dayMap.get(key)!;
      day.totalBilled += inv.totalAmount;
      day.totalPaid += inv.paidAmount;
      day.items.push({
        id: inv.id,
        type: 'INVOICE',
        title: `Bill #${inv.invoiceNumber}`,
        subtitle: `Mode: ${inv.paymentMode} • Billed by ${inv.createdByName || 'Cashier'}`,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        pendingAmount: pending,
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: inv.paymentStatus,
        invoiceObj: inv,
      });
    });

    // 2. Process Direct Ledger Transactions
    transactions.forEach((txn) => {
      const isInvoiceTxn = txn.description?.toLowerCase().includes('pos bill') || txn.description?.toLowerCase().includes('invoice');
      if (isInvoiceTxn) return;

      const d = new Date(txn.txnDate);
      const key = d.toISOString().split('T')[0];
      const isCredit = txn.txnType === 'CREDIT';

      if (!dayMap.has(key)) {
        dayMap.set(key, {
          dateStr: key,
          dateObj: d,
          displayDate: d.toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          totalBilled: 0,
          totalPaid: 0,
          items: [],
        });
      }

      const day = dayMap.get(key)!;
      if (isCredit) {
        day.totalPaid += txn.amount;
      } else {
        day.totalBilled += txn.amount;
      }

      day.items.push({
        id: txn.id,
        type: isCredit ? 'PAYMENT' : 'UDHAAR',
        title: isCredit ? 'Payment Received' : 'Udhaar Given',
        subtitle: `${txn.description || 'Ledger Entry'} (${txn.paymentMode})`,
        totalAmount: txn.amount,
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });

    return Array.from(dayMap.values()).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[500px] lg:h-[calc(100vh-8.5rem)] flex-1">
      {/* Left Column: Party List */}
      <div className={`lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden ${
        selectedParty ? 'hidden lg:flex' : 'flex'
      }`}>
        {/* Type Switcher & Add Button */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setPartyType('CUSTOMER');
                  setSelectedParty(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  partyType === 'CUSTOMER'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customers (Grahak)
              </button>
              <button
                onClick={() => {
                  setPartyType('SUPPLIER');
                  setSelectedParty(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  partyType === 'SUPPLIER'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Suppliers (Vyapari)
              </button>
            </div>

            <button
              onClick={() => setShowAddPartyModal(true)}
              className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add {partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${partyType.toLowerCase()} by name or phone...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Balance Filter & Sort Dropdowns */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="ALL">⚖️ All Balances</option>
              <option value="YOU_WILL_GET">🟢 You Will Get (Udhaar)</option>
              <option value="YOU_WILL_GIVE">🔴 You Will Give (Advance)</option>
              <option value="SETTLED">⚪ Settled (₹0)</option>
            </select>

            <select
              value={partySort}
              onChange={(e) => setPartySort(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="NAME_ASC">🔤 Name (A → Z)</option>
              <option value="NAME_DESC">🔤 Name (Z → A)</option>
              <option value="BALANCE_DESC">💰 Highest Udhaar</option>
              <option value="BALANCE_ASC">💳 Lowest / Advance</option>
            </select>
          </div>

          {/* Active / Inactive / All Status Pills & Export Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPartyActiveFilter('ACTIVE')}
                className={`flex-1 py-1 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                  partyActiveFilter === 'ACTIVE'
                    ? 'bg-white text-emerald-700 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Active</span>
              </button>
              <button
                type="button"
                onClick={() => setPartyActiveFilter('INACTIVE')}
                className={`flex-1 py-1 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                  partyActiveFilter === 'INACTIVE'
                    ? 'bg-white text-rose-700 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>Archived</span>
              </button>
              <button
                type="button"
                onClick={() => setPartyActiveFilter('ALL')}
                className={`flex-1 py-1 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                  partyActiveFilter === 'ALL'
                    ? 'bg-white text-indigo-700 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All ({parties.length})</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold text-slate-400">
                {filteredParties.length} {partyType === 'CUSTOMER' ? 'customers' : 'suppliers'} found
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => exportPartiesToExcel(filteredParties, partyType, activeTenant?.name || 'Store', currency)}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                  title={`Export ${partyType.toLowerCase()}s to Excel`}
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportPartiesToPdf(filteredParties, partyType, activeTenant?.name || 'Store', currency)}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                  title={`Export ${partyType.toLowerCase()}s to PDF`}
                >
                  <FileText className="w-3 h-3 text-rose-600" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Party List items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {paginatedParties.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No {partyType.toLowerCase()}s found matching filters.</p>
              <p className="text-xs text-slate-400 mt-1">Adjust filters or click "Add" above.</p>
            </div>
          ) : (
            paginatedParties.map((party) => {
              const isSelected = selectedParty?.id === party.id;
              const owesMoney = party.currentBalance > 0;
              const youOwe = party.currentBalance < 0;

              return (
                <div
                  key={party.id}
                  onClick={() => handleSelectParty(party)}
                  className={`p-4 cursor-pointer transition flex items-center justify-between ${
                    isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                      {party.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <h4 className="font-semibold text-slate-900 text-sm">{party.name}</h4>
                        {party.nativeName && (
                          <span className="text-xs text-slate-500 font-normal">({party.nativeName})</span>
                        )}
                      </div>
                      {party.phone && (
                        <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{party.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        owesMoney
                          ? 'text-emerald-700'
                          : youOwe
                          ? 'text-rose-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {currency}{Math.abs(party.currentBalance).toLocaleString()}
                    </span>
                    <p className="text-[10px] uppercase font-semibold text-slate-400">
                      {owesMoney ? 'You will get' : youOwe ? 'You will give' : 'Settled'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Party Directory Pagination */}
        <Pagination
          currentPage={partyPage}
          totalItems={filteredParties.length}
          pageSize={partyPageSize}
          onPageChange={(p) => setPartyPage(p)}
          onPageSizeChange={(s) => setPartyPageSize(s)}
          pageSizeOptions={[10, 15, 25, 50]}
        />
      </div>

      {/* Right Column: Ledger Detail Drawer */}
      <div className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden ${
        selectedParty ? 'flex' : 'hidden lg:flex'
      }`}>
        {selectedParty ? (
          <>
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {/* Mobile Back Button */}
                <div className="lg:hidden mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedParty(null)}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs transition"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                    <span>← Back to {partyType === 'CUSTOMER' ? 'Customers' : 'Suppliers'}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    {selectedParty.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-lg">{selectedParty.name}</h3>
                      {selectedParty.nativeName && (
                        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {selectedParty.nativeName}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center space-x-1 ${
                        selectedParty.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedParty.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span>{selectedParty.isActive ? 'Active' : 'Archived'}</span>
                      </span>

                      {selectedParty.isActive ? (
                        <button
                          type="button"
                          onClick={() => setDeactivatingParty(selectedParty)}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200 transition inline-flex items-center space-x-1"
                          title="Deactivate account (soft-delete)"
                        >
                          <Archive className="w-3 h-3" />
                          <span>Deactivate</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTogglePartyActive(selectedParty)}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition inline-flex items-center space-x-1"
                          title="Restore account"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                      {selectedParty.phone && <span>📞 {selectedParty.phone}</span>}
                      {selectedParty.address && <span>📍 {selectedParty.address}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Running Balance Banner */}
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-right self-start sm:self-auto">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Net Balance
                </p>
                <h4
                  className={`text-xl font-bold ${
                    selectedParty.currentBalance > 0
                      ? 'text-emerald-600'
                      : selectedParty.currentBalance < 0
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {currency}{Math.abs(selectedParty.currentBalance).toLocaleString()}
                  <span className="text-xs ml-1 font-medium">
                    {selectedParty.currentBalance > 0
                      ? '(You Will Get)'
                      : selectedParty.currentBalance < 0
                      ? '(You Will Give)'
                      : '(Settled)'}
                  </span>
                </h4>
              </div>
            </div>

            {/* AI Credit Risk Assessment Banner */}
            {partyType === 'CUSTOMER' && (() => {
              const risk = assessPartyCreditRisk(selectedParty);
              return (
                <div className="px-6 pb-3 bg-white">
                  <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition ${
                    risk.tier === 'SAFE'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : risk.tier === 'MODERATE'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-current shrink-0"></span>
                      <div>
                        <span className="font-bold">AI Credit Score: {risk.label}</span>
                        <p className="text-[11px] opacity-90 mt-0.5">{risk.recommendation}</p>
                      </div>
                    </div>
                    {selectedParty.creditLimit > 0 && (
                      <div className="sm:text-right shrink-0">
                        <span className="text-[11px] font-semibold block">
                          Credit Limit: {currency}{selectedParty.creditLimit.toLocaleString()}
                        </span>
                        <span className="text-[10px] opacity-75">
                          {risk.limitUtilizationPct}% Limit Utilized
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Action Bar (Settle Udhaar / You Gave / You Got) */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {/* Primary Spotlight: Settle Udhaar & Reconcile Bills */}
                <button
                  onClick={() => openSettleModal()}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition active:scale-95"
                  title="Settle customer credit across pending bills with auto-reconciliation"
                >
                  <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                  <span>Settle Udhaar & Bills</span>
                  {pendingInvoices.length > 0 && (
                    <span className="bg-indigo-800/80 text-[11px] font-bold px-1.5 py-0.5 rounded-full text-indigo-100">
                      {pendingInvoices.length} Due
                    </span>
                  )}
                </button>

                {/* Red: You Gave / Udhaar */}
                <button
                  onClick={() => {
                    setTxnType('DEBIT');
                    setShowTxnModal(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>You Gave (Udhaar)</span>
                </button>

                {/* Green: You Got / Jama */}
                <button
                  onClick={() => {
                    setTxnType('CREDIT');
                    setShowTxnModal(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Direct Jama</span>
                </button>
              </div>

              {selectedParty.phone && activeTenant && (
                <div className="flex flex-wrap items-center gap-1.5 bg-emerald-50/80 p-1.5 rounded-2xl border border-emerald-200 text-xs w-full sm:w-auto">
                  <span className="text-emerald-800 font-bold px-1.5 flex items-center space-x-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Reminder:</span>
                  </span>
                  {(['HI', 'GU', 'EN'] as const).map((lang) => (
                    <button
                      type="button"
                      key={lang}
                      onClick={() => sendWhatsAppReminderDirect(selectedParty, activeTenant, lang, waTarget)}
                      className="px-2.5 py-1 rounded-xl font-bold bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 shadow-xs border border-emerald-200 transition text-[11px] active:scale-95"
                      title={`Send WhatsApp payment reminder directly (no extra tabs) in ${
                        lang === 'HI' ? 'Hindi' : lang === 'GU' ? 'Gujarati' : 'English'
                      }`}
                    >
                      {lang === 'HI' ? 'हिंदी' : lang === 'GU' ? 'ગુજરાતી' : 'English'}
                    </button>
                  ))}
                </div>
              )}

              {/* Statement Export to Excel & PDF */}
              <div className="flex items-center space-x-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => exportStatementToExcel(selectedParty, transactions, activeTenant?.name || 'Store', currency)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs border border-slate-200"
                  title="Export Statement to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Statement Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportStatementToPdf(selectedParty, transactions, activeTenant?.name || 'Store', currency)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs border border-slate-200"
                  title="Export Statement to PDF (.pdf)"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>Statement PDF</span>
                </button>
              </div>
            </div>

            {/* Sub-Tab Navigation for Selected Customer */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActivePartyTab('DAY_BY_DAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  activePartyTab === 'DAY_BY_DAY'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Day-by-Day Statement</span>
                <span className="bg-slate-700/50 text-[10px] px-1.5 py-0.5 rounded-full">{getDayByDayHistory().length} days</span>
              </button>

              <button
                onClick={() => setActivePartyTab('INVOICES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  activePartyTab === 'INVOICES'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Bills & Pending Dues</span>
                <span className="bg-slate-700/50 text-[10px] px-1.5 py-0.5 rounded-full">{invoices.length}</span>
              </button>

              <button
                onClick={() => setActivePartyTab('TXN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  activePartyTab === 'TXN'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ledger Cashbook</span>
                <span className="bg-slate-700/50 text-[10px] px-1.5 py-0.5 rounded-full">{transactions.length}</span>
              </button>
            </div>

            {/* Sub-Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* TAB 1: DAY-BY-DAY STATEMENT */}
              {activePartyTab === 'DAY_BY_DAY' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Day-by-Day Chronological Statement (Passbook)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Daily invoice billing, payments received, and running dues history
                      </p>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center space-x-1"
                      title="Print Day-by-Day Statement"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Print Statement</span>
                    </button>
                  </div>

                  {getDayByDayHistory().length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
                      <p className="text-sm font-medium">No day-by-day activity recorded yet.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Invoices and payments for {selectedParty.name} will appear organized by date here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {getDayByDayHistory().map((day) => (
                        <div key={day.dateStr} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                          {/* Day Header */}
                          <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-indigo-600" />
                              <span className="font-bold text-xs text-slate-900">{day.displayDate}</span>
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] font-semibold">
                              {day.totalBilled > 0 && (
                                <span className="text-indigo-700">Billed: {currency}{day.totalBilled.toFixed(2)}</span>
                              )}
                              {day.totalPaid > 0 && (
                                <span className="text-emerald-700">Paid: {currency}{day.totalPaid.toFixed(2)}</span>
                              )}
                              <span className={day.totalBilled - day.totalPaid > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                                Net: {day.totalBilled - day.totalPaid > 0 ? '+' : ''}{currency}{(day.totalBilled - day.totalPaid).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Day Line Items */}
                          <div className="divide-y divide-slate-100 p-2">
                            {day.items.map((item) => (
                              <div key={item.id} className="p-2.5 hover:bg-slate-50/80 rounded-lg flex items-center justify-between transition">
                                <div className="flex items-start space-x-2.5">
                                  <div className="mt-0.5">
                                    {item.type === 'INVOICE' ? (
                                      <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 inline-block">
                                        <Receipt className="w-4 h-4" />
                                      </span>
                                    ) : item.type === 'PAYMENT' ? (
                                      <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 inline-block">
                                        <ArrowDownLeft className="w-4 h-4" />
                                      </span>
                                    ) : (
                                      <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 inline-block">
                                        <ArrowUpRight className="w-4 h-4" />
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-xs text-slate-900">{item.title}</span>
                                      {item.badge && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                          item.badge === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                          item.badge === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                                          item.badge === 'RETURNED' ? 'bg-purple-100 text-purple-800' :
                                          item.badge === 'PARTIALLY_RETURNED' ? 'bg-orange-100 text-orange-800' :
                                          item.badge === 'REFUNDED' ? 'bg-indigo-100 text-indigo-800' :
                                          'bg-rose-100 text-rose-800'
                                        }`}>
                                          {item.badge}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400">{item.time}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</p>
                                  </div>
                                </div>

                                <div className="text-right flex items-center space-x-3">
                                  <div>
                                    <div className={`text-xs font-bold ${item.type === 'PAYMENT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                      {item.type === 'PAYMENT' ? '+' : ''}{currency}{item.totalAmount.toFixed(2)}
                                    </div>
                                    {item.pendingAmount !== undefined && item.pendingAmount > 0 && (
                                      <div className="text-[10px] font-bold text-rose-600">
                                        Due: {currency}{item.pendingAmount.toFixed(2)}
                                      </div>
                                    )}
                                  </div>

                                  {item.invoiceObj && (
                                    <div className="flex items-center space-x-1">
                                      {item.pendingAmount !== undefined && item.pendingAmount > 0 && (
                                        <button
                                          onClick={() => handleSettleInvoice(item.invoiceObj!)}
                                          className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-xs flex items-center space-x-1"
                                          title="Collect payment for this bill"
                                        >
                                          <Zap className="w-3 h-3" />
                                          <span>Pay Due</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={async () => {
                                          try {
                                            const res = await api.getInvoice(item.invoiceObj!.id);
                                            setSelectedInvoice(res.data);
                                            setShowInvoiceModal(true);
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                                        title="View Bill Receipt"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}

                                  {!item.invoiceObj && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const txn = transactions.find(t => t.id === item.id);
                                        if (txn) setDeactivatingTxn(txn);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                      title="Soft-Delete / Reverse this ledger entry"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INVOICES & PENDING DUES */}
              {activePartyTab === 'INVOICES' && (() => {
                const totalBilled = invoices.reduce((a, b) => a + b.totalAmount, 0);
                const totalPaid = invoices.reduce((a, b) => a + b.paidAmount, 0);
                const totalPending = Math.max(0, invoices.reduce((a, b) => a + (b.totalAmount - b.paidAmount), 0));
                const pendingInvoices = invoices.filter((i) => i.totalAmount - i.paidAmount > 0);
                const displayedInvoices = invoiceDueFilter === 'PENDING' ? pendingInvoices : invoices;

                return (
                  <div className="space-y-4">
                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Total Bills</span>
                        <div className="text-base font-black text-slate-800 mt-0.5">{invoices.length}</div>
                      </div>
                      <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
                        <span className="text-[10px] font-bold uppercase text-indigo-500">Total Billed</span>
                        <div className="text-base font-black text-indigo-700 mt-0.5">{currency}{totalBilled.toFixed(2)}</div>
                      </div>
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold uppercase text-emerald-500">Total Paid</span>
                        <div className="text-base font-black text-emerald-700 mt-0.5">{currency}{totalPaid.toFixed(2)}</div>
                      </div>
                      <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
                        <span className="text-[10px] font-bold uppercase text-rose-500">Pending to Pay</span>
                        <div className="text-base font-black text-rose-700 mt-0.5">{currency}{totalPending.toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        <button
                          onClick={() => setInvoiceDueFilter('ALL')}
                          className={`px-3 py-1 rounded-lg transition ${
                            invoiceDueFilter === 'ALL'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          All Bills ({invoices.length})
                        </button>
                        <button
                          onClick={() => setInvoiceDueFilter('PENDING')}
                          className={`px-3 py-1 rounded-lg transition flex items-center space-x-1 ${
                            invoiceDueFilter === 'PENDING'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>Pending to Pay ({pendingInvoices.length})</span>
                        </button>
                      </div>

                      {totalPending > 0 && (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          {currency}{totalPending.toFixed(2)} Total Due
                        </span>
                      )}
                    </div>

                    {/* Invoices List */}
                    {displayedInvoices.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-500" />
                        <p className="text-sm font-medium">
                          {invoiceDueFilter === 'PENDING' ? 'No pending unpaid bills! All clear.' : 'No bills found.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {displayedInvoices.map((inv) => {
                          const balance = inv.totalAmount - inv.paidAmount;
                          return (
                            <div
                              key={inv.id}
                              className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                                balance > 0
                                  ? 'bg-rose-50/30 border-rose-200/80 hover:bg-rose-50/60'
                                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                              }`}
                            >
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-xs text-indigo-600">{inv.invoiceNumber}</span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                      inv.paymentStatus === 'PAID'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : inv.paymentStatus === 'PARTIAL'
                                        ? 'bg-amber-100 text-amber-800'
                                        : inv.paymentStatus === 'RETURNED'
                                        ? 'bg-purple-100 text-purple-800'
                                        : inv.paymentStatus === 'PARTIALLY_RETURNED'
                                        ? 'bg-orange-100 text-orange-800'
                                        : inv.paymentStatus === 'REFUNDED'
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {inv.paymentStatus}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {new Date(inv.invoiceDate).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  Billed by: {inv.createdByName || 'Cashier'} • Mode: {inv.paymentMode}
                                </p>
                              </div>

                              <div className="flex items-center space-x-3 text-right">
                                <div>
                                  <div className="text-sm font-bold text-slate-900">
                                    {currency}{inv.totalAmount.toFixed(2)}
                                  </div>
                                  {balance > 0 ? (
                                    <div className="text-[11px] text-rose-600 font-bold">
                                      Due: {currency}{balance.toFixed(2)}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-emerald-600 font-medium">Fully Paid</div>
                                  )}
                                </div>

                                <div className="flex items-center space-x-1.5">
                                  {balance > 0 && (
                                    <button
                                      onClick={() => handleSettleInvoice(inv)}
                                      className="px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs flex items-center space-x-1"
                                      title="Collect & Settle this Bill"
                                    >
                                      <Zap className="w-3 h-3" />
                                      <span>Settle Bill</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await api.getInvoice(inv.id);
                                        setSelectedInvoice(res.data);
                                        setShowInvoiceModal(true);
                                      } catch (err) {
                                        console.error('Failed to load bill receipt', err);
                                      }
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                    title="View Bill Receipt"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 3: LEDGER CASHBOOK */}
              {activePartyTab === 'TXN' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Ledger Cashbook Transactions ({filteredTransactions.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Detailed entry-by-entry records of Udhaar given and payments collected
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Txn Type Filter */}
                      <select
                        value={txnTypeFilter}
                        onChange={(e) => setTxnTypeFilter(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                      >
                        <option value="ALL">All Entries</option>
                        <option value="DEBIT">🔴 You Gave (Udhaar)</option>
                        <option value="CREDIT">🟢 You Got (Jama)</option>
                      </select>

                      {/* Date Range Filter */}
                      <select
                        value={txnDateRange}
                        onChange={(e) => setTxnDateRange(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                      >
                        <option value="ALL">📅 All Time</option>
                        <option value="THIS_MONTH">This Month</option>
                        <option value="LAST_30">Last 30 Days</option>
                        <option value="LAST_90">Last 90 Days</option>
                      </select>

                      {/* Sort Order */}
                      <select
                        value={`${txnSortField}_${txnSortDir}`}
                        onChange={(e) => {
                          const [field, dir] = e.target.value.split('_');
                          setTxnSortField(field as any);
                          setTxnSortDir(dir as any);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                      >
                        <option value="date_DESC">⏱️ Date (Newest First)</option>
                        <option value="date_ASC">⏱️ Date (Oldest First)</option>
                        <option value="amount_DESC">💰 Amount (High → Low)</option>
                        <option value="amount_ASC">💰 Amount (Low → High)</option>
                      </select>
                    </div>
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <p className="text-sm">No transactions match current filters.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Use the buttons above to record Udhaar or Payments.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {paginatedTransactions.map((txn) => {
                        const isDebit = txn.txnType === 'DEBIT';
                        return (
                          <div
                            key={txn.id}
                            className="bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between transition"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                    isDebit
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isDebit ? 'You Gave' : 'You Got'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(txn.txnDate).toLocaleDateString()} • {txn.paymentMode}
                                </span>
                              </div>
                              {txn.description && (
                                <p className="text-xs text-slate-700 font-medium mt-1">
                                  {txn.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 text-right">
                              <span
                                className={`text-base font-bold ${
                                  isDebit ? 'text-rose-600' : 'text-emerald-600'
                                }`}
                              >
                                {isDebit ? '-' : '+'}{currency}{txn.amount.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => setDeactivatingTxn(txn)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Soft-Delete / Reverse Transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Pagination Controls */}
                      <Pagination
                        currentPage={txnPage}
                        totalItems={filteredTransactions.length}
                        pageSize={txnPageSize}
                        onPageChange={(p) => setTxnPage(p)}
                        onPageSizeChange={(s) => setTxnPageSize(s)}
                        pageSizeOptions={[10, 15, 25, 50]}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <h4 className="font-semibold text-slate-700 text-base">Select a {partyType.toLowerCase()}</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
              Choose an account from the left list to view their ledger statement, record payments, and manage credit.
            </p>
          </div>
        )}
      </div>

      {/* Add Party Modal */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 my-auto max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-semibold text-base">
                Add New {partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'}
              </h3>
              <button onClick={() => setShowAddPartyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Full Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Native / Regional Name (स्थानीय नाम / પ્રાદેશિક નામ)
                </label>
                <input
                  type="text"
                  placeholder="e.g. रमेश कुमार / રમેશભાઈ"
                  value={newNativeName}
                  onChange={(e) => setNewNativeName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9823456789"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Opening Balance ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newOpeningBalance}
                    onChange={(e) => setNewOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Positive: They owe you</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Credit Limit ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5000.00"
                    value={newCreditLimit}
                    onChange={(e) => setNewCreditLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Transaction Modal */}
      {showTxnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 my-auto max-h-[90vh] flex flex-col">
            <div
              className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
                txnType === 'DEBIT' ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <h3 className={`font-semibold text-base ${txnType === 'DEBIT' ? 'text-rose-800' : 'text-emerald-800'}`}>
                {txnType === 'DEBIT' ? 'Record: You Gave (Udhaar)' : 'Record: You Got (Payment/Jama)'}
              </h3>
              <button onClick={() => setShowTxnModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Amount ({currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  autoFocus
                  value={txnAmount}
                  onChange={(e) => setTxnAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xl font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={txnMode}
                  onChange={(e) => setTxnMode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="BANK">Bank Transfer (NEFT/IMPS)</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Notes / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grocery purchase, bill settlement"
                  value={txnDescription}
                  onChange={(e) => setTxnDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTxnModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm transition ${
                    txnType === 'DEBIT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  Confirm Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill / Invoice Receipt Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm">Invoice #{selectedInvoice.invoice.invoiceNumber}</h4>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 w-full max-w-[320px] text-xs font-mono">
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                  {activeTenant?.logoUrl && (
                    <img 
                      src={activeTenant.logoUrl} 
                      alt="Shop Logo" 
                      className="w-12 h-12 object-contain mx-auto mb-1.5 rounded-lg border border-slate-200"
                    />
                  )}
                  <h3 className="font-bold text-base tracking-tight">{activeTenant?.name}</h3>
                  {activeTenant?.tagline && (
                    <p className="text-[11px] text-slate-600 italic font-sans">{activeTenant.tagline}</p>
                  )}
                  {activeTenant?.gstin && (
                    <p className="text-[10px] font-mono text-slate-700">GSTIN: {activeTenant.gstin}</p>
                  )}
                  {activeTenant?.phone && <p>Tel: {activeTenant?.phone}</p>}
                  {activeTenant?.address && <p>{activeTenant?.address}</p>}
                  {activeTenant?.printHeaderNote && (
                    <p className="text-[10px] text-indigo-700 font-sans mt-1 bg-indigo-50/70 p-1 rounded">
                      {activeTenant.printHeaderNote}
                    </p>
                  )}
                </div>

                <div className="flex justify-between mb-1">
                  <span>Inv: {selectedInvoice.invoice.invoiceNumber}</span>
                  <span>{new Date(selectedInvoice.invoice.invoiceDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Customer: {selectedInvoice.invoice.partyName}</span>
                </div>
                <div className="flex justify-between mb-3 text-[10px] text-slate-500">
                  <span>Biller: {selectedInvoice.invoice.createdByName || 'Staff'}</span>
                </div>

                <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                  {selectedInvoice.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>
                        {it.itemName}
                        {it.nativeName && <span className="text-[10px] text-slate-500 ml-1">({it.nativeName})</span>}
                        {' '}x{it.quantity}
                      </span>
                      <span>{currency}{it.total?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="py-2 space-y-1 font-bold">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>{currency}{selectedInvoice.invoice.totalAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-normal">
                    <span>Paid ({selectedInvoice.invoice.paymentMode}):</span>
                    <span>{currency}{selectedInvoice.invoice.paidAmount?.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.invoice.totalAmount - selectedInvoice.invoice.paidAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Khata Due:</span>
                      <span>{currency}{(selectedInvoice.invoice.totalAmount - selectedInvoice.invoice.paidAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 whitespace-pre-line">
                  {activeTenant?.printFooterNote || 'Thank You for Shopping! Please Visit Again.'}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end space-x-3 bg-white">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Udhaar & Reconcile Bills Modal */}
      {showSettleModal && selectedParty && (() => {
        const parsedAmount = parseFloat(settleAmount) || 0;
        const totalPendingDue = pendingInvoices.reduce((a, b) => a + (b.totalAmount - b.paidAmount), 0);
        const fifoPreview = getFifoAllocationPreview(parsedAmount);
        const totalAllocated = useCustomAllocation
          ? Object.values(customAllocations).reduce((a, b) => a + (b || 0), 0)
          : Math.min(parsedAmount, totalPendingDue);
        const projectedRemainingDue = Math.max(0, totalPendingDue - parsedAmount);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-900 my-8 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-indigo-50 via-slate-50 to-emerald-50 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Zap className="w-5 h-5 fill-amber-300 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Settle Udhaar & Reconcile Bills
                    </h3>
                    <p className="text-xs text-slate-500">
                      Customer: <span className="font-semibold text-slate-800">{selectedParty.name}</span>
                      {selectedParty.phone && <span className="ml-1 text-slate-400">({selectedParty.phone})</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettleModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Due Summary Card */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Khata Balance</span>
                    <div className="text-base font-black text-rose-600 mt-0.5">
                      {currency}{Math.abs(selectedParty.currentBalance).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pending Bills</span>
                    <div className="text-base font-black text-indigo-700 mt-0.5">
                      {currency}{totalPendingDue.toFixed(2)}
                      <span className="text-[11px] font-medium text-slate-400 ml-1">
                        ({pendingInvoices.length} {pendingInvoices.length === 1 ? 'bill' : 'bills'})
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">After Payment Due</span>
                    <div className={`text-base font-black mt-0.5 ${projectedRemainingDue === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {currency}{projectedRemainingDue.toFixed(2)}
                      {projectedRemainingDue === 0 && parsedAmount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">
                          All Cleared!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleConfirmSettlement} id="settle-udhaar-form" className="space-y-4">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Amount Received ({currency}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                        {currency}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        autoFocus
                        placeholder="0.00"
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-2xl font-black text-slate-900 border-2 border-indigo-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition"
                      />
                    </div>

                    {/* Quick Amount Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Select:</span>
                      {totalPendingDue > 0 && (
                        <button
                          type="button"
                          onClick={() => setSettleAmount(totalPendingDue.toFixed(2))}
                          className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition"
                        >
                          Full Due ({currency}{totalPendingDue.toFixed(2)})
                        </button>
                      )}
                      {pendingInvoices.map((inv) => {
                        const due = inv.totalAmount - inv.paidAmount;
                        return (
                          <button
                            key={inv.id}
                            type="button"
                            onClick={() => setSettleAmount(due.toFixed(2))}
                            className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          >
                            Bill #{inv.invoiceNumber} ({currency}{due.toFixed(2)})
                          </button>
                        );
                      })}
                      {[1000, 2000, 3000, 4000, 5000].filter((val) => val <= totalPendingDue && !pendingInvoices.some((inv) => (inv.totalAmount - inv.paidAmount) === val)).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSettleAmount(val.toString())}
                          className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          {currency}{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Mode & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Payment Mode
                      </label>
                      <select
                        value={settleMode}
                        onChange={(e) => setSettleMode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="CASH">💵 Cash</option>
                        <option value="UPI">📲 UPI / PhonePe / GPay</option>
                        <option value="BANK">🏦 Bank Transfer (NEFT/IMPS)</option>
                        <option value="CHEQUE">📝 Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Notes / Reference No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GPay ref 892348, Counter cash"
                        value={settleNotes}
                        onChange={(e) => setSettleNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Allocation Mode Toggle */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Bill Reconcile Breakdown:
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {useCustomAllocation ? '(Custom allocation)' : '(Automatic FIFO - Oldest Bill First)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseCustomAllocation(!useCustomAllocation)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center space-x-1"
                      >
                        <Split className="w-3.5 h-3.5" />
                        <span>{useCustomAllocation ? 'Switch to Auto FIFO' : 'Customize Split'}</span>
                      </button>
                    </div>

                    {/* Pending Invoices Preview List */}
                    {pendingInvoices.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                        No unpaid pending invoices found. The full amount ({currency}{parsedAmount.toFixed(2)}) will be credited to customer khata.
                      </div>
                    ) : (
                      <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-56 overflow-y-auto">
                        {fifoPreview.map((item) => {
                          const customVal = customAllocations[item.invoice.id] !== undefined
                            ? customAllocations[item.invoice.id]
                            : item.allocated;

                          return (
                            <div
                              key={item.invoice.id}
                              className={`p-2.5 rounded-lg border text-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                item.isFullyPaid
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                  : item.isPartial
                                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-indigo-700">
                                  #{item.invoice.invoiceNumber}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  {new Date(item.invoice.invoiceDate).toLocaleDateString()}
                                </span>
                                <span className="text-slate-500 font-medium">
                                  (Due: {currency}{item.due.toFixed(2)})
                                </span>
                              </div>

                              <div className="flex items-center space-x-3">
                                {useCustomAllocation ? (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[11px] text-slate-500 font-semibold">Pay: {currency}</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={item.due}
                                      value={customVal || ''}
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value) || 0;
                                        setCustomAllocations((prev) => ({
                                          ...prev,
                                          [item.invoice.id]: Math.min(v, item.due),
                                        }));
                                      }}
                                      className="w-20 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-right font-bold"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-right">
                                    <span className="font-bold text-xs">
                                      + {currency}{item.allocated.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] block opacity-75">
                                      {item.remainingDue === 0 ? 'Rem: ₹0.00' : `Rem: ${currency}${item.remainingDue.toFixed(2)}`}
                                    </span>
                                  </div>
                                )}

                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    item.isFullyPaid
                                      ? 'bg-emerald-200 text-emerald-800'
                                      : item.isPartial
                                      ? 'bg-amber-200 text-amber-900'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {item.isFullyPaid ? '✅ Fully Paid' : item.isPartial ? '⚠️ Partial' : '⏳ Pending'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanatory summary */}
                    {parsedAmount > 0 && (
                      <p className="text-[11px] text-slate-500 mt-2 bg-indigo-50/60 p-2 rounded-lg border border-indigo-100 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>
                          {currency}{parsedAmount.toFixed(2)} will allocate{' '}
                          <span className="font-bold text-indigo-900">
                            {currency}{totalAllocated.toFixed(2)}
                          </span>{' '}
                          across {pendingInvoices.filter((_, idx) => fifoPreview[idx]?.allocated > 0).length} pending bill(s).
                          {parsedAmount > totalPendingDue && (
                            <span className="font-bold text-emerald-700 ml-1">
                              Surplus of {currency}{(parsedAmount - totalPendingDue).toFixed(2)} added as khata credit!
                            </span>
                          )}
                        </span>
                      </p>
                    )}

                    {/* Auto Send WhatsApp Receipt Option */}
                    {selectedParty.phone && (
                      <div className="mt-3 flex items-center justify-between text-xs bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoSendReceipt}
                            onChange={(e) => {
                              setAutoSendReceipt(e.target.checked);
                              localStorage.setItem('khatabook_auto_settle_receipt', e.target.checked ? 'true' : 'false');
                            }}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <span className="font-semibold text-emerald-950 flex items-center space-x-1">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Auto-send receipt to WhatsApp ({selectedParty.phone})</span>
                          </span>
                        </label>

                        <select
                          value={waTarget}
                          onChange={(e) => {
                            const val = e.target.value as WhatsAppTarget;
                            setWaTarget(val);
                            setWhatsAppTargetPreference(val);
                          }}
                          className="text-[10px] font-bold bg-white text-slate-700 border border-emerald-300 rounded px-1.5 py-1 focus:outline-none"
                        >
                          <option value="DESKTOP_APP">⚡ App (No Tabs)</option>
                          <option value="WEB_POPUP">🌐 Web Popup</option>
                        </select>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="settle-udhaar-form"
                  disabled={settling || parsedAmount <= 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-2"
                >
                  {settling ? (
                    <span>Processing Settlement...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Udhaar Settlement ({currency}{parsedAmount.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Settlement Receipt & WhatsApp Share Modal */}
      {showSettlementReceiptModal && settlementResult && selectedParty && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 flex flex-col max-h-[92vh]">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-emerald-50">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-sm text-emerald-900">Udhaar Settlement Successful!</h4>
              </div>
              <button
                onClick={() => setShowSettlementReceiptModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 w-full max-w-[340px] text-xs font-mono">
                {/* Shop Header */}
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                  {activeTenant?.logoUrl && (
                    <img 
                      src={activeTenant.logoUrl} 
                      alt="Shop Logo" 
                      className="w-12 h-12 object-contain mx-auto mb-1.5 rounded-lg border border-slate-200"
                    />
                  )}
                  <h3 className="font-bold text-base tracking-tight">{activeTenant?.name}</h3>
                  {activeTenant?.tagline && (
                    <p className="text-[11px] text-slate-600 italic font-sans">{activeTenant.tagline}</p>
                  )}
                  {activeTenant?.gstin && (
                    <p className="text-[10px] font-mono text-slate-700">GSTIN: {activeTenant.gstin}</p>
                  )}
                  {activeTenant?.phone && <p>Tel: {activeTenant?.phone}</p>}
                  {activeTenant?.address && <p>{activeTenant?.address}</p>}

                  <div className="mt-2 py-1 px-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] font-sans font-bold text-emerald-800">
                    🤝 UDHAAR PAYMENT RECEIPT
                  </div>
                </div>

                {/* Receipt Meta */}
                <div className="space-y-1 mb-2 text-[11px]">
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold">{selectedParty.name}</span>
                  </div>
                  {selectedParty.phone && (
                    <div className="flex justify-between text-slate-500">
                      <span>Phone:</span>
                      <span>{selectedParty.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Payment Mode:</span>
                    <span className="font-bold uppercase">{settleMode}</span>
                  </div>
                </div>

                {/* Amount Paid Box */}
                <div className="my-3 p-2.5 bg-emerald-500 text-white rounded-lg text-center">
                  <div className="text-[10px] uppercase tracking-wider font-sans font-bold opacity-90">
                    Amount Received
                  </div>
                  <div className="text-xl font-black font-sans mt-0.5">
                    {currency}{settlementResult.totalPaid.toFixed(2)}
                  </div>
                </div>

                {/* Balance Summary */}
                <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5 font-bold">
                  <div className="flex justify-between text-slate-600 font-normal">
                    <span>Previous Udhaar Balance:</span>
                    <span>{currency}{settlementResult.previousBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Amount Settled:</span>
                    <span>- {currency}{settlementResult.totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 border-t border-slate-200 pt-1">
                    <span>Remaining Balance Due:</span>
                    <span className={settlementResult.newBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      {currency}{settlementResult.newBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Settled Invoices List */}
                {settlementResult.settledInvoices && settlementResult.settledInvoices.length > 0 && (
                  <div className="py-2.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 font-sans block mb-1">
                      Bills Reconciled:
                    </span>
                    {settlementResult.settledInvoices.map((inv: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] bg-slate-50 p-1 rounded">
                        <div>
                          <span className="font-bold">Bill #{inv.invoiceNumber}</span>
                          <span className="text-[10px] text-slate-500 block">
                            (Total {currency}{inv.totalAmount.toFixed(2)})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-700">
                            +{currency}{inv.allocatedAmount.toFixed(2)}
                          </span>
                          <span className={`text-[9px] block font-bold ${inv.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {inv.status === 'PAID' ? 'CLEARED' : `DUE ${currency}${inv.remainingDue.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 whitespace-pre-line font-sans">
                  {activeTenant?.printFooterNote || 'Thank you for your payment! Please visit again.'}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white">
              <button
                onClick={() => setShowSettlementReceiptModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Done
              </button>

              <div className="flex items-center space-x-2">
                {selectedParty.phone && activeTenant && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        sendWhatsAppSettlementReceiptDirect(settlementResult, selectedParty, activeTenant, settleMode, waTarget);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 transition active:scale-95"
                      title="Send WhatsApp receipt directly (no extra browser tab)"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Receipt</span>
                    </button>
                    <select
                      value={waTarget}
                      onChange={(e) => {
                        const val = e.target.value as WhatsAppTarget;
                        setWaTarget(val);
                        setWhatsAppTargetPreference(val);
                      }}
                      className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded-lg px-2 py-2 focus:outline-none"
                      title="Choose WhatsApp target: Desktop App (zero tabs) or Web Popup"
                    >
                      <option value="DESKTOP_APP">⚡ App (No Tabs)</option>
                      <option value="WEB_POPUP">🌐 Web Popup</option>
                    </select>
                  </div>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Soft-Delete Party Confirmation Modal */}
      {deactivatingParty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Deactivate {partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'}</h3>
                <p className="text-xs text-slate-500">Soft-Delete (Balance & ledger history protected)</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-700 font-semibold">
                <span>Account Name:</span>
                <span className="text-slate-900 font-bold">{deactivatingParty.name}</span>
              </div>
              {deactivatingParty.phone && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Phone:</span>
                  <span className="font-mono text-slate-800">{deactivatingParty.phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-600">
                <span>Current Ledger Balance:</span>
                <span className={`font-bold ${deactivatingParty.currentBalance > 0 ? 'text-emerald-600' : deactivatingParty.currentBalance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {currency}{Math.abs(deactivatingParty.currentBalance).toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6 bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-amber-900">
              💡 <strong>Safe Soft-Delete:</strong> Deactivating this party will archive their account and hide it from active billing dropdowns. All past bills, payment receipts, and balance history remain fully intact. You can restore this account at any time!
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setDeactivatingParty(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleDeactivateParty}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Deactivate (Soft-Delete)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Soft-Delete Transaction Confirmation Modal */}
      {deactivatingTxn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Soft-Delete Ledger Transaction</h3>
                <p className="text-xs text-slate-500">Reverses entry & recalculates balance safely</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-700 font-semibold">
                <span>Transaction Type:</span>
                <span className={`font-bold ${deactivatingTxn.txnType === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {deactivatingTxn.txnType === 'DEBIT' ? 'Udhaar Given (You Gave)' : 'Payment Received (You Got)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Amount:</span>
                <span className="font-bold text-slate-900">{currency}{deactivatingTxn.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-semibold text-slate-700">{deactivatingTxn.paymentMode}</span>
              </div>
              {deactivatingTxn.description && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Note:</span>
                  <span className="text-slate-800">{deactivatingTxn.description}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6 bg-rose-50/70 border border-rose-200 p-3 rounded-xl text-rose-900">
              ⚠️ <strong>Accounting Integrity:</strong> Soft-deleting this entry will mark it inactive in the database and reverse its financial impact from {selectedParty?.name}'s balance. The entry is preserved for complete audit accountability.
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setDeactivatingTxn(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateTxn}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Soft-Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
