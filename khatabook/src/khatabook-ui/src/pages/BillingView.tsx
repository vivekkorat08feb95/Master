import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Trash2, 
  Printer, 
  Plus, 
  Minus, 
  CheckCircle2, 
  X,
  History,
  UserPlus,
  FileText,
  FileSpreadsheet,
  UserCheck,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  QrCode,
  Mic,
  MicOff,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  Tag,
  Volume2,
  Zap,
  Loader2,
  Camera,
  Barcode,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Calendar,
  SlidersHorizontal,
  RotateCcw,
  Undo2,
  ArrowDownLeft,
  FileCheck,
  Banknote,
  CreditCard,
  Package,
  ShoppingCart
} from 'lucide-react';
import { Item, Party, Tenant, Invoice, InvoiceItem } from '../types';
import { api } from '../services/api';
import { SearchableSelect } from '../components/SearchableSelect';
import { Pagination } from '../components/Pagination';
import { exportInvoicesToExcel, exportInvoicesToPdf } from '../utils/exportUtils';
import { generateUpiQrDataUrl } from '../utils/upiQr';

import { 
  formatWhatsAppInvoiceMessage, 
  sendWhatsAppInvoiceDirect, 
  sendWhatsAppCreditNoteDirect,
  getWhatsAppTargetPreference, 
  setWhatsAppTargetPreference, 
  WhatsAppTarget 
} from '../utils/whatsappHelper';
import { assessPartyCreditRisk } from '../utils/creditScorer';
import { parseVoiceCommand } from '../utils/voiceParser';
import { playScannerBeep } from '../utils/audioBeep';
import { BarcodeCameraScanner } from '../components/BarcodeCameraScanner';
import { 
  cacheItemsLocally, 
  getCachedItemsLocally, 
  cachePartiesLocally, 
  getCachedPartiesLocally, 
  saveOfflineInvoice 
} from '../utils/offlineStorage';

interface BillingViewProps {
  activeTenant: Tenant | null;
  activeUser?: any | null;
}

export const BillingView: React.FC<BillingViewProps> = ({ activeTenant, activeUser }) => {
  // Navigation mode
  const [activeTab, setActiveTab] = useState<'POS' | 'HISTORY'>('POS');
  const [posMobileTab, setPosMobileTab] = useState<'CART' | 'CHECKOUT'>('CART');

  // WhatsApp auto-send and target preferences
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState<boolean>(() => {
    return localStorage.getItem('khatabook_auto_whatsapp') !== 'false';
  });
  const [waTarget, setWaTarget] = useState<WhatsAppTarget>(() => getWhatsAppTargetPreference());

  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  
  // Require customer toggle (default true for retail accountability)
  const [requireCustomer, setRequireCustomer] = useState<boolean>(true);
  const [checkoutError, setCheckoutError] = useState<string>('');

  // Quick Add Customer modal
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);
  const [quickName, setQuickName] = useState<string>('');
  const [quickNativeName, setQuickNativeName] = useState<string>('');
  const [quickPhone, setQuickPhone] = useState<string>('');
  const [quickAddress, setQuickAddress] = useState<string>('');
  const [addingCustomer, setAddingCustomer] = useState<boolean>(false);

  // Quick Add Item Modal (Auto-triggered when scanned barcode not found in system, or manually)
  const [showQuickAddItemModal, setShowQuickAddItemModal] = useState<boolean>(false);
  const [quickItemBarcode, setQuickItemBarcode] = useState<string>('');
  const [quickItemName, setQuickItemName] = useState<string>('');
  const [quickItemNativeName, setQuickItemNativeName] = useState<string>('');
  const [quickItemCategory, setQuickItemCategory] = useState<string>('General');
  const [quickItemUnit, setQuickItemUnit] = useState<string>('Pcs');
  const [quickItemSellingPrice, setQuickItemSellingPrice] = useState<string>('');
  const [quickItemPurchasePrice, setQuickItemPurchasePrice] = useState<string>('');
  const [quickItemWholesalePrice, setQuickItemWholesalePrice] = useState<string>('');
  const [quickItemOpeningStock, setQuickItemOpeningStock] = useState<string>('10');
  const [quickItemMinAlert, setQuickItemMinAlert] = useState<string>('5');
  const [quickItemAutoAddToCart, setQuickItemAutoAddToCart] = useState<boolean>(true);
  const [isSavingQuickItem, setIsSavingQuickItem] = useState<boolean>(false);

  // Cart
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('CASH');

  // Search items
  const [searchItem, setSearchItem] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

  // Print modal / receipt view
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<'THERMAL' | 'A4'>('THERMAL');
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [showCounterUpiModal, setShowCounterUpiModal] = useState<boolean>(false);
  const [counterUpiQrUrl, setCounterUpiQrUrl] = useState<string>('');
  const [upiPaymentStatus, setUpiPaymentStatus] = useState<'IDLE' | 'SUCCESS'>('IDLE');
  const [autoVerifySeconds, setAutoVerifySeconds] = useState<number | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Wholesale vs Retail Price Tier
  const [priceTier, setPriceTier] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');

  // AI Voice POS
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceToast, setVoiceToast] = useState<string>('');

  // Barcode scanner states
  const [showCameraScanner, setShowCameraScanner] = useState<boolean>(false);
  const [scanToast, setScanToast] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  // History state
  const [historyInvoices, setHistoryInvoices] = useState<Invoice[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyPartyFilter, setHistoryPartyFilter] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'SALE' | 'SALE_RETURN'>('ALL');
  const [historyActiveFilter, setHistoryActiveFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [historyPaymentModeFilter, setHistoryPaymentModeFilter] = useState<string>('ALL');
  const [historyDateRangeFilter, setHistoryDateRangeFilter] = useState<string>('ALL');
  const [historySortField, setHistorySortField] = useState<'createdAt' | 'invoiceNumber' | 'totalAmount' | 'paidAmount' | 'balanceAmount' | 'customerName'>('createdAt');
  const [historySortDir, setHistorySortDir] = useState<'asc' | 'desc'>('desc');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(25);
  const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);
  const [isVoidingInvoice, setIsVoidingInvoice] = useState<boolean>(false);

  // POS Product picker dropdown state
  const [posCategoryFilter, setPosCategoryFilter] = useState<string>('ALL');

  // Return & Credit Note Modal States
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<Invoice | null>(null);
  const [invoiceItemsForReturn, setInvoiceItemsForReturn] = useState<any[]>([]);
  const [loadingReturnInvoice, setLoadingReturnInvoice] = useState<boolean>(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnItemsSelected, setReturnItemsSelected] = useState<Record<string, boolean>>({});
  const [returnReason, setReturnReason] = useState<string>('Defective / Damaged');
  const [refundMode, setRefundMode] = useState<string>('CASH');
  const [restockInventory, setRestockInventory] = useState<boolean>(true);
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [isProcessingReturn, setIsProcessingReturn] = useState<boolean>(false);
  const [returnError, setReturnError] = useState<string>('');

  // Credit Note Print Modal
  const [showCreditNoteModal, setShowCreditNoteModal] = useState<boolean>(false);
  const [lastCreditNote, setLastCreditNote] = useState<any | null>(null);
  const [creditNoteFormat, setCreditNoteFormat] = useState<'THERMAL' | 'A4'>('THERMAL');
  const creditNotePrintRef = useRef<HTMLDivElement>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const currency = activeTenant?.currencySymbol || '₹';

  const loadData = async () => {
    try {
      if (navigator.onLine && activeTenant) {
        const [partiesRes, itemsRes] = await Promise.all([
          api.getParties({ type: 'CUSTOMER' }),
          api.getItems(),
        ]);
        setParties(partiesRes.data);
        setItems(itemsRes.data);
        // Cache to IndexedDB for seamless offline operations
        await cacheItemsLocally(itemsRes.data);
        await cachePartiesLocally(partiesRes.data);
      } else {
        const [cachedP, cachedI] = await Promise.all([
          getCachedPartiesLocally(),
          getCachedItemsLocally()
        ]);
        setParties(cachedP);
        setItems(cachedI);
      }
    } catch (err) {
      console.warn('Network load failed, falling back to offline IndexedDB cache', err);
      const [cachedP, cachedI] = await Promise.all([
        getCachedPartiesLocally(),
        getCachedItemsLocally()
      ]);
      setParties(cachedP);
      setItems(cachedI);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTenant]);

  const loadHistory = async () => {
    if (!activeTenant) return;
    setHistoryLoading(true);
    try {
      const res = await api.getInvoices({
        partyId: historyPartyFilter || undefined,
        search: historySearch.trim() || undefined,
        type: historyTypeFilter === 'ALL' ? undefined : historyTypeFilter,
        isActive: historyActiveFilter === 'ALL' ? undefined : historyActiveFilter === 'ACTIVE' ? true : false,
      });
      setHistoryInvoices(res.data);
    } catch (err) {
      console.error('Failed to load invoice history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      loadHistory();
    }
  }, [activeTab, historyPartyFilter, historySearch, historyTypeFilter, historyActiveFilter, activeTenant]);

  useEffect(() => {
    if (!searchItem.trim()) {
      setFilteredItems([]);
    } else {
      const term = searchItem.toLowerCase();
      setFilteredItems(
        items.filter(
          (i) =>
            i.name.toLowerCase().includes(term) ||
            (i.nativeName && i.nativeName.toLowerCase().includes(term)) ||
            (i.barcode && i.barcode.toLowerCase().includes(term))
        ).slice(0, 8)
      );
    }
  }, [searchItem, items]);

  const addToCart = (item: Item, customQty: number = 1) => {
    const unitPrice =
      priceTier === 'WHOLESALE' && item.wholesalePrice && item.wholesalePrice > 0
        ? item.wholesalePrice
        : item.sellingPrice;

    setCart((prev) => {
      const existing = prev.find((ci) => ci.itemId === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.itemId === item.id
            ? {
                ...ci,
                quantity: ci.quantity + customQty,
                total: (ci.quantity + customQty) * ci.unitPrice,
              }
            : ci
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          itemName: item.name,
          nativeName: item.nativeName,
          unit: item.unit,
          priceTier,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: customQty,
          unitPrice,
          discountAmount: 0,
          taxRate: item.taxRate || 0,
          total: unitPrice * customQty,
        },
      ];
    });
    setSearchItem('');
    setFilteredItems([]);
  };

  const openQuickAddItemModal = (prefillCode?: string, prefillName?: string) => {
    setQuickItemBarcode(prefillCode || '');
    setQuickItemName(prefillName || '');
    setQuickItemNativeName('');
    setQuickItemCategory('General');
    setQuickItemUnit('Pcs');
    setQuickItemSellingPrice('');
    setQuickItemPurchasePrice('');
    setQuickItemWholesalePrice('');
    setQuickItemOpeningStock('10');
    setQuickItemMinAlert('5');
    setQuickItemAutoAddToCart(true);
    setShowQuickAddItemModal(true);
    setShowCameraScanner(false);
  };

  const handleCreateQuickItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemName.trim() || !quickItemSellingPrice.trim()) {
      alert('Product Name and Selling Price are required.');
      return;
    }

    const price = parseFloat(quickItemSellingPrice);
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid selling price.');
      return;
    }

    const cost = parseFloat(quickItemPurchasePrice || '0') || 0;
    const wsPrice = parseFloat(quickItemWholesalePrice || '0') || 0;
    const stock = parseFloat(quickItemOpeningStock || '10') || 0;
    const minAlert = parseFloat(quickItemMinAlert || '5') || 5;

    const payload = {
      name: quickItemName.trim(),
      nativeName: quickItemNativeName.trim() || undefined,
      barcode: quickItemBarcode.trim() || undefined,
      category: quickItemCategory.trim() || 'General',
      unit: quickItemUnit || 'Pcs',
      purchasePrice: cost,
      sellingPrice: price,
      mrp: price,
      wholesalePrice: wsPrice,
      openingStock: stock,
      minStockAlert: minAlert,
      taxRate: 0,
      unitConversionRatio: 1,
    };

    try {
      setIsSavingQuickItem(true);
      let createdItem: Item;

      if (!navigator.onLine) {
        // Offline handling: create temporary offline item
        createdItem = {
          id: `offline-item-${Date.now()}`,
          name: payload.name,
          nativeName: payload.nativeName,
          barcode: payload.barcode,
          category: payload.category,
          unit: payload.unit,
          purchasePrice: payload.purchasePrice,
          sellingPrice: payload.sellingPrice,
          mrp: payload.mrp,
          wholesalePrice: payload.wholesalePrice,
          currentStock: payload.openingStock,
          openingStock: payload.openingStock,
          minStockAlert: payload.minStockAlert,
          taxRate: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Item;

        const updatedItems = [createdItem, ...items];
        setItems(updatedItems);
        await cacheItemsLocally(updatedItems);
      } else {
        const res = await api.createItem(payload);
        createdItem = res.data;
        const updatedItems = [createdItem, ...items];
        setItems(updatedItems);
        await cacheItemsLocally(updatedItems);
      }

      playScannerBeep(true);

      // If auto-add to cart is enabled:
      if (quickItemAutoAddToCart) {
        addToCart(createdItem, 1);
        setScanToast({
          message: `🎉 Added to catalog: ${createdItem.name} and inserted into Cart (+1 ${createdItem.unit})!`,
          type: 'SUCCESS',
        });
      } else {
        setScanToast({
          message: `✅ Created ${createdItem.name} in catalog!`,
          type: 'SUCCESS',
        });
      }

      setTimeout(() => setScanToast(null), 3500);
      setShowQuickAddItemModal(false);
      setSearchItem('');
      setFilteredItems([]);
    } catch (err: any) {
      console.error('Failed to create quick item', err);
      alert(err.response?.data?.message || 'Failed to create item. Please check the values.');
    } finally {
      setIsSavingQuickItem(false);
    }
  };

  const handleBarcodeScan = (scannedCode: string): boolean => {
    const raw = (scannedCode || '').trim();
    if (!raw) return false;
    const clean = raw.toLowerCase();

    // 1. Look for matching barcode, SKU, partNumber, serialImei, or exact name
    const matched = items.find((i) => {
      const b = (i.barcode || '').trim().toLowerCase();
      const p = (i.partNumber || '').trim().toLowerCase();
      const s = (i.serialImei || '').trim().toLowerCase();
      const n = i.name.trim().toLowerCase();
      return b === clean || p === clean || s === clean || n === clean;
    });

    if (matched) {
      playScannerBeep(true);
      addToCart(matched, 1);

      const existingInCart = cart.find((ci) => ci.itemId === matched.id);
      const newQty = (existingInCart ? existingInCart.quantity : 0) + 1;

      setScanToast({
        message: `🔔 Scanned: ${matched.name} (+1 ${matched.unit || 'Pack'}) • In Cart: ${newQty}`,
        type: 'SUCCESS',
      });
      setTimeout(() => setScanToast(null), 3000);
      setSearchItem('');
      setFilteredItems([]);
      return true;
    } else {
      playScannerBeep(false);
      setScanToast({
        message: `⚠️ Unrecognized Barcode "${raw}". Opening Quick Add Item...`,
        type: 'ERROR',
      });
      setTimeout(() => setScanToast(null), 3500);

      // Distinguish if raw looks like a barcode/sku code or item name
      const isCode = /^[0-9A-Za-z\-_]{3,}$/.test(raw) && !raw.includes(' ');
      if (isCode) {
        openQuickAddItemModal(raw, '');
      } else {
        openQuickAddItemModal('', raw);
      }
      return true;
    }
  };

  // Global listener for physical USB/Bluetooth handheld barcode scanners
  useEffect(() => {
    if (activeTab !== 'POS') return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const matched = handleBarcodeScan(buffer);
          if (matched) {
            e.preventDefault();
            buffer = '';
            return;
          }
        }
        buffer = '';
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Barcode scanners output characters in rapid bursts (< 55ms per character)
      if (diff < 55 || buffer.length === 0) {
        buffer += e.key;
      } else {
        buffer = e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, items, cart]);

  const startVoiceBilling = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // Recognizes Hindi/English/Hinglish
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      setVoiceToast('🎙️ Listening... Speak quantity & item (e.g. "2 packet urea" or "5 kg seeds")');

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const parsed = parseVoiceCommand(transcript, items);
        if (parsed) {
          addToCart(parsed.matchedItem, parsed.quantity);
          setVoiceToast(`✅ Voice POS added: ${parsed.quantity}x ${parsed.matchedItem.name}!`);
        } else {
          setVoiceToast(`❓ Couldn't match item: "${transcript}". Please search by name.`);
        }
        setIsListening(false);
        setTimeout(() => setVoiceToast(''), 4500);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceToast('');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error('Speech recognition error', e);
      setIsListening(false);
      setVoiceToast('');
    }
  };

  const openCounterUpiQr = async () => {
    if (cart.length === 0) {
      setCheckoutError('Please add at least one item to the cart first.');
      return;
    }
    if (requireCustomer && !selectedParty) {
      setCheckoutError('Customer selection is required before generating UPI QR.');
      return;
    }
    setCheckoutError('');

    if (!activeTenant?.upiId) {
      alert('Please configure your store UPI ID in Store Settings (click gear icon in navbar).');
      return;
    }
    if (grandTotal <= 0) {
      alert('Cart total must be greater than 0 to generate UPI QR code.');
      return;
    }

    const qr = await generateUpiQrDataUrl({
      vpa: activeTenant.upiId,
      payeeName: activeTenant.upiPayeeName || activeTenant.name,
      amount: grandTotal,
      note: `Bill for ${activeTenant.name}`,
    }, 280);

    setCounterUpiQrUrl(qr);
    setUpiPaymentStatus('IDLE');
    setAutoVerifySeconds(null);
    setShowCounterUpiModal(true);
  };

  const generateReceiptQr = async (invoiceData: any) => {
    if (activeTenant?.upiId && invoiceData?.totalAmount > 0) {
      const qr = await generateUpiQrDataUrl({
        vpa: activeTenant.upiId,
        payeeName: activeTenant.upiPayeeName || activeTenant.name,
        amount: invoiceData.totalAmount,
        transactionRef: invoiceData.invoiceNumber,
        note: `Bill ${invoiceData.invoiceNumber}`,
      }, 180);
      setUpiQrUrl(qr);
    } else {
      setUpiQrUrl('');
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        item.quantity = newQty;
        item.total = item.quantity * item.unitPrice - item.discountAmount;
      }
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((acc, ci) => acc + ci.quantity * ci.unitPrice, 0);
  const discount = parseFloat(discountAmount || '0') || 0;
  const grandTotal = Math.max(0, subtotal - discount);

  // Auto-sync paid amount default
  useEffect(() => {
    setPaidAmount(grandTotal.toString());
  }, [grandTotal]);

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    setAddingCustomer(true);
    try {
      const res = await api.createParty({
        name: quickName.trim(),
        nativeName: quickNativeName.trim() || undefined,
        phone: quickPhone.trim() || undefined,
        address: quickAddress.trim() || undefined,
        partyType: 'CUSTOMER',
      });
      const newCust = res.data;
      setParties((prev) => [newCust, ...prev]);
      setSelectedParty(newCust);
      setShowQuickAdd(false);
      setQuickName('');
      setQuickNativeName('');
      setQuickPhone('');
      setQuickAddress('');
      setCheckoutError('');
    } catch (err) {
      console.error('Failed to create customer', err);
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleCheckout = async (overrideMode?: string, overridePaid?: number) => {
    if (cart.length === 0) return;

    if (requireCustomer && !selectedParty) {
      setCheckoutError('Customer selection is required. Please select or add a customer.');
      return;
    }
    setCheckoutError('');

    const mode = overrideMode || paymentMode;
    const paid = overridePaid !== undefined ? overridePaid : (parseFloat(paidAmount || '0') || 0);
    const billerName = activeUser?.fullName || activeTenant?.name || 'Cashier';

    const payload = {
      invoiceType: 'SALE',
      partyId: selectedParty?.id || null,
      partyName: selectedParty?.name || 'Walk-in Customer',
      partyPhone: selectedParty?.phone || null,
      discountAmount: discount,
      paidAmount: paid,
      paymentMode: mode,
      notes: `POS Bill`,
      createdBy: activeUser?.id || null,
      createdByName: billerName,
      items: cart,
    };

    try {
      setIsCheckingOut(true);

      // Offline-first interception: If device is offline, store directly in IndexedDB queue
      if (!navigator.onLine) {
        const offlineResult = await saveOfflineInvoice(payload);
        setLastInvoice(offlineResult);
        setShowPrintModal(true);
        // Reset form
        setCart([]);
        setDiscountAmount('0');
        setSelectedParty(null);
        setPaidAmount('');
        setPaymentMode('CASH');
        return;
      }

      const res = await api.createInvoice(payload);
      setLastInvoice(res.data);
      await generateReceiptQr(res.data.invoice);
      setShowPrintModal(true);

      // Auto-send directly to customer's WhatsApp upon invoice generation (No extra browser tab!)
      const targetPhone = res.data.invoice?.partyPhone || payload.partyPhone;
      if (autoSendWhatsApp && targetPhone && activeTenant) {
        sendWhatsAppInvoiceDirect(res.data.invoice, activeTenant, res.data.items, waTarget);
      }

      // Reset form
      setCart([]);
      setDiscountAmount('0');
      setSelectedParty(null);
      setPaidAmount('');
      setPaymentMode('CASH');
    } catch (err) {
      console.warn('Online invoice creation failed, saving to offline IndexedDB queue...', err);
      try {
        const offlineResult = await saveOfflineInvoice(payload);
        setLastInvoice(offlineResult);
        setShowPrintModal(true);
        // Reset form
        setCart([]);
        setDiscountAmount('0');
        setSelectedParty(null);
        setPaidAmount('');
        setPaymentMode('CASH');
      } catch (offlineErr) {
        console.error('Invoice creation failed completely', offlineErr);
        setCheckoutError('Invoice creation failed. Please check network and try again.');
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const announcePaymentSuccess = (amount: number, mode: string = 'UPI') => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const storeName = activeTenant?.name || 'Store';
        const msg = `${storeName}: Received ${Math.round(amount)} rupees payment via ${mode}`;
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-IN';
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error('Speech synthesis error', e);
    }
  };

  const executeUpiPaymentSuccess = async () => {
    setAutoVerifySeconds(null);
    setUpiPaymentStatus('SUCCESS');
    announcePaymentSuccess(grandTotal, 'UPI');

    // Auto-close modal after 900ms and immediately generate the invoice bill!
    setTimeout(async () => {
      setShowCounterUpiModal(false);
      setUpiPaymentStatus('IDLE');
      await handleCheckout('UPI', grandTotal);
    }, 900);
  };

  useEffect(() => {
    let timer: any = null;
    if (autoVerifySeconds !== null && autoVerifySeconds > 0 && showCounterUpiModal) {
      timer = setTimeout(() => {
        if (autoVerifySeconds === 1) {
          setAutoVerifySeconds(null);
          executeUpiPaymentSuccess();
        } else {
          setAutoVerifySeconds((prev) => (prev !== null ? prev - 1 : null));
        }
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [autoVerifySeconds, showCounterUpiModal]);

  const viewInvoiceReceipt = async (invId: string) => {
    try {
      const res = await api.getInvoice(invId);
      setLastInvoice(res.data);
      await generateReceiptQr(res.data.invoice);
      setShowPrintModal(true);
    } catch (err) {
      console.error('Failed to fetch invoice details', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openReturnModal = async (inv: Invoice) => {
    setSelectedInvoiceForReturn(inv);
    setShowReturnModal(true);
    setLoadingReturnInvoice(true);
    setReturnError('');
    setReturnNotes('');
    setRestockInventory(true);
    setReturnReason('Defective / Damaged');

    const balanceDue = inv.totalAmount - inv.paidAmount;
    if (inv.partyId && balanceDue > 0) {
      setRefundMode('DEDUCT_UDHAAR');
    } else {
      setRefundMode('CASH');
    }

    try {
      const res = await api.getInvoice(inv.id);
      const invoiceData = res.data;
      const items = invoiceData.items || [];
      setInvoiceItemsForReturn(items);

      const initSelected: Record<string, boolean> = {};
      const initQtys: Record<string, number> = {};
      items.forEach((it: any, idx: number) => {
        const key = it.id || `item-${idx}`;
        initSelected[key] = true;
        initQtys[key] = it.quantity;
      });
      setReturnItemsSelected(initSelected);
      setReturnQuantities(initQtys);
    } catch (err) {
      console.error('Failed to load invoice items for return', err);
      setReturnError('Could not load line items for this invoice.');
    } finally {
      setLoadingReturnInvoice(false);
    }
  };

  const handleReturnItemToggle = (key: string) => {
    setReturnItemsSelected((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleReturnQtyChange = (key: string, maxQty: number, nextVal: number) => {
    const clamped = Math.max(1, Math.min(maxQty, nextVal));
    setReturnQuantities((prev) => ({
      ...prev,
      [key]: clamped,
    }));
  };

  const selectedReturnItemsList = invoiceItemsForReturn.filter((it, idx) => {
    const key = it.id || `item-${idx}`;
    return returnItemsSelected[key];
  });

  const returnSubtotal = selectedReturnItemsList.reduce((acc, it, idx) => {
    const key = it.id || `item-${idx}`;
    const qty = returnQuantities[key] || it.quantity;
    return acc + qty * it.unitPrice;
  }, 0);

  const returnTaxAmount = selectedReturnItemsList.reduce((acc, it, idx) => {
    const key = it.id || `item-${idx}`;
    const qty = returnQuantities[key] || it.quantity;
    const taxRate = it.taxRate || 0;
    return acc + qty * it.unitPrice * (taxRate / 100);
  }, 0);

  const totalReturnRefundAmount = returnSubtotal + returnTaxAmount;

  const handleProcessReturn = async () => {
    if (!selectedInvoiceForReturn) return;
    if (selectedReturnItemsList.length === 0) {
      setReturnError('Please select at least one item to return.');
      return;
    }

    const payloadItems = selectedReturnItemsList.map((it, idx) => {
      const key = it.id || `item-${idx}`;
      const qty = returnQuantities[key] || it.quantity;
      return {
        itemId: it.itemId,
        itemName: it.itemName,
        returnQuantity: qty,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate || 0,
        unit: it.unit,
        reason: returnReason,
      };
    });

    const payload = {
      originalInvoiceId: selectedInvoiceForReturn.id,
      items: payloadItems,
      refundMode,
      reason: returnReason,
      notes: returnNotes.trim() || undefined,
      restockInventory,
      createdBy: activeUser?.id || undefined,
      createdByName: activeUser?.fullName || activeTenant?.name || 'Staff',
    };

    try {
      setIsProcessingReturn(true);
      setReturnError('');
      const res = await api.processInvoiceReturn(payload);
      setShowReturnModal(false);

      setLastCreditNote(res.data);
      setShowCreditNoteModal(true);

      const phone = res.data.creditNote?.partyPhone || selectedInvoiceForReturn.partyPhone;
      if (autoSendWhatsApp && phone && activeTenant) {
        sendWhatsAppCreditNoteDirect(
          res.data.creditNote,
          activeTenant,
          res.data.items,
          selectedInvoiceForReturn.invoiceNumber,
          waTarget
        );
      }

      await loadHistory();
    } catch (err: any) {
      console.error('Invoice return failed', err);
      const msg = err.response?.data?.message || err.response?.data || 'Failed to process return.';
      setReturnError(typeof msg === 'string' ? msg : 'Failed to process return.');
    } finally {
      setIsProcessingReturn(false);
    }
  };

  const viewCreditNoteReceipt = async (creditNoteId: string) => {
    try {
      const res = await api.getInvoice(creditNoteId);
      setLastCreditNote({
        creditNote: res.data.invoice,
        items: res.data.items,
        originalInvoice: null,
        refundAmount: res.data.invoice.totalAmount,
      });
      setShowCreditNoteModal(true);
    } catch (err) {
      console.error('Failed to fetch credit note details', err);
    }
  };

  const handlePrintCreditNote = () => {
    window.print();
  };

  const handleSoftDeleteInvoice = async () => {
    if (!voidingInvoice) return;
    setIsVoidingInvoice(true);
    try {
      await api.deleteInvoice(voidingInvoice.id);
      setVoidingInvoice(null);
      await loadHistory();
    } catch (err: any) {
      console.error('Failed to void invoice', err);
      alert(err?.response?.data?.message || 'Failed to void invoice.');
    } finally {
      setIsVoidingInvoice(false);
    }
  };

  const handleToggleInvoiceActive = async (inv: Invoice) => {
    try {
      await api.toggleInvoiceActive(inv.id);
      await loadHistory();
    } catch (err: any) {
      console.error('Failed to toggle invoice status', err);
      alert(err?.response?.data?.message || 'Failed to update invoice status.');
    }
  };

  // Filtered invoices for history
  const filteredHistory = useMemo(() => {
    return historyInvoices.filter((inv) => {
      if (historyStatusFilter) {
        if (historyStatusFilter === 'PENDING') {
          if ((inv.totalAmount - inv.paidAmount) <= 0) return false;
        } else if (inv.paymentStatus !== historyStatusFilter) {
          return false;
        }
      }

      if (historyPaymentModeFilter !== 'ALL') {
        if ((inv.paymentMode || '').toUpperCase() !== historyPaymentModeFilter.toUpperCase()) return false;
      }

      if (historyDateRangeFilter !== 'ALL') {
        const invDate = new Date(inv.invoiceDate);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (historyDateRangeFilter === 'TODAY') {
          if (invDate < startOfToday) return false;
        } else if (historyDateRangeFilter === 'YESTERDAY') {
          const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
          if (invDate < startOfYesterday || invDate >= startOfToday) return false;
        } else if (historyDateRangeFilter === 'THIS_WEEK') {
          const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (invDate < startOfWeek) return false;
        } else if (historyDateRangeFilter === 'THIS_MONTH') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (invDate < startOfMonth) return false;
        } else if (historyDateRangeFilter === 'LAST_30_DAYS') {
          const startOf30Days = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (invDate < startOf30Days) return false;
        }
      }

      return true;
    });
  }, [historyInvoices, historyStatusFilter, historyPaymentModeFilter, historyDateRangeFilter]);

  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      let comparison = 0;
      if (historySortField === 'createdAt') {
        comparison = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
      } else if (historySortField === 'invoiceNumber') {
        comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
      } else if (historySortField === 'customerName') {
        comparison = (a.partyName || 'Walk-in').localeCompare(b.partyName || 'Walk-in');
      } else if (historySortField === 'totalAmount') {
        comparison = a.totalAmount - b.totalAmount;
      } else if (historySortField === 'paidAmount') {
        comparison = a.paidAmount - b.paidAmount;
      } else if (historySortField === 'balanceAmount') {
        const balA = a.invoiceType === 'SALE_RETURN' ? 0 : a.totalAmount - a.paidAmount;
        const balB = b.invoiceType === 'SALE_RETURN' ? 0 : b.totalAmount - b.paidAmount;
        comparison = balA - balB;
      }
      return historySortDir === 'asc' ? comparison : -comparison;
    });
  }, [filteredHistory, historySortField, historySortDir]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return sortedHistory.slice(start, start + historyPageSize);
  }, [sortedHistory, historyPage, historyPageSize]);

  const handleHistorySort = (field: typeof historySortField) => {
    if (historySortField === field) {
      setHistorySortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setHistorySortField(field);
      setHistorySortDir(field === 'customerName' || field === 'invoiceNumber' ? 'asc' : 'desc');
    }
  };

  const renderHistorySortIcon = (field: typeof historySortField) => {
    if (historySortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />;
    }
    return historySortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-600 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-600 font-bold" />
    );
  };

  const posCategoryOptions = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.category || 'General'))).sort();
    return ['ALL', ...cats];
  }, [items]);

  const posSelectableItems = useMemo(() => {
    return items.filter((i) => {
      if (posCategoryFilter !== 'ALL' && (i.category || 'General') !== posCategoryFilter) return false;
      return true;
    });
  }, [items, posCategoryFilter]);

  const salesInvoices = sortedHistory.filter((i) => i.invoiceType !== 'SALE_RETURN');
  const returnInvoices = sortedHistory.filter((i) => i.invoiceType === 'SALE_RETURN');

  const historyTotalAmount = salesInvoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const historyTotalPaid = salesInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
  const historyTotalDue = Math.max(0, historyTotalAmount - historyTotalPaid);
  const historyTotalRefunds = returnInvoices.reduce((acc, i) => acc + i.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('POS')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'POS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>New POS Bill</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'HISTORY'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Invoice History (User-Wise)</span>
          </button>
        </div>

        {activeUser && (
          <div className="text-xs text-slate-500 font-medium flex items-center space-x-1.5 px-3 py-1 bg-slate-50 rounded-xl border border-slate-200">
            <span>Biller / Cashier:</span>
            <span className="font-bold text-slate-800">{activeUser.fullName || activeUser.email}</span>
          </div>
        )}
      </div>

      {/* POS BILLING VIEW */}
      {activeTab === 'POS' && (
        <>
          {/* Mobile Tab Switcher */}
          <div className="lg:hidden flex bg-slate-200/80 p-1 rounded-xl mb-3 text-xs font-bold shadow-xs">
            <button
              type="button"
              onClick={() => setPosMobileTab('CART')}
              className={`flex-1 py-2 text-center rounded-lg transition flex items-center justify-center space-x-1.5 ${
                posMobileTab === 'CART'
                  ? 'bg-white text-indigo-700 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🛒 Items & Cart</span>
              {cart.length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {cart.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPosMobileTab('CHECKOUT')}
              className={`flex-1 py-2 text-center rounded-lg transition flex items-center justify-center space-x-1.5 ${
                posMobileTab === 'CHECKOUT'
                  ? 'bg-white text-indigo-700 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>💳 Checkout & Pay</span>
              {cart.length > 0 && (
                <span className="text-emerald-700 font-bold ml-1">
                  {currency}{grandTotal.toFixed(0)}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[500px] lg:h-[calc(100vh-13rem)] flex-1">
            {/* Left Column: Cart & Item Selection */}
            <div className={`lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden ${
              posMobileTab === 'CART' ? 'flex' : 'hidden lg:flex'
            }`}>
            {/* Customer Bar */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:space-x-3 w-full sm:w-auto">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Customer:</span>
                </div>
                <SearchableSelect
                  options={parties.map((p) => ({
                    value: p.id,
                    label: p.name,
                    nativeName: p.nativeName,
                    phone: p.phone,
                    subText: p.creditLimit ? `Limit: ${currency}${p.creditLimit}` : undefined,
                    badge: p.currentBalance > 0 ? `${currency}${p.currentBalance.toFixed(0)} Udhaar` : undefined,
                    badgeColor: p.currentBalance > 0 ? 'rose' : undefined,
                  }))}
                  value={selectedParty?.id || ''}
                  onChange={(val) => {
                    const found = parties.find((p) => p.id === val);
                    setSelectedParty(found || null);
                    if (found) setCheckoutError('');
                  }}
                  placeholder={requireCustomer ? '-- Select Required Customer --' : 'Walk-in Customer (Cash)'}
                  searchPlaceholder="Search customer name, phone, native name..."
                  emptyMessage="No customer found"
                  isRequired={requireCustomer}
                  className="w-full sm:w-80"
                  clearLabel={requireCustomer ? '-- Select Required Customer --' : 'Walk-in Customer (Cash)'}
                  onQuickAdd={() => setShowQuickAdd(true)}
                  quickAddLabel="+ Quick Add Customer"
                />

                <button
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-xl border border-indigo-200 transition"
                  title="Add new customer directly"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Quick Add</span>
                </button>

                {/* AI Smart Credit Risk Assessment Badge */}
                {selectedParty && (() => {
                  const risk = assessPartyCreditRisk(selectedParty);
                  return (
                    <div
                      className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                        risk.tier === 'SAFE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : risk.tier === 'MODERATE'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                      title={risk.recommendation}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span>{risk.label}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Mandatory Customer Toggle */}
              <label className="flex items-center space-x-2 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={requireCustomer}
                  onChange={(e) => {
                    setRequireCustomer(e.target.checked);
                    if (!e.target.checked) setCheckoutError('');
                  }}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700">Require Customer for Bill</span>
              </label>
            </div>

            {/* Item Search Bar with Barcode Scanner, AI Voice POS & Price Tier Toggle */}
            <div className="p-4 border-b border-slate-200 relative space-y-2">
              {scanToast && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center justify-between transition-all ${
                    scanToast.type === 'SUCCESS'
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                    <span>{scanToast.message}</span>
                  </div>
                  <button onClick={() => setScanToast(null)} className="text-white/80 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Scan barcode or type item name..."
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchItem.trim()) {
                        e.preventDefault();
                        handleBarcodeScan(searchItem);
                      }
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Product Catalog Dropdown Picker (with Scrolling Pagination & Category Filter) */}
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div className="w-full sm:w-44 shrink-0">
                    <select
                      value={posCategoryFilter}
                      onChange={(e) => setPosCategoryFilter(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">📦 All Categories</option>
                      {posCategoryOptions
                        .filter((c) => c !== 'ALL')
                        .map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="w-full flex-1">
                    <SearchableSelect
                      options={posSelectableItems.map((item) => ({
                        value: item.id,
                        label: `${item.name} (${item.unit})`,
                        nativeName: item.nativeName,
                        barcode: item.barcode,
                        subText: `Stock: ${item.currentStock ?? 0} ${item.unit} | Price: ${currency}${
                          priceTier === 'WHOLESALE' && item.wholesalePrice && item.wholesalePrice > 0
                            ? item.wholesalePrice
                            : item.sellingPrice
                        }`,
                        badge: (item.currentStock ?? 0) <= (item.minStockAlert || 5) ? 'Low Stock' : undefined,
                        badgeColor: (item.currentStock ?? 0) <= (item.minStockAlert || 5) ? 'amber' : undefined,
                      }))}
                      value=""
                      onChange={(val) => {
                        if (!val) return;
                        const itm = items.find((i) => i.id === val);
                        if (itm) {
                          addToCart(itm, 1);
                          playScannerBeep();
                        }
                      }}
                      placeholder="Browse product dropdown (with infinite scroll)..."
                      searchPlaceholder="Search product by name, barcode..."
                      className="w-full"
                      pageSize={25}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Quick Add Product Button */}
                  <button
                    type="button"
                    onClick={() => openQuickAddItemModal('', searchItem.trim())}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 active:scale-95"
                    title="Quick Add new product to catalog and active bill"
                  >
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span>+ Add Product</span>
                  </button>

                  {/* Camera Barcode Scanner Button */}
                  <button
                    type="button"
                    onClick={() => setShowCameraScanner(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                    title="Scan barcode with camera or webcam (adds 1 pack, merges if existing)"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Scan Barcode</span>
                  </button>

                  {/* AI Voice POS Button */}
                  <button
                    type="button"
                    onClick={startVoiceBilling}
                    className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                    }`}
                    title="Speak to add items in Hindi/Gujarati/English (e.g. '2 packet urea')"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isListening ? 'Listening...' : 'AI Voice POS'}</span>
                  </button>

                  {/* Price Tier Toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setPriceTier('RETAIL')}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition ${
                        priceTier === 'RETAIL'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Retail (MRP)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceTier('WHOLESALE')}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition ${
                        priceTier === 'WHOLESALE'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Wholesale
                    </button>
                  </div>
                </div>
              </div>

              {/* Voice recognition status feedback */}
              {voiceToast && (
                <div className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl flex items-center space-x-2 animate-fadeIn">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{voiceToast}</span>
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {searchItem.trim().length > 0 && (
                <div className="absolute left-4 right-4 top-16 bg-white rounded-xl shadow-xl border border-slate-200 z-30 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="p-3 hover:bg-indigo-50 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{item.name}</span>
                          {item.nativeName && (
                            <span className="text-slate-500 font-normal">({item.nativeName})</span>
                          )}
                          {item.barcode && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                              {item.barcode}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400">Stock: {item.currentStock} {item.unit}</span>
                      </div>
                      <span className="font-bold text-indigo-600">
                        {currency}{item.sellingPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}

                  {/* 1-click Quick Add option */}
                  <div
                    onClick={() => {
                      const isDigits = /^[0-9A-Za-z\-_]{3,}$/.test(searchItem.trim()) && !searchItem.includes(' ');
                      openQuickAddItemModal(isDigits ? searchItem.trim() : '', isDigits ? '' : searchItem.trim());
                    }}
                    className="p-3 bg-indigo-50/60 hover:bg-indigo-100/80 cursor-pointer flex items-center justify-between text-xs transition font-bold text-indigo-700"
                  >
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-indigo-600" />
                      <span>
                        {filteredItems.length === 0 ? 'Product not found. ' : ''}
                        Add "<strong>{searchItem}</strong>" as New Product
                      </span>
                    </div>
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                      + Quick Add
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Receipt className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-sm font-medium">Cart is empty</p>
                  <p className="text-xs text-slate-400 mt-0.5">Search or scan items above to add to bill</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((ci, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <h5 className="font-semibold text-slate-900 text-sm">{ci.itemName}</h5>
                          {ci.nativeName && (
                            <span className="text-xs text-slate-500 font-normal">({ci.nativeName})</span>
                          )}
                          {ci.priceTier === 'WHOLESALE' && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Wholesale
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {currency}{ci.unitPrice.toFixed(2)} per {ci.unit}
                        </p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <button
                          onClick={() => updateQuantity(index, -1)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-xs px-1 text-slate-800">{ci.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, 1)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="w-24 text-right">
                        <span className="font-bold text-slate-900 text-sm">
                          {currency}{ci.total.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Sticky Proceed to Pay Bar */}
            {cart.length > 0 && (
              <div className="lg:hidden p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'} in cart
                  </div>
                  <div className="text-base font-black text-slate-900">
                    {currency}{grandTotal.toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPosMobileTab('CHECKOUT')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
                >
                  <span>Proceed to Pay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Checkout Summary */}
          <div className={`lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden ${
            posMobileTab === 'CHECKOUT' ? 'flex' : 'hidden lg:flex'
          }`}>
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                {/* Mobile Back to Cart Button */}
                <button
                  type="button"
                  onClick={() => setPosMobileTab('CART')}
                  className="lg:hidden inline-flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 mb-1.5 shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Back to Cart ({cart.length})</span>
                </button>
                <h4 className="font-bold text-slate-900 text-sm">Payment & Bill Summary</h4>
              </div>
            </div>

            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              {/* Selected Customer Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Customer (Khata User)
                </div>
                {selectedParty ? (
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{selectedParty.name}</div>
                    <div className="text-xs text-slate-500">
                      {selectedParty.phone || 'No Phone'} • Current Khata: {currency}{selectedParty.currentBalance}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 font-medium">
                    {requireCustomer ? '⚠️ Please select a customer above' : 'Walk-in Customer'}
                  </div>
                )}
              </div>

              {/* Subtotal */}
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{currency}{subtotal.toFixed(2)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Special Discount ({currency})</span>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-24 px-2 py-1 text-right border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-base text-slate-900">Grand Total</span>
                <span className="font-black text-2xl text-indigo-700">
                  {currency}{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Payment Mode */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['CASH', 'UPI', 'CREDIT'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 rounded-xl text-xs font-bold transition ${
                        paymentMode === mode
                          ? 'bg-slate-900 text-white shadow'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mode === 'CREDIT' ? 'Udhaar' : mode}
                    </button>
                  ))}
                </div>

                {paymentMode === 'UPI' && (
                  <button
                    type="button"
                    onClick={openCounterUpiQr}
                    className="w-full mt-2.5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 transition"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Show Dynamic UPI QR to Customer ({currency}{grandTotal.toFixed(2)})</span>
                  </button>
                )}

                {paymentMode === 'CASH' && (
                  <button
                    type="button"
                    onClick={() => handleCheckout('CASH', grandTotal)}
                    disabled={cart.length === 0 || isCheckingOut}
                    className="w-full mt-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>⚡ Quick Cash Bill & Auto-Generate ({currency}{grandTotal.toFixed(2)})</span>
                  </button>
                )}

                {paymentMode === 'CREDIT' && (
                  <button
                    type="button"
                    onClick={() => handleCheckout('CREDIT', 0)}
                    disabled={cart.length === 0 || isCheckingOut}
                    className="w-full mt-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>⚡ Quick Khata Bill & Auto-Generate ({currency}{grandTotal.toFixed(2)})</span>
                  </button>
                )}
              </div>

              {/* Amount Paid */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Amount Paid ({currency})
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {grandTotal - (parseFloat(paidAmount || '0') || 0) > 0 && selectedParty && (
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    ⚠️ Balance of {currency}{(grandTotal - (parseFloat(paidAmount || '0') || 0)).toFixed(2)} will be added to {selectedParty.name}'s Khata.
                  </p>
                )}
              </div>

              {/* Checkout validation error */}
              {checkoutError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </div>

            {/* Auto WhatsApp Dispatch Option */}
            <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSendWhatsApp}
                  onChange={(e) => {
                    setAutoSendWhatsApp(e.target.checked);
                    localStorage.setItem('khatabook_auto_whatsapp', e.target.checked ? 'true' : 'false');
                  }}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-700 flex items-center space-x-1">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auto-send bill on WhatsApp</span>
                </span>
              </label>

              <select
                value={waTarget}
                onChange={(e) => {
                  const val = e.target.value as WhatsAppTarget;
                  setWaTarget(val);
                  setWhatsAppTargetPreference(val);
                }}
                className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded px-2 py-1 focus:outline-none"
                title="Choose WhatsApp target: Desktop App (zero tabs) or Web Popup"
              >
                <option value="DESKTOP_APP">⚡ Desktop App (No Tabs)</option>
                <option value="WEB_POPUP">🌐 Web Popup (Single Window)</option>
              </select>
            </div>

            {/* Checkout Button */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
              <button
                onClick={() => handleCheckout()}
                disabled={cart.length === 0 || isCheckingOut}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-base shadow-sm transition flex items-center justify-center space-x-2"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating Invoice Bill...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Complete & Generate Bill</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </>
    )}

      {/* INVOICE HISTORY VIEW (USER-WISE) */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* User/Customer Filter */}
              <div className="w-full sm:w-64">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer / User
                </label>
                <SearchableSelect
                  options={parties.map((p) => ({
                    value: p.id,
                    label: p.name,
                    nativeName: p.nativeName,
                    phone: p.phone,
                  }))}
                  value={historyPartyFilter}
                  onChange={(val) => setHistoryPartyFilter(val)}
                  placeholder="All Customers (All Users)"
                  searchPlaceholder="Search customer..."
                  clearLabel="All Customers (All Users)"
                  className="w-full"
                />
              </div>

              {/* Search Bar */}
              <div className="w-full sm:w-64">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Search Invoice / Biller
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Invoice #, customer or cashier..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Document Type Filter */}
              <div className="w-full sm:w-48">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Document Type
                </label>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => {
                    setHistoryTypeFilter(e.target.value as any);
                    setHistoryPage(1);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Documents (Bills & Returns)</option>
                  <option value="SALE">🧾 Sales Invoices Only</option>
                  <option value="SALE_RETURN">↩️ Returns / Credit Notes Only</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-44">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Status
                </label>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => {
                    setHistoryStatusFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">⚠️ Pending Due to Pay</option>
                  <option value="PAID">Fully Paid</option>
                  <option value="PARTIAL">Partial Payment</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIALLY_RETURNED">🔄 Partial Return</option>
                  <option value="RETURNED">↩️ Fully Returned</option>
                  <option value="REFUNDED">💸 Refund Settled</option>
                </select>
              </div>

              {/* Payment Mode Filter */}
              <div className="w-full sm:w-40">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={historyPaymentModeFilter}
                  onChange={(e) => {
                    setHistoryPaymentModeFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Modes</option>
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">📱 UPI QR</option>
                  <option value="CARD">💳 Card</option>
                  <option value="UDHAAR">📒 Udhaar / Credit</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="w-full sm:w-40">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Date Range
                </label>
                <select
                  value={historyDateRangeFilter}
                  onChange={(e) => {
                    setHistoryDateRangeFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ALL">📅 All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="THIS_WEEK">Last 7 Days</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                </select>
              </div>

              {/* Active / Voided Filter */}
              <div className="w-full sm:w-44">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Record Status
                </label>
                <select
                  value={historyActiveFilter}
                  onChange={(e) => {
                    setHistoryActiveFilter(e.target.value as any);
                    setHistoryPage(1);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ACTIVE">🟢 Active Bills</option>
                  <option value="INACTIVE">🚫 Voided / Inactive</option>
                  <option value="ALL">📋 All Documents</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end">
              <button
                type="button"
                onClick={() => exportInvoicesToExcel(sortedHistory, activeTenant?.name || 'KhataBook', currency)}
                className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition flex items-center space-x-1.5"
                title="Export filtered invoices to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={() => exportInvoicesToPdf(sortedHistory, activeTenant?.name || 'KhataBook', currency)}
                className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition flex items-center space-x-1.5"
                title="Export filtered invoices to PDF (.pdf)"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={loadHistory}
                className="px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Selected Customer Pending Due Banner */}
          {historyPartyFilter && (() => {
            const selectedCust = parties.find((p) => p.id === historyPartyFilter);
            const pendingInvs = historyInvoices.filter((i) => i.partyId === historyPartyFilter && (i.totalAmount - i.paidAmount) > 0);
            return (
              <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <span className="font-bold text-indigo-950">
                    Customer Account: {selectedCust?.name || 'Customer'}
                  </span>
                  {selectedCust?.phone && (
                    <span className="text-slate-500 font-mono">({selectedCust.phone})</span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-600">
                    Pending Invoices: <strong className="text-rose-700">{pendingInvs.length}</strong>
                  </span>
                  <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                    Total Pending to Pay: {currency}{historyTotalDue.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500">Total Documents</span>
              <h4 className="text-lg font-black text-slate-900 mt-1">{filteredHistory.length}</h4>
            </div>
            <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
              <span className="text-[11px] font-semibold text-indigo-600">Total Billed</span>
              <h4 className="text-lg font-black text-indigo-700 mt-1">
                {currency}{historyTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
            </div>
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-600">Total Collected</span>
              <h4 className="text-lg font-black text-emerald-700 mt-1">
                {currency}{historyTotalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
            </div>
            <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
              <span className="text-[11px] font-semibold text-rose-600">Outstanding Due</span>
              <h4 className="text-lg font-black text-rose-700 mt-1">
                {currency}{historyTotalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
            </div>
            <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
              <span className="text-[11px] font-semibold text-purple-700">Returns / Credits</span>
              <h4 className="text-lg font-black text-purple-800 mt-1">
                {currency}{historyTotalRefunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold select-none">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleHistorySort('invoiceNumber')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Invoice / Credit #</span>
                      {renderHistorySortIcon('invoiceNumber')}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleHistorySort('createdAt')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date & Time</span>
                      {renderHistorySortIcon('createdAt')}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleHistorySort('customerName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Customer (User)</span>
                      {renderHistorySortIcon('customerName')}
                    </div>
                  </th>
                  <th className="py-3 px-4">Billed By</th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleHistorySort('totalAmount')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Total Amount</span>
                      {renderHistorySortIcon('totalAmount')}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleHistorySort('paidAmount')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Paid</span>
                      {renderHistorySortIcon('paidAmount')}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => handleHistorySort('balanceAmount')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Balance Due</span>
                      {renderHistorySortIcon('balanceAmount')}
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      {historyLoading ? 'Loading invoices...' : 'No invoices found matching current filters.'}
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((inv) => {
                    const isCreditNote = inv.invoiceType === 'SALE_RETURN';
                    const isVoided = inv.isActive === false;
                    const balance = isCreditNote ? 0 : inv.totalAmount - inv.paidAmount;
                    return (
                      <tr key={inv.id} className={`hover:bg-slate-50/70 transition ${isVoided ? 'opacity-65 bg-slate-50/50' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className={`font-bold ${isVoided ? 'line-through text-slate-400' : isCreditNote ? 'text-purple-700' : 'text-indigo-600'}`}>
                              {inv.invoiceNumber}
                            </span>
                            {isVoided && (
                              <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded border border-rose-300">
                                VOIDED
                              </span>
                            )}
                            {isCreditNote && (
                              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Credit Note</span>
                              </span>
                            )}
                          </div>
                          {inv.notes && inv.notes.includes('against #') && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                              {inv.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(inv.invoiceDate).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{inv.partyName || 'Walk-in'}</div>
                          {inv.partyPhone && (
                            <div className="text-[10px] text-slate-400">{inv.partyPhone}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {inv.createdByName || 'Cashier'}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${isCreditNote ? 'text-purple-700' : 'text-slate-900'}`}>
                          {isCreditNote ? '-' : ''}{currency}{inv.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                          {currency}{inv.paidAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-rose-600">
                          {currency}{balance > 0 ? balance.toFixed(2) : '0.00'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isVoided
                                ? 'bg-slate-200 text-slate-700'
                                : inv.paymentStatus === 'PAID'
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
                            {isVoided
                              ? 'VOIDED'
                              : inv.paymentStatus === 'RETURNED'
                              ? 'FULLY RETURNED'
                              : inv.paymentStatus === 'PARTIALLY_RETURNED'
                              ? 'PARTIAL RETURN'
                              : inv.paymentStatus === 'REFUNDED'
                              ? 'REFUNDED'
                              : inv.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {isCreditNote ? (
                              <>
                                <button
                                  onClick={() => viewCreditNoteReceipt(inv.id)}
                                  className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition inline-flex items-center space-x-1 border border-purple-200"
                                  title="View & Print Credit Note"
                                >
                                  <RotateCcw className="w-3 h-3 text-purple-600" />
                                  <span>Credit Note</span>
                                </button>
                                {isVoided ? (
                                  <button
                                    onClick={() => handleToggleInvoiceActive(inv)}
                                    className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition inline-flex items-center space-x-1"
                                    title="Reactivate this credit note"
                                  >
                                    <RotateCcw className="w-3 h-3 text-emerald-600" />
                                    <span>Restore</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setVoidingInvoice(inv)}
                                    className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition inline-flex items-center space-x-1"
                                    title="Safely void / soft-delete this credit note"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>Void</span>
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => viewInvoiceReceipt(inv.id)}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition inline-flex items-center space-x-1"
                                  title="View & Print Invoice Bill"
                                >
                                  <Printer className="w-3 h-3 text-indigo-600" />
                                  <span>View Bill</span>
                                </button>
                                {!isVoided && inv.paymentStatus !== 'RETURNED' && (
                                  <button
                                    onClick={() => openReturnModal(inv)}
                                    className="px-2 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition inline-flex items-center space-x-1"
                                    title="Return items from this bill & issue Credit Note"
                                  >
                                    <Undo2 className="w-3 h-3 text-amber-600" />
                                    <span>Return</span>
                                  </button>
                                )}
                                {isVoided ? (
                                  <button
                                    onClick={() => handleToggleInvoiceActive(inv)}
                                    className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition inline-flex items-center space-x-1"
                                    title="Restore / Reactivate this voided bill"
                                  >
                                    <RotateCcw className="w-3 h-3 text-emerald-600" />
                                    <span>Restore</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setVoidingInvoice(inv)}
                                    className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition inline-flex items-center space-x-1"
                                    title="Safely void / soft-delete this invoice"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>Void</span>
                                  </button>
                                )}
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
            currentPage={historyPage}
            totalItems={sortedHistory.length}
            pageSize={historyPageSize}
            onPageChange={setHistoryPage}
            onPageSizeChange={(newSize) => {
              setHistoryPageSize(newSize);
              setHistoryPage(1);
            }}
          />
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Quick Add Customer</span>
              </h4>
              <button onClick={() => setShowQuickAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer / User Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Native Name (સ્થानीय / પ્રાદેશિક નામ)
                </label>
                <input
                  type="text"
                  placeholder="e.g. રમેશ પટેલ / रमेश पटेल"
                  value={quickNativeName}
                  onChange={(e) => setQuickNativeName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address / City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Market Road, Shop 4"
                  value={quickAddress}
                  onChange={(e) => setQuickAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCustomer || !quickName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  {addingCustomer ? 'Adding...' : 'Add & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD ITEM MODAL (Triggered when scanned barcode not found in catalog, or via + button) */}
      {showQuickAddItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 my-auto animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Package className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center space-x-2">
                    <span>⚡ Quick Add Product</span>
                    {quickItemBarcode && (
                      <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                        {quickItemBarcode}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    {quickItemBarcode
                      ? 'Scanned barcode not found in catalog. Create item and bill immediately.'
                      : 'Add unlisted item to catalog & insert into active bill.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddItemModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateQuickItem} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Barcode & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Barcode / SKU</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Scan or enter code"
                    value={quickItemBarcode}
                    onChange={(e) => setQuickItemBarcode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="quick-item-categories"
                    placeholder="General, Grocery, etc."
                    value={quickItemCategory}
                    onChange={(e) => setQuickItemCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <datalist id="quick-item-categories">
                    <option value="General" />
                    <option value="Grocery" />
                    <option value="Dairy" />
                    <option value="Snacks" />
                    <option value="Beverages" />
                    <option value="Personal Care" />
                    <option value="Pharmacy" />
                    <option value="Hardware" />
                    <option value="Fertilizer" />
                  </datalist>
                </div>
              </div>

              {/* Product Name * */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Parle-G Gold 250g, Urea 50kg Bag"
                  value={quickItemName}
                  onChange={(e) => setQuickItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Native / Regional Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Native / Regional Name (Hindi / Gujarati)
                </label>
                <input
                  type="text"
                  placeholder="e.g. પાર્લે-જી ગોલ્ડ, यूरिया खाद"
                  value={quickItemNativeName}
                  onChange={(e) => setQuickItemNativeName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    Selling Price * ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={quickItemSellingPrice}
                    onChange={(e) => setQuickItemSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-sm font-bold text-emerald-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Cost Price ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={quickItemPurchasePrice}
                    onChange={(e) => setQuickItemPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-700 mb-1">
                    Wholesale ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={quickItemWholesalePrice}
                    onChange={(e) => setQuickItemWholesalePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Unit, Opening Stock, Min Stock Alert */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit (UOM)
                  </label>
                  <select
                    value={quickItemUnit}
                    onChange={(e) => setQuickItemUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Kg">Kg (Kilogram)</option>
                    <option value="Gm">Gm (Gram)</option>
                    <option value="Ltr">Ltr (Liter)</option>
                    <option value="Ml">Ml (Milliliter)</option>
                    <option value="Box">Box</option>
                    <option value="Pack">Pack / Packet</option>
                    <option value="Bag">Bag / Bori</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Meter">Meter</option>
                    <option value="Strip">Strip (Tablet)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quickItemOpeningStock}
                    onChange={(e) => setQuickItemOpeningStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={quickItemMinAlert}
                    onChange={(e) => setQuickItemMinAlert(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Auto Add to Cart Checkbox */}
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={quickItemAutoAddToCart}
                    onChange={(e) => setQuickItemAutoAddToCart(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">
                      Immediately add to this bill (+1 {quickItemUnit})
                    </span>
                    <span className="text-[10px] text-indigo-700 block">
                      Inserts straight into cart so customer doesn't have to wait
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddItemModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickItem || !quickItemName.trim() || !quickItemSellingPrice.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-2 active:scale-95"
                >
                  {isSavingQuickItem ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Item...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Save & Add to Bill</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      {showPrintModal && lastInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-2xl ${printFormat === 'A4' ? 'max-w-2xl' : 'max-w-md'} w-full overflow-hidden text-slate-900 flex flex-col max-h-[90vh] transition-all`}>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm">Invoice #{lastInvoice.invoice.invoiceNumber}</h4>
                {lastInvoice.invoice.isOffline && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                    ⚡ Saved Offline (Will Sync)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPrintFormat(printFormat === 'THERMAL' ? 'A4' : 'THERMAL')}
                  className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition"
                >
                  Switch to: {printFormat === 'THERMAL' ? 'A4 Full Page' : 'Thermal 80mm'}
                </button>
                <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              {printFormat === 'THERMAL' ? (
                /* THERMAL 80mm FORMAT */
                <div 
                  ref={printRef}
                  className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 w-full max-w-[320px] text-xs font-mono"
                >
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
                    <span>Inv: {lastInvoice.invoice.invoiceNumber}</span>
                    <span>{new Date(lastInvoice.invoice.invoiceDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Customer: {lastInvoice.invoice.partyName}</span>
                  </div>
                  {lastInvoice.invoice.partyPhone && (
                    <div className="flex justify-between mb-1 text-[10px] text-slate-600">
                      <span>Phone: {lastInvoice.invoice.partyPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-3 text-[10px] text-slate-500">
                    <span>Biller: {lastInvoice.invoice.createdByName || 'Staff'}</span>
                  </div>

                  <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                    {lastInvoice.items.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>
                          {it.itemName}
                          {it.nativeName && <span className="text-[10px] text-slate-500 ml-1">({it.nativeName})</span>}
                          {' '}x{it.quantity}
                        </span>
                        <span>{currency}{it.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="py-2 space-y-1 font-bold">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{currency}{lastInvoice.invoice.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 font-normal">
                      <span>Paid ({lastInvoice.invoice.paymentMode}):</span>
                      <span>{currency}{lastInvoice.invoice.paidAmount.toFixed(2)}</span>
                    </div>
                    {lastInvoice.invoice.totalAmount - lastInvoice.invoice.paidAmount > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Khata Balance Due:</span>
                        <span>{currency}{(lastInvoice.invoice.totalAmount - lastInvoice.invoice.paidAmount).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic UPI QR for Thermal Print */}
                  {upiQrUrl && (
                    <div className="text-center my-2.5 py-2 border-t border-b border-dashed border-slate-300">
                      <img src={upiQrUrl} alt="UPI QR" className="w-24 h-24 object-contain mx-auto" />
                      <p className="text-[9px] font-bold mt-1">Scan & Pay via Any UPI App</p>
                      <p className="text-[8px] text-slate-500">{activeTenant?.upiId}</p>
                    </div>
                  )}

                  <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 whitespace-pre-line">
                    {activeTenant?.printFooterNote || 'Thank You for Shopping! Please Visit Again.'}
                  </div>
                </div>
              ) : (
                /* A4 FULL PAGE INVOICE FORMAT */
                <div 
                  ref={printRef}
                  className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full text-xs font-sans space-y-5"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div className="flex items-center space-x-3">
                      {activeTenant?.logoUrl && (
                        <img 
                          src={activeTenant.logoUrl} 
                          alt="Shop Logo" 
                          className="w-16 h-16 object-contain rounded-xl border border-slate-200"
                        />
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{activeTenant?.name}</h2>
                        {activeTenant?.tagline && (
                          <p className="text-xs text-slate-600 italic">{activeTenant.tagline}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">{activeTenant?.address}</p>
                        <p className="text-xs text-slate-500">
                          {activeTenant?.phone && `Tel: ${activeTenant.phone}`}
                          {activeTenant?.gstin && ` | GSTIN: ${activeTenant.gstin}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                        Tax Invoice / Bill
                      </span>
                      <h4 className="font-bold text-sm text-slate-800 mt-2">#{lastInvoice.invoice.invoiceNumber}</h4>
                      <p className="text-xs text-slate-500">{new Date(lastInvoice.invoice.invoiceDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Header Note */}
                  {activeTenant?.printHeaderNote && (
                    <div className="bg-indigo-50 text-indigo-800 p-2.5 rounded-lg text-xs font-medium border border-indigo-100">
                      {activeTenant.printHeaderNote}
                    </div>
                  )}

                  {/* Bill To & Details */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Bill To (Customer):</p>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{lastInvoice.invoice.partyName}</p>
                      {lastInvoice.invoice.partyPhone && (
                        <p className="text-xs text-slate-600">Phone: {lastInvoice.invoice.partyPhone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Billed By:</p>
                      <p className="font-bold text-slate-800 text-xs mt-0.5">{lastInvoice.invoice.createdByName || 'Store Cashier'}</p>
                      <p className="text-xs text-slate-500">Payment: {lastInvoice.invoice.paymentMode}</p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Item Name & Regional Name</th>
                        <th className="py-2 px-2 text-right">Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {lastInvoice.items.map((it: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2.5 px-2 text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-2 font-medium text-slate-900">
                            <div>{it.itemName}</div>
                            {it.nativeName && (
                              <div className="text-[10px] text-slate-500">{it.nativeName}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold">{it.quantity}</td>
                          <td className="py-2.5 px-2 text-right text-slate-600">{currency}{it.unitPrice?.toFixed(2) || '0.00'}</td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-900">{currency}{it.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary Totals & Dynamic QR */}
                  <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row justify-between items-start gap-4">
                    {upiQrUrl ? (
                      <div className="flex items-center space-x-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                        <img src={upiQrUrl} alt="UPI QR" className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white p-1" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Scan & Pay via UPI</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">VPA: <span className="font-mono font-bold text-indigo-700">{activeTenant?.upiId}</span></p>
                          <p className="text-[10px] text-slate-400 mt-0.5">GPay • PhonePe • Paytm • BHIM</p>
                        </div>
                      </div>
                    ) : (
                      <div></div>
                    )}

                    <div className="w-full sm:w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Total Amount:</span>
                        <span className="font-bold text-slate-900">{currency}{lastInvoice.invoice.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Paid ({lastInvoice.invoice.paymentMode}):</span>
                        <span className="font-bold">{currency}{lastInvoice.invoice.paidAmount.toFixed(2)}</span>
                      </div>
                      {lastInvoice.invoice.totalAmount - lastInvoice.invoice.paidAmount > 0 && (
                        <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                          <span>Balance Due (Khata):</span>
                          <span>{currency}{(lastInvoice.invoice.totalAmount - lastInvoice.invoice.paidAmount).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer note */}
                  <div className="text-center pt-4 border-t border-dashed border-slate-200 text-xs text-slate-500 whitespace-pre-line">
                    {activeTenant?.printFooterNote || 'Thank You for Shopping! Please Visit Again.'}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white">
              {/* WhatsApp Direct Share Button */}
              {activeTenant && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      sendWhatsAppInvoiceDirect(lastInvoice.invoice, activeTenant, lastInvoice.items, waTarget);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                    title="Send bill directly to WhatsApp (No extra browser tab)"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send on WhatsApp</span>
                  </button>

                  <select
                    value={waTarget}
                    onChange={(e) => {
                      const val = e.target.value as WhatsAppTarget;
                      setWaTarget(val);
                      setWhatsAppTargetPreference(val);
                    }}
                    className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none"
                    title="Choose WhatsApp target: Desktop App (zero tabs) or Web Popup"
                  >
                    <option value="DESKTOP_APP">⚡ App (No Tabs)</option>
                    <option value="WEB_POPUP">🌐 Web Popup</option>
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-2 ml-auto">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Bill ({printFormat === 'THERMAL' ? 'Thermal' : 'A4'})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COUNTER DYNAMIC UPI QR MODAL */}
      {showCounterUpiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 relative overflow-hidden">
            {upiPaymentStatus === 'SUCCESS' ? (
              <div className="py-8 px-4 flex flex-col items-center space-y-3">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Payment Succeeded! 🎉</h3>
                <div className="text-3xl font-black text-emerald-600">
                  {currency}{grandTotal.toFixed(2)}
                </div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  <span>Soundbox Voice Alert Announced</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Auto-closing & generating invoice bill...
                </p>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-3">
                  <div className="bg-emerald-500 h-1.5 rounded-full animate-pulse w-full"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                    <QrCode className="w-5 h-5 text-indigo-600" />
                    <span>Customer Counter UPI QR</span>
                  </h4>
                  <button
                    onClick={() => {
                      setAutoVerifySeconds(null);
                      setShowCounterUpiModal(false);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Live Soundbox Listener Pulse */}
                <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 py-1.5 px-3 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>
                    {autoVerifySeconds !== null
                      ? `Auto-detecting payment in ${autoVerifySeconds}s...`
                      : 'Waiting for Customer to Scan & Pay...'}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center">
                  {counterUpiQrUrl && (
                    <img
                      src={counterUpiQrUrl}
                      alt="Counter UPI QR"
                      className="w-56 h-56 object-contain rounded-2xl bg-white p-2 border border-slate-200 shadow-sm"
                    />
                  )}
                  <div className="mt-3">
                    <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                      Exact Bill Amount
                    </span>
                    <h2 className="text-3xl font-black text-indigo-700 mt-0.5">
                      {currency}{grandTotal.toFixed(2)}
                    </h2>
                  </div>
                  <p className="text-xs font-mono text-slate-700 mt-1 font-bold">{activeTenant?.upiId}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Payee: {activeTenant?.upiPayeeName || activeTenant?.name}
                  </p>
                </div>

                {/* Primary Action Button: Confirm, Auto Close & Generate Bill */}
                <button
                  onClick={executeUpiPaymentSuccess}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment Received ({currency}{grandTotal.toFixed(2)})</span>
                </button>

                {/* Simulator / Soundbox Demo option */}
                <div className="flex items-center justify-between pt-1">
                  {autoVerifySeconds === null ? (
                    <button
                      type="button"
                      onClick={() => setAutoVerifySeconds(5)}
                      className="w-full text-[11px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center space-x-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ Auto-Detect in 5s (Simulate Customer Payment)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAutoVerifySeconds(null)}
                      className="w-full text-[11px] text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center space-x-1"
                    >
                      <span>Cancel Auto-Timer</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* RETURN ITEMS & ISSUE CREDIT NOTE MODAL */}
      {showReturnModal && selectedInvoiceForReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Process Sales Return & Credit Note
                  </h4>
                  <p className="text-xs text-slate-500">
                    Against Bill: <strong className="text-indigo-600 font-mono">#{selectedInvoiceForReturn.invoiceNumber}</strong>
                    {selectedInvoiceForReturn.partyName && (
                      <span> • Customer: <strong className="text-slate-700">{selectedInvoiceForReturn.partyName}</strong></span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingReturnInvoice ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs font-semibold">Loading items from invoice...</p>
                </div>
              ) : invoiceItemsForReturn.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-semibold">No items found on this invoice.</p>
                </div>
              ) : (
                <>
                  {/* Item selection table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Select Items to Return
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {selectedReturnItemsList.length} of {invoiceItemsForReturn.length} selected
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {invoiceItemsForReturn.map((item, idx) => {
                        const key = item.id || `item-${idx}`;
                        const isSelected = !!returnItemsSelected[key];
                        const currentQty = returnQuantities[key] || item.quantity;
                        const lineTax = (item.taxRate || 0);
                        const lineSub = currentQty * item.unitPrice * (1 + lineTax / 100);

                        return (
                          <div
                            key={key}
                            className={`p-3 flex items-center justify-between gap-3 transition ${
                              isSelected ? 'bg-rose-50/30' : 'bg-white opacity-60'
                            }`}
                          >
                            <label className="flex items-center space-x-3 flex-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleReturnItemToggle(key)}
                                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                              />
                              <div>
                                <div className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                                  <span>{item.itemName}</span>
                                  {item.nativeName && (
                                    <span className="text-slate-400 font-normal">({item.nativeName})</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Billed: {item.quantity} {item.unit || 'pcs'} @ {currency}{item.unitPrice.toFixed(2)}
                                  {item.taxRate > 0 && <span className="text-slate-400 ml-1">+{item.taxRate}% tax</span>}
                                </div>
                              </div>
                            </label>

                            {/* Return Qty control */}
                            {isSelected && (
                              <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleReturnQtyChange(key, item.quantity, currentQty - 1)}
                                  disabled={currentQty <= 1}
                                  className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-bold text-xs px-1 text-slate-900 min-w-[20px] text-center">
                                  {currentQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleReturnQtyChange(key, item.quantity, currentQty + 1)}
                                  disabled={currentQty >= item.quantity}
                                  className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Refund line amount */}
                            <div className="w-24 text-right">
                              <span className="font-bold text-xs text-rose-700">
                                {currency}{lineSub.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Refund summary card */}
                  <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                        Net Refund Calculation
                      </span>
                      <div className="text-xs text-slate-600 mt-0.5 space-x-2">
                        <span>Items Subtotal: <strong>{currency}{returnSubtotal.toFixed(2)}</strong></span>
                        {returnTaxAmount > 0 && (
                          <span>• Tax Reversal: <strong>{currency}{returnTaxAmount.toFixed(2)}</strong></span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-rose-700 font-semibold uppercase block">Total Refund Value</span>
                      <span className="text-xl font-black text-rose-800">
                        {currency}{totalReturnRefundAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Return options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Reason */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Return Reason *
                      </label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      >
                        <option value="Defective / Damaged">Defective / Damaged Item</option>
                        <option value="Wrong Item Sold">Wrong Item Sold by Staff</option>
                        <option value="Customer Changed Mind">Customer Changed Mind / Not Needed</option>
                        <option value="Expired / Near Expiry">Expired / Quality Issue</option>
                        <option value="Excess Quantity Billed">Excess Quantity Billed</option>
                        <option value="Other">Other Reason</option>
                      </select>
                    </div>

                    {/* Settlement mode */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Refund / Settlement Mode *
                      </label>
                      <select
                        value={refundMode}
                        onChange={(e) => setRefundMode(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      >
                        <option value="CASH">💵 Cash Payout at Counter</option>
                        <option value="UPI">📲 Online UPI / Bank Refund</option>
                        {selectedInvoiceForReturn.partyId && (
                          <option value="DEDUCT_UDHAAR">
                            📉 Deduct from Udhaar Khata (Customer Ledger)
                          </option>
                        )}
                        <option value="STORE_CREDIT">🎟️ Store Credit / Credit Note</option>
                      </select>
                    </div>
                  </div>

                  {/* Restock toggle & Notes */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 p-2.5 rounded-xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={restockInventory}
                        onChange={(e) => setRestockInventory(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800">
                          Restock Returned Items into Inventory Shelf (+Stock)
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Automatically increases item stock, creates Stock Movement, and logs into Daily Stock Register.
                        </p>
                      </div>
                    </label>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Return Notes / Internal Remarks (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Broken seal replaced, packaging intact..."
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Error banner */}
                  {returnError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{returnError}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProcessReturn}
                disabled={selectedReturnItemsList.length === 0 || isProcessingReturn || loadingReturnInvoice}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
              >
                {isProcessingReturn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Return...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm Return & Issue Credit Note ({currency}{totalReturnRefundAmount.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE CREDIT NOTE / RETURN BILL MODAL */}
      {showCreditNoteModal && lastCreditNote && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-2xl ${creditNoteFormat === 'A4' ? 'max-w-2xl' : 'max-w-md'} w-full overflow-hidden text-slate-900 flex flex-col max-h-[90vh] transition-all`}>
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-purple-50">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-purple-700" />
                <h4 className="font-bold text-sm text-purple-950">
                  Credit Note #{lastCreditNote.creditNote?.invoiceNumber}
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCreditNoteFormat(creditNoteFormat === 'THERMAL' ? 'A4' : 'THERMAL')}
                  className="text-xs font-semibold px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 transition"
                >
                  Switch to: {creditNoteFormat === 'THERMAL' ? 'A4 Full Page' : 'Thermal 80mm'}
                </button>
                <button
                  onClick={() => setShowCreditNoteModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              {creditNoteFormat === 'THERMAL' ? (
                /* THERMAL 80mm CREDIT NOTE */
                <div
                  ref={creditNotePrintRef}
                  className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 w-full max-w-[320px] text-xs font-mono"
                >
                  <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                    {activeTenant?.logoUrl && (
                      <img
                        src={activeTenant.logoUrl}
                        alt="Shop Logo"
                        className="w-12 h-12 object-contain mx-auto mb-1.5 rounded-lg border border-slate-200"
                      />
                    )}
                    <h3 className="font-bold text-base tracking-tight">{activeTenant?.name}</h3>
                    {activeTenant?.gstin && (
                      <p className="text-[10px] font-mono text-slate-700">GSTIN: {activeTenant.gstin}</p>
                    )}
                    {activeTenant?.phone && <p>Tel: {activeTenant?.phone}</p>}
                    {activeTenant?.address && <p>{activeTenant?.address}</p>}

                    <div className="mt-2 py-1 border-t border-b border-dashed border-slate-400 text-center font-bold text-purple-800 text-[11px] font-sans uppercase tracking-wider">
                      *** CREDIT NOTE / RETURN VOUCHER ***
                    </div>
                  </div>

                  <div className="flex justify-between mb-1">
                    <span>Credit Note: {lastCreditNote.creditNote.invoiceNumber}</span>
                    <span>{new Date(lastCreditNote.creditNote.invoiceDate || lastCreditNote.creditNote.createdAt).toLocaleDateString()}</span>
                  </div>
                  {lastCreditNote.creditNote.partyName && (
                    <div className="flex justify-between mb-1">
                      <span>Customer: {lastCreditNote.creditNote.partyName}</span>
                    </div>
                  )}
                  {lastCreditNote.originalInvoice?.invoiceNumber && (
                    <div className="flex justify-between mb-1 text-[10px] text-slate-600">
                      <span>Against Bill: #{lastCreditNote.originalInvoice.invoiceNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-2 text-[10px] text-slate-500">
                    <span>Cashier: {lastCreditNote.creditNote.createdByName || 'Staff'}</span>
                  </div>

                  {/* Items */}
                  <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Returned Items</div>
                    {lastCreditNote.items.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>
                          {it.itemName} x{it.quantity} {it.unit || ''}
                        </span>
                        <span>{currency}{(it.total || it.quantity * it.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Refund summary */}
                  <div className="py-2 space-y-1 font-bold">
                    <div className="flex justify-between text-sm text-purple-900 border-b border-dashed border-slate-300 pb-1">
                      <span>TOTAL REFUND:</span>
                      <span>{currency}{lastCreditNote.creditNote.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 pt-1 font-normal">
                      <span>Refund Mode:</span>
                      <span className="font-bold">{lastCreditNote.creditNote.paymentMode || 'CASH'}</span>
                    </div>
                  </div>

                  {/* Restock & reason notice */}
                  <div className="text-[10px] bg-slate-50 p-2 rounded border border-slate-200 mt-2 space-y-1 font-sans">
                    <p className="text-slate-600"><strong>Reason:</strong> {lastCreditNote.creditNote.notes || 'Sales Return'}</p>
                    <p className="text-emerald-700">✅ Returned stock restored to store shelf.</p>
                  </div>

                  <div className="text-center pt-3 mt-3 border-t border-dashed border-slate-200 text-[10px] text-slate-400 font-sans">
                    StockStoreKhata • Authorized Return Receipt
                  </div>
                </div>
              ) : (
                /* A4 FULL PAGE CREDIT NOTE */
                <div
                  ref={creditNotePrintRef}
                  className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-[650px] text-xs font-sans space-y-5"
                >
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div>
                      {activeTenant?.logoUrl && (
                        <img
                          src={activeTenant.logoUrl}
                          alt="Logo"
                          className="h-10 object-contain mb-1.5"
                        />
                      )}
                      <h2 className="text-lg font-bold text-slate-900">{activeTenant?.name}</h2>
                      {activeTenant?.gstin && (
                        <p className="text-xs text-slate-600 font-mono">GSTIN: {activeTenant.gstin}</p>
                      )}
                      <p className="text-xs text-slate-500">{activeTenant?.address}</p>
                      <p className="text-xs text-slate-500">Phone: {activeTenant?.phone}</p>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 font-black rounded-lg text-sm tracking-wider uppercase">
                        CREDIT NOTE
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-2">
                        #{lastCreditNote.creditNote.invoiceNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        Date: {new Date(lastCreditNote.creditNote.invoiceDate || lastCreditNote.creditNote.createdAt).toLocaleDateString()}
                      </p>
                      {lastCreditNote.originalInvoice?.invoiceNumber && (
                        <p className="text-xs text-indigo-600 font-medium">
                          Original Bill: #{lastCreditNote.originalInvoice.invoiceNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Customer info */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Details</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {lastCreditNote.creditNote.partyName || 'Walk-in Customer'}
                      </p>
                      {lastCreditNote.creditNote.partyPhone && (
                        <p className="text-xs text-slate-600">{lastCreditNote.creditNote.partyPhone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Issued By</span>
                      <p className="text-xs font-semibold text-slate-800">
                        {lastCreditNote.creditNote.createdByName || 'Authorized Cashier'}
                      </p>
                      <p className="text-xs text-purple-700 font-bold mt-1">
                        Settlement: {lastCreditNote.creditNote.paymentMode}
                      </p>
                    </div>
                  </div>

                  {/* Returned Items Table */}
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-[11px] font-bold text-slate-600 bg-slate-50">
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Item Description</th>
                        <th className="py-2 px-2 text-right">Return Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-2 text-right">Tax</th>
                        <th className="py-2 px-2 text-right">Refund Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lastCreditNote.items.map((it: any, i: number) => (
                        <tr key={i}>
                          <td className="py-2.5 px-2 text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-2 font-bold text-slate-900">
                            {it.itemName}
                            {it.nativeName && <span className="text-slate-400 font-normal ml-1">({it.nativeName})</span>}
                          </td>
                          <td className="py-2.5 px-2 text-right font-medium text-slate-800">
                            {it.quantity} {it.unit || ''}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-700">
                            {currency}{it.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-500">
                            {it.taxRate > 0 ? `${it.taxRate}%` : '0%'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                            {currency}{(it.total || it.quantity * it.unitPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary & Signatures */}
                  <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                    <div className="max-w-xs space-y-1">
                      <p className="text-[11px] text-slate-600">
                        <strong>Reason:</strong> {lastCreditNote.creditNote.notes || 'Sales Return'}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        ✅ Shelf Stock Successfully Restocked
                      </p>
                      {activeTenant?.printFooterNote && (
                        <p className="text-[11px] text-slate-500 italic mt-2">
                          {activeTenant.printFooterNote}
                        </p>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <span className="text-[11px] font-bold text-purple-800 uppercase block">
                          Total Credit Note Value
                        </span>
                        <span className="text-2xl font-black text-purple-900">
                          {currency}{lastCreditNote.creditNote.totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="pt-6 text-center border-t border-slate-300 mt-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Authorized Signature
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white">
              {/* WhatsApp direct share */}
              {activeTenant && (
                <button
                  type="button"
                  onClick={() => {
                    sendWhatsAppCreditNoteDirect(
                      lastCreditNote.creditNote,
                      activeTenant,
                      lastCreditNote.items,
                      lastCreditNote.originalInvoice?.invoiceNumber,
                      waTarget
                    );
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                  title="Send Credit Note directly to Customer's WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send Credit Note on WhatsApp</span>
                </button>
              )}

              <div className="flex items-center space-x-2 ml-auto">
                <button
                  onClick={() => setShowCreditNoteModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintCreditNote}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Credit Note ({creditNoteFormat === 'THERMAL' ? 'Thermal' : 'A4'})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Invoice Confirmation Modal (Soft-Delete) */}
      {voidingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center space-x-2 text-rose-700">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm">Void Invoice #{voidingInvoice.invoiceNumber}</h3>
              </div>
              <button
                onClick={() => setVoidingInvoice(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900">
                <p className="font-bold flex items-center space-x-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Soft-Delete & Audit Protection</span>
                </p>
                <p>
                  This invoice will be marked as <strong className="text-rose-700">VOIDED</strong>. It will not be permanently deleted from the database.
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>Invoice record and line items remain safely archived.</li>
                  <li>Excluded from active billing revenue and GST registers.</li>
                  <li>You can reactivate / restore this bill at any time.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-800">{voidingInvoice.partyName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="text-slate-700">{new Date(voidingInvoice.invoiceDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bill Value:</span>
                  <span className="font-bold text-rose-700">{currency}{voidingInvoice.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setVoidingInvoice(null)}
                disabled={isVoidingInvoice}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSoftDeleteInvoice}
                disabled={isVoidingInvoice}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              >
                {isVoidingInvoice ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Voiding...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Void This Bill</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      <BarcodeCameraScanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(code) => handleBarcodeScan(code)}
        title="POS Barcode Scanner"
        subtitle="Aim camera at item barcode to add 1 pack to bill (merges if in cart)"
        continuous={true}
      />
    </div>
  );
};
