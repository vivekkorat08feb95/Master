import { apiClient } from './apiClient';
import { authService } from './authService';
import { tenantService } from './tenantService';
import { partyService } from './partyService';
import { itemService } from './itemService';
import { billingService } from './billingService';
import { reportService } from './reportService';
import { migrationService } from './migrationService';

export {
  apiClient,
  authService,
  tenantService,
  partyService,
  itemService,
  billingService,
  reportService,
  migrationService,
};

// Unified API facade maintaining 100% backward compatibility
export const api = {
  ...authService,
  ...tenantService,
  ...partyService,
  ...itemService,
  ...billingService,
  ...reportService,
  ...migrationService,
};

export default api;
