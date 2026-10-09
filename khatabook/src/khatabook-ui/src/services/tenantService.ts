import { apiClient } from './apiClient';
import { Tenant } from '../types';

export const tenantService = {
  getAdminTenants: () => apiClient.get('/admin/tenants'),
  getAdminOverview: () => apiClient.get('/admin/overview'),
  getTenants: () => apiClient.get<Tenant[]>('/tenants'),
  getTenant: (id: string) => apiClient.get<Tenant>(`/tenants/${id}`),
  createTenant: (data: Partial<Tenant>) => apiClient.post<Tenant>('/tenants', data),
  getTenantBranding: (code: string) => apiClient.get<Tenant>(`/tenants/${code}/branding`),
  updateTenantBranding: (code: string, data: any) => apiClient.put<Tenant>(`/tenants/${code}/branding`, data),
  toggleTenantActive: (id: string) => apiClient.patch<{ id: string; isActive: boolean; message: string }>(`/admin/tenants/${id}/toggle-active`),
  deleteTenant: (id: string) => apiClient.delete(`/admin/tenants/${id}`),
  getAdminAuditLogs: (params?: { tenantCode?: string; deviceType?: string; statusCode?: number; search?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/admin/audit-logs', { params }),
  adminLogin: (credentials: { username: string; password: string }) =>
    apiClient.post<{ token: string; user: any; message: string }>('/admin/login', credentials),
  verifyAdminSession: () => apiClient.get<{ valid: boolean; message: string }>('/admin/verify'),
};
