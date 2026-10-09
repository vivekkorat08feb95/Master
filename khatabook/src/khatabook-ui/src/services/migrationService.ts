import { apiClient } from './apiClient';

export const migrationService = {
  importParties: (parties: any[]) => apiClient.post('/migration/import-parties', { parties }),
  importItems: (items: any[]) => apiClient.post('/migration/import-items', { items }),
  importInvoices: (invoices: any[]) => apiClient.post('/migration/import-invoices', { invoices }),
  getMigrationTemplate: (type: string) => apiClient.get(`/migration/template/${type}`),
};
