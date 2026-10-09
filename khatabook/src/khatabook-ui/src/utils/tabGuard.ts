import { getPreventMultiTab } from './sessionSecurity';

export type TabBlockReason = 'ANOTHER_TAB_ACTIVE' | 'SESSION_TAKEOVER';

export interface TabGuardState {
  isBlocked: boolean;
  reason: TabBlockReason | null;
  tabId: string;
}

const STORAGE_ACTIVE_TAB_ID = 'stockstorekhata_active_tab_id';
const STORAGE_ACTIVE_TAB_HEARTBEAT = 'stockstorekhata_active_tab_heartbeat';
const BROADCAST_CHANNEL_NAME = 'stockstorekhata_tab_bus';

export function createUniqueTabId(): string {
  return 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
}

/**
 * Initializes single-browser-tab guard to prevent concurrent multi-tab usage.
 * Protects POS checkout carts, sequential invoice numbering, and shelf inventory updates.
 */
export function initTabGuard(
  myTabId: string,
  onStateChange: (state: TabGuardState) => void
): () => void {
  // If user disabled multi-tab prevention in settings, permit all tabs
  if (!getPreventMultiTab()) {
    onStateChange({ isBlocked: false, reason: null, tabId: myTabId });
    return () => {};
  }

  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }
  } catch (err) {
    console.warn('BroadcastChannel unavailable; falling back to storage events', err);
  }

  const checkAndClaimOrBlock = () => {
    if (!getPreventMultiTab()) {
      onStateChange({ isBlocked: false, reason: null, tabId: myTabId });
      return;
    }

    const currentPrimary = localStorage.getItem(STORAGE_ACTIVE_TAB_ID);
    const lastHeartbeat = parseInt(localStorage.getItem(STORAGE_ACTIVE_TAB_HEARTBEAT) || '0', 10);
    const now = Date.now();
    const isPrimaryAlive = currentPrimary && currentPrimary !== myTabId && (now - lastHeartbeat < 3500);

    if (isPrimaryAlive) {
      // Another tab is actively running!
      onStateChange({ isBlocked: true, reason: 'ANOTHER_TAB_ACTIVE', tabId: myTabId });
    } else {
      // No alive primary tab -> claim leadership
      localStorage.setItem(STORAGE_ACTIVE_TAB_ID, myTabId);
      localStorage.setItem(STORAGE_ACTIVE_TAB_HEARTBEAT, now.toString());
      onStateChange({ isBlocked: false, reason: null, tabId: myTabId });
    }
  };

  // Initial check
  checkAndClaimOrBlock();

  // Heartbeat loop for active tab
  const heartbeatInterval = setInterval(() => {
    if (!getPreventMultiTab()) return;

    const currentPrimary = localStorage.getItem(STORAGE_ACTIVE_TAB_ID);
    if (currentPrimary === myTabId) {
      localStorage.setItem(STORAGE_ACTIVE_TAB_HEARTBEAT, Date.now().toString());
    }
  }, 1000);

  // Broadcast message handler
  const handleMessage = (msgData: any) => {
    if (!msgData || !getPreventMultiTab()) return;

    if (msgData.type === 'CLAIM_PRIMARY_TAB') {
      if (msgData.tabId !== myTabId) {
        // Another tab has taken over leadership
        const currentPrimary = localStorage.getItem(STORAGE_ACTIVE_TAB_ID);
        if (currentPrimary === myTabId || currentPrimary === msgData.tabId) {
          onStateChange({ isBlocked: true, reason: 'SESSION_TAKEOVER', tabId: myTabId });
        }
      }
    } else if (msgData.type === 'RELEASE_PRIMARY_TAB') {
      // If previous tab was closed, the currently focused tab can take over
      if (document.visibilityState === 'visible') {
        localStorage.setItem(STORAGE_ACTIVE_TAB_ID, myTabId);
        localStorage.setItem(STORAGE_ACTIVE_TAB_HEARTBEAT, Date.now().toString());
        onStateChange({ isBlocked: false, reason: null, tabId: myTabId });
      }
    }
  };

  if (channel) {
    channel.onmessage = (event) => handleMessage(event.data);
  }

  // Cross-tab storage event listener
  const handleStorageEvent = (event: StorageEvent) => {
    if (!getPreventMultiTab()) return;

    if (event.key === STORAGE_ACTIVE_TAB_ID) {
      if (event.newValue && event.newValue !== myTabId) {
        onStateChange({ isBlocked: true, reason: 'SESSION_TAKEOVER', tabId: myTabId });
      }
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // Cleanup on unload / close
  const handleUnload = () => {
    const currentPrimary = localStorage.getItem(STORAGE_ACTIVE_TAB_ID);
    if (currentPrimary === myTabId) {
      localStorage.removeItem(STORAGE_ACTIVE_TAB_ID);
      localStorage.removeItem(STORAGE_ACTIVE_TAB_HEARTBEAT);
      if (channel) {
        try {
          channel.postMessage({ type: 'RELEASE_PRIMARY_TAB', tabId: myTabId });
        } catch (_) {}
      }
    }
  };
  window.addEventListener('beforeunload', handleUnload);

  // Return cleanup function
  return () => {
    clearInterval(heartbeatInterval);
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener('beforeunload', handleUnload);
    if (channel) {
      try {
        channel.close();
      } catch (_) {}
    }
  };
}

/**
 * Manually takes over leadership from this tab, unblocking it and pausing any other open tab.
 */
export function takeOverActiveTab(myTabId: string): void {
  const now = Date.now();
  localStorage.setItem(STORAGE_ACTIVE_TAB_ID, myTabId);
  localStorage.setItem(STORAGE_ACTIVE_TAB_HEARTBEAT, now.toString());

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: 'CLAIM_PRIMARY_TAB', tabId: myTabId });
      setTimeout(() => channel.close(), 100);
    }
  } catch (err) {
    console.warn('Failed to broadcast takeover message', err);
  }
}
