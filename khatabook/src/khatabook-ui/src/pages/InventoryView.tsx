import React, { useEffect, useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  SlidersHorizontal, 
  AlertTriangle, 
  X, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History,
  Camera,
  Barcode,
  Zap,
  CheckCircle2,
  ClipboardList,
  Scale,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  RefreshCw,
  Check,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Download,
  DollarSign,
  UserCheck,
  Info,
  Clock,
  ArrowRight,
  Sparkles,
  Bot,
  Send,
  Truck,
  ShoppingCart,
  MessageSquare,
  ExternalLink,
  Archive,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { Item, Tenant, StockMovement, DailyStockRegisterSummary, DailyStockRegisterRow, Party } from '../types';
import { api } from '../services/api';
import { SearchableSelect } from '../components/SearchableSelect';
import { Pagination } from '../components/Pagination';
import { exportInventoryToExcel, exportInventoryToPdf } from '../utils/exportUtils';
import { playScannerBeep } from '../utils/audioBeep';
import { BarcodeCameraScanner } from '../components/BarcodeCameraScanner';
import { buildPurchaseOrderWhatsAppMessage, sendWhatsAppPurchaseOrderDirect } from '../utils/whatsappHelper';
import { cacheItemsLocally, getCachedItemsLocally, getCachedPartiesLocally } from '../utils/offlineStorage';


interface InventoryViewProps {
  activeTenant: Tenant | null;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ activeTenant }) => {
  // Main Sub-Tab Navigation
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'REGISTER' | 'AUDIT'>('CATALOG');

  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemActiveFilter, setItemActiveFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [deactivatingItem, setDeactivatingItem] = useState<Item | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState<boolean>(false);

  // Catalog Pagination, Filtering & Sorting State
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEGATIVE'>('ALL');
  const [sortField, setSortField] = useState<'name' | 'category' | 'purchasePrice' | 'sellingPrice' | 'currentStock' | 'isActive'>('name');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Daily Stock Register State
  const [registerDate, setRegisterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [registerSummary, setRegisterSummary] = useState<DailyStockRegisterSummary | null>(null);
  const [registerLoading, setRegisterLoading] = useState<boolean>(false);
  const [registerSearch, setRegisterSearch] = useState<string>('');
  const [registerCategory, setRegisterCategory] = useState<string>('');
  const [registerActiveOnly, setRegisterActiveOnly] = useState<boolean>(false);
  const [showPrintRegisterModal, setShowPrintRegisterModal] = useState<boolean>(false);

  // Physical Stock Audit & Shelf Tally State
  const [auditSelectedItem, setAuditSelectedItem] = useState<Item | null>(null);
  const [auditPhysicalCount, setAuditPhysicalCount] = useState<string>('');
  const [auditReason, setAuditReason] = useState<string>('Physical Shelf Recount');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [auditedBy, setAuditedBy] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditSessionLogs, setAuditSessionLogs] = useState<Array<{
    id: string;
    itemName: string;
    unit: string;
    previousStock: number;
    physicalCount: number;
    discrepancy: number;
    status: string;
    reason: string;
    timestamp: string;
  }>>([]);
  const [auditItemSearch, setAuditItemSearch] = useState<string>('');
  const [showPrintAuditSessionModal, setShowPrintAuditSessionModal] = useState<boolean>(false);

  // History per Item Modal State
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'SALE' | 'INWARD' | 'AUDIT' | 'ADJUST'>('ALL');
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [showPrintItemModal, setShowPrintItemModal] = useState<boolean>(false);

  // Modals
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);

  // Barcode Scanning Stock Manager state
  const [showCameraScanner, setShowCameraScanner] = useState<boolean>(false);
  const [showScanStockModal, setShowScanStockModal] = useState<boolean>(false);
  const [scannedItem, setScannedItem] = useState<Item | null>(null);
  const [scanStockToast, setScanStockToast] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);
  const [autoAddOneOnScan, setAutoAddOneOnScan] = useState<boolean>(false);

  // Adjustment form
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUBTRACT'>('SUBTRACT');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Damage');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Add Item form
  const [name, setName] = useState('');
  const [nativeName, setNativeName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [itemCategory, setItemCategory] = useState('General');
  const [unit, setUnit] = useState('Pcs');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [secondaryUnit, setSecondaryUnit] = useState('');
  const [unitConversionRatio, setUnitConversionRatio] = useState('1');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [openingStock, setOpeningStock] = useState('');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [serialImei, setSerialImei] = useState('');

  // Autonomous AI Reorder Bot State
  const [showReorderBotModal, setShowReorderBotModal] = useState<boolean>(false);
  const [reorderSuppliers, setReorderSuppliers] = useState<Party[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [reorderSupplierName, setReorderSupplierName] = useState<string>('');
  const [reorderSupplierPhone, setReorderSupplierPhone] = useState<string>('');
  const [reorderLanguage, setReorderLanguage] = useState<'EN' | 'HI' | 'GU'>('HI');
  const [reorderPoNumber, setReorderPoNumber] = useState<string>('');
  const [reorderNotes, setReorderNotes] = useState<string>('Please dispatch via regular freight / tempo.');
  const [reorderDraftItems, setReorderDraftItems] = useState<Array<{
    item: Item;
    reorderQty: number;
    isSelected: boolean;
  }>>([]);
  const [reorderItemToAdd, setReorderItemToAdd] = useState<string>('');
  const [reorderToast, setReorderToast] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);
  const [showPrintPoModal, setShowPrintPoModal] = useState<boolean>(false);
  const [poPrintFormat, setPoPrintFormat] = useState<'THERMAL' | 'A4'>('A4');

  const currency = activeTenant?.currencySymbol || '₹';

  const fetchItems = async () => {
    if (!activeTenant) return;
    try {
      setLoading(true);
      const isActiveParam = itemActiveFilter === 'ALL' ? null : itemActiveFilter === 'ACTIVE' ? true : false;
      const res = await api.getItems({ search, category, isActive: isActiveParam });
      setItems(res.data);
      cacheItemsLocally(res.data);
    } catch (err) {
      console.error('Failed to fetch items, loading from offline cache', err);
      try {
        const cached = await getCachedItemsLocally();
        if (cached && cached.length > 0) {
          let filtered = cached;
          if (itemActiveFilter !== 'ALL') {
            filtered = filtered.filter(i => itemActiveFilter === 'ACTIVE' ? i.isActive : !i.isActive);
          }
          if (search.trim()) {
            const q = search.toLowerCase().trim();
            filtered = filtered.filter(i => 
              i.name.toLowerCase().includes(q) || 
              (i.nativeName && i.nativeName.toLowerCase().includes(q)) ||
              (i.barcode && i.barcode.toLowerCase().includes(q))
            );
          }
          if (category) {
            filtered = filtered.filter(i => i.category === category);
          }
          setItems(filtered);
        }
      } catch (cacheErr) {
        console.error('Failed to load cached items', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTenant, search, category, itemActiveFilter]);

  const handleToggleItemActive = async (item: Item) => {
    try {
      const res = await api.toggleItemActive(item.id);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isActive: res.data.isActive } : i))
      );
    } catch (err) {
      console.error('Failed to toggle item active status', err);
    }
  };

  const handleDeactivateItem = async () => {
    if (!deactivatingItem) return;
    try {
      setDeactivateLoading(true);
      await api.deleteItem(deactivatingItem.id);
      setItems((prev) =>
        prev.map((i) => (i.id === deactivatingItem.id ? { ...i, isActive: false } : i))
      );
      setDeactivatingItem(null);
    } catch (err) {
      console.error('Failed to deactivate item', err);
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.createItem({
        name: name.trim(),
        nativeName: nativeName.trim() || undefined,
        barcode: barcode.trim(),
        category: itemCategory,
        unit,
        purchasePrice: parseFloat(purchasePrice || '0'),
        sellingPrice: parseFloat(sellingPrice || '0'),
        wholesalePrice: parseFloat(wholesalePrice || '0'),
        secondaryUnit: secondaryUnit.trim() || undefined,
        unitConversionRatio: parseFloat(unitConversionRatio || '1'),
        mrp: parseFloat(sellingPrice || '0'),
        taxRate: 0,
        batchNumber: batchNumber.trim() || undefined,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        partNumber: partNumber.trim() || undefined,
        serialImei: serialImei.trim() || undefined,
        openingStock: parseFloat(openingStock || '0'),
        minStockAlert: parseFloat(minStockAlert || '5'),
      });
      setShowAddItemModal(false);
      setName('');
      setNativeName('');
      setBarcode('');
      setBatchNumber('');
      setExpiryDate('');
      setPartNumber('');
      setSerialImei('');
      setPurchasePrice('');
      setSellingPrice('');
      setWholesalePrice('');
      setSecondaryUnit('');
      setUnitConversionRatio('1');
      setOpeningStock('');
      fetchItems();
    } catch (err) {
      console.error('Failed to create item', err);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !adjustQty) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty <= 0) return;

    try {
      await api.adjustStock({
        itemId: selectedItem.id,
        adjustmentType: adjustType,
        quantity: qty,
        reason: adjustReason,
        notes: adjustNotes,
      });
      setShowAdjustModal(false);
      setAdjustQty('');
      setAdjustNotes('');
      fetchItems();
    } catch (err) {
      console.error('Failed to adjust stock', err);
    }
  };

  const fetchDailyRegister = async (targetDate?: string) => {
    if (!activeTenant) return;
    const dateToQuery = targetDate || registerDate;
    try {
      setRegisterLoading(true);
      const res = await api.getDailyStockRegister(dateToQuery);
      setRegisterSummary(res.data);
    } catch (err) {
      console.error('Failed to load daily stock register', err);
    } finally {
      setRegisterLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'REGISTER') {
      fetchDailyRegister(registerDate);
    }
  }, [activeTenant, activeTab, registerDate]);

  const handleShiftDate = (days: number) => {
    const d = new Date(registerDate);
    d.setDate(d.getDate() + days);
    setRegisterDate(d.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setRegisterDate(new Date().toISOString().split('T')[0]);
  };

  const handleAuditReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditSelectedItem) return;
    const count = parseFloat(auditPhysicalCount);
    if (isNaN(count) || count < 0) {
      alert('Please enter a valid physical count (0 or higher).');
      return;
    }

    try {
      setIsAuditing(true);
      await api.reconcileStockAudit({
        itemId: auditSelectedItem.id,
        physicalCount: count,
        discrepancyReason: auditReason,
        notes: auditNotes.trim() || undefined,
        auditedBy: auditedBy.trim() || undefined,
      });

      playScannerBeep(true);

      const prev = auditSelectedItem.currentStock;
      const diff = count - prev;
      const status = diff === 0 ? 'MATCHED' : diff > 0 ? 'SURPLUS' : 'DEFICIT';

      // Record in session audit log
      const newEntry = {
        id: Math.random().toString(36).substring(2, 9),
        itemName: auditSelectedItem.name,
        unit: auditSelectedItem.unit,
        previousStock: prev,
        physicalCount: count,
        discrepancy: diff,
        status: status,
        reason: auditReason,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAuditSessionLogs((prevLogs) => [newEntry, ...prevLogs]);

      setScanStockToast({
        message:
          diff === 0
            ? `✅ Count Verified: ${auditSelectedItem.name} matches book stock (${count} ${auditSelectedItem.unit})`
            : `⚖️ Reconciled: ${auditSelectedItem.name} updated from ${prev} to ${count} ${auditSelectedItem.unit} (${diff > 0 ? '+' : ''}${diff})`,
        type: 'SUCCESS',
      });
      setTimeout(() => setScanStockToast(null), 4000);

      // Refresh items and register
      fetchItems();
      if (activeTab === 'REGISTER') {
        fetchDailyRegister(registerDate);
      }

      // Reset tally form
      setAuditSelectedItem(null);
      setAuditPhysicalCount('');
      setAuditNotes('');
    } catch (err) {
      console.error('Failed to reconcile audit', err);
      alert('Failed to reconcile stock audit. Please check your connection.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleViewHistory = async (item: Item) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
    setHistoryFilter('ALL');
    setHistoryLoading(true);
    try {
      const res = await api.getItemStockHistory(item.id);
      setStockHistory(res.data);
    } catch (err) {
      console.error('Failed to load stock history via stockmovements endpoint', err);
      try {
        const fallbackRes = await api.getItem(item.id);
        setStockHistory(fallbackRes.data.stockHistory || []);
      } catch (e) {
        console.error('Failed to fallback load stock history', e);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleInventoryBarcodeScan = async (scannedCode: string): Promise<boolean> => {
    const raw = (scannedCode || '').trim();
    if (!raw) return false;
    const clean = raw.toLowerCase();

    // Look for matching barcode, SKU, partNumber, serialImei, or exact name
    const matched = items.find((i) => {
      const b = (i.barcode || '').trim().toLowerCase();
      const p = (i.partNumber || '').trim().toLowerCase();
      const s = (i.serialImei || '').trim().toLowerCase();
      const n = i.name.trim().toLowerCase();
      return b === clean || p === clean || s === clean || n === clean;
    });

    if (activeTab === 'AUDIT') {
      if (matched) {
        playScannerBeep(true);
        setAuditSelectedItem(matched);
        setAuditPhysicalCount(matched.currentStock.toString());
        setScanStockToast({
          message: `🎯 Shelf Item Scanned: ${matched.name} • Book Stock: ${matched.currentStock} ${matched.unit}`,
          type: 'SUCCESS',
        });
        setTimeout(() => setScanStockToast(null), 3000);
        return true;
      } else {
        playScannerBeep(false);
        setScanStockToast({
          message: `⚠️ Barcode "${raw}" not found in catalog. Opening Add Item...`,
          type: 'ERROR',
        });
        setTimeout(() => setScanStockToast(null), 3500);
        setBarcode(raw);
        setName('');
        setNativeName('');
        setShowAddItemModal(true);
        setShowCameraScanner(false);
        return false;
      }
    }

    if (matched) {
      playScannerBeep(true);

      // If auto-add 1 pack on scan is enabled:
      if (autoAddOneOnScan) {
        try {
          await api.adjustStock({
            itemId: matched.id,
            adjustmentType: 'ADD',
            quantity: 1,
            reason: 'Barcode Scan Receiving (+1 Pack)',
            notes: `Auto-scan code: ${raw}`,
          });
          setScanStockToast({
            message: `🔔 Stock +1 ${matched.unit} added to ${matched.name}! New Stock: ${matched.currentStock + 1}`,
            type: 'SUCCESS',
          });
          setTimeout(() => setScanStockToast(null), 3500);
          fetchItems();
          return true;
        } catch (err) {
          console.error(err);
        }
      }

      // Default: open the Quick Scan Stock Manager modal
      setScannedItem(matched);
      setAdjustType('ADD');
      setAdjustQty('1');
      setAdjustReason('Purchase / Shipment Received');
      setAdjustNotes('');
      setShowScanStockModal(true);

      setScanStockToast({
        message: `🔔 Scanned: ${matched.name} • Current In-Stock: ${matched.currentStock} ${matched.unit}`,
        type: 'SUCCESS',
      });
      setTimeout(() => setScanStockToast(null), 3000);
      return true;
    } else {
      playScannerBeep(false);
      setScanStockToast({
        message: `⚠️ Barcode "${raw}" not found in stock. Pre-filling Add New Item...`,
        type: 'ERROR',
      });
      setTimeout(() => setScanStockToast(null), 3500);

      // Pre-fill Add Item form with this barcode!
      setBarcode(raw);
      setName('');
      setNativeName('');
      setShowAddItemModal(true);
      return false;
    }
  };

  const handleQuickAddStock = async (item: Item, qtyToAdd: number) => {
    try {
      await api.adjustStock({
        itemId: item.id,
        adjustmentType: 'ADD',
        quantity: qtyToAdd,
        reason: 'Shipment / Stock In Received',
        notes: `Quick scan add +${qtyToAdd} ${item.unit}`,
      });
      playScannerBeep(true);
      setScanStockToast({
        message: `✅ Added +${qtyToAdd} ${item.unit} to ${item.name}!`,
        type: 'SUCCESS',
      });
      setTimeout(() => setScanStockToast(null), 3500);
      setShowScanStockModal(false);
      fetchItems();
    } catch (err) {
      console.error('Failed to add stock', err);
    }
  };

  // Keyboard listener for physical barcode scanners in InventoryView
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAddItemModal || showAdjustModal || showScanStockModal) return;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          handleInventoryBarcodeScan(buffer);
          e.preventDefault();
        }
        buffer = '';
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (diff < 55 || buffer.length === 0) {
        buffer += e.key;
      } else {
        buffer = e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, autoAddOneOnScan, showAddItemModal, showAdjustModal, showScanStockModal]);

  const categories = Array.from(new Set(items.map((i) => i.category || 'General')));

  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(new Date().getDate() + 90);
  const expiringItems = items.filter((i) => {
    if (!i.expiryDate) return false;
    const exp = new Date(i.expiryDate);
    return exp <= ninetyDaysFromNow;
  });

  const displayedItems = showExpiringOnly ? expiringItems : items;

  // Filtered and Sorted Catalog Items
  const filteredCatalogItems = useMemo(() => {
    let list = showExpiringOnly ? expiringItems : items;

    if (stockStatusFilter === 'IN_STOCK') {
      list = list.filter((i) => i.currentStock > 0);
    } else if (stockStatusFilter === 'LOW_STOCK') {
      list = list.filter((i) => i.currentStock > 0 && i.currentStock <= i.minStockAlert);
    } else if (stockStatusFilter === 'OUT_OF_STOCK') {
      list = list.filter((i) => i.currentStock === 0);
    } else if (stockStatusFilter === 'NEGATIVE') {
      list = list.filter((i) => i.currentStock < 0);
    }

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '');
      } else if (sortField === 'purchasePrice') {
        comparison = (a.purchasePrice || 0) - (b.purchasePrice || 0);
      } else if (sortField === 'sellingPrice') {
        comparison = (a.sellingPrice || 0) - (b.sellingPrice || 0);
      } else if (sortField === 'currentStock') {
        comparison = (a.currentStock || 0) - (b.currentStock || 0);
      } else if (sortField === 'isActive') {
        comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
      }
      return sortDirection === 'ASC' ? comparison : -comparison;
    });
  }, [items, showExpiringOnly, expiringItems, stockStatusFilter, sortField, sortDirection]);

  // Paginated items for current page
  const paginatedCatalogItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCatalogItems.slice(startIndex, startIndex + pageSize);
  }, [filteredCatalogItems, currentPage, pageSize]);

  const handleSort = (field: 'name' | 'category' | 'purchasePrice' | 'sellingPrice' | 'currentStock' | 'isActive') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortField(field);
      setSortDirection('ASC');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, stockStatusFilter, itemActiveFilter, showExpiringOnly]);

  const lowStockItems = items.filter((i) => i.currentStock <= i.minStockAlert);

  const handleOpenReorderBot = async (preselectedItem?: Item) => {
    // Generate PO Reference Number
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const poRef = `PO-${todayStr}-${randomSuffix}`;
    setReorderPoNumber(poRef);

    // Load Suppliers
    try {
      const res = await api.getParties({ type: 'SUPPLIER' });
      const sups = res.data.filter((p: Party) => p.partyType === 'SUPPLIER');
      setReorderSuppliers(sups);
      if (sups.length > 0) {
        setSelectedSupplierId(sups[0].id);
        setReorderSupplierName(sups[0].name);
        setReorderSupplierPhone(sups[0].phone || '');
      } else {
        setSelectedSupplierId('CUSTOM');
        setReorderSupplierName('Main Distributor');
        setReorderSupplierPhone('');
      }
    } catch {
      try {
        const cached = await getCachedPartiesLocally();
        const sups = cached.filter((p: Party) => p.partyType === 'SUPPLIER');
        setReorderSuppliers(sups);
        if (sups.length > 0) {
          setSelectedSupplierId(sups[0].id);
          setReorderSupplierName(sups[0].name);
          setReorderSupplierPhone(sups[0].phone || '');
        } else {
          setSelectedSupplierId('CUSTOM');
          setReorderSupplierName('Main Distributor');
          setReorderSupplierPhone('');
        }
      } catch {
        setSelectedSupplierId('CUSTOM');
      }
    }

    // Determine target items
    let targetItems: Item[] = [];
    if (preselectedItem) {
      targetItems = [preselectedItem];
      lowStockItems.forEach((it) => {
        if (it.id !== preselectedItem.id) {
          targetItems.push(it);
        }
      });
    } else {
      targetItems = lowStockItems.length > 0 ? [...lowStockItems] : items.slice(0, 5);
    }

    const drafts = targetItems.map((item) => {
      const suggested = Math.max(
        Math.ceil((item.minStockAlert * 3) - Math.max(0, item.currentStock)),
        item.minStockAlert > 0 ? item.minStockAlert * 2 : 10
      );
      return {
        item,
        reorderQty: suggested > 0 ? suggested : 10,
        isSelected: true,
      };
    });

    setReorderDraftItems(drafts);
    setShowReorderBotModal(true);
  };

  const handleSupplierSelect = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (supplierId === 'CUSTOM') {
      setReorderSupplierName('');
      setReorderSupplierPhone('');
      return;
    }
    const sup = reorderSuppliers.find((s) => s.id === supplierId);
    if (sup) {
      setReorderSupplierName(sup.name);
      setReorderSupplierPhone(sup.phone || '');
    }
  };

  const handleUpdateDraftQty = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setReorderDraftItems((prev) =>
      prev.map((d) => (d.item.id === itemId ? { ...d, reorderQty: newQty } : d))
    );
  };

  const handleToggleDraftSelection = (itemId: string) => {
    setReorderDraftItems((prev) =>
      prev.map((d) => (d.item.id === itemId ? { ...d, isSelected: !d.isSelected } : d))
    );
  };

  const handleToggleSelectAllDrafts = (selectAll: boolean) => {
    setReorderDraftItems((prev) => prev.map((d) => ({ ...d, isSelected: selectAll })));
  };

  const handleAddCatalogItemToDraft = (itemId: string) => {
    if (!itemId) return;
    const foundItem = items.find((i) => i.id === itemId);
    if (!foundItem) return;
    if (reorderDraftItems.some((d) => d.item.id === foundItem.id)) {
      alert('This item is already included in the purchase order draft.');
      return;
    }
    const suggested = Math.max(
      Math.ceil((foundItem.minStockAlert * 3) - Math.max(0, foundItem.currentStock)),
      foundItem.minStockAlert > 0 ? foundItem.minStockAlert * 2 : 10
    );
    setReorderDraftItems((prev) => [
      ...prev,
      {
        item: foundItem,
        reorderQty: suggested > 0 ? suggested : 10,
        isSelected: true,
      },
    ]);
    setReorderItemToAdd('');
  };

  const handleRemoveDraftItem = (itemId: string) => {
    setReorderDraftItems((prev) => prev.filter((d) => d.item.id !== itemId));
  };

  const handleSendPoViaWhatsApp = () => {
    const selectedDrafts = reorderDraftItems.filter((d) => d.isSelected);
    if (selectedDrafts.length === 0) {
      alert('Please select at least one item to reorder.');
      return;
    }
    if (!reorderSupplierPhone.trim()) {
      alert('Please enter a valid distributor phone number (e.g. 9876543210).');
      return;
    }
    if (!activeTenant) return;

    const itemsForPo = selectedDrafts.map((d) => ({
      itemName: d.item.name + (d.item.nativeName ? ` (${d.item.nativeName})` : ''),
      reorderQty: d.reorderQty,
      unit: d.item.unit,
      purchasePrice: d.item.purchasePrice,
    }));

    const supplierObj = {
      name: reorderSupplierName.trim() || 'Distributor / Supplier',
      phone: reorderSupplierPhone.trim(),
    };

    const ok = sendWhatsAppPurchaseOrderDirect(
      reorderSupplierPhone.trim(),
      reorderPoNumber,
      activeTenant,
      supplierObj,
      itemsForPo,
      reorderLanguage,
      reorderNotes
    );

    if (ok) {
      setReorderToast({
        message: `Purchase Order ${reorderPoNumber} dispatched to ${supplierObj.name} (${reorderSupplierPhone}) via WhatsApp!`,
        type: 'SUCCESS',
      });
      setTimeout(() => setReorderToast(null), 5000);
    }
  };

  const activePoDrafts = reorderDraftItems.filter((d) => d.isSelected);
  const totalPoQty = activePoDrafts.reduce((sum, d) => sum + d.reorderQty, 0);
  const totalEstPoValue = activePoDrafts.reduce(
    (sum, d) => sum + d.reorderQty * d.item.purchasePrice,
    0
  );

  const liveWhatsAppPreviewText = activeTenant
    ? buildPurchaseOrderWhatsAppMessage(
        reorderPoNumber,
        activeTenant,
        { name: reorderSupplierName || 'Distributor / Supplier', phone: reorderSupplierPhone },
        activePoDrafts.map((d) => ({
          itemName: d.item.name + (d.item.nativeName ? ` (${d.item.nativeName})` : ''),
          reorderQty: d.reorderQty,
          unit: d.item.unit,
          purchasePrice: d.item.purchasePrice,
        })),
        reorderLanguage,
        reorderNotes
      )
    : '';

  // Filtered rows for Daily Stock Register
  const displayedRegisterRows = (registerSummary?.rows || []).filter((row) => {
    if (registerActiveOnly && !row.hasActivity) return false;
    if (registerCategory && row.category !== registerCategory) return false;
    if (registerSearch.trim()) {
      const q = registerSearch.toLowerCase().trim();
      const matchName = row.name.toLowerCase().includes(q);
      const matchNative = row.nativeName?.toLowerCase().includes(q);
      const matchBarcode = row.barcode?.toLowerCase().includes(q);
      const matchCat = row.category?.toLowerCase().includes(q);
      return matchName || matchNative || matchBarcode || matchCat;
    }
    return true;
  });

  const registerFilteredInward = displayedRegisterRows.reduce((acc, r) => acc + r.inwardQty, 0);
  const registerFilteredOutward = displayedRegisterRows.reduce((acc, r) => acc + r.outwardQty, 0);
  const registerFilteredValuation = displayedRegisterRows.reduce((acc, r) => acc + r.closingValue, 0);
  const registerFilteredNet = registerFilteredInward - registerFilteredOutward;

  // Filtered stock movements in History Modal
  const filteredStockHistory = stockHistory.filter((m) => {
    if (historyFilter === 'ALL') return true;
    if (historyFilter === 'SALE') return m.movementType === 'SALE';
    if (historyFilter === 'INWARD') {
      return m.movementType === 'PURCHASE' || m.movementType === 'INITIAL' || m.movementType === 'ADJUSTMENT_ADD' || m.movementType === 'SALE_RETURN' || m.movementType === 'RETURN';
    }
    if (historyFilter === 'AUDIT') {
      return m.movementType === 'AUDIT_RECONCILE' || m.movementType === 'AUDIT_VERIFIED';
    }
    if (historyFilter === 'ADJUST') {
      return m.movementType === 'ADJUSTMENT_ADD' || m.movementType === 'ADJUSTMENT_SUB';
    }
    return true;
  });

  const historyInwardSum = stockHistory
    .filter((m) => m.movementType === 'PURCHASE' || m.movementType === 'INITIAL' || m.movementType === 'ADJUSTMENT_ADD' || m.movementType === 'SALE_RETURN' || m.movementType === 'RETURN')
    .reduce((sum, m) => sum + m.quantity, 0);

  const historyOutwardSum = stockHistory
    .filter((m) => m.movementType === 'SALE' || m.movementType === 'ADJUSTMENT_SUB')
    .reduce((sum, m) => sum + m.quantity, 0);

  const historyAuditsCount = stockHistory
    .filter((m) => m.movementType === 'AUDIT_RECONCILE' || m.movementType === 'AUDIT_VERIFIED').length;

  // Audit discrepancy calculation for selected audit item
  const parsedAuditCount = parseFloat(auditPhysicalCount);
  const auditDiff = !isNaN(parsedAuditCount) && auditSelectedItem ? parsedAuditCount - auditSelectedItem.currentStock : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation Pills */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <Package className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Inventory & Stock Control</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Complete inventory suite: Master catalog, daily Aavak-Javak register, and physical shelf tallies
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {activeTab === 'REGISTER' && (
              <button
                type="button"
                onClick={() => setShowPrintRegisterModal(true)}
                className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
                title="Print official Daily Stock Register (Aavak - Javak)"
              >
                <Printer className="w-4 h-4" />
                <span>Print Register</span>
              </button>
            )}

            {activeTab === 'AUDIT' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCameraScanner(true)}
                  className="flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
                  title="Scan shelf barcode with camera"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Shelf Barcode</span>
                </button>
                {auditSessionLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPrintAuditSessionModal(true)}
                    className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
                    title="Print shift tally sheet"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Tally Sheet</span>
                  </button>
                )}
              </>
            )}

            {activeTab === 'CATALOG' && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenReorderBot()}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
                  title="Autonomous AI Reorder Bot for Distributors"
                >
                  <Bot className="w-4 h-4" />
                  <span>AI Reorder Bot</span>
                  {lowStockItems.length > 0 && (
                    <span className="bg-white text-rose-700 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ml-0.5 animate-pulse">
                      {lowStockItems.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCameraScanner(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
                  title="Scan item barcode with camera to view, receive, or adjust stock"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Barcode Stock</span>
                </button>

                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Item</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center space-x-2 border-t border-slate-100 pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('CATALOG')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'CATALOG'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Master Catalog ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('REGISTER')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'REGISTER'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Daily Register (Aavak - Javak)</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'AUDIT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Physical Shelf Audit (Shelf Tally)</span>
            {auditSessionLogs.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'AUDIT' ? 'bg-white text-indigo-700' : 'bg-indigo-200 text-indigo-900'
              }`}>
                {auditSessionLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {scanStockToast && (
        <div
          className={`p-3 rounded-xl text-xs font-bold shadow-sm flex items-center justify-between transition-all ${
            scanStockToast.type === 'SUCCESS'
              ? 'bg-emerald-600 text-white animate-pulse'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
            <span>{scanStockToast.message}</span>
          </div>
          <button onClick={() => setScanStockToast(null)} className="text-white/80 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Product Master Catalog Tab */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search items by name, barcode, or SKU (or scan barcode directly)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    handleInventoryBarcodeScan(search);
                  }
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center space-x-1.5 flex-1 sm:flex-initial">
                <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                <SearchableSelect
                  options={categories.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                  value={category}
                  onChange={(val) => setCategory(val)}
                  placeholder="All Categories"
                  searchPlaceholder="Search category..."
                  clearLabel="All Categories"
                  className="w-full sm:w-48"
                />
              </div>

              {/* Stock Status Dropdown */}
              <div className="w-full sm:w-44">
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                >
                  <option value="ALL">📦 All Stock Levels</option>
                  <option value="IN_STOCK">🟢 In Stock (&gt;0)</option>
                  <option value="LOW_STOCK">⚠️ Low Stock (≤ Alert)</option>
                  <option value="OUT_OF_STOCK">🚫 Out of Stock (0)</option>
                  <option value="NEGATIVE">🔻 Negative Stock (&lt;0)</option>
                </select>
              </div>

              {/* Status Filter (Active / Inactive / All) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setItemActiveFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                    itemActiveFilter === 'ACTIVE'
                      ? 'bg-white text-emerald-700 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemActiveFilter('INACTIVE')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                    itemActiveFilter === 'INACTIVE'
                      ? 'bg-white text-rose-700 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>Archived</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                    itemActiveFilter === 'ALL'
                      ? 'bg-white text-indigo-700 font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All ({items.length})</span>
                </button>
              </div>

              {/* Export to Excel & PDF Actions */}
              <div className="flex items-center space-x-1.5 shrink-0 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => exportInventoryToExcel(filteredCatalogItems, activeTenant?.name || 'Store', currency)}
                  className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                  title="Export filtered items to Microsoft Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportInventoryToPdf(filteredCatalogItems, activeTenant?.name || 'Store', currency)}
                  className="inline-flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                  title="Export filtered items to printable PDF (.pdf)"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Auto-Reorder Stock-Out Prevention Banner */}
          {lowStockItems.length > 0 && (
            <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-rose-100 rounded-xl text-rose-700 mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-rose-950">
                      🤖 AI Auto-Reorder Bot: Stock-Out Prevention Alert
                    </h3>
                    <span className="text-[11px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold">
                      {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'} critically low
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Fast-moving inventory dropped below minimum alerts. Let AI draft a multilingual WhatsApp Purchase Order for your distributor immediately.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenReorderBot()}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white shadow-sm transition flex items-center space-x-1.5 active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Draft WhatsApp PO ({lowStockItems.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* AI Expiry Risk & Dead-Stock Loss Prevention Banner */}
          {expiringItems.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-amber-900">AI Expiry & Dead-Stock Risk Alert</h3>
                    <span className="text-[11px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      {expiringItems.length} {expiringItems.length === 1 ? 'item' : 'items'} expiring soon
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Items approaching expiry within 90 days. Run a clearance bundle or discount wholesale to minimize inventory loss.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExpiringOnly(!showExpiringOnly)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition shrink-0 ${
                  showExpiringOnly
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
              >
                {showExpiringOnly ? 'Show All Products' : 'Filter Expiring Items'}
              </button>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th onClick={() => handleSort('name')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                      <div className="flex items-center space-x-1">
                        <span>Item Details</span>
                        {sortField === 'name' ? (sortDirection === 'ASC' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('category')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                      <div className="flex items-center space-x-1">
                        <span>Category</span>
                        {sortField === 'category' ? (sortDirection === 'ASC' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('isActive')} className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition select-none">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Status</span>
                        {sortField === 'isActive' ? (sortDirection === 'ASC' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('purchasePrice')} className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none">
                      <div className="flex items-center justify-end space-x-1">
                        <span>Cost Price</span>
                        {sortField === 'purchasePrice' ? (sortDirection === 'ASC' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('sellingPrice')} className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none">
                      <div className="flex items-center justify-end space-x-1">
                        <span>Selling Price</span>
                        {sortField === 'sellingPrice' ? (sortDirection === 'ASC' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('currentStock')} className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition select-none">
                      <div className="flex items-center justify-end space-x-1">
                        <span>Stock Level</span>
                        {sortField === 'currentStock' ? (sortDirection === 'ASC' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCatalogItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="font-medium">No items found.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCatalogItems.map((item) => {

                      const isLowStock = item.currentStock <= item.minStockAlert;
                      return (
                        <tr key={item.id} className={`transition ${item.isActive ? 'hover:bg-slate-50/80' : 'hover:bg-slate-100/50 bg-slate-50/60 opacity-75'}`}>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            {item.nativeName && (
                              <div className="text-xs text-indigo-600 font-medium">{item.nativeName}</div>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {item.barcode && (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                  Code: {item.barcode}
                                </span>
                              )}
                              {item.batchNumber && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                                  Batch: {item.batchNumber}
                                </span>
                              )}
                              {item.expiryDate && (
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium border border-amber-200">
                                  Exp: {new Date(item.expiryDate).toLocaleDateString()}
                                </span>
                              )}
                              {item.partNumber && (
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono border border-blue-200">
                                  Part#: {item.partNumber}
                                </span>
                              )}
                              {item.serialImei && (
                                <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono border border-purple-200">
                                  IMEI: {item.serialImei}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleItemActive(item)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition inline-flex items-center space-x-1 cursor-pointer ${
                                item.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                              }`}
                              title={item.isActive ? 'Active: Click to Deactivate' : 'Archived: Click to Reactivate'}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              <span>{item.isActive ? 'Active' : 'Archived'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {currency}{item.purchasePrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-bold text-slate-900">
                              {currency}{item.sellingPrice.toFixed(2)}
                            </div>
                            {item.wholesalePrice !== undefined && item.wholesalePrice > 0 && (
                              <div className="text-[11px] text-amber-700 font-semibold">
                                WS: {currency}{item.wholesalePrice.toFixed(2)}
                              </div>
                            )}
                            {item.secondaryUnit && (
                              <div className="text-[10px] text-slate-400">
                                1 {item.unit} = {item.unitConversionRatio || 1} {item.secondaryUnit}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {isLowStock && (
                                <span title="Low Stock Warning">
                                  <AlertTriangle className="w-4 h-4 text-amber-500 inline" />
                                </span>
                              )}
                              <span
                                className={`font-bold ${
                                  item.currentStock <= 0
                                    ? 'text-rose-600'
                                    : isLowStock
                                    ? 'text-amber-600'
                                    : 'text-slate-800'
                                }`}
                              >
                                {item.currentStock} {item.unit}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {item.isActive && isLowStock && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReorderBot(item)}
                                  className="flex items-center space-x-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-1.5 rounded-lg transition"
                                  title="Draft WhatsApp Purchase Order for this item"
                                >
                                  <Bot className="w-3.5 h-3.5" />
                                  <span>Reorder</span>
                                </button>
                              )}
                              {item.isActive ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setShowAdjustModal(true);
                                    }}
                                    className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
                                  >
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                    <span>Adjust</span>
                                  </button>
                                  <button
                                    onClick={() => handleViewHistory(item)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                                    title="Audit History"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeactivatingItem(item)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                    title="Deactivate / Soft-Delete Item"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleItemActive(item)}
                                    className="flex items-center space-x-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition"
                                    title="Restore / Reactivate Item"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Restore</span>
                                  </button>
                                  <button
                                    onClick={() => handleViewHistory(item)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                                    title="Audit History"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredCatalogItems.length}
              pageSize={pageSize}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(newSize) => setPageSize(newSize)}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        </div>
      )}

      {/* Daily Stock Register (Aavak - Javak Logbook) Tab */}
      {activeTab === 'REGISTER' && (
        <div className="space-y-4">
          {/* Date Picker & Register Header Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Register Date:</span>
              </span>
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => handleShiftDate(-1)}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={registerDate}
                  onChange={(e) => setRegisterDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 px-2 py-1 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleShiftDate(1)}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => fetchDailyRegister(registerDate)}
                className="p-2 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-xl transition"
                title="Refresh Daily Register"
              >
                <RefreshCw className={`w-4 h-4 ${registerLoading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-700">Stock Balance Formula:</span>
              <span>Opening + Inward (आवक) - Outward (जावक) = Closing</span>
            </div>
          </div>

          {/* 5 KPI Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Catalog Products</span>
              <div className="text-xl font-black text-slate-800 mt-1">
                {registerSummary?.totalItemsCount || items.length}
              </div>
              <span className="text-[10px] text-slate-500">Total registered items</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Moved Items</span>
              <div className="text-xl font-black text-indigo-600 mt-1">
                {registerSummary?.activeItemsCount || 0}
              </div>
              <span className="text-[10px] text-slate-500">Items with transactions today</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Total Inward (आवक)</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-700 mt-1">
                +{(registerSummary?.totalInwardQty || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-800/80">Purchases & additions</span>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-4 rounded-2xl border border-rose-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">Total Outward (जावक)</span>
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-black text-rose-700 mt-1">
                -{(registerSummary?.totalOutwardQty || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-rose-800/80">Sales & deductions</span>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-200 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">Closing Valuation</span>
              <div className="text-xl font-black text-indigo-900 mt-1">
                {currency}{(registerSummary?.totalValuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-indigo-800/80">Based on cost price</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Filter register by item name, native name, barcode, or category..."
                value={registerSearch}
                onChange={(e) => setRegisterSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <SearchableSelect
                options={categories.map((c) => ({ value: c, label: c }))}
                value={registerCategory}
                onChange={(val) => setRegisterCategory(val)}
                placeholder="All Categories"
                searchPlaceholder="Filter category..."
                clearLabel="All Categories"
                className="w-full sm:w-48"
              />

              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 select-none cursor-pointer whitespace-nowrap bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={registerActiveOnly}
                  onChange={(e) => setRegisterActiveOnly(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>Moved Items Only</span>
              </label>
            </div>
          </div>

          {/* Daily Stock Register Aavak - Javak Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Unit Rate</th>
                    <th className="py-3 px-3 text-right">Opening Stock</th>
                    <th className="py-3 px-3 text-right bg-emerald-50/50 text-emerald-800">Inward (आवक)</th>
                    <th className="py-3 px-3 text-right bg-rose-50/50 text-rose-800">Outward (जावक)</th>
                    <th className="py-3 px-3 text-right">Audit Diff</th>
                    <th className="py-3 px-3 text-right font-bold text-slate-900">Closing Stock</th>
                    <th className="py-3 px-4 text-right">Closing Value</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registerLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-indigo-600" />
                        <p className="font-semibold text-sm">Loading daily register entries...</p>
                      </td>
                    </tr>
                  ) : displayedRegisterRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="font-medium text-sm">No items found for this date & filter.</p>
                        {registerActiveOnly && (
                          <p className="text-xs text-slate-400 mt-1">
                            Tip: Uncheck "Moved Items Only" to view all master products.
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    displayedRegisterRows.map((row) => {
                      const matchedItem = items.find((i) => i.id === row.itemId);
                      return (
                        <tr key={row.itemId} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{row.name}</div>
                            {row.nativeName && (
                              <div className="text-[11px] text-indigo-600 font-medium">{row.nativeName}</div>
                            )}
                            {row.barcode && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono">
                                {row.barcode}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {row.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-medium">{currency}{row.purchasePrice.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-400">Sell: {currency}{row.sellingPrice.toFixed(2)}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600">
                            {row.openingStock} {row.unit}
                          </td>
                          <td className="py-3 px-3 text-right bg-emerald-50/40">
                            {row.inwardQty > 0 ? (
                              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg inline-block">
                                +{row.inwardQty} {row.unit}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right bg-rose-50/40">
                            {row.outwardQty > 0 ? (
                              <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg inline-block">
                                -{row.outwardQty} {row.unit}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {row.auditDiscrepancyQty > 0 ? (
                              <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg inline-block">
                                Δ {row.auditDiscrepancyQty}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-black ${row.closingStock <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {row.closingStock} {row.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">
                            {currency}{row.closingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (matchedItem) {
                                  handleViewHistory(matchedItem);
                                } else {
                                  handleViewHistory({
                                    id: row.itemId,
                                    name: row.name,
                                    nativeName: row.nativeName,
                                    barcode: row.barcode,
                                    category: row.category,
                                    unit: row.unit,
                                    purchasePrice: row.purchasePrice,
                                    sellingPrice: row.sellingPrice,
                                    currentStock: row.closingStock,
                                    minStockAlert: 5,
                                    mrp: row.sellingPrice,
                                    taxRate: 0,
                                    isActive: true,
                                  });
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                              title="View Complete Item Audit Trail"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right uppercase text-[11px] text-slate-500">
                      Filtered Totals ({displayedRegisterRows.length} items):
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 bg-emerald-100/50">
                      +{registerFilteredInward.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-700 bg-rose-100/50">
                      -{registerFilteredOutward.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500">
                      Net: {registerFilteredNet >= 0 ? `+${registerFilteredNet}` : registerFilteredNet}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800">
                      -
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-900 font-black">
                      {currency}{registerFilteredValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Physical Stock Audit & Shelf Tally Tab */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          {/* Top Selector & Fast Scan Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 w-full sm:w-auto">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Physical Stock Audit & Shelf Tally</h3>
                <p className="text-xs text-slate-500">Scan shelf barcodes or select item below to reconcile discrepancies</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <SearchableSelect
                options={items.map((i) => ({
                  value: i.id,
                  label: `${i.name} ${i.nativeName ? `(${i.nativeName})` : ''} - Book: ${i.currentStock} ${i.unit}`,
                }))}
                value={auditSelectedItem?.id || ''}
                onChange={(val) => {
                  const it = items.find((x) => x.id === val);
                  if (it) {
                    setAuditSelectedItem(it);
                    setAuditPhysicalCount(it.currentStock.toString());
                  } else {
                    setAuditSelectedItem(null);
                    setAuditPhysicalCount('');
                  }
                }}
                placeholder="Pick product to tally..."
                searchPlaceholder="Search product by name, barcode..."
                clearLabel="Clear selection"
                className="w-full sm:w-80"
              />

              <button
                type="button"
                onClick={() => setShowCameraScanner(true)}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 shrink-0"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Barcode</span>
              </button>
            </div>
          </div>

          {/* Audit Main Section: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Active Tally / Reconciliation Station */}
            <div className="lg:col-span-7 space-y-4">
              {!auditSelectedItem ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Scale className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h4 className="font-bold text-base text-slate-900">Select or Scan a Shelf Product to Tally</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Pick any item from the dropdown or scan its shelf barcode using your handheld scanner or phone camera.
                    </p>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Quick Pick From Master Catalog:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-h-64 overflow-y-auto p-1">
                      {items.slice(0, 8).map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => {
                            setAuditSelectedItem(it);
                            setAuditPhysicalCount(it.currentStock.toString());
                          }}
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex items-center justify-between text-xs group"
                        >
                          <div className="truncate mr-2">
                            <div className="font-bold text-slate-800 group-hover:text-indigo-700 truncate">{it.name}</div>
                            <span className="text-[10px] text-slate-400">{it.category}</span>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-slate-600 shrink-0 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {it.currentStock} {it.unit}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
                  {/* Selected Product Banner */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-base text-slate-900">{auditSelectedItem.name}</h4>
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                          {auditSelectedItem.category}
                        </span>
                      </div>
                      {auditSelectedItem.nativeName && (
                        <p className="text-xs text-indigo-600 font-medium mt-0.5">{auditSelectedItem.nativeName}</p>
                      )}
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                        {auditSelectedItem.barcode && (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded">
                            Barcode: {auditSelectedItem.barcode}
                          </span>
                        )}
                        <span>Cost: <strong>{currency}{auditSelectedItem.purchasePrice.toFixed(2)}</strong></span>
                        <span>MRP: <strong>{currency}{auditSelectedItem.sellingPrice.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAuditSelectedItem(null);
                        setAuditPhysicalCount('');
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                    >
                      Clear
                    </button>
                  </div>

                  {/* 3-Way Comparison Cards: System Book vs Physical Shelf vs Live Variance */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 1. System Book Stock */}
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        System Book Stock
                      </span>
                      <div className="text-2xl font-black text-slate-800 mt-1">
                        {auditSelectedItem.currentStock} <span className="text-sm font-semibold">{auditSelectedItem.unit}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Database recorded</span>
                    </div>

                    {/* 2. Physical Shelf Count */}
                    <div className="bg-indigo-50/50 border border-indigo-200 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                        Physical Shelf Count
                      </span>
                      <div className="mt-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={auditPhysicalCount}
                          onChange={(e) => setAuditPhysicalCount(e.target.value)}
                          className="w-full text-center text-2xl font-black bg-white border border-indigo-300 rounded-lg py-0.5 text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <span className="text-[10px] text-indigo-600 font-semibold">{auditSelectedItem.unit} on shelf</span>
                    </div>

                    {/* 3. Live Variance indicator */}
                    <div className={`p-3.5 rounded-xl border text-center transition-all ${
                      auditDiff === 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : auditDiff < 0
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-blue-50 border-blue-300 text-blue-800'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">
                        Audit Variance (अंतर)
                      </span>
                      <div className="text-2xl font-black mt-1">
                        {auditDiff > 0 ? `+${auditDiff}` : auditDiff}{' '}
                        <span className="text-sm font-semibold">{auditSelectedItem.unit}</span>
                      </div>
                      <span className="text-[10px] font-bold">
                        {auditDiff === 0
                          ? '✅ Perfectly Matched'
                          : auditDiff < 0
                          ? `⚠️ Deficit (Loss: -${currency}${(Math.abs(auditDiff) * auditSelectedItem.purchasePrice).toFixed(2)})`
                          : `✨ Surplus (Gain: +${currency}${(auditDiff * auditSelectedItem.purchasePrice).toFixed(2)})`}
                      </span>
                    </div>
                  </div>

                  {/* Quick Tally Adjustment Buttons */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Quick Shelf Count Adjustments:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[-10, -5, -1, 1, 5, 10].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(auditPhysicalCount || '0');
                            const next = Math.max(0, cur + delta);
                            setAuditPhysicalCount(next.toString());
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                            delta < 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setAuditPhysicalCount(auditSelectedItem.currentStock.toString())}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition ml-auto"
                      >
                        Reset to Book Stock ({auditSelectedItem.currentStock})
                      </button>
                    </div>
                  </div>

                  {/* Discrepancy Reconciliation Form */}
                  <form onSubmit={handleAuditReconcile} className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Reason for Count / Discrepancy *
                        </label>
                        <select
                          value={auditReason}
                          onChange={(e) => setAuditReason(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="Physical Shelf Recount">Physical Shelf Recount (Verified)</option>
                          <option value="Shrinkage / Unrecorded Loss">Shrinkage / Unrecorded Loss</option>
                          <option value="Damaged / Broken on Shelf">Damaged / Broken Goods</option>
                          <option value="Expired / Spoiled Goods">Expired / Spoiled Goods</option>
                          <option value="Supplier Over-delivery / Bonus Stock">Supplier Over-delivery / Bonus Stock</option>
                          <option value="Theft / Pilferage">Theft / Pilferage</option>
                          <option value="Billing Counter Mismatch">Billing Counter Error</option>
                          <option value="Customer Return / Unrecorded Stock">Customer Return / Unrecorded Stock</option>
                          <option value="Other Variance">Other Recount / Variance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Audited By (Staff / Auditor Name)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Store Manager, Audit Team"
                          value={auditedBy}
                          onChange={(e) => setAuditedBy(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Audit Notes / Shelf Rack Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Aisle 4 Rack B, counted during weekly physical tally"
                        value={auditNotes}
                        onChange={(e) => setAuditNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center justify-end space-x-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAuditSelectedItem(null);
                          setAuditPhysicalCount('');
                        }}
                        className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={isAuditing}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition active:scale-95 ${
                          auditDiff === 0
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        } ${isAuditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isAuditing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Saving Audit...</span>
                          </>
                        ) : auditDiff === 0 ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirm & Timestamp Audit (0 Discrepancy)</span>
                          </>
                        ) : (
                          <>
                            <Scale className="w-4 h-4" />
                            <span>Reconcile Book Stock ({auditDiff > 0 ? `+${auditDiff}` : auditDiff} {auditSelectedItem.unit})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Right Column: Live Session Tally Sheet */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Session Audit Tally Sheet</h4>
                    <p className="text-xs text-slate-500">{auditSessionLogs.length} items audited this shift</p>
                  </div>

                  {auditSessionLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPrintAuditSessionModal(true)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                      title="Print Shift Tally Sheet"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Session Mini-KPIs */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Audited</span>
                    <strong className="text-sm font-black text-slate-800">{auditSessionLogs.length}</strong>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 text-emerald-800">
                    <span className="text-[10px] font-bold block uppercase">Matched</span>
                    <strong className="text-sm font-black">
                      {auditSessionLogs.filter((l) => l.status === 'MATCHED').length}
                    </strong>
                  </div>
                  <div className="bg-rose-50 p-2 rounded-xl border border-rose-200 text-rose-800">
                    <span className="text-[10px] font-bold block uppercase">Variance</span>
                    <strong className="text-sm font-black">
                      {auditSessionLogs.filter((l) => l.status !== 'MATCHED').length}
                    </strong>
                  </div>
                </div>

                {/* Audit Entries List */}
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {auditSessionLogs.length === 0 ? (
                    <div className="py-10 text-center text-slate-400">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-semibold">No items audited yet in this session.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Scan or select an item on the shelf to record your first tally.
                      </p>
                    </div>
                  ) : (
                    auditSessionLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <div className="pr-2">
                          <div className="font-bold text-slate-900">{log.itemName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Book: {log.previousStock} → Shelf: <strong>{log.physicalCount} {log.unit}</strong>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {log.reason} • {log.timestamp}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold block ${
                              log.status === 'MATCHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'SURPLUS'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status === 'MATCHED'
                              ? 'MATCHED'
                              : `${log.discrepancy > 0 ? '+' : ''}${log.discrepancy} ${log.unit}`}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 my-auto max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-semibold text-base">Add New Stock Item</h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Item / Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice 1kg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Native / Regional Name (e.g. बासमती चावल / બાસ્મતી ચોખા)
                </label>
                <input
                  type="text"
                  placeholder="e.g. गेहूं, बासमती चावल, यूरिया"
                  value={nativeName}
                  onChange={(e) => setNativeName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Barcode / Code
                  </label>
                  <input
                    type="text"
                    placeholder="Scan or enter"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grocery"
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Gm">Gm</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Box">Box</option>
                    <option value="Mtr">Mtr</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Buy Price ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Sale Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Wholesale & Unit Conversion Tiers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Wholesale Price ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 450.00 (Bulk rate)"
                    value={wholesalePrice}
                    onChange={(e) => setWholesalePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Secondary Unit & Ratio
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Gm / Tab"
                      value={secondaryUnit}
                      onChange={(e) => setSecondaryUnit(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Ratio (e.g. 1000)"
                      value={unitConversionRatio}
                      onChange={(e) => setUnitConversionRatio(e.target.value)}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Industry Specialized Fields */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Industry & Batch Details (Optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Batch No (Agro / Pharma)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BATCH-2026-A"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Part No (Garage / Spares)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BRK-PAD-01"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Serial / IMEI (Electronics)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 865234059123456"
                      value={serialImei}
                      onChange={(e) => setSerialImei(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Opening Stock Quantity
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Low Stock Alert Qty
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="5"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 my-auto max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="font-semibold text-base">Adjust Stock Level</h3>
                <p className="text-xs text-slate-500">{selectedItem.name}</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdjustType('SUBTRACT')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    adjustType === 'SUBTRACT'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  - Deduct (Damage/Loss)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('ADD')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    adjustType === 'ADD'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + Add Stock
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Quantity ({selectedItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="0"
                  autoFocus
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 text-lg font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Current Stock: {selectedItem.currentStock} {selectedItem.unit}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Reason for Adjustment
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Damage">Damaged Goods</option>
                  <option value="Expired">Expired Stock</option>
                  <option value="Recount">Physical Inventory Recount</option>
                  <option value="Lost">Lost or Theft</option>
                  <option value="Sample">Sample / Free Giveaway</option>
                  <option value="Return">Customer Return</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Audit Notes
                </label>
                <input
                  type="text"
                  placeholder="Additional notes for bookkeeping"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Executive Stock Movement History Modal */}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-900 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{selectedItem.name}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    {selectedItem.nativeName && <span>{selectedItem.nativeName} •</span>}
                    <span>Category: {selectedItem.category}</span>
                    {selectedItem.barcode && <span>• Barcode: <strong className="font-mono">{selectedItem.barcode}</strong></span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPrintItemModal(true)}
                  className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                  title="Print Item Statement"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Summary Metrics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Balance</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {selectedItem.currentStock} {selectedItem.unit}
                  </div>
                </div>

                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Inward (Aavak)</span>
                  <div className="text-base font-black text-emerald-700 mt-0.5">
                    +{historyInwardSum} {selectedItem.unit}
                  </div>
                </div>

                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-center">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Total Outward (Javak)</span>
                  <div className="text-base font-black text-rose-700 mt-0.5">
                    -{historyOutwardSum} {selectedItem.unit}
                  </div>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Audit Tallies</span>
                  <div className="text-base font-black text-amber-700 mt-0.5">
                    {historyAuditsCount} Events
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setHistoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    historyFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({stockHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('SALE')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    historyFilter === 'SALE'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sales / Bills ({stockHistory.filter((m) => m.movementType === 'SALE').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('INWARD')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    historyFilter === 'INWARD'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Inward Shipments ({stockHistory.filter((m) => m.movementType === 'PURCHASE' || m.movementType === 'INITIAL' || m.movementType === 'ADJUSTMENT_ADD').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('AUDIT')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    historyFilter === 'AUDIT'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Shelf Tallies ({historyAuditsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('ADJUST')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    historyFilter === 'ADJUST'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Adjustments ({stockHistory.filter((m) => m.movementType === 'ADJUSTMENT_ADD' || m.movementType === 'ADJUSTMENT_SUB').length})
                </button>
              </div>

              {/* Movement Ledger List */}
              <div className="space-y-2">
                {historyLoading ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-7 h-7 mx-auto mb-2 animate-spin text-indigo-600" />
                    <p className="text-xs font-semibold">Loading stock ledger movements...</p>
                  </div>
                ) : filteredStockHistory.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">No movement records found for this filter.</p>
                  </div>
                ) : (
                  filteredStockHistory.map((m) => {
                    const isOutward = m.movementType === 'SALE' || m.movementType === 'ADJUSTMENT_SUB';
                    const isInward = m.movementType === 'PURCHASE' || m.movementType === 'INITIAL' || m.movementType === 'ADJUSTMENT_ADD' || m.movementType === 'SALE_RETURN' || m.movementType === 'RETURN';

                    return (
                      <div
                        key={m.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 flex items-center justify-between text-xs transition"
                      >
                        <div className="space-y-1 pr-3">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                m.movementType === 'SALE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : m.movementType === 'PURCHASE' || m.movementType === 'INITIAL'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.movementType === 'SALE_RETURN' || m.movementType === 'RETURN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : m.movementType === 'AUDIT_RECONCILE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : m.movementType === 'AUDIT_VERIFIED'
                                  ? 'bg-teal-100 text-teal-800'
                                  : isOutward
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {m.movementType === 'SALE_RETURN' ? '↩️ SALE_RETURN' : m.movementType}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(m.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-slate-700 font-medium">
                            {m.reason || (m.movementType === 'SALE' ? 'POS Invoice Sale' : m.movementType === 'SALE_RETURN' ? 'Customer Sales Return (Restocked)' : 'Inventory Transaction')}
                          </p>

                          {m.notes && (
                            <p className="text-[11px] text-slate-500 italic">
                              Note: {m.notes}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`font-black text-sm ${
                              isOutward
                                ? 'text-rose-600'
                                : isInward
                                ? 'text-emerald-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {isOutward ? `-${m.quantity}` : isInward ? `+${m.quantity}` : m.quantity === 0 ? '0 (Verified)' : `Δ ${m.quantity}`}{' '}
                            <span className="text-[11px] font-medium">{selectedItem.unit}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            Balance: {m.stockAfter} {selectedItem.unit}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-500">
                Showing {filteredStockHistory.length} of {stockHistory.length} movement records
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPrintItemModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Item Statement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal 1: Official Daily Stock Register (Aavak - Javak Logbook) */}
      {showPrintRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden text-slate-900 my-auto max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Daily Stock Register Print Preview</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Now</span>
                </button>
                <button
                  onClick={() => setShowPrintRegisterModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs font-sans">
              {/* Official Store Print Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {activeTenant?.name || 'StockStore Khata'}
                  </h2>
                  <p className="text-slate-600">{activeTenant?.address || 'Retail & Wholesale Merchant'}</p>
                  {activeTenant?.phone && <p className="text-slate-600">Phone: {activeTenant.phone}</p>}
                  {activeTenant?.gstin && <p className="text-slate-600 font-mono">GSTIN: {activeTenant.gstin}</p>}
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-slate-900 text-white text-[11px] font-black uppercase rounded tracking-wider block">
                    DAILY STOCK REGISTER
                  </span>
                  <div className="mt-1 font-bold text-slate-700">
                    Date: <span className="font-black text-slate-900">{registerDate}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Generated: {new Date().toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-4 gap-2 text-center border border-slate-300 p-2.5 rounded-lg bg-slate-50">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Catalog Items</span>
                  <strong className="text-sm font-black text-slate-900">{displayedRegisterRows.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">Total Inward (आवक)</span>
                  <strong className="text-sm font-black text-emerald-700">+{registerFilteredInward}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-rose-800 font-bold uppercase block">Total Outward (जावक)</span>
                  <strong className="text-sm font-black text-rose-700">-{registerFilteredOutward}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-800 font-bold uppercase block">Closing Valuation</span>
                  <strong className="text-sm font-black text-indigo-900">
                    {currency}{registerFilteredValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <th className="border border-slate-300 p-2">Item Name</th>
                    <th className="border border-slate-300 p-2">Category</th>
                    <th className="border border-slate-300 p-2 text-right">Unit Rate</th>
                    <th className="border border-slate-300 p-2 text-right">Opening</th>
                    <th className="border border-slate-300 p-2 text-right bg-emerald-50">Inward (आवक)</th>
                    <th className="border border-slate-300 p-2 text-right bg-rose-50">Outward (जावक)</th>
                    <th className="border border-slate-300 p-2 text-right">Audit Diff</th>
                    <th className="border border-slate-300 p-2 text-right font-bold">Closing</th>
                    <th className="border border-slate-300 p-2 text-right">Closing Value</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRegisterRows.map((row) => (
                    <tr key={row.itemId} className="border-b border-slate-200">
                      <td className="border border-slate-300 p-2 font-medium">
                        {row.name} {row.nativeName ? `(${row.nativeName})` : ''}
                      </td>
                      <td className="border border-slate-300 p-2 text-slate-600">{row.category}</td>
                      <td className="border border-slate-300 p-2 text-right">{currency}{row.purchasePrice.toFixed(2)}</td>
                      <td className="border border-slate-300 p-2 text-right font-semibold">{row.openingStock} {row.unit}</td>
                      <td className="border border-slate-300 p-2 text-right text-emerald-700 font-bold">
                        {row.inwardQty > 0 ? `+${row.inwardQty}` : '-'}
                      </td>
                      <td className="border border-slate-300 p-2 text-right text-rose-700 font-bold">
                        {row.outwardQty > 0 ? `-${row.outwardQty}` : '-'}
                      </td>
                      <td className="border border-slate-300 p-2 text-right text-amber-700">
                        {row.auditDiscrepancyQty > 0 ? `Δ ${row.auditDiscrepancyQty}` : '-'}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-black">{row.closingStock} {row.unit}</td>
                      <td className="border border-slate-300 p-2 text-right font-bold">
                        {currency}{row.closingValue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-400">
                    <td colSpan={4} className="border border-slate-300 p-2 text-right uppercase">
                      Register Totals:
                    </td>
                    <td className="border border-slate-300 p-2 text-right text-emerald-800">
                      +{registerFilteredInward}
                    </td>
                    <td className="border border-slate-300 p-2 text-right text-rose-800">
                      -{registerFilteredOutward}
                    </td>
                    <td className="border border-slate-300 p-2 text-right text-slate-600">
                      Net: {registerFilteredNet >= 0 ? `+${registerFilteredNet}` : registerFilteredNet}
                    </td>
                    <td className="border border-slate-300 p-2 text-right">-</td>
                    <td className="border border-slate-300 p-2 text-right text-indigo-900 font-black">
                      {currency}{registerFilteredValuation.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Verification Sign-offs */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-slate-600">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">Store Manager / In-Charge</p>
                  <p className="text-[10px]">Verified Stock Register</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">Stock Auditor / Cashier</p>
                  <p className="text-[10px]">Audited & Balanced</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal 2: Item Stock Movement Statement */}
      {showPrintItemModal && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-900 my-auto max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Item Statement Print Preview</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Statement</span>
                </button>
                <button
                  onClick={() => setShowPrintItemModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs font-sans">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase">{activeTenant?.name || 'StockStore Khata'}</h2>
                  <p className="text-slate-600 font-semibold">{selectedItem.name} {selectedItem.nativeName ? `(${selectedItem.nativeName})` : ''}</p>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Category: {selectedItem.category} • Barcode: {selectedItem.barcode || 'N/A'} • Unit: {selectedItem.unit}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase rounded block">
                    ITEM STOCK CARD
                  </span>
                  <div className="mt-1 font-bold text-slate-700">
                    Current Balance: <strong className="text-slate-900 text-sm">{selectedItem.currentStock} {selectedItem.unit}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center border border-slate-300 p-2 rounded-lg bg-slate-50">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Inward</span>
                  <strong className="text-sm font-black text-emerald-700">+{historyInwardSum} {selectedItem.unit}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Outward</span>
                  <strong className="text-sm font-black text-rose-700">-{historyOutwardSum} {selectedItem.unit}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Audit Checks</span>
                  <strong className="text-sm font-black text-indigo-900">{historyAuditsCount}</strong>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <th className="border border-slate-300 p-2">Date / Time</th>
                    <th className="border border-slate-300 p-2">Transaction Type</th>
                    <th className="border border-slate-300 p-2">Reason / Details</th>
                    <th className="border border-slate-300 p-2 text-right">Quantity (±)</th>
                    <th className="border border-slate-300 p-2 text-right font-bold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockHistory.map((m) => {
                    const isOut = m.movementType === 'SALE' || m.movementType === 'ADJUSTMENT_SUB';
                    const isIn = m.movementType === 'PURCHASE' || m.movementType === 'INITIAL' || m.movementType === 'ADJUSTMENT_ADD';
                    return (
                      <tr key={m.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-slate-600">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                        <td className="border border-slate-300 p-2 font-bold">{m.movementType}</td>
                        <td className="border border-slate-300 p-2 text-slate-700">{m.reason || 'Manual movement'}</td>
                        <td className={`border border-slate-300 p-2 text-right font-black ${
                          isOut ? 'text-rose-700' : isIn ? 'text-emerald-700' : 'text-slate-800'
                        }`}>
                          {isOut ? `-${m.quantity}` : isIn ? `+${m.quantity}` : m.quantity === 0 ? '0' : `Δ ${m.quantity}`}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-black">{m.stockAfter}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pt-6 border-t border-slate-300 text-right text-slate-600">
                <p className="font-bold text-slate-800">Authorized Signatory</p>
                <p className="text-[10px]">Verified Stock Ledger</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal 3: Physical Shelf Tally Sheet */}
      {showPrintAuditSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-900 my-auto max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Shift Tally Sheet Print Preview</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sheet</span>
                </button>
                <button
                  onClick={() => setShowPrintAuditSessionModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs font-sans">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase">{activeTenant?.name || 'StockStore Khata'}</h2>
                  <p className="text-slate-600 font-bold">PHYSICAL STOCK AUDIT & SHELF TALLY SHEET</p>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Audited by: {auditedBy || 'Store Staff'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-indigo-700 text-white text-[10px] font-black uppercase rounded block">
                    SHELF TALLY AUDIT
                  </span>
                  <div className="mt-1 font-bold text-slate-700">Date: {new Date().toLocaleDateString()}</div>
                  <div className="text-[10px] text-slate-500">Items Audited: {auditSessionLogs.length}</div>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <th className="border border-slate-300 p-2">Time</th>
                    <th className="border border-slate-300 p-2">Item Name</th>
                    <th className="border border-slate-300 p-2 text-right">Book Stock</th>
                    <th className="border border-slate-300 p-2 text-right">Physical Count</th>
                    <th className="border border-slate-300 p-2 text-right font-bold">Variance</th>
                    <th className="border border-slate-300 p-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditSessionLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-200">
                      <td className="border border-slate-300 p-2 text-slate-500">{log.timestamp}</td>
                      <td className="border border-slate-300 p-2 font-medium">{log.itemName}</td>
                      <td className="border border-slate-300 p-2 text-right">{log.previousStock} {log.unit}</td>
                      <td className="border border-slate-300 p-2 text-right font-black">{log.physicalCount} {log.unit}</td>
                      <td className={`border border-slate-300 p-2 text-right font-black ${
                        log.status === 'MATCHED'
                          ? 'text-emerald-700'
                          : log.status === 'SURPLUS'
                          ? 'text-blue-700'
                          : 'text-rose-700'
                      }`}>
                        {log.status === 'MATCHED' ? '0 (Matched)' : `${log.discrepancy > 0 ? '+' : ''}${log.discrepancy} ${log.unit}`}
                      </td>
                      <td className="border border-slate-300 p-2 text-slate-600">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-slate-600">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">Physical Stock Auditor</p>
                  <p className="text-[10px]">Verified Count Signature</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">Store Manager Sign-Off</p>
                  <p className="text-[10px]">Approved Discrepancy Adjustments</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Scan Stock Manager Modal */}
      {showScanStockModal && scannedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 flex flex-col my-auto max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200 bg-linear-to-r from-indigo-50 to-emerald-50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Scan Stock Manager</h3>
                  <p className="text-xs text-slate-500">Quick receiving & inventory adjustment</p>
                </div>
              </div>
              <button
                onClick={() => setShowScanStockModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Item Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{scannedItem.name}</h4>
                    {scannedItem.nativeName && (
                      <p className="text-xs text-slate-500">{scannedItem.nativeName}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        Barcode: {scannedItem.barcode || 'N/A'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Cat: {scannedItem.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Current In Stock</span>
                    <span className="text-lg font-black text-emerald-600">
                      {scannedItem.currentStock} {scannedItem.unit}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-600 text-[11px]">
                  <span>MRP: <strong className="text-slate-900">{currency}{scannedItem.sellingPrice.toFixed(2)}</strong></span>
                  {scannedItem.wholesalePrice != null && scannedItem.wholesalePrice > 0 && (
                    <span>Wholesale: <strong className="text-indigo-700">{currency}{scannedItem.wholesalePrice.toFixed(2)}</strong></span>
                  )}
                  {scannedItem.purchasePrice != null && scannedItem.purchasePrice > 0 && (
                    <span>Cost: <strong className="text-slate-500">{currency}{scannedItem.purchasePrice.toFixed(2)}</strong></span>
                  )}
                </div>
              </div>

              {/* 1-Click Fast Stock Receiving */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ⚡ 1-Click Receive Shipment (Stock In):
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 5, 10, 25, 50].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => handleQuickAddStock(scannedItem, qty)}
                      className="py-2 px-1 text-center font-bold text-xs bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 rounded-xl transition shadow-xs"
                      title={`Instantly add +${qty} ${scannedItem.unit} to stock`}
                    >
                      +{qty} {scannedItem.unit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const q = parseFloat(adjustQty);
                  if (isNaN(q) || q <= 0) return;
                  try {
                    await api.adjustStock({
                      itemId: scannedItem.id,
                      adjustmentType: adjustType,
                      quantity: q,
                      reason: adjustReason,
                      notes: adjustNotes,
                    });
                    playScannerBeep(true);
                    setScanStockToast({
                      message: `✅ Stock updated for ${scannedItem.name}!`,
                      type: 'SUCCESS',
                    });
                    setTimeout(() => setScanStockToast(null), 3000);
                    setShowScanStockModal(false);
                    fetchItems();
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="space-y-3 pt-2 border-t border-slate-200"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Custom Stock Adjustment
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('ADD')}
                      className={`py-1.5 rounded-lg font-bold text-xs transition border ${
                        adjustType === 'ADD'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      + Stock In (Received)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('SUBTRACT')}
                      className={`py-1.5 rounded-lg font-bold text-xs transition border ${
                        adjustType === 'SUBTRACT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      - Stock Out (Damage/Loss)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Quantity ({scannedItem.unit}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Reason
                    </label>
                    <select
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Purchase / Shipment Received">Shipment / Purchase Received</option>
                      <option value="Physical Stock Audit">Physical Audit Correction</option>
                      <option value="Damaged / Broken">Damage / Broken Goods</option>
                      <option value="Expired Stock Removal">Expired Stock Removal</option>
                      <option value="Customer Return">Customer Return</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Notes / Batch Ref.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Invoice #PO-902, Carton 4"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Auto +1 Mode Toggle */}
                <div className="pt-2 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAddOneOnScan}
                      onChange={(e) => setAutoAddOneOnScan(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-700">
                      Rapid Mode: Auto +1 {scannedItem.unit} on each future scan
                    </span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowScanStockModal(false)}
                    className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                  >
                    Confirm Stock Change
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Autonomous AI Reorder Bot Modal */}
      {showReorderBotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-indigo-900/50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 text-white shadow-md">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold">Autonomous AI Reorder Bot</h3>
                    <span className="text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-mono font-semibold">
                      {reorderPoNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Stock-out prevention: Draft automated multilingual Purchase Orders and dispatch directly to distributor WhatsApp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReorderBotModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Distributor & Configuration Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Distributor Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Truck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Select Distributor / Supplier</span>
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {reorderSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Other / Custom Distributor</option>
                  </select>
                </div>

                {/* Distributor Details (Name & Phone) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Distributor Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shreeji Traders / Balaji Agencies"
                    value={reorderSupplierName}
                    onChange={(e) => setReorderSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp Phone Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={reorderSupplierPhone}
                    onChange={(e) => setReorderSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Language & PO Preferences */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    PO Language:
                  </span>
                  <div className="inline-flex rounded-lg border border-indigo-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setReorderLanguage('EN')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                        reorderLanguage === 'EN'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      type="button"
                      onClick={() => setReorderLanguage('HI')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                        reorderLanguage === 'HI'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🇮🇳 हिंदी (Hindi)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReorderLanguage('GU')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                        reorderLanguage === 'GU'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🇮🇳 ગુજરાતી (Gujarati)
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    Selected Items: <strong className="text-slate-800">{activePoDrafts.length}</strong> / {reorderDraftItems.length}
                  </span>
                  <span className="text-slate-500 font-medium">
                    Total Units: <strong className="text-slate-800">{totalPoQty}</strong>
                  </span>
                  <span className="text-slate-500 font-medium">
                    Est. Value: <strong className="text-indigo-700 font-bold">{currency}{totalEstPoValue.toFixed(2)}</strong>
                  </span>
                </div>
              </div>

              {/* Items Table & Stepper */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Reorder Draft Items
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAllDrafts(true)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAllDrafts(false)}
                      className="text-slate-500 hover:text-slate-700 font-semibold"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/75 text-[11px] font-bold uppercase text-slate-600 sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Include</th>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3 text-center">Current Stock / Alert</th>
                        <th className="py-2.5 px-3 text-center">Reorder Qty</th>
                        <th className="py-2.5 px-3 text-right">Est. Cost Rate</th>
                        <th className="py-2.5 px-3 text-right">Est. Total</th>
                        <th className="py-2.5 px-3 w-10 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reorderDraftItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No items in reorder list. Add items from catalog below.
                          </td>
                        </tr>
                      ) : (
                        reorderDraftItems.map((draft) => {
                          const isLow = draft.item.currentStock <= draft.item.minStockAlert;
                          const lineTotal = draft.reorderQty * (draft.item.purchasePrice || 0);

                          return (
                            <tr
                              key={draft.item.id}
                              className={`transition ${draft.isSelected ? 'bg-white hover:bg-indigo-50/30' : 'bg-slate-50/60 opacity-60'}`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={draft.isSelected}
                                  onChange={() => handleToggleDraftSelection(draft.item.id)}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{draft.item.name}</div>
                                {draft.item.nativeName && (
                                  <div className="text-[11px] text-indigo-600">{draft.item.nativeName}</div>
                                )}
                                <div className="text-[10px] text-slate-400">
                                  {draft.item.category || 'General'} {draft.item.barcode ? `• Code: ${draft.item.barcode}` : ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="inline-flex items-center space-x-1">
                                  <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-700'}`}>
                                    {draft.item.currentStock} {draft.item.unit}
                                  </span>
                                  <span className="text-slate-400">/</span>
                                  <span className="text-slate-500" title="Min alert threshold">
                                    Min {draft.item.minStockAlert}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDraftQty(draft.item.id, Math.max(1, draft.reorderQty - 1))}
                                    className="px-2 py-1 bg-slate-50 hover:bg-slate-200 text-slate-700 font-bold transition"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={draft.reorderQty}
                                    onChange={(e) => handleUpdateDraftQty(draft.item.id, parseInt(e.target.value) || 1)}
                                    className="w-16 text-center py-1 font-bold text-slate-900 text-xs focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDraftQty(draft.item.id, draft.reorderQty + 1)}
                                    className="px-2 py-1 bg-slate-50 hover:bg-slate-200 text-slate-700 font-bold transition"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-500 ml-1.5">{draft.item.unit}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                                {currency}{draft.item.purchasePrice.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {currency}{lineTotal.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDraftItem(draft.item.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                                  title="Remove from draft"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Another Item from Master Catalog */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600 shrink-0">
                    + Add other item to this PO:
                  </span>
                  <select
                    value={reorderItemToAdd}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCatalogItemToDraft(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Choose item from catalog --</option>
                    {items
                      .filter((it) => !reorderDraftItems.some((d) => d.item.id === it.id))
                      .map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} (Stock: {it.currentStock} {it.unit}) - {currency}{it.purchasePrice.toFixed(2)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Delivery Notes & WhatsApp Preview Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Delivery Notes */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Delivery Instructions / Special Notes
                  </label>
                  <textarea
                    rows={4}
                    value={reorderNotes}
                    onChange={(e) => setReorderNotes(e.target.value)}
                    placeholder="e.g. Please dispatch before 11:00 AM. Provide invoice bill copy with vehicle delivery."
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 italic">
                    These instructions will be formatted directly into the distributor's WhatsApp dispatch message and printable PO slip.
                  </p>
                </div>

                {/* Live WhatsApp Message Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Live WhatsApp Message Preview</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(liveWhatsAppPreviewText);
                        alert('WhatsApp message copied to clipboard!');
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Copy Text
                    </button>
                  </div>

                  <div className="bg-[#e5ddd5] p-3 rounded-xl border border-emerald-200/80 max-h-36 overflow-y-auto shadow-inner text-xs font-sans text-slate-900 whitespace-pre-wrap leading-relaxed">
                    <div className="bg-white p-2.5 rounded-lg shadow-xs border border-emerald-100">
                      {liveWhatsAppPreviewText || 'Select items to preview message.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPrintPoModal(true)}
                  disabled={activePoDrafts.length === 0}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official PO Slip</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReorderBotModal(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleSendPoViaWhatsApp}
                  disabled={activePoDrafts.length === 0 || !reorderSupplierPhone.trim()}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch PO to Distributor WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Purchase Order Print Slip Modal */}
      {showPrintPoModal && activeTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Purchase Order Print Preview</h3>
              </div>

              <div className="flex items-center space-x-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPoPrintFormat('A4')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
                      poPrintFormat === 'A4' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    A4 Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoPrintFormat('THERMAL')}
                    className={`px-2.5 py-1 rounded font-semibold transition ${
                      poPrintFormat === 'THERMAL' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    80mm Thermal
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPrintPoModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              <div
                id="printable-po-slip"
                className={`bg-white shadow-md p-6 border border-slate-200 text-slate-800 ${
                  poPrintFormat === 'THERMAL' ? 'max-w-[340px] font-mono text-xs' : 'max-w-xl w-full text-xs'
                }`}
              >
                {/* Store Header */}
                <div className="text-center pb-4 border-b border-slate-300">
                  <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                    {activeTenant.name}
                  </h1>
                  {activeTenant.tagline && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">{activeTenant.tagline}</p>
                  )}
                  {activeTenant.address && (
                    <p className="text-[11px] text-slate-600 mt-1">{activeTenant.address}</p>
                  )}
                  {activeTenant.phone && (
                    <p className="text-[11px] text-slate-600">Phone: {activeTenant.phone}</p>
                  )}
                  {activeTenant.gstin && (
                    <p className="text-[11px] font-bold text-slate-700">GSTIN: {activeTenant.gstin}</p>
                  )}
                </div>

                {/* PO Title & Metadata */}
                <div className="py-3 border-b border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-indigo-700 tracking-wider">OFFICIAL PURCHASE ORDER</span>
                    <span className="font-bold text-slate-900">{reorderPoNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Date: {new Date().toLocaleDateString()}</span>
                    <span>Status: ISSUED</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-[11px]">
                    <p>
                      <strong>Distributor:</strong> {reorderSupplierName || 'Supplier'}
                    </p>
                    {reorderSupplierPhone && (
                      <p>
                        <strong>Phone / WA:</strong> {reorderSupplierPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full my-3 text-left">
                  <thead className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-600">
                    <tr>
                      <th className="py-1">#</th>
                      <th className="py-1">Item Description</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Est. Rate</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePoDrafts.map((d, idx) => (
                      <tr key={d.item.id}>
                        <td className="py-1.5">{idx + 1}</td>
                        <td className="py-1.5 font-medium">
                          {d.item.name}
                          {d.item.nativeName ? ` (${d.item.nativeName})` : ''}
                        </td>
                        <td className="py-1.5 text-center font-bold">
                          {d.reorderQty} {d.item.unit}
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {currency}{d.item.purchasePrice.toFixed(2)}
                        </td>
                        <td className="py-1.5 text-right font-mono font-bold">
                          {currency}{(d.reorderQty * d.item.purchasePrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & Notes */}
                <div className="pt-2 border-t border-slate-300 space-y-1">
                  <div className="flex justify-between font-bold text-sm">
                    <span>Total Est. Order Value:</span>
                    <span className="text-indigo-700">{currency}{totalEstPoValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Total Units Ordered:</span>
                    <span>{totalPoQty} units ({activePoDrafts.length} items)</span>
                  </div>
                </div>

                {reorderNotes && (
                  <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                    <strong>Delivery Notes:</strong> {reorderNotes}
                  </div>
                )}

                {/* Signatory line */}
                <div className="mt-6 pt-4 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
                  <div>
                    <p>Generated by StockStoreKhata</p>
                    <p>{new Date().toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="border-b border-slate-400 w-36 mb-1"></div>
                    <p className="font-bold text-slate-700">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPrintPoModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Notification Toast */}
      {reorderToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-xs font-bold shadow-xl flex items-center space-x-3 transition-all animate-in slide-in-from-bottom duration-200 ${
            reorderToast.type === 'SUCCESS' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{reorderToast.message}</span>
          <button
            onClick={() => setReorderToast(null)}
            className="text-white/80 hover:text-white p-0.5 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Soft-Delete / Deactivate Confirmation Modal */}
      {deactivatingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Deactivate Item Safely</h3>
                <p className="text-xs text-slate-500">Soft-Delete (No data loss guarantee)</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-700 font-semibold">
                <span>Product Name:</span>
                <span className="text-slate-900 font-bold">{deactivatingItem.name}</span>
              </div>
              {deactivatingItem.barcode && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Barcode:</span>
                  <span className="font-mono text-slate-800">{deactivatingItem.barcode}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-600">
                <span>Current Stock:</span>
                <span className="font-bold text-indigo-600">{deactivatingItem.currentStock} {deactivatingItem.unit}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6 bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-amber-900">
              💡 <strong>Soft Delete Protection:</strong> This product will be marked inactive. It will be hidden from new POS sales and catalog lists, but all historical invoices, stock register entries, and GST tax filings remain 100% intact. You can reactivate this item at any time from the "Archived" filter.
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setDeactivatingItem(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleDeactivateItem}
                disabled={deactivateLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
              >
                {deactivateLoading ? (
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

      {/* Camera Barcode Scanner Modal for Inventory */}
      <BarcodeCameraScanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(code) => handleInventoryBarcodeScan(code)}
        title="Inventory Barcode Scanner"
        subtitle="Aim camera at item barcode to view stock or receive inventory"
        continuous={true}
      />
    </div>
  );
};
