import { apiClient } from './apiClient';
import { Invoice } from '../types';

export const billingService = {
  getInvoices: (params?: { type?: string; partyId?: string; createdBy?: string; search?: string; page?: number; pageSize?: number; isActive?: boolean | null }) =>
    apiClient.get<Invoice[]>('/invoices', { params }),
  getInvoice: (id: string) => apiClient.get<{ invoice: Invoice; items: any[] }>(`/invoices/${id}`),
  createInvoice: (data: any) => apiClient.post('/invoices', data),
  deleteInvoice: (id: string) => apiClient.delete(`/invoices/${id}`),
  toggleInvoiceActive: (id: string) => apiClient.patch<{ id: string; isActive: boolean; message: string }>(`/invoices/${id}/toggle-active`),
  processInvoiceReturn: (data: {
    originalInvoiceId: string;
    items: Array<{
      itemId?: string;
      itemName: string;
      returnQuantity: number;
      unitPrice: number;
      taxRate: number;
      unit?: string;
      reason?: string;
    }>;
    refundMode: string;
    reason: string;
    notes?: string;
    restockInventory?: boolean;
    createdBy?: string;
    createdByName?: string;
  }) => apiClient.post('/invoices/return', data),
};

