import axios from 'axios';

const rawBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5260/api';
const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to detect client device type
const detectClientDevice = (): string => {
  const ua = navigator.userAgent;
  if (/iPad|tablet/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return 'TABLET';
  if (/iPhone|iPod/.test(ua)) return 'MOBILE_IOS';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'MOBILE_ANDROID' : 'TABLET';
  return 'DESKTOP';
};

// Interceptor to inject active Tenant ID, Code, User ID, Device, and Correlation ID
apiClient.interceptors.request.use((config) => {
  const activeTenantId = localStorage.getItem('active_tenant_id');
  const activeTenantCode = localStorage.getItem('active_tenant_code');
  const activeUserId = localStorage.getItem('active_user_id');
  const activeSessionToken = localStorage.getItem('active_session_token');

  // Generate or forward Correlation ID for full request-response audit tracking
  const correlationId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2) + Date.now().toString(36);
  config.headers['X-Correlation-Id'] = correlationId;
  config.headers['X-Client-Device'] = detectClientDevice();

  if (activeTenantId) {
    config.headers['X-Tenant-Id'] = activeTenantId;
  }
  if (activeTenantCode) {
    config.headers['X-Tenant-Code'] = activeTenantCode;
  }
  if (activeUserId) {
    config.headers['X-User-Id'] = activeUserId;
  }
  if (activeSessionToken) {
    config.headers['X-Session-Token'] = activeSessionToken;
  }
  const adminToken = localStorage.getItem('admin_token');
  if (adminToken) {
    config.headers['X-Admin-Token'] = adminToken;
  }

  try {
    const rawUser = localStorage.getItem('active_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed.name) config.headers['X-User-Name'] = parsed.name;
      if (parsed.role) config.headers['X-User-Role'] = parsed.role;
    }
  } catch {}

  return config;
});

// Response interceptor to catch 401 Unauthorized / token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const data = error.response?.data;
      const message = typeof data === 'string' 
        ? data 
        : (data?.message || 'Session expired or invalidated. Please sign in again.');
      
      window.dispatchEvent(
        new CustomEvent('khatabook_auth_unauthorized', {
          detail: { message },
        })
      );
    }
    return Promise.reject(error);
  }
);

