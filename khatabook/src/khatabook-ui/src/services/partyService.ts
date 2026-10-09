import { apiClient } from './apiClient';
import { Party, Invoice } from '../types';

export const partyService = {
  getParties: (params?: { type?: string; search?: string; isActive?: boolean | null }) =>
    apiClient.get<Party[]>('/parties', { params }),
  getParty: (id: string) =>
    apiClient.get<{ party: Party; transactions: any[]; invoices?: Invoice[] }>(`/parties/${id}`),
  createParty: (data: any) => apiClient.post<Party>('/parties', data),
  updateParty: (id: string, data: any) => apiClient.put<Party>(`/parties/${id}`, data),
  deleteParty: (id: string) => apiClient.delete(`/parties/${id}`),
  togglePartyActive: (id: string) => apiClient.patch<{ id: string; isActive: boolean; message: string }>(`/parties/${id}/toggle-active`),
  createTransaction: (data: {
    partyId: string;
    txnType: 'DEBIT' | 'CREDIT';
    amount: number;
    paymentMode: string;
    description?: string;
  }) => apiClient.post('/transactions', data),
  deleteTransaction: (id: string) => apiClient.delete(`/transactions/${id}`),
  toggleTransactionActive: (id: string) => apiClient.patch<{ id: string; isActive: boolean; message: string }>(`/transactions/${id}/toggle-active`),
  settleUdhaar: (partyId: string, data: {
    amount: number;
    paymentMode: string;
    notes?: string;
    allocations?: Array<{ invoiceId: string; allocatedAmount: number }>;
  }) => apiClient.post<any>(`/parties/${partyId}/settle-udhaar`, data),
};
