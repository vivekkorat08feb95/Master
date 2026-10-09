import { apiClient } from './apiClient';
import { Item } from '../types';

export const itemService = {
  getItems: (params?: { search?: string; category?: string; isActive?: boolean | null }) =>
    apiClient.get<Item[]>('/items', { params }),
  getLowStockItems: () => apiClient.get<Item[]>('/items/low-stock'),
  getItem: (id: string) => apiClient.get<{ item: Item; stockHistory: any[] }>(`/items/${id}`),
  createItem: (data: any) => apiClient.post<Item>('/items', data),
  updateItem: (id: string, data: any) => apiClient.put<Item>(`/items/${id}`, data),
  deleteItem: (id: string) => apiClient.delete(`/items/${id}`),
  toggleItemActive: (id: string) => apiClient.patch<{ id: string; isActive: boolean; message: string }>(`/items/${id}/toggle-active`),
  adjustStock: (data: {
    itemId: string;
    adjustmentType: 'ADD' | 'SUBTRACT';
    quantity: number;
    reason: string;
    notes?: string;
  }) => apiClient.post('/stockmovements/adjust', data),
  reconcileStockAudit: (data: {
    itemId: string;
    physicalCount: number;
    discrepancyReason: string;
    notes?: string;
    auditedBy?: string;
  }) => apiClient.post('/stockmovements/audit-reconcile', data),
  getDailyStockRegister: (date?: string) =>
    apiClient.get('/stockmovements/daily-register', { params: { date } }),
  getItemStockHistory: (itemId: string) =>
    apiClient.get<any[]>(`/stockmovements/history/${itemId}`),
};
