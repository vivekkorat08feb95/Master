export interface Party {
  id: string;
  name: string;
  nativeName?: string;
  phone?: string;
  email?: string;
  address?: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  vehicleNumber?: string; // For Garage
  dlNumber?: string;      // For Pharmacy
  openingBalance: number;
  currentBalance: number;
  creditLimit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
