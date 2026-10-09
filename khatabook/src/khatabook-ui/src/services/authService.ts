import { apiClient } from './apiClient';

export const authService = {
  registerStore: (data: {
    storeCode: string;
    storeName: string;
    businessType: string;
    ownerName: string;
    email?: string;
    phone?: string;
    password: string;
    address?: string;
  }) => apiClient.post('/auth/register-store', data),

  storeLogin: (data: { storeCodeOrEmail: string; password: string; deviceInfo?: string }) =>
    apiClient.post('/auth/login', data),

  validateSession: (storeCode: string, sessionToken?: string) =>
    apiClient.get('/auth/validate-session', {
      params: { storeCode, sessionToken },
    }),

  login: (data: { emailOrPhone?: string; password?: string; pinCode?: string }) =>
    apiClient.post('/users/login', data),

  getStaff: () => apiClient.get('/users/staff'),
  addStaff: (data: any) => apiClient.post('/users/staff', data),
};
