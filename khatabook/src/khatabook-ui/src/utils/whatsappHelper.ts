import { Tenant, Invoice, Party } from '../types';

export type WhatsAppTarget = 'DESKTOP_APP' | 'WEB_POPUP' | 'WEB_TAB';

export function getWhatsAppTargetPreference(): WhatsAppTarget {
  return (localStorage.getItem('khatabook_whatsapp_target') as WhatsAppTarget) || 'DESKTOP_APP';
}

export function setWhatsAppTargetPreference(target: WhatsAppTarget) {
  localStorage.setItem('khatabook_whatsapp_target', target);
}

/**
 * Builds the formatted WhatsApp message text for an Invoice.
 */
export function buildInvoiceMessageText(
  invoice: any,
  tenant: Tenant,
  items: any[]
): string {
  const currency = tenant.currencySymbol || '₹';

  let text = `🧾 *${tenant.name.toUpperCase()}*\n`;
  if (tenant.tagline) text += `_${tenant.tagline}_\n`;
  text += `--------------------------------\n`;
  text += `*Bill No:* ${invoice.invoiceNumber}\n`;
  text += `*Date:* ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString()}\n`;
  if (invoice.partyName) text += `*Customer:* ${invoice.partyName}\n`;
  text += `--------------------------------\n`;
  text += `*ITEMS:*\n`;

  items.forEach((item: any, idx: number) => {
    const lineTotal = item.total || item.quantity * item.unitPrice;
    text += `${idx + 1}. ${item.itemName} (${item.quantity} ${item.unit || 'Pcs'}) - ${currency}${lineTotal.toFixed(2)}\n`;
  });

  text += `--------------------------------\n`;
  text += `*Grand Total:* ${currency}${invoice.totalAmount.toFixed(2)}\n`;
  text += `*Amount Paid:* ${currency}${invoice.paidAmount.toFixed(2)} (${invoice.paymentMode || 'CASH'})\n`;

  const due = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  if (due > 0) {
    text += `*⚠️ Balance Due (Udhaar):* ${currency}${due.toFixed(2)}\n`;
  }

  if (tenant.upiId && due > 0) {
    const upiLink = `upi://pay?pa=${tenant.upiId}&pn=${encodeURIComponent(tenant.upiPayeeName || tenant.name)}&am=${due.toFixed(2)}&cu=INR`;
    text += `\n*📲 Pay via UPI:* ${upiLink}\n`;
  }

  if (tenant.printFooterNote) {
    text += `\n_${tenant.printFooterNote}_\n`;
  }

  text += `\n_Thank you for your business!_ 🙏`;
  return text;
}

/**
 * Builds the formatted WhatsApp payment reminder message text.
 */
export function buildPaymentReminderText(
  party: Party,
  tenant: Tenant,
  lang: 'EN' | 'HI' | 'GU' = 'HI'
): string {
  const currency = tenant.currencySymbol || '₹';
  const balance = Math.abs(party.currentBalance).toFixed(2);

  let text = '';
  if (lang === 'GU') {
    text = `નમસ્તે *${party.name}* જી,\n\n*${tenant.name}* માં આપનું બાકી ઉધાર ખાતું *${currency}${balance}* છે. કૃપા કરીને વહેલી તકે ચુકવણી કરવા વિનંતી છે.\n`;
  } else if (lang === 'HI') {
    text = `नमस्ते *${party.name}* जी,\n\n*${tenant.name}* में आपका बकाया उधार *${currency}${balance}* है। कृपया समय पर भुगतान करने का कष्ट करें।\n`;
  } else {
    text = `Dear *${party.name}*,\n\nThis is a gentle reminder that your pending balance at *${tenant.name}* is *${currency}${balance}*. Kindly settle the due amount at your earliest convenience.\n`;
  }

  if (tenant.upiId) {
    const upiLink = `upi://pay?pa=${tenant.upiId}&pn=${encodeURIComponent(tenant.upiPayeeName || tenant.name)}&am=${balance}&cu=INR`;
    text += `\n*📲 Pay Instantly via UPI:* ${upiLink}\n`;
  }

  text += `\nસંપર્ક / Contact: ${tenant.phone || ''}\nધન્યવાદ / धन्यवाद / Thank You! 🙏`;
  return text;
}

/**
 * Builds the formatted WhatsApp Udhaar settlement receipt text.
 */
export function buildSettlementReceiptText(
  result: {
    totalPaid: number;
    previousBalance: number;
    newBalance: number;
    settledInvoices: Array<{
      invoiceNumber: string;
      totalAmount: number;
      allocatedAmount: number;
      remainingDue: number;
      status: string;
    }>;
  },
  party: Party,
  tenant: Tenant,
  paymentMode: string = 'CASH'
): string {
  const currency = tenant.currencySymbol || '₹';

  let text = `🧾 *${tenant.name.toUpperCase()}* - *PAYMENT RECEIPT*\n`;
  if (tenant.tagline) text += `_${tenant.tagline}_\n`;
  text += `--------------------------------\n`;
  text += `*Customer:* ${party.name}\n`;
  text += `*Date:* ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
  text += `*Payment Mode:* ${paymentMode}\n`;
  text += `--------------------------------\n`;
  text += `*💰 Amount Received:* ${currency}${result.totalPaid.toFixed(2)}\n`;
  text += `*Previous Khata Balance:* ${currency}${result.previousBalance.toFixed(2)}\n`;
  text += `*Updated Balance Due:* ${currency}${result.newBalance.toFixed(2)}\n`;

  if (result.settledInvoices && result.settledInvoices.length > 0) {
    text += `--------------------------------\n`;
    text += `*BILLS RECONCILED:*\n`;
    result.settledInvoices.forEach((inv, idx) => {
      const statusIcon = inv.status === 'PAID' ? '✅ Cleared' : `⚠️ Rem. ${currency}${inv.remainingDue.toFixed(2)}`;
      text += `${idx + 1}. *Bill #${inv.invoiceNumber}*: ${currency}${inv.allocatedAmount.toFixed(2)} settled [${statusIcon}]\n`;
    });
  }

  if (result.newBalance > 0 && tenant.upiId) {
    const upiLink = `upi://pay?pa=${tenant.upiId}&pn=${encodeURIComponent(tenant.upiPayeeName || tenant.name)}&am=${result.newBalance.toFixed(2)}&cu=INR`;
    text += `\n*📲 Pay Remaining Balance via UPI:*\n${upiLink}\n`;
  }

  if (tenant.phone) {
    text += `\n*Contact:* ${tenant.phone}`;
  }
  text += `\n_Thank you for your payment!_ 🙏`;
  return text;
}

/**
 * Dispatches a WhatsApp message directly without opening unwanted browser tabs.
 * 
 * - 'DESKTOP_APP' (Default): Uses native 'whatsapp://send' protocol on Windows.
 *   Opens WhatsApp Desktop directly, staying on the Khatabook screen without creating ANY extra browser tab!
 * - 'WEB_POPUP': Uses a single dedicated floating popup window ('khatabook_whatsapp')
 *   reused for all sends so it never litters multiple browser tabs.
 * - 'WEB_TAB': Standard web link fallback.
 */
export function dispatchWhatsAppMessage(
  phone: string,
  text: string,
  targetPreference?: WhatsAppTarget
): boolean {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    alert('Customer does not have a phone number entered for WhatsApp.');
    return false;
  }

  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encodedText = encodeURIComponent(text);
  const pref = targetPreference || getWhatsAppTargetPreference();

  if (pref === 'DESKTOP_APP') {
    // Direct Windows WhatsApp Desktop protocol: ZERO NEW TABS!
    const appUrl = `whatsapp://send?phone=${fullPhone}&text=${encodedText}`;
    
    try {
      window.location.href = appUrl;
    } catch (_) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = appUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (_) {}
      }, 2000);
    }
    return true;
  }

  if (pref === 'WEB_POPUP') {
    // Dedicated floating popup window: reuses the exact same window across all invoices
    const webUrl = `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
    const windowFeatures = 'width=750,height=800,top=60,left=120,menubar=no,toolbar=no,location=no,status=no,resizable=yes';
    window.open(webUrl, 'khatabook_whatsapp_applet', windowFeatures);
    return true;
  }

  // Fallback
  window.open(`https://wa.me/${fullPhone}?text=${encodedText}`, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Convenience helper to directly dispatch an Invoice to WhatsApp.
 */
export function sendWhatsAppInvoiceDirect(
  invoice: any,
  tenant: Tenant,
  items: any[],
  targetPreference?: WhatsAppTarget
): boolean {
  const phone = invoice.partyPhone || '';
  const text = buildInvoiceMessageText(invoice, tenant, items);
  return dispatchWhatsAppMessage(phone, text, targetPreference);
}

/**
 * Convenience helper to directly dispatch a Khata payment reminder to WhatsApp.
 */
export function sendWhatsAppReminderDirect(
  party: Party,
  tenant: Tenant,
  lang: 'EN' | 'HI' | 'GU' = 'HI',
  targetPreference?: WhatsAppTarget
): boolean {
  const phone = party.phone || '';
  const text = buildPaymentReminderText(party, tenant, lang);
  return dispatchWhatsAppMessage(phone, text, targetPreference);
}

/**
 * Convenience helper to directly dispatch a Settlement Receipt to WhatsApp.
 */
export function sendWhatsAppSettlementReceiptDirect(
  result: any,
  party: Party,
  tenant: Tenant,
  paymentMode: string = 'CASH',
  targetPreference?: WhatsAppTarget
): boolean {
  const phone = party.phone || '';
  const text = buildSettlementReceiptText(result, party, tenant, paymentMode);
  return dispatchWhatsAppMessage(phone, text, targetPreference);
}

/**
 * Builds the formatted WhatsApp message text for a Credit Note / Sales Return.
 */
export function buildCreditNoteMessageText(
  creditNote: any,
  tenant: Tenant,
  items: any[],
  originalInvoiceNumber?: string
): string {
  const currency = tenant.currencySymbol || '₹';

  let text = `↩️ *${tenant.name.toUpperCase()} - CREDIT NOTE*\n`;
  if (tenant.tagline) text += `_${tenant.tagline}_\n`;
  text += `--------------------------------\n`;
  text += `*Credit Note No:* ${creditNote.invoiceNumber}\n`;
  if (originalInvoiceNumber) {
    text += `*Against Invoice:* ${originalInvoiceNumber}\n`;
  }
  text += `*Date:* ${new Date(creditNote.invoiceDate || creditNote.createdAt).toLocaleDateString()}\n`;
  if (creditNote.partyName) text += `*Customer:* ${creditNote.partyName}\n`;
  text += `--------------------------------\n`;
  text += `*RETURNED ITEMS:*\n`;

  items.forEach((item: any, idx: number) => {
    const lineTotal = item.total || item.quantity * item.unitPrice;
    text += `${idx + 1}. ${item.itemName} (${item.quantity} ${item.unit || 'Pcs'}) - ${currency}${lineTotal.toFixed(2)}\n`;
  });

  text += `--------------------------------\n`;
  text += `*Total Refund / Credit:* ${currency}${creditNote.totalAmount.toFixed(2)}\n`;
  const mode = creditNote.paymentMode || 'CASH';
  const modeLabel = mode === 'DEDUCT_UDHAAR' ? 'Deducted from Khata (Udhaar balance reduced)' : mode === 'STORE_CREDIT' ? 'Store Credit issued' : `${mode} Refund`;
  text += `*Settlement Mode:* ${modeLabel}\n`;

  if (tenant.printFooterNote) {
    text += `\n_${tenant.printFooterNote}_\n`;
  }

  text += `\n_StockStoreKhata Return Record_ 🙏`;
  return text;
}

/**
 * Convenience helper to directly dispatch a Credit Note / Return Receipt to WhatsApp.
 */
/**
 * Convenience helper to directly dispatch a Credit Note / Return Receipt to WhatsApp.
 */
export function sendWhatsAppCreditNoteDirect(
  creditNote: any,
  tenant: Tenant,
  items: any[],
  originalInvoiceNumber?: string,
  targetPreference?: WhatsAppTarget
): boolean {
  const phone = creditNote.partyPhone || '';
  const text = buildCreditNoteMessageText(creditNote, tenant, items, originalInvoiceNumber);
  return dispatchWhatsAppMessage(phone, text, targetPreference);
}

/**
 * Builds formatted WhatsApp Purchase Order text for automated supplier reordering.
 */
export function buildPurchaseOrderWhatsAppMessage(
  poRef: string,
  tenant: Tenant,
  supplier: any | null,
  items: Array<{ itemName: string; reorderQty: number; unit?: string; purchasePrice?: number }>,
  lang: 'EN' | 'HI' | 'GU' = 'HI',
  notes?: string
): string {
  const currency = tenant.currencySymbol || '₹';
  const totalEstCost = items.reduce((acc, it) => acc + (it.reorderQty * (it.purchasePrice || 0)), 0);
  const supplierName = supplier?.name || supplier?.companyName || 'Supplier / Distributor';

  let greeting = '';
  let requestLine = '';
  let footer = '';

  if (lang === 'GU') {
    greeting = `📦 *ઓર્ડર નોંધ (PURCHASE ORDER)*\n*દુકાન:* ${tenant.name.toUpperCase()}\n*વિતરક (Distributor):* ${supplierName}\n*PO Ref:* ${poRef}\n*તારીખ:* ${new Date().toLocaleDateString()}`;
    requestLine = `નમસ્તે જી! કૃપા કરીને અમારી દુકાન માટે નીચે મુજબનો માલ વહેલી તકે મોકલવા વિનંતી:`;
    footer = `કૃપા કરીને ડિલિવરી સમય અને પાકું બિલ જણાવશો. ધન્યવાદ! 🙏\n_StockStoreKhata AI Reorder Bot_`;
  } else if (lang === 'HI') {
    greeting = `📦 *खरीद आदेश (PURCHASE ORDER)*\n*दुकान:* ${tenant.name.toUpperCase()}\n*वितरक (Distributor):* ${supplierName}\n*PO Ref:* ${poRef}\n*दिनांक:* ${new Date().toLocaleDateString()}`;
    requestLine = `नमस्ते जी! कृपया हमारी दुकान के लिए निम्नलिखित सामग्री जल्द से जल्द भेजने का कष्ट करें:`;
    footer = `कृपया डिलीवरी समय और पक्का बिल कन्फर्म करें। धन्यवाद! 🙏\n_StockStoreKhata AI Reorder Bot_`;
  } else {
    greeting = `📦 *PURCHASE ORDER*\n*Store:* ${tenant.name.toUpperCase()}\n*Distributor:* ${supplierName}\n*PO Ref:* ${poRef}\n*Date:* ${new Date().toLocaleDateString()}`;
    requestLine = `Dear Distributor, please arrange supply of the following items to our store at your earliest convenience:`;
    footer = `Please confirm dispatch schedule and invoice bill. Thank you! 🙏\n_StockStoreKhata AI Reorder Bot_`;
  }

  let text = `${greeting}\n--------------------------------\n${requestLine}\n\n`;

  items.forEach((it, idx) => {
    const estLine = (it.purchasePrice && it.purchasePrice > 0)
      ? ` (~${currency}${(it.reorderQty * it.purchasePrice).toFixed(2)})`
      : '';
    text += `${idx + 1}. *${it.itemName}* : ${it.reorderQty} ${it.unit || 'Pcs'}${estLine}\n`;
  });

  text += `--------------------------------\n`;
  if (totalEstCost > 0) {
    text += `*Est. Order Value:* ${currency}${totalEstCost.toFixed(2)}\n`;
  }
  if (tenant.phone) {
    text += `*Store Contact:* ${tenant.phone}\n`;
  }
  if (notes && notes.trim()) {
    text += `*Special Note:* ${notes.trim()}\n`;
  }
  text += `\n${footer}`;

  return text;
}

/**
 * Dispatches Purchase Order directly to Distributor's WhatsApp.
 */
export function sendWhatsAppPurchaseOrderDirect(
  supplierPhone: string,
  poRef: string,
  tenant: Tenant,
  supplier: any | null,
  items: Array<{ itemName: string; reorderQty: number; unit?: string; purchasePrice?: number }>,
  lang: 'EN' | 'HI' | 'GU' = 'HI',
  notes?: string,
  targetPreference?: WhatsAppTarget
): boolean {
  const text = buildPurchaseOrderWhatsAppMessage(poRef, tenant, supplier, items, lang, notes);
  return dispatchWhatsAppMessage(supplierPhone, text, targetPreference);
}

// -------------------------------------------------------------
// Backward Compatibility helpers returning URLs (for legacy <a href> if needed)
// -------------------------------------------------------------
export function formatWhatsAppInvoiceMessage(
  invoice: any,
  tenant: Tenant,
  items: any[]
): string {
  const cleanPhone = (invoice.partyPhone || '').replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const text = buildInvoiceMessageText(invoice, tenant, items);
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}

export function formatWhatsAppPaymentReminder(
  party: Party,
  tenant: Tenant,
  lang: 'EN' | 'HI' | 'GU' = 'HI'
): string {
  const cleanPhone = (party.phone || '').replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const text = buildPaymentReminderText(party, tenant, lang);
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}

export function formatWhatsAppSettlementReceipt(
  result: any,
  party: Party,
  tenant: Tenant,
  paymentMode: string = 'CASH'
): string {
  const cleanPhone = (party.phone || '').replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const text = buildSettlementReceiptText(result, party, tenant, paymentMode);
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}
