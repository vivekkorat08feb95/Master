import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Item, Party, Invoice, Transaction } from '../types';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  correlationId: string;
  httpMethod: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  tenantCode?: string;
  userName?: string;
  userRole?: string;
  deviceType: string;
  platformOs?: string;
  clientIp?: string;
  requestPayload?: string;
  responsePayload?: string;
  errorMessage?: string;
}

/**
 * Universal Excel & PDF Export Utility for StockStoreKhata
 */

// ---------------------------------------------------------------------------
// 1. INVENTORY / PRODUCTS EXPORT
// ---------------------------------------------------------------------------
export function exportInventoryToExcel(items: Item[], storeName: string, currency: string = '₹') {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString();

  const rows: (string | number)[][] = [
    [`${storeName} - Product Catalog & Inventory Valuation`],
    [`Exported on: ${dateStr} • Total Products: ${items.length}`],
    [],
    ['Item Name', 'Regional Name', 'Category', 'Barcode / SKU', 'Unit', 'Cost Price', 'Selling Price', 'Wholesale Price', 'Current Stock', 'Stock Value', 'Min Alert', 'Status']
  ];

  items.forEach((item) => {
    const cost = item.purchasePrice || 0;
    const stock = item.currentStock || 0;
    const val = cost * stock;
    rows.push([
      item.name,
      item.nativeName || '',
      item.category || 'General',
      item.barcode || item.partNumber || '',
      item.unit || 'Pcs',
      cost,
      item.sellingPrice || 0,
      item.wholesalePrice || 0,
      stock,
      val,
      item.minStockAlert || 0,
      item.isActive !== false ? 'ACTIVE' : 'ARCHIVED'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  const fileName = `${storeName.replace(/\s+/g, '_')}_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportInventoryToPdf(items: Item[], storeName: string, currency: string = '₹') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString();

  // Header
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(storeName, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Inventory Catalog Report • Date: ${dateStr} • Items Count: ${items.length}`, 14, 21);

  const tableHead = [['#', 'Item Name', 'Category', 'Barcode', 'Unit', 'Cost Price', 'Selling Price', 'Stock', 'Status']];
  const tableData = items.map((item, idx) => [
    (idx + 1).toString(),
    item.name + (item.nativeName ? ` (${item.nativeName})` : ''),
    item.category || 'General',
    item.barcode || '-',
    item.unit || 'Pcs',
    `${currency}${(item.purchasePrice || 0).toFixed(2)}`,
    `${currency}${(item.sellingPrice || 0).toFixed(2)}`,
    `${item.currentStock} ${item.unit}`,
    item.isActive !== false ? 'ACTIVE' : 'ARCHIVED'
  ]);

  autoTable(doc, {
    startY: 26,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 26, left: 14, right: 14, bottom: 14 }
  });

  const fileName = `${storeName.replace(/\s+/g, '_')}_Inventory_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// ---------------------------------------------------------------------------
// 2. KHATA PARTIES (CUSTOMERS & SUPPLIERS) EXPORT
// ---------------------------------------------------------------------------
export function exportPartiesToExcel(parties: Party[], partyType: 'CUSTOMER' | 'SUPPLIER', storeName: string, currency: string = '₹') {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString();
  const typeLabel = partyType === 'CUSTOMER' ? 'Customers' : 'Suppliers';

  const rows: (string | number)[][] = [
    [`${storeName} - ${typeLabel} Khata Directory`],
    [`Exported on: ${dateStr} • Total Accounts: ${parties.length}`],
    [],
    ['Name', 'Regional Name', 'Phone', 'Address', 'Credit Limit', 'Current Balance', 'Balance Status', 'Account Status']
  ];

  parties.forEach((p) => {
    const bal = p.currentBalance || 0;
    const statusText = bal > 0 ? 'You Will Get' : bal < 0 ? 'You Will Give' : 'Settled';
    rows.push([
      p.name,
      p.nativeName || '',
      p.phone || '',
      p.address || '',
      p.creditLimit || 0,
      bal,
      statusText,
      p.isActive !== false ? 'ACTIVE' : 'ARCHIVED'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 30 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, typeLabel);
  const fileName = `${storeName.replace(/\s+/g, '_')}_${typeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportPartiesToPdf(parties: Party[], partyType: 'CUSTOMER' | 'SUPPLIER', storeName: string, currency: string = '₹') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString();
  const typeLabel = partyType === 'CUSTOMER' ? 'Customers' : 'Suppliers';

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(storeName, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`${typeLabel} Khata Directory • Date: ${dateStr} • Total: ${parties.length}`, 14, 21);

  const tableHead = [['#', 'Name', 'Phone', 'Address', 'Credit Limit', 'Balance', 'Status']];
  const tableData = parties.map((p, idx) => {
    const bal = p.currentBalance || 0;
    const balText = `${currency}${Math.abs(bal).toFixed(2)} ${bal > 0 ? '(Dr)' : bal < 0 ? '(Cr)' : '(0)'}`;
    return [
      (idx + 1).toString(),
      p.name + (p.nativeName ? ` (${p.nativeName})` : ''),
      p.phone || '-',
      p.address || '-',
      p.creditLimit ? `${currency}${p.creditLimit.toFixed(2)}` : '-',
      balText,
      p.isActive !== false ? 'ACTIVE' : 'ARCHIVED'
    ];
  });

  autoTable(doc, {
    startY: 26,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 26, left: 14, right: 14, bottom: 14 }
  });

  const fileName = `${storeName.replace(/\s+/g, '_')}_${typeLabel}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// ---------------------------------------------------------------------------
// 3. CUSTOMER LEDGER STATEMENT EXPORT
// ---------------------------------------------------------------------------
export function exportStatementToExcel(party: Party, txns: Transaction[], storeName: string, currency: string = '₹') {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString();

  const rows: (string | number)[][] = [
    [`${storeName} - Account Statement: ${party.name}`],
    [`Contact: ${party.phone || 'N/A'} • Address: ${party.address || 'N/A'}`],
    [`Current Balance: ${currency}${party.currentBalance} • Statement Date: ${dateStr}`],
    [],
    ['Date', 'Type', 'Description', 'Payment Mode', 'Debit (Udhaar)', 'Credit (Payment)', 'Status']
  ];

  txns.forEach((t) => {
    const isDebit = t.txnType === 'DEBIT';
    rows.push([
      new Date(t.txnDate).toLocaleDateString(),
      t.txnType,
      t.description || '',
      t.paymentMode || 'CASH',
      isDebit ? t.amount : 0,
      !isDebit ? t.amount : 0,
      t.isActive !== false ? 'ACTIVE' : 'VOIDED'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 },
    { wch: 16 }, { wch: 16 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Ledger Statement');
  const fileName = `${party.name.replace(/\s+/g, '_')}_Statement_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportStatementToPdf(party: Party, txns: Transaction[], storeName: string, currency: string = '₹') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString();

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(storeName, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Customer Statement: ${party.name} ${party.phone ? `(${party.phone})` : ''}`, 14, 21);
  doc.text(`Current Balance: ${currency}${party.currentBalance.toFixed(2)} • Date: ${dateStr}`, 14, 26);

  const tableHead = [['#', 'Date', 'Type', 'Description', 'Mode', 'Debit (Udhaar)', 'Credit (Payment)']];
  const tableData = txns.map((t, idx) => {
    const isDebit = t.txnType === 'DEBIT';
    return [
      (idx + 1).toString(),
      new Date(t.txnDate).toLocaleDateString(),
      t.txnType,
      t.description || '-',
      t.paymentMode || 'CASH',
      isDebit ? `${currency}${t.amount.toFixed(2)}` : '-',
      !isDebit ? `${currency}${t.amount.toFixed(2)}` : '-'
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 32, left: 14, right: 14, bottom: 14 }
  });

  const fileName = `${party.name.replace(/\s+/g, '_')}_Statement_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// ---------------------------------------------------------------------------
// 4. INVOICES / SALES REGISTER EXPORT
// ---------------------------------------------------------------------------
export function exportInvoicesToExcel(invoices: Invoice[], storeName: string, currency: string = '₹') {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString();

  const rows: (string | number)[][] = [
    [`${storeName} - Sales Register & Invoices Report`],
    [`Exported on: ${dateStr} • Total Invoices: ${invoices.length}`],
    [],
    ['Invoice / Credit #', 'Date', 'Type', 'Customer Name', 'Customer Phone', 'Billed By', 'Payment Mode', 'Total Amount', 'Paid Amount', 'Balance Due', 'Payment Status', 'Record Status']
  ];

  invoices.forEach((inv) => {
    const isCredit = inv.invoiceType === 'SALE_RETURN';
    const bal = isCredit ? 0 : inv.totalAmount - inv.paidAmount;
    rows.push([
      inv.invoiceNumber,
      new Date(inv.invoiceDate).toLocaleDateString(),
      inv.invoiceType || 'SALE',
      inv.partyName || 'Walk-in',
      inv.partyPhone || '',
      inv.createdByName || 'Cashier',
      inv.paymentMode || 'CASH',
      (isCredit ? -1 : 1) * inv.totalAmount,
      inv.paidAmount,
      bal,
      inv.paymentStatus,
      inv.isActive !== false ? 'ACTIVE' : 'VOIDED'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
    { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');
  const fileName = `${storeName.replace(/\s+/g, '_')}_Sales_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportInvoicesToPdf(invoices: Invoice[], storeName: string, currency: string = '₹') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString();

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(storeName, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sales Register Report • Date: ${dateStr} • Total Documents: ${invoices.length}`, 14, 21);

  const tableHead = [['#', 'Bill #', 'Date', 'Customer', 'Cashier', 'Mode', 'Total', 'Paid', 'Balance', 'Status']];
  const tableData = invoices.map((inv, idx) => {
    const isCredit = inv.invoiceType === 'SALE_RETURN';
    const bal = isCredit ? 0 : inv.totalAmount - inv.paidAmount;
    return [
      (idx + 1).toString(),
      inv.invoiceNumber,
      new Date(inv.invoiceDate).toLocaleDateString(),
      inv.partyName || 'Walk-in',
      inv.createdByName || 'Staff',
      inv.paymentMode || 'CASH',
      `${isCredit ? '-' : ''}${currency}${inv.totalAmount.toFixed(2)}`,
      `${currency}${inv.paidAmount.toFixed(2)}`,
      `${currency}${bal > 0 ? bal.toFixed(2) : '0.00'}`,
      inv.isActive === false ? 'VOIDED' : inv.paymentStatus
    ];
  });

  autoTable(doc, {
    startY: 26,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 26, left: 14, right: 14, bottom: 14 }
  });

  const fileName = `${storeName.replace(/\s+/g, '_')}_Sales_Register_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// ---------------------------------------------------------------------------
// 5. AUDIT LOGS EXPORT
// ---------------------------------------------------------------------------
export function exportAuditLogsToExcel(logs: AuditLogItem[]) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString();

  const rows: (string | number)[][] = [
    ['StockStoreKhata - API Request & Security Audit Trail'],
    [`Exported on: ${dateStr} • Total Events: ${logs.length}`],
    [],
    ['Timestamp', 'Method', 'Endpoint', 'Status', 'Duration (ms)', 'Store', 'User Name', 'Role', 'Device', 'OS', 'Client IP', 'Correlation ID']
  ];

  logs.forEach((l) => {
    rows.push([
      new Date(l.timestamp).toLocaleString(),
      l.httpMethod,
      l.endpoint,
      l.statusCode,
      l.durationMs,
      l.tenantCode || 'MASTER',
      l.userName || 'Anonymous',
      l.userRole || 'None',
      l.deviceType,
      l.platformOs || '',
      l.clientIp || '',
      l.correlationId
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 14 },
    { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
  const fileName = `AuditLogs_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportAuditLogsToPdf(logs: AuditLogItem[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString();

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('StockStoreKhata - API Request & Audit Logs', 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on ${dateStr} • Events Count: ${logs.length}`, 14, 21);

  const tableHead = [['#', 'Time', 'Method', 'Endpoint', 'Status', 'Duration', 'Store', 'Device', 'Client IP']];
  const tableData = logs.map((l, idx) => [
    (idx + 1).toString(),
    new Date(l.timestamp).toLocaleTimeString(),
    l.httpMethod,
    l.endpoint,
    l.statusCode.toString(),
    `${l.durationMs}ms`,
    l.tenantCode || 'SYSTEM',
    `${l.deviceType} (${l.platformOs || ''})`,
    l.clientIp || '-'
  ]);

  autoTable(doc, {
    startY: 26,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 26, left: 14, right: 14, bottom: 14 }
  });

  const fileName = `AuditLogs_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

// ---------------------------------------------------------------------------
// 6. RETAILERS REGISTRY EXPORT
// ---------------------------------------------------------------------------
export function exportRetailersToExcel(retailers: any[]) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString();

  const rows: (string | number)[][] = [
    ['StockStoreKhata - Retailers Platform Registry'],
    [`Exported on: ${dateStr} • Total Stores: ${retailers.length}`],
    [],
    ['Store Name', 'Store Code', 'Industry Type', 'Database Name', 'Owner Name', 'Contact Phone', 'Email', 'Created Date', 'Status']
  ];

  retailers.forEach((r) => {
    rows.push([
      r.name,
      r.code,
      r.businessType || 'General Store',
      r.databaseName || '',
      r.ownerName || '',
      r.phone || '',
      r.ownerEmail || '',
      new Date(r.createdAt).toLocaleDateString(),
      r.isActive !== false ? 'ACTIVE' : 'SUSPENDED'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 25 }, { wch: 14 }, { wch: 18 }, { wch: 25 },
    { wch: 20 }, { wch: 16 }, { wch: 25 }, { wch: 15 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Retailers');
  const fileName = `Retailers_Registry_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportRetailersToPdf(retailers: any[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString();

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('StockStoreKhata - Registered Retailers Registry', 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on ${dateStr} • Total Stores: ${retailers.length}`, 14, 21);

  const tableHead = [['#', 'Store Name', 'Code', 'Industry', 'Database', 'Owner', 'Phone', 'Registered', 'Status']];
  const tableData = retailers.map((r, idx) => [
    (idx + 1).toString(),
    r.name,
    r.code,
    r.businessType || 'General',
    r.databaseName || '-',
    r.ownerName || '-',
    r.phone || '-',
    new Date(r.createdAt).toLocaleDateString(),
    r.isActive !== false ? 'ACTIVE' : 'SUSPENDED'
  ]);

  autoTable(doc, {
    startY: 26,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 26, left: 14, right: 14, bottom: 14 }
  });

  const fileName = `Retailers_Registry_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
