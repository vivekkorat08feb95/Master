export interface Item {
  id: string;
  name: string;
  nativeName?: string;
  barcode?: string;
  sku?: string;
  category: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  secondaryUnit?: string;
  unitConversionRatio?: number;
  mrp: number;
  taxRate: number;
  hsnCode?: string;

  // Generic industry extensions
  batchNumber?: string; // Agro & Pharmacy
  expiryDate?: string;  // Agro & Pharmacy
  mfgDate?: string;
  serialImei?: string;  // Electronics
  partNumber?: string;  // Garage & Auto

  currentStock: number;
  minStockAlert: number;
  isActive: boolean;
}

export interface DailyStockRegisterRow {
  itemId: string;
  name: string;
  nativeName?: string;
  barcode?: string;
  category: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  openingStock: number;
  inwardQty: number;
  outwardQty: number;
  auditDiscrepancyQty: number;
  closingStock: number;
  closingValue: number;
  movementsCount: number;
  hasActivity: boolean;
}

export interface DailyStockRegisterSummary {
  date: string;
  totalItemsCount: number;
  activeItemsCount: number;
  totalInwardQty: number;
  totalOutwardQty: number;
  netMovementQty: number;
  totalValuation: number;
  rows: DailyStockRegisterRow[];
}

export interface StockMovement {
  id: string;
  itemId: string;
  movementType: string;
  quantity: number;
  unitPrice: number;
  stockAfter: number;
  reason?: string;
  batchNumber?: string;
  notes?: string;
  createdAt: string;
}
