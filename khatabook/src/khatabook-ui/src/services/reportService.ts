import { apiClient } from './apiClient';
import { DashboardStats, Party } from '../types';

export const reportService = {
  getDashboard: () => apiClient.get<DashboardStats>('/reports/dashboard'),
  getDaybook: (date?: string) => apiClient.get('/reports/daybook', { params: { date } }),
  getStockValuation: () => apiClient.get('/reports/stock-valuation'),
  getOutstanding: (type?: string) => apiClient.get<Party[]>('/reports/outstanding', { params: { type } }),
  getGstr1: (fromDate?: string, toDate?: string) =>
    apiClient.get('/reports/gstr1', { params: { fromDate, toDate } }),
};
