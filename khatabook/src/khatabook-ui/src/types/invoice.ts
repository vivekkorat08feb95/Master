export interface InvoiceItem {
  id?: string;
  itemId?: string;
  itemName: string;
  nativeName?: string;
  unit?: string;
  priceTier?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount?: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: 'SALE' | 'PURCHASE' | 'SALE_RETURN';
  partyId?: string;
  partyName?: string;
  partyPhone?: string;
  vehicleNumber?: string; // Garage
  doctorName?: string;    // Pharmacy
  patientName?: string;   // Pharmacy
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'RETURNED' | 'PARTIALLY_RETURNED' | 'REFUNDED';
  paymentMode: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  isActive?: boolean;
  invoiceDate: string;
  createdAt: string;
  updatedAt?: string;
}
