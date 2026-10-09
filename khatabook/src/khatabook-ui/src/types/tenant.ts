export interface Tenant {
  id: string;
  code: string; // e.g. 'agro1', 'agro2', 'kirana1', 'garage1'
  name: string;
  businessType: string; // 'Kirana', 'Agro', 'Pharmacy', 'Garage', 'Electronics', 'General'
  databaseName?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  currencySymbol: string;
  logoUrl?: string;
  tagline?: string;
  printHeaderNote?: string;
  printFooterNote?: string;
  upiId?: string;
  upiPayeeName?: string;
  enforceSingleSession?: boolean;
  currentSessionToken?: string;
  lastLoginDevice?: string;
  lastLoginAt?: string;
  role?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  pinCode?: string;
}
