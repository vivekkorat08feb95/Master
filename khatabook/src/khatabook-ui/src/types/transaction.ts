export interface Transaction {
  id: string;
  partyId: string;
  invoiceId?: string;
  txnType: 'DEBIT' | 'CREDIT';
  amount: number;
  paymentMode: string;
  description?: string;
  txnDate: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}
