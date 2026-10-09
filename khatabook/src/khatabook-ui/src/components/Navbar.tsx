import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  Receipt, 
  BarChart3, 
  LayoutDashboard,
  LogOut,
  Lock,
  Wheat,
  Pill,
  Wrench,
  Smartphone,
  ShoppingCart,
  Settings,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Tenant } from '../types';
import { StoreSettingsModal } from './StoreSettingsModal';
import { getPendingOfflineInvoices, syncOfflineInvoicesToCloud } from '../utils/offlineStorage';
import { api } from '../services/api';

interface NavbarProps {
  activeTenant: Tenant | null;
  activeUser: any | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  onLockScreen?: () => void;
  onOpenAdmin: () => void;
  onTenantUpdated?: (updatedTenant: Tenant) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTenant,
  activeUser,
  activeTab,
  onSelectTab,
  onLogout,
  onLockScreen,
  onOpenAdmin,
  onTenantUpdated,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');

  const checkPendingQueue = async () => {
    try {
      const pending = await getPendingOfflineInvoices();
      setPendingSyncCount(pending.length);
    } catch (e) {
      console.warn('Queue check error', e);
    }
  };

  const handleSyncOffline = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback('Syncing offline bills...');
    try {
      const res = await syncOfflineInvoicesToCloud((payload) => api.createInvoice(payload));
      if (res.syncedCount > 0) {
        setSyncFeedback(`✅ Synced ${res.syncedCount} bill${res.syncedCount > 1 ? 's' : ''}!`);
        setTimeout(() => setSyncFeedback(''), 4000);
      } else {
        setSyncFeedback('All bills up to date');
        setTimeout(() => setSyncFeedback(''), 2500);
      }
      await checkPendingQueue();
    } catch (err) {
      console.error('Offline sync failed', err);
      setSyncFeedback('Sync failed');
      setTimeout(() => setSyncFeedback(''), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkPendingQueue();
    const interval = setInterval(checkPendingQueue, 8000);

    const handleOnline = () => {
      setIsOnline(true);
      handleSyncOffline();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isCashier = activeUser?.role?.toLowerCase() === 'cashier' || activeUser?.role?.toLowerCase() === 'staff';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'khata', label: 'Khata Ledger', icon: Users },
    { id: 'inventory', label: 'Stock & Items', icon: Package },
    { id: 'billing', label: 'POS Billing', icon: Receipt },
    ...(!isCashier
      ? [
          { id: 'reports', label: 'Reports', icon: BarChart3 },
          { id: 'migration', label: 'Import Old Data', icon: Database },
        ]
      : []),
  ];

  const getStoreIcon = (type?: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('agro')) return <Wheat className="w-4 h-4 text-emerald-400" />;
    if (t.includes('pharma') || t.includes('med')) return <Pill className="w-4 h-4 text-cyan-400" />;
    if (t.includes('garage') || t.includes('auto')) return <Wrench className="w-4 h-4 text-amber-400" />;
    if (t.includes('elec')) return <Smartphone className="w-4 h-4 text-violet-400" />;
    return <ShoppingCart className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <>
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Dedicated Store Badge */}
            <div className="flex items-center space-x-3 sm:space-x-5">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center font-black text-lg shadow-sm text-white">
                  S
                </div>
                <div className="hidden sm:block">
                  <span className="font-bold text-lg tracking-tight text-white">StockStore</span>
                  <span className="font-semibold text-indigo-400 text-lg">Khata</span>
                </div>
              </div>

            {/* Current Dedicated Store Badge & Logo */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-800/90 rounded-xl px-2 sm:px-2.5 py-1.5 border border-slate-700">
              {activeTenant?.logoUrl ? (
                <img
                  src={activeTenant.logoUrl}
                  alt={activeTenant.name}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-contain bg-white/10 p-0.5 border border-slate-600 shrink-0"
                />
              ) : (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                  {getStoreIcon(activeTenant?.businessType)}
                </div>
              )}

              <div className="leading-tight">
                <div className="text-xs font-bold text-white max-w-[110px] sm:max-w-[170px] truncate">
                  {activeTenant?.name || 'My Store'}
                </div>
                <div className="text-[10px] font-mono text-indigo-400 truncate max-w-[110px] sm:max-w-[170px]">
                  {activeTenant?.tagline || `code: ${activeTenant?.code || 'store'}`}
                </div>
              </div>

              {/* Edit Branding Button (Only for Owners/Admins/Managers) */}
              {!isCashier && (
                <button
                  onClick={() => setShowSettingsModal(true)}
                  title="Configure Shop Logo, UPI & Branding"
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition ml-0.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile, Offline/Online Status, Role Badge & Logout */}
          <div className="flex items-center space-x-2.5">
            {/* PWA Offline/Online Sync Badge */}
            <div className="flex items-center space-x-1.5">
              {!isOnline ? (
                <div 
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold"
                  title="Operating Offline • Bills saved locally on device"
                >
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Offline Mode</span>
                </div>
              ) : pendingSyncCount > 0 ? (
                <button
                  type="button"
                  onClick={handleSyncOffline}
                  disabled={isSyncing}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-orange-600/90 hover:bg-orange-500 text-white text-[10px] font-bold transition shadow-xs animate-pulse"
                  title="Click to sync offline bills to cloud database"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync {pendingSyncCount} {pendingSyncCount === 1 ? 'Bill' : 'Bills'}</span>
                </button>
              ) : (
                <div 
                  className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-semibold"
                  title="Live Cloud Connected"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Online</span>
                </div>
              )}

              {syncFeedback && (
                <span className="text-[10px] font-bold text-emerald-400 hidden lg:inline animate-fade-in">
                  {syncFeedback}
                </span>
              )}
            </div>

            <div className="hidden sm:flex flex-col items-end">
              {activeUser?.name && (
                <span className="text-xs text-slate-200 font-semibold leading-tight">
                  {activeUser.name}
                </span>
              )}
              {activeUser?.role && (
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-indigo-950/70 text-indigo-300 border border-indigo-700/50 rounded leading-none mt-0.5">
                  {activeUser.role}
                </span>
              )}
            </div>
            {onLockScreen && (
              <button
                type="button"
                onClick={onLockScreen}
                title="Lock POS Counter Screen (Preserves Cart & Unsaved Work)"
                className="flex items-center space-x-1 text-xs text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-950/80 px-2.5 py-1.5 rounded-lg border border-amber-900/50 transition shrink-0 active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            )}
            <button
              onClick={onLogout}
              title="Sign Out of Store"
              className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/80 px-2.5 py-1.5 rounded-lg border border-rose-900/50 transition shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Fixed Bottom Navigation Bar for Mobile (Smartphones & Small Tablets) */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-1 py-1 text-white shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const isPos = item.id === 'billing';

        if (isPos) {
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 relative -top-2 transition group"
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition active:scale-95 ${
                  isActive
                    ? 'bg-indigo-600 text-white ring-4 ring-slate-900 shadow-indigo-600/50'
                    : 'bg-indigo-700/80 text-white group-hover:bg-indigo-600 ring-4 ring-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-bold mt-0.5 ${
                  isActive ? 'text-indigo-400' : 'text-slate-400'
                }`}
              >
                POS Bill
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition ${
              isActive
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span
              className={`text-[10px] mt-0.5 leading-tight truncate max-w-[65px] ${
                isActive ? 'font-bold text-white' : 'font-medium'
              }`}
            >
              {item.id === 'dashboard'
                ? 'Home'
                : item.id === 'khata'
                ? 'Khata'
                : item.id === 'inventory'
                ? 'Stock'
                : item.id === 'reports'
                ? 'Reports'
                : item.label}
            </span>
          </button>
        );
      })}
    </nav>

      {/* Store Branding Modal */}
      {activeTenant && (
        <StoreSettingsModal
          tenant={activeTenant}
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onTenantUpdated={(t) => {
            if (onTenantUpdated) onTenantUpdated(t);
          }}
        />
      )}
    </>
  );
};
