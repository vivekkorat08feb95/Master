import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './pages/DashboardView';
import { KhataView } from './pages/KhataView';
import { InventoryView } from './pages/InventoryView';
import { BillingView } from './pages/BillingView';
import { ReportsView } from './pages/ReportsView';
import { MigrationView } from './pages/MigrationView';
import { AuthView } from './pages/AuthView';
import { AdminView } from './pages/AdminView';
import { Tenant } from './types';
import { 
  getSessionTimeoutMins, 
  getTimeoutAction, 
  getPreventBackExit,
  getPreventMultiTab 
} from './utils/sessionSecurity';
import {
  initTabGuard,
  takeOverActiveTab,
  createUniqueTabId,
  TabGuardState
} from './utils/tabGuard';
import { 
  Clock, 
  ShieldAlert, 
  Lock, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  KeyRound, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Layers,
  Smartphone
} from 'lucide-react';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [activeUser, setActiveUser] = useState<any | null>(null);
  const [activeTab, setActiveTabState] = useState<string>('dashboard');
  const [showAdmin, setShowAdmin] = useState<boolean>(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Exit Guard Toast & Back-Button Protection
  const [exitToast, setExitToast] = useState<string | null>(null);
  const lastBackPressTime = useRef<number>(0);

  // Multi-Tab Guard (Single Browser Tab Lock)
  const myTabId = useRef<string>(createUniqueTabId());
  const [tabGuardState, setTabGuardState] = useState<TabGuardState>({
    isBlocked: false,
    reason: null,
    tabId: myTabId.current,
  });

  // Session Inactivity & Auto-Logout / Screen Lock State
  const [showTimeoutWarningModal, setShowTimeoutWarningModal] = useState<boolean>(false);
  const [timeoutSecondsLeft, setTimeoutSecondsLeft] = useState<number>(60);
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string>('');
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());

  // -------------------------------------------------------------
  // Route Map & Navigation Guard
  // -------------------------------------------------------------
  const getHashRoute = (): string => {
    return window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  };

  const navigateToTab = useCallback((tab: string, replace = false) => {
    const isCashier = activeUser?.role?.toLowerCase() === 'cashier' || activeUser?.role?.toLowerCase() === 'staff';
    if (isCashier && (tab === 'reports' || tab === 'migration')) {
      alert('Access restricted: Cashiers do not have permission for Reports or Migration.');
      return;
    }

    if (tab === 'admin') {
      setShowAdmin(true);
      if (replace) {
        window.history.replaceState(null, '', '#/admin');
      } else {
        window.location.hash = '#/admin';
      }
      return;
    }

    setShowAdmin(false);
    setActiveTabState(tab);

    const targetHash = `#/${tab}`;
    if (window.location.hash !== targetHash) {
      if (replace) {
        window.history.replaceState(null, '', targetHash);
      } else {
        window.location.hash = targetHash;
      }
    }
  }, [activeUser]);

  // Synchronize route on initial load and when hash changes
  useEffect(() => {
    const syncRouteFromHash = () => {
      const hash = getHashRoute();

      // If unauthenticated:
      if (!activeTenant) {
        if (hash === 'admin') {
          setShowAdmin(true);
        } else {
          setShowAdmin(false);
          if (hash !== 'login') {
            window.history.replaceState(null, '', '#/login');
          }
        }
        return;
      }

      // If authenticated:
      if (hash === 'admin') {
        setShowAdmin(true);
        return;
      }
      setShowAdmin(false);

      const validTabs = ['dashboard', 'khata', 'inventory', 'billing', 'reports', 'migration'];

      // BACK BUTTON LOGOUT PROTECTION:
      // If user presses back button all the way to '#/login' or '#/' while logged in:
      // DO NOT LOG OUT! Prevent accidental logout and keep them on dashboard.
      if (!hash || hash === 'login' || hash === '/') {
        window.history.replaceState(null, '', '#/dashboard');
        setActiveTabState('dashboard');
        return;
      }

      if (validTabs.includes(hash)) {
        const isCashier = activeUser?.role?.toLowerCase() === 'cashier' || activeUser?.role?.toLowerCase() === 'staff';
        if (isCashier && (hash === 'reports' || hash === 'migration')) {
          navigateToTab('billing', true);
          return;
        }
        setActiveTabState(hash);
      } else {
        // Unknown route -> default to dashboard
        navigateToTab('dashboard', true);
      }
    };

    window.addEventListener('hashchange', syncRouteFromHash);
    syncRouteFromHash();

    return () => {
      window.removeEventListener('hashchange', syncRouteFromHash);
    };
  }, [activeTenant, activeUser, navigateToTab]);

  // Trap popstate for browser back button exit protection
  useEffect(() => {
    if (!activeTenant) return;

    const handlePopState = () => {
      const hash = getHashRoute();
      const preventExit = getPreventBackExit();

      if (preventExit && (!hash || hash === 'dashboard' || hash === 'login')) {
        const now = Date.now();
        const diff = now - lastBackPressTime.current;

        if (diff < 2000) {
          // Double-tap back within 2 seconds: Allow natural exit
          return;
        }

        // First back press: intercept, stay on dashboard, show exit warning toast
        lastBackPressTime.current = now;
        window.history.pushState(null, '', '#/dashboard');
        setActiveTabState('dashboard');

        setExitToast('⚠️ Press Back again within 2 seconds to exit StockStoreKhata');
        setTimeout(() => setExitToast(null), 2500);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTenant]);

  // -------------------------------------------------------------
  // Initial Session Hydration & 401 Unauthorized Listener
  // -------------------------------------------------------------
  useEffect(() => {
    const savedTenant = localStorage.getItem('active_tenant');
    const savedUser = localStorage.getItem('active_user');

    if (savedTenant) {
      try {
        const tenantObj = JSON.parse(savedTenant);
        setActiveTenant(tenantObj);
        localStorage.setItem('active_tenant_id', tenantObj.id);
        localStorage.setItem('active_tenant_code', tenantObj.code);
      } catch (e) {
        console.error('Failed to parse saved tenant session', e);
      }
    }

    if (savedUser) {
      try {
        setActiveUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user session', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = (e: any) => {
      const msg = e.detail?.message || 'Session expired or unauthorized. Please sign in again.';
      handleLogout(msg);
    };

    window.addEventListener('khatabook_auth_unauthorized', handleUnauthorized as EventListener);
    return () => {
      window.removeEventListener('khatabook_auth_unauthorized', handleUnauthorized as EventListener);
    };
  }, []);

  // -------------------------------------------------------------
  // Multi-Tab Guard (Single Browser Tab Lock)
  // -------------------------------------------------------------
  useEffect(() => {
    const cleanup = initTabGuard(myTabId.current, (state) => {
      setTabGuardState(state);
    });
    return cleanup;
  }, []);

  // -------------------------------------------------------------
  // Single Active Device / Session Policy Heartbeat
  // -------------------------------------------------------------
  useEffect(() => {
    if (!activeTenant || !activeTenant.enforceSingleSession) return;

    const checkSingleSession = async () => {
      const token = localStorage.getItem('active_session_token');
      if (!token) return;

      try {
        const res = await api.validateSession(activeTenant.code, token);
        if (res.data?.enforced && !res.data?.valid) {
          handleLogout(res.data.message || '⚠️ Account logged in on another device. Session terminated.');
        }
      } catch (err: any) {
        // If 401, intercepted by apiClient
      }
    };

    const interval = setInterval(checkSingleSession, 12000);
    return () => clearInterval(interval);
  }, [activeTenant]);

  // -------------------------------------------------------------
  // Inactivity Auto-Logout & Screen Lock Tracker
  // -------------------------------------------------------------
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showTimeoutWarningModal) {
      setShowTimeoutWarningModal(false);
    }
  }, [showTimeoutWarningModal]);

  // Listen to user interactions (mouse, keyboard, touch, scroll)
  useEffect(() => {
    if (!activeTenant || isScreenLocked) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleUserActivity = () => {
      if (!showTimeoutWarningModal) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [activeTenant, isScreenLocked, showTimeoutWarningModal]);

  // Check inactivity elapsed time every 1 second
  useEffect(() => {
    if (!activeTenant || isScreenLocked) return;

    const timer = setInterval(() => {
      const timeoutMins = getSessionTimeoutMins();
      if (timeoutMins <= 0) return; // 0 = Never / Disabled

      const timeoutTotalSecs = timeoutMins * 60;
      const elapsedSecs = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remainingSecs = timeoutTotalSecs - elapsedSecs;

      if (remainingSecs <= 0) {
        // Inactivity timeout reached!
        setShowTimeoutWarningModal(false);
        const action = getTimeoutAction();
        if (action === 'LOCK') {
          setIsScreenLocked(true);
        } else {
          handleLogout('Session expired due to inactivity. Please sign in again.');
        }
      } else if (remainingSecs <= 60) {
        // Show 60-second warning countdown dialog
        setTimeoutSecondsLeft(remainingSecs);
        setShowTimeoutWarningModal(true);
      } else {
        if (showTimeoutWarningModal) {
          setShowTimeoutWarningModal(false);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTenant, isScreenLocked, showTimeoutWarningModal]);

  // Unlock Screen Handler
  const handleUnlockScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim() || !activeTenant) return;

    setIsUnlocking(true);
    setUnlockError('');
    try {
      await api.storeLogin({
        storeCodeOrEmail: activeTenant.code,
        password: unlockPassword,
      });

      // Unlock successful!
      setIsScreenLocked(false);
      setUnlockPassword('');
      lastActivityRef.current = Date.now();
    } catch (err: any) {
      console.error('Unlock failed', err);
      setUnlockError(err.response?.data || 'Incorrect password. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLoginSuccess = (tenant: Tenant, user: any, sessionToken?: string) => {
    setActiveTenant(tenant);
    setActiveUser(user);
    setSessionNotice(null);
    setIsScreenLocked(false);
    setShowTimeoutWarningModal(false);
    lastActivityRef.current = Date.now();

    localStorage.setItem('active_tenant', JSON.stringify(tenant));
    localStorage.setItem('active_user', JSON.stringify(user));
    localStorage.setItem('active_tenant_id', tenant.id);
    localStorage.setItem('active_tenant_code', tenant.code);
    if (sessionToken) {
      localStorage.setItem('active_session_token', sessionToken);
    } else if (tenant.currentSessionToken) {
      localStorage.setItem('active_session_token', tenant.currentSessionToken);
    }
    setShowAdmin(false);

    navigateToTab('dashboard', true);
  };

  const handleLogout = (notice?: string) => {
    setActiveTenant(null);
    setActiveUser(null);
    setIsScreenLocked(false);
    setShowTimeoutWarningModal(false);
    localStorage.removeItem('active_tenant');
    localStorage.removeItem('active_user');
    localStorage.removeItem('active_tenant_id');
    localStorage.removeItem('active_tenant_code');
    localStorage.removeItem('active_session_token');
    setSessionNotice(notice || null);
    window.location.hash = '#/login';
  };

  // -------------------------------------------------------------
  // Render: Admin & Auth Views
  // -------------------------------------------------------------
  if (showAdmin) {
    return (
      <AdminView
        onBack={() => {
          setShowAdmin(false);
          navigateToTab(activeTenant ? 'dashboard' : 'login', true);
        }}
        onSelectStore={(tenant) => {
          setActiveTenant(tenant);
          localStorage.setItem('active_tenant', JSON.stringify(tenant));
          localStorage.setItem('active_tenant_id', tenant.id);
          localStorage.setItem('active_tenant_code', tenant.code);
          setShowAdmin(false);
          navigateToTab('dashboard', true);
        }}
      />
    );
  }

  if (!activeTenant) {
    return (
      <AuthView 
        onLoginSuccess={handleLoginSuccess} 
        onOpenAdmin={() => navigateToTab('admin')} 
        sessionNotice={sessionNotice}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans relative">
      <Navbar
        activeTenant={activeTenant}
        activeUser={activeUser}
        activeTab={activeTab}
        onSelectTab={(tab) => navigateToTab(tab)}
        onLogout={() => handleLogout()}
        onLockScreen={() => setIsScreenLocked(true)}
        onOpenAdmin={() => navigateToTab('admin')}
        onTenantUpdated={(updatedTenant) => {
          setActiveTenant(updatedTenant);
          localStorage.setItem('active_tenant', JSON.stringify(updatedTenant));
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardView activeTenant={activeTenant} onNavigate={(tab) => navigateToTab(tab)} />
        )}
        {activeTab === 'khata' && (
          <KhataView activeTenant={activeTenant} activeUser={activeUser} />
        )}
        {activeTab === 'inventory' && (
          <InventoryView activeTenant={activeTenant} />
        )}
        {activeTab === 'billing' && (
          <BillingView activeTenant={activeTenant} activeUser={activeUser} />
        )}
        {activeTab === 'reports' && (
          <ReportsView activeTenant={activeTenant} />
        )}
        {activeTab === 'migration' && (
          <MigrationView activeTenant={activeTenant} />
        )}
      </main>

      {/* Floating Back Button Exit Prevention Toast */}
      {exitToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/95 text-amber-300 border border-amber-500/40 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom duration-150">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{exitToast}</span>
        </div>
      )}

      {/* Session Inactivity 60s Warning Modal */}
      {showTimeoutWarningModal && !isScreenLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 border border-amber-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-amber-500 text-slate-950 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-950/10 rounded-xl">
                  <Clock className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Session Inactivity Warning</h3>
                  <p className="text-xs font-medium text-slate-900/80">Counter inactivity detected</p>
                </div>
              </div>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-400 mx-auto flex items-center justify-center">
                <span className="text-3xl font-black text-amber-700 font-mono">
                  {timeoutSecondsLeft}s
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Your session will expire in {timeoutSecondsLeft} seconds
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Click below to stay logged in and keep your billing counter and customer records active.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={resetActivity}
                  className="w-full sm:w-auto flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95"
                >
                  Keep Working (Stay Logged In)
                </button>
                <button
                  type="button"
                  onClick={() => setIsScreenLocked(true)}
                  className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Lock Counter Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS Screen Lock Modal (Preserves Billing Cart & Session State) */}
      {isScreenLocked && activeTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 text-white text-center space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 mx-auto flex items-center justify-center shadow-lg text-white">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-white">{activeTenant.name}</h3>
              <p className="text-xs text-indigo-400 font-medium mt-0.5">Counter Locked • Data Intact</p>
              {activeUser?.name && (
                <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{activeUser.name} ({activeUser.role || 'Staff'})</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUnlockScreen} className="space-y-3">
              {unlockError && (
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 text-left">
                  {unlockError}
                </div>
              )}

              <div>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter password to unlock"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-center text-white placeholder-slate-500 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isUnlocking || !unlockPassword.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center space-x-2"
              >
                {isUnlocking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Unlocking...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Unlock Counter</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleLogout()}
                className="text-xs text-slate-400 hover:text-rose-400 transition"
              >
                Sign out or switch store account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Tab Conflict / Takeover Modal (Single Browser Tab Lock) */}
      {tabGuardState.isBlocked && activeTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 text-white text-center space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
              <Layers className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-white">
                {tabGuardState.reason === 'SESSION_TAKEOVER'
                  ? 'Session Shifted to Another Tab'
                  : 'Active in Another Browser Tab'}
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {tabGuardState.reason === 'SESSION_TAKEOVER'
                  ? 'Your cashier session was resumed in another browser tab. To prevent cart state collisions and duplicate invoice numbers, this tab has been paused.'
                  : 'StockStoreKhata is already active in another browser tab. Simultaneous tabs are restricted to ensure accurate billing totals, stock registers, and sequential bill numbers.'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-left text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                POS Integrity Protection
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Single-tab enforcement prevents two cashiers or two windows from printing bills with the same invoice sequence number or overriding active carts.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => takeOverActiveTab(myTabId.current)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95 flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Resume &amp; Take Over Session in This Tab</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    window.close();
                  } catch (_) {}
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Close This Tab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
