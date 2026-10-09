import { Item, Party, Tenant } from '../types';

const DB_NAME = 'StockStoreKhataOfflineDB';
const DB_VERSION = 1;

export interface OfflineInvoiceQueueItem {
  offlineId: string;
  payload: any;
  createdAt: string;
  displayInvoiceNumber: string;
}

let dbInstance: IDBDatabase | null = null;

export async function getOfflineDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('parties')) {
        db.createObjectStore('parties', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_invoices')) {
        db.createObjectStore('offline_invoices', { keyPath: 'offlineId' });
      }
      if (!db.objectStoreNames.contains('tenant_meta')) {
        db.createObjectStore('tenant_meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: any) => {
      dbInstance = event.target.result as IDBDatabase;
      resolve(dbInstance);
    };

    request.onerror = (event: any) => {
      console.error('Failed to open IndexedDB', event);
      reject(event.target.error);
    };
  });
}

// -------------------------------------------------------------
// Cache Items
// -------------------------------------------------------------
export async function cacheItemsLocally(items: Item[]): Promise<void> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    store.clear();
    items.forEach((item) => store.put(item));
  } catch (err) {
    console.warn('Failed to cache items in IndexedDB', err);
  }
}

export async function getCachedItemsLocally(): Promise<Item[]> {
  try {
    const db = await getOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction('items', 'readonly');
      const store = tx.objectStore('items');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// Cache Parties (Customers & Suppliers)
// -------------------------------------------------------------
export async function cachePartiesLocally(parties: Party[]): Promise<void> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction('parties', 'readwrite');
    const store = tx.objectStore('parties');
    store.clear();
    parties.forEach((party) => store.put(party));
  } catch (err) {
    console.warn('Failed to cache parties in IndexedDB', err);
  }
}

export async function getCachedPartiesLocally(): Promise<Party[]> {
  try {
    const db = await getOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction('parties', 'readonly');
      const store = tx.objectStore('parties');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// Cache Tenant Profile
// -------------------------------------------------------------
export async function cacheTenantLocally(tenant: Tenant): Promise<void> {
  try {
    const db = await getOfflineDb();
    const tx = db.transaction('tenant_meta', 'readwrite');
    const store = tx.objectStore('tenant_meta');
    store.put({ key: 'activeTenant', value: tenant });
  } catch (err) {
    console.warn('Failed to cache tenant in IndexedDB', err);
  }
}

export async function getCachedTenantLocally(): Promise<Tenant | null> {
  try {
    const db = await getOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction('tenant_meta', 'readonly');
      const store = tx.objectStore('tenant_meta');
      const req = store.get('activeTenant');
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Offline Invoices Queue
// -------------------------------------------------------------
export async function saveOfflineInvoice(payload: any): Promise<{
  offlineId: string;
  invoice: any;
  items: any[];
}> {
  const db = await getOfflineDb();
  const timestamp = Date.now();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const offlineId = `OFFLINE-${timestamp}`;
  const displayInvoiceNumber = `OFFLINE-INV-${dateStr}-${randomSuffix}`;

  const queueItem: OfflineInvoiceQueueItem = {
    offlineId,
    payload: {
      ...payload,
      notes: `[OFFLINE CREATED] ${payload.notes || ''}`.trim(),
    },
    createdAt: new Date().toISOString(),
    displayInvoiceNumber,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('offline_invoices', 'readwrite');
    const store = tx.objectStore('offline_invoices');
    const req = store.put(queueItem);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // Locally deduct cached items stock so cashier's subsequent offline bills stay in sync
  try {
    const cachedItems = await getCachedItemsLocally();
    payload.items.forEach((ci: any) => {
      const found = cachedItems.find((it) => it.id === ci.itemId);
      if (found) {
        found.currentStock = Math.max(0, found.currentStock - ci.quantity);
      }
    });
    await cacheItemsLocally(cachedItems);
  } catch (e) {
    console.warn('Failed to decrement local cached stock', e);
  }

  // Construct fake invoice result for immediate printing while offline
  const subtotal = payload.items.reduce((acc: number, it: any) => acc + it.total, 0);
  const totalAmount = Math.max(0, subtotal - (payload.discountAmount || 0));

  const offlineInvoiceObj = {
    id: offlineId,
    invoiceNumber: displayInvoiceNumber,
    invoiceType: payload.invoiceType || 'SALE',
    partyId: payload.partyId,
    partyName: payload.partyName || 'Walk-in Customer',
    partyPhone: payload.partyPhone,
    subtotal,
    discountAmount: payload.discountAmount || 0,
    taxAmount: 0,
    totalAmount,
    paidAmount: payload.paidAmount || 0,
    paymentStatus: payload.paidAmount >= totalAmount ? 'PAID' : payload.paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
    paymentMode: payload.paymentMode || 'CASH',
    notes: payload.notes,
    createdByName: payload.createdByName || 'Offline Till',
    invoiceDate: new Date().toISOString(),
    isOffline: true,
  };

  return {
    offlineId,
    invoice: offlineInvoiceObj,
    items: payload.items,
  };
}

export async function getPendingOfflineInvoices(): Promise<OfflineInvoiceQueueItem[]> {
  try {
    const db = await getOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction('offline_invoices', 'readonly');
      const store = tx.objectStore('offline_invoices');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineInvoice(offlineId: string): Promise<void> {
  const db = await getOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_invoices', 'readwrite');
    const store = tx.objectStore('offline_invoices');
    const req = store.delete(offlineId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// -------------------------------------------------------------
// Auto-Sync Offline Invoices to Cloud API
// -------------------------------------------------------------
export async function syncOfflineInvoicesToCloud(
  createInvoiceFn: (data: any) => Promise<any>
): Promise<{ syncedCount: number; errors: string[] }> {
  const pending = await getPendingOfflineInvoices();
  if (pending.length === 0) return { syncedCount: 0, errors: [] };

  let syncedCount = 0;
  const errors: string[] = [];

  for (const item of pending) {
    try {
      await createInvoiceFn(item.payload);
      await removeOfflineInvoice(item.offlineId);
      syncedCount++;
    } catch (err: any) {
      console.error(`Failed to sync offline invoice ${item.displayInvoiceNumber}`, err);
      errors.push(item.displayInvoiceNumber);
    }
  }

  return { syncedCount, errors };
}
