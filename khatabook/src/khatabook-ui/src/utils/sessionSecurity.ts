export type TimeoutAction = 'LOCK' | 'LOGOUT';

export const SESSION_TIMEOUT_STORAGE_KEY = 'khatabook_session_timeout_mins';
export const TIMEOUT_ACTION_STORAGE_KEY = 'khatabook_timeout_action';
export const PREVENT_BACK_EXIT_STORAGE_KEY = 'khatabook_prevent_back_exit';

/**
 * Gets configured inactivity timeout in minutes (0 means never).
 * Default: 30 minutes.
 */
export function getSessionTimeoutMins(): number {
  const val = localStorage.getItem(SESSION_TIMEOUT_STORAGE_KEY);
  if (val === null || val === undefined) return 30; // 30 mins default
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 30 : parsed;
}

export function setSessionTimeoutMins(mins: number): void {
  localStorage.setItem(SESSION_TIMEOUT_STORAGE_KEY, mins.toString());
}

/**
 * Gets configured action on session timeout ('LOCK' or 'LOGOUT').
 * Default: 'LOCK' (Preserves active POS cart and screen state).
 */
export function getTimeoutAction(): TimeoutAction {
  const val = localStorage.getItem(TIMEOUT_ACTION_STORAGE_KEY);
  return (val === 'LOGOUT') ? 'LOGOUT' : 'LOCK';
}

export function setTimeoutAction(action: TimeoutAction): void {
  localStorage.setItem(TIMEOUT_ACTION_STORAGE_KEY, action);
}

/**
 * Gets whether browser back button should be intercepted to prevent accidental exit/logout.
 * Default: true.
 */
export function getPreventBackExit(): boolean {
  const val = localStorage.getItem(PREVENT_BACK_EXIT_STORAGE_KEY);
  return val !== 'false';
}

export function setPreventBackExit(enabled: boolean): void {
  localStorage.setItem(PREVENT_BACK_EXIT_STORAGE_KEY, enabled ? 'true' : 'false');
}

export const PREVENT_MULTI_TAB_STORAGE_KEY = 'khatabook_prevent_multi_tab';

/**
 * Gets whether multi-tab access should be prevented (Single Browser Tab Lock).
 * Default: true.
 */
export function getPreventMultiTab(): boolean {
  const val = localStorage.getItem(PREVENT_MULTI_TAB_STORAGE_KEY);
  return val !== 'false'; // Enabled by default
}

export function setPreventMultiTab(enabled: boolean): void {
  localStorage.setItem(PREVENT_MULTI_TAB_STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * Detects client OS and device category for human-readable audit logging.
 */
export function getDeviceIdentifier(): string {
  if (typeof window === 'undefined' || !navigator) return 'Web Client';

  const ua = navigator.userAgent;
  let os = 'Desktop';
  if (/android/i.test(ua)) os = 'Mobile (Android)';
  else if (/iPad|iPhone|iPod/.test(ua)) os = 'Mobile (iOS)';
  else if (/windows/i.test(ua)) os = 'Desktop (Windows)';
  else if (/macintosh|mac os x/i.test(ua)) os = 'Desktop (Mac)';
  else if (/linux/i.test(ua)) os = 'Desktop (Linux)';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return `${os} - ${browser}`;
}
