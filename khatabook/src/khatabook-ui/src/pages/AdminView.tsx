import React, { useEffect, useState, useMemo } from 'react';
import { 
  Building2, 
  Database, 
  Server, 
  Users, 
  ArrowLeft, 
  CheckCircle2, 
  RefreshCw,
  ExternalLink,
  Wheat,
  ShoppingCart,
  Pill,
  Wrench,
  Smartphone,
  Store,
  Power,
  ShieldCheck,
  ShieldX,
  RotateCcw,
  Loader2,
  Activity,
  Monitor,
  Tablet,
  Search,
  Eye,
  EyeOff,
  X,
  Clock,
  ShieldAlert,
  FileSpreadsheet,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  User,
  AlertCircle,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';
import { Pagination } from '../components/Pagination';
import { 
  exportRetailersToExcel, 
  exportRetailersToPdf, 
  exportAuditLogsToExcel, 
  exportAuditLogsToPdf 
} from '../utils/exportUtils';

interface AdminViewProps {
  onBack: () => void;
  onSelectStore: (tenant: any) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onBack, onSelectStore }) => {
  const [activeTab, setActiveTab] = useState<'STORES' | 'AUDIT_LOGS'>('STORES');

  const [retailers, setRetailers] = useState<any[]>([]);
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingTenantId, setTogglingTenantId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Retailers Filter, Sort, Pagination
  const [retailerSearch, setRetailerSearch] = useState<string>('');
  const [retailerSortField, setRetailerSortField] = useState<'name' | 'code' | 'businessType' | 'databaseName' | 'createdAt' | 'isActive'>('createdAt');
  const [retailerSortDir, setRetailerSortDir] = useState<'asc' | 'desc'>('desc');
  const [retailerPage, setRetailerPage] = useState<number>(1);
  const [retailerPageSize, setRetailerPageSize] = useState<number>(10);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditDeviceFilter, setAuditDeviceFilter] = useState<string>('ALL');
  const [auditTenantFilter, setAuditTenantFilter] = useState<string>('');
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('ALL');
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(25);
  const [auditSortField, setAuditSortField] = useState<'timestamp' | 'durationMs' | 'statusCode' | 'endpoint' | 'tenantCode' | 'userName'>('timestamp');
  const [auditSortDir, setAuditSortDir] = useState<'asc' | 'desc'>('desc');
  const [inspectingLog, setInspectingLog] = useState<any | null>(null);

  // Super Admin Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [adminUser, setAdminUser] = useState<any | null>(() => {
    try {
      const u = localStorage.getItem('admin_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // Admin Login Portal States
  const [adminLoginUsername, setAdminLoginUsername] = useState<string>('admin');
  const [adminLoginPassword, setAdminLoginPassword] = useState<string>('admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [adminLoginLoading, setAdminLoginLoading] = useState<boolean>(false);
  const [adminLoginError, setAdminLoginError] = useState<string>('');

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminLoginUsername.trim() || !adminLoginPassword) {
      setAdminLoginError('Please enter both username and password.');
      return;
    }

    setAdminLoginLoading(true);
    setAdminLoginError('');
    try {
      const res = await api.adminLogin({
        username: adminLoginUsername.trim(),
        password: adminLoginPassword,
      });

      const { token, user } = res.data;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      setAdminToken(token);
      setAdminUser(user);
    } catch (err: any) {
      console.error('Super Admin login failed', err);
      setAdminLoginError(err.response?.data?.message || err.response?.data || 'Invalid Super Admin credentials.');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminToken(null);
    setAdminUser(null);
    setAdminLoginError('');
  };

  const fetchAdminData = async () => {
    if (!localStorage.getItem('admin_token')) return;
    setLoading(true);
    try {
      const [tenantsRes, overviewRes] = await Promise.all([
        api.getAdminTenants(),
        api.getAdminOverview()
      ]);
      setRetailers(tenantsRes.data);
      setOverview(overviewRes.data);
    } catch (err: any) {
      console.error('Failed to load admin data', err);
      if (err?.response?.status === 401) {
        handleAdminLogout();
        setAdminLoginError('Super Admin session expired. Please sign in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTenant = async (tenant: any) => {
    try {
      setTogglingTenantId(tenant.id);
      await api.toggleTenantActive(tenant.id);
      await fetchAdminData();
    } catch (err: any) {
      console.error('Failed to toggle tenant active status', err);
      alert(err?.response?.data?.message || 'Failed to update store status');
    } finally {
      setTogglingTenantId(null);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken]);

  const fetchAuditLogs = async (pageOverride?: number) => {
    if (!localStorage.getItem('admin_token')) return;
    setAuditLoading(true);
    const targetPage = pageOverride ?? auditPage;
    try {
      const res = await api.getAdminAuditLogs({
        tenantCode: auditTenantFilter || undefined,
        deviceType: auditDeviceFilter !== 'ALL' ? auditDeviceFilter : undefined,
        statusCode: auditStatusFilter !== 'ALL' ? parseInt(auditStatusFilter) : undefined,
        search: auditSearch.trim() || undefined,
        page: targetPage,
        pageSize: auditPageSize
      });
      setAuditLogs(res.data.items || []);
      setAuditTotal(res.data.total || 0);
    } catch (err: any) {
      console.error('Failed to load audit logs', err);
      if (err?.response?.status === 401) {
        handleAdminLogout();
        setAdminLoginError('Super Admin session expired. Please sign in again.');
      }
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken && activeTab === 'AUDIT_LOGS') {
      fetchAuditLogs();
    }
  }, [adminToken, activeTab, auditDeviceFilter, auditTenantFilter, auditStatusFilter, auditPage, auditPageSize]);

  const handleExportAuditLogsExcel = async () => {
    try {
      let exportItems = auditLogs;
      if (auditTotal > auditLogs.length) {
        const res = await api.getAdminAuditLogs({
          tenantCode: auditTenantFilter || undefined,
          deviceType: auditDeviceFilter !== 'ALL' ? auditDeviceFilter : undefined,
          statusCode: auditStatusFilter !== 'ALL' ? parseInt(auditStatusFilter) : undefined,
          search: auditSearch.trim() || undefined,
          page: 1,
          pageSize: 1000
        });
        exportItems = res.data.items || auditLogs;
      }
      exportAuditLogsToExcel(exportItems);
    } catch (err) {
      exportAuditLogsToExcel(auditLogs);
    }
  };

  const handleExportAuditLogsPdf = async () => {
    try {
      let exportItems = auditLogs;
      if (auditTotal > auditLogs.length) {
        const res = await api.getAdminAuditLogs({
          tenantCode: auditTenantFilter || undefined,
          deviceType: auditDeviceFilter !== 'ALL' ? auditDeviceFilter : undefined,
          statusCode: auditStatusFilter !== 'ALL' ? parseInt(auditStatusFilter) : undefined,
          search: auditSearch.trim() || undefined,
          page: 1,
          pageSize: 200
        });
        exportItems = res.data.items || auditLogs;
      }
      exportAuditLogsToPdf(exportItems);
    } catch (err) {
      exportAuditLogsToPdf(auditLogs);
    }
  };

  const getIndustryIcon = (type?: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('agro')) return <Wheat className="w-4 h-4 text-emerald-600" />;
    if (t.includes('pharma') || t.includes('med')) return <Pill className="w-4 h-4 text-cyan-600" />;
    if (t.includes('garage') || t.includes('auto')) return <Wrench className="w-4 h-4 text-amber-600" />;
    if (t.includes('elec')) return <Smartphone className="w-4 h-4 text-violet-600" />;
    return <ShoppingCart className="w-4 h-4 text-indigo-600" />;
  };

  const activeCount = retailers.filter((r) => r.isActive !== false).length;
  const suspendedCount = retailers.filter((r) => r.isActive === false).length;

  const filteredRetailers = useMemo(() => {
    return retailers.filter((r) => {
      if (statusFilter === 'ACTIVE' && r.isActive === false) return false;
      if (statusFilter === 'SUSPENDED' && r.isActive !== false) return false;
      if (retailerSearch.trim()) {
        const query = retailerSearch.toLowerCase().trim();
        const matchesName = (r.name || '').toLowerCase().includes(query);
        const matchesCode = (r.code || '').toLowerCase().includes(query);
        const matchesDb = (r.databaseName || '').toLowerCase().includes(query);
        const matchesOwner = (r.ownerName || '').toLowerCase().includes(query);
        const matchesPhone = (r.phone || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesDb && !matchesOwner && !matchesPhone) return false;
      }
      return true;
    });
  }, [retailers, statusFilter, retailerSearch]);

  const sortedRetailers = useMemo(() => {
    return [...filteredRetailers].sort((a, b) => {
      let comparison = 0;
      if (retailerSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (retailerSortField === 'code') {
        comparison = (a.code || '').localeCompare(b.code || '');
      } else if (retailerSortField === 'businessType') {
        comparison = (a.businessType || '').localeCompare(b.businessType || '');
      } else if (retailerSortField === 'databaseName') {
        comparison = (a.databaseName || '').localeCompare(b.databaseName || '');
      } else if (retailerSortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (retailerSortField === 'isActive') {
        comparison = (a.isActive !== false ? 1 : 0) - (b.isActive !== false ? 1 : 0);
      }
      return retailerSortDir === 'asc' ? comparison : -comparison;
    });
  }, [filteredRetailers, retailerSortField, retailerSortDir]);

  const paginatedRetailers = useMemo(() => {
    const start = (retailerPage - 1) * retailerPageSize;
    return sortedRetailers.slice(start, start + retailerPageSize);
  }, [sortedRetailers, retailerPage, retailerPageSize]);

  const handleRetailerSort = (field: typeof retailerSortField) => {
    if (retailerSortField === field) {
      setRetailerSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setRetailerSortField(field);
      setRetailerSortDir(field === 'name' || field === 'code' ? 'asc' : 'desc');
    }
  };

  const renderRetailerSortIcon = (field: typeof retailerSortField) => {
    if (retailerSortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60" />;
    }
    return retailerSortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-400 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-400 font-bold" />
    );
  };

  const sortedAuditLogs = useMemo(() => {
    return [...auditLogs].sort((a, b) => {
      let comparison = 0;
      if (auditSortField === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (auditSortField === 'durationMs') {
        comparison = (a.durationMs || 0) - (b.durationMs || 0);
      } else if (auditSortField === 'statusCode') {
        comparison = (a.statusCode || 0) - (b.statusCode || 0);
      } else if (auditSortField === 'endpoint') {
        comparison = (a.endpoint || '').localeCompare(b.endpoint || '');
      } else if (auditSortField === 'tenantCode') {
        comparison = (a.tenantCode || '').localeCompare(b.tenantCode || '');
      } else if (auditSortField === 'userName') {
        comparison = (a.userName || '').localeCompare(b.userName || '');
      }
      return auditSortDir === 'asc' ? comparison : -comparison;
    });
  }, [auditLogs, auditSortField, auditSortDir]);

  const handleAuditSort = (field: typeof auditSortField) => {
    if (auditSortField === field) {
      setAuditSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAuditSortField(field);
      setAuditSortDir(field === 'endpoint' || field === 'userName' ? 'asc' : 'desc');
    }
  };

  const renderAuditSortIcon = (field: typeof auditSortField) => {
    if (auditSortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60" />;
    }
    return auditSortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-400 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-400 font-bold" />
    );
  };

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full relative z-10 space-y-6">
          {/* Brand & Shield Badge */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-600 mx-auto flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30">
              <Server className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 mb-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Restricted Super Admin Console</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Super Admin Portal</h1>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Authenticate to manage multi-tenant retail databases, global platform registries, and telemetry audit logs.
              </p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
            {adminLoginError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{adminLoginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Admin Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={adminLoginUsername}
                    onChange={(e) => setAdminLoginUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminLoginPassword}
                    onChange={(e) => setAdminLoginPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo credentials hint pill */}
              <button
                type="button"
                onClick={() => {
                  setAdminLoginUsername('admin');
                  setAdminLoginPassword('admin123');
                }}
                className="w-full text-left p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-300 hover:bg-indigo-950/70 transition flex items-center justify-between"
              >
                <span>💡 Default Credentials:</span>
                <span className="font-mono font-bold bg-indigo-900/60 px-2 py-0.5 rounded text-white">admin / admin123</span>
              </button>

              <button
                type="submit"
                disabled={adminLoginLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2"
              >
                {adminLoginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Admin Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In to Admin Console</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Exit Admin Portal?</span>
              <button
                onClick={onBack}
                className="text-indigo-400 hover:text-indigo-300 font-bold transition flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Store Login</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                <Server className="w-6 h-6 text-indigo-400" />
                <span>Super Admin Platform Panel</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor all registered retailers and their physical PostgreSQL databases
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {adminUser && (
              <div className="hidden sm:flex items-center space-x-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-slate-400">Admin:</span>
                <span className="font-bold text-white">{adminUser.username || 'admin'}</span>
                <span className="bg-indigo-950 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-800">
                  SUPER_ADMIN
                </span>
              </div>
            )}

            <button
              onClick={() => activeTab === 'STORES' ? fetchAdminData() : fetchAuditLogs()}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(loading || auditLoading) ? 'animate-spin' : ''}`} />
              <span>{activeTab === 'STORES' ? 'Refresh Registry' : 'Refresh Logs'}</span>
            </button>

            <button
              onClick={handleAdminLogout}
              className="flex items-center space-x-1.5 bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/60 text-rose-300 px-3 py-2 rounded-xl text-xs font-bold transition"
              title="Log out of Super Admin Console"
            >
              <Power className="w-3.5 h-3.5 text-rose-400" />
              <span>Logout Admin</span>
            </button>

            <button
              onClick={onBack}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              Back to App
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('STORES')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'STORES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Registered Retailers ({retailers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIT_LOGS')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'AUDIT_LOGS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Full Audit Logs & Requests {auditTotal > 0 && `(${auditTotal})`}</span>
          </button>
        </div>

        {activeTab === 'STORES' ? (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400">Total Retailers</p>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {overview?.totalStores ?? retailers.length}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-emerald-900/40 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-emerald-400">Active Stores</p>
                  <h3 className="text-2xl font-black text-emerald-400 mt-1">
                    {activeCount}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-rose-900/40 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-rose-400">Suspended Stores</p>
                  <h3 className="text-2xl font-black text-rose-400 mt-1">
                    {suspendedCount}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center">
                  <ShieldX className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-400">Total Users</p>
                  <h3 className="text-2xl font-black text-indigo-300 mt-1">
                    {overview?.totalUsers ?? retailers.length}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Retailers Table */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
              <div className="p-4 border-b border-slate-700 font-bold text-sm text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span>Registered Retailers Registry (Master DB)</span>
                  <span className="text-xs text-slate-400 font-normal ml-2">Database-per-Tenant Isolated</span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Retailer Search Bar */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={retailerSearch}
                      onChange={(e) => {
                        setRetailerSearch(e.target.value);
                        setRetailerPage(1);
                      }}
                      placeholder="Search store, code, db..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => {
                        setStatusFilter('ALL');
                        setRetailerPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        statusFilter === 'ALL'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({retailers.length})
                    </button>
                    <button
                      onClick={() => {
                        setStatusFilter('ACTIVE');
                        setRetailerPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        statusFilter === 'ACTIVE'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-emerald-400'
                      }`}
                    >
                      Active ({activeCount})
                    </button>
                    <button
                      onClick={() => {
                        setStatusFilter('SUSPENDED');
                        setRetailerPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        statusFilter === 'SUSPENDED'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      Suspended ({suspendedCount})
                    </button>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => exportRetailersToExcel(sortedRetailers)}
                      className="px-2.5 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-400 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                      title="Export retailers to Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel</span>
                    </button>
                    <button
                      onClick={() => exportRetailersToPdf(sortedRetailers)}
                      className="px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/60 text-rose-400 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                      title="Export retailers to PDF (.pdf)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 uppercase font-bold text-slate-400 border-b border-slate-700 text-[11px] select-none">
                    <tr>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleRetailerSort('name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Store Code & Name</span>
                          {renderRetailerSortIcon('name')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 text-center cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleRetailerSort('isActive')}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Status</span>
                          {renderRetailerSortIcon('isActive')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleRetailerSort('businessType')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Industry Type</span>
                          {renderRetailerSortIcon('businessType')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleRetailerSort('databaseName')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Dedicated Database Name</span>
                          {renderRetailerSortIcon('databaseName')}
                        </div>
                      </th>
                      <th className="py-3 px-4">Owner & Contact</th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleRetailerSort('createdAt')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Registered Date</span>
                          {renderRetailerSortIcon('createdAt')}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {paginatedRetailers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          {retailerSearch ? 'No stores found matching search criteria.' : 'No retailers found matching filter.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRetailers.map((r) => {
                        const isStoreActive = r.isActive !== false;
                        const isToggling = togglingTenantId === r.id;
                        return (
                          <tr key={r.id} className={`hover:bg-slate-750 transition ${!isStoreActive ? 'opacity-65 bg-slate-900/30' : ''}`}>
                            <td className="py-3 px-4">
                              <div className={`font-bold text-sm ${isStoreActive ? 'text-white' : 'text-slate-400'}`}>{r.name}</div>
                              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                                code: {r.code}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isStoreActive
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                    : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                                }`}
                              >
                                {isStoreActive ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span>ACTIVE</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                    <span>SUSPENDED</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200">
                                {getIndustryIcon(r.businessType)}
                                <span>{r.businessType}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-400">
                              {r.databaseName}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-200">{r.ownerName}</div>
                              <div className="text-[11px] text-slate-400">{r.phone || r.ownerEmail || 'No phone'}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => onSelectStore(r)}
                                  className="inline-flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                  title="Switch into this tenant workspace"
                                >
                                  <span>Open Store</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleToggleTenant(r)}
                                  disabled={isToggling}
                                  className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                                    isStoreActive
                                      ? 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border-rose-800/50'
                                      : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/50'
                                  }`}
                                  title={isStoreActive ? 'Suspend store (soft-deactivate)' : 'Reactivate / restore store'}
                                >
                                  {isToggling ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : isStoreActive ? (
                                    <Power className="w-3 h-3 text-rose-400" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3 text-emerald-400" />
                                  )}
                                  <span>{isStoreActive ? 'Suspend' : 'Activate'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Retailers Pagination */}
              <div className="p-3 border-t border-slate-700 bg-slate-900/40">
                <Pagination
                  variant="dark"
                  currentPage={retailerPage}
                  totalItems={sortedRetailers.length}
                  pageSize={retailerPageSize}
                  onPageChange={setRetailerPage}
                  onPageSizeChange={(newSize) => {
                    setRetailerPageSize(newSize);
                    setRetailerPage(1);
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* AUDIT LOGS & FULL-CONTEXT REQUEST TRACING PANEL                           */
          /* ========================================================================= */
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-md flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
                  placeholder="Search endpoint, user, IP, or correlation ID..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Device Filter */}
              <div className="w-36">
                <select
                  value={auditDeviceFilter}
                  onChange={(e) => setAuditDeviceFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="ALL">📱 All Devices</option>
                  <option value="DESKTOP">💻 Desktop</option>
                  <option value="MOBILE_ANDROID">🤖 Android Phone</option>
                  <option value="MOBILE_IOS">🍏 iOS iPhone</option>
                  <option value="TABLET">📟 Tablet</option>
                </select>
              </div>

              {/* Store Filter */}
              <div className="w-36">
                <select
                  value={auditTenantFilter}
                  onChange={(e) => setAuditTenantFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="">🏬 All Stores</option>
                  {retailers.map((r) => (
                    <option key={r.id} value={r.code}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>

              {/* Status Code Filter */}
              <div className="w-32">
                <select
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="ALL">⚡ All Status</option>
                  <option value="200">🟢 200 OK</option>
                  <option value="201">🟢 201 Created</option>
                  <option value="400">🟡 400 Bad Request</option>
                  <option value="401">🔴 401 Unauthorized</option>
                  <option value="500">🔥 500 Server Error</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setAuditPage(1);
                  fetchAuditLogs(1);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>

              <div className="flex items-center space-x-1.5 ml-auto">
                <button
                  type="button"
                  onClick={handleExportAuditLogsExcel}
                  className="px-2.5 py-2 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-400 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  title="Export audit logs to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportAuditLogsPdf}
                  className="px-2.5 py-2 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/60 text-rose-400 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  title="Export audit logs to PDF (.pdf)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
              <div className="p-3.5 border-b border-slate-700 flex justify-between items-center text-xs text-slate-400">
                <span>Displaying {auditLogs.length} of {auditTotal} total request logs</span>
                <span className="font-mono text-[11px] text-emerald-400">Master DB + Serilog Rolling Sync</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 uppercase font-bold text-slate-400 border-b border-slate-700 text-[11px] select-none">
                    <tr>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleAuditSort('timestamp')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Time & Latency</span>
                          {renderAuditSortIcon('timestamp')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleAuditSort('endpoint')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Method & Endpoint</span>
                          {renderAuditSortIcon('endpoint')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 text-center cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleAuditSort('statusCode')}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Status</span>
                          {renderAuditSortIcon('statusCode')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleAuditSort('tenantCode')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Store</span>
                          {renderAuditSortIcon('tenantCode')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition"
                        onClick={() => handleAuditSort('userName')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>User</span>
                          {renderAuditSortIcon('userName')}
                        </div>
                      </th>
                      <th className="py-3 px-4">Device & Client</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {sortedAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          {auditLoading ? 'Loading audit records...' : 'No audit log events found matching criteria.'}
                        </td>
                      </tr>
                    ) : (
                      sortedAuditLogs.map((log) => {
                        const is2xx = log.statusCode >= 200 && log.statusCode < 300;
                        const is4xx = log.statusCode >= 400 && log.statusCode < 500;
                        const is5xx = log.statusCode >= 500;

                        return (
                          <tr key={log.id} className="hover:bg-slate-750 transition font-sans">
                            {/* Time & Duration */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-white font-mono text-[11px]">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ⏱️ {log.durationMs}ms
                              </span>
                            </td>

                            {/* Method & Endpoint */}
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${
                                    log.httpMethod === 'GET'
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                      : log.httpMethod === 'POST'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : log.httpMethod === 'DELETE'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}
                                >
                                  {log.httpMethod}
                                </span>
                                <span className="font-mono text-slate-200 text-xs font-semibold truncate max-w-[200px]" title={log.endpoint}>
                                  {log.endpoint}
                                </span>
                              </div>
                              {log.queryString && (
                                <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[200px]">
                                  {log.queryString}
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                                  is2xx
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                    : is4xx
                                    ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                                    : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                                }`}
                              >
                                {log.statusCode}
                              </span>
                            </td>

                            {/* Store */}
                            <td className="py-3 px-4 font-mono">
                              {log.tenantCode ? (
                                <span className="text-indigo-400 font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40 text-[11px]">
                                  {log.tenantCode}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Public / Master</span>
                              )}
                            </td>

                            {/* User */}
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-200 text-xs">{log.userName || 'Anonymous'}</div>
                              {log.userRole && (
                                <span className="text-[10px] text-slate-400 capitalize">{log.userRole}</span>
                              )}
                            </td>

                            {/* Device & Client */}
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                                {log.deviceType?.includes('IOS') || log.deviceType?.includes('ANDROID') ? (
                                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : log.deviceType === 'TABLET' ? (
                                  <Tablet className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                ) : (
                                  <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                )}
                                <span className="font-semibold text-[11px]">{log.deviceType}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {log.platformOs || 'OS'} • {log.browser || 'Browser'}
                              </div>
                            </td>

                            {/* IP */}
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {log.clientIp}
                            </td>

                            {/* Inspect Action */}
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => setInspectingLog(log)}
                                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[11px] font-semibold transition inline-flex items-center space-x-1"
                                title="Inspect payload, response and trace metadata"
                              >
                                <Eye className="w-3 h-3 text-indigo-400" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Audit Logs Pagination */}
              <div className="p-3 border-t border-slate-700 bg-slate-900/40">
                <Pagination
                  variant="dark"
                  currentPage={auditPage}
                  totalItems={auditTotal}
                  pageSize={auditPageSize}
                  onPageChange={(p) => {
                    setAuditPage(p);
                    fetchAuditLogs(p);
                  }}
                  onPageSizeChange={(newSize) => {
                    setAuditPageSize(newSize);
                    setAuditPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LOG INSPECTION MODAL (Payloads, Response & Trace)                        */}
        {/* ========================================================================= */}
        {inspectingLog && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-black font-mono ${
                      inspectingLog.httpMethod === 'POST' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'
                    }`}
                  >
                    {inspectingLog.httpMethod}
                  </span>
                  <span className="font-mono text-sm font-bold text-white">{inspectingLog.endpoint}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                      inspectingLog.statusCode < 300 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                    }`}
                  >
                    {inspectingLog.statusCode}
                  </span>
                </div>
                <button
                  onClick={() => setInspectingLog(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto text-xs">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/70 p-3.5 rounded-xl border border-slate-700 text-slate-300">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Correlation Trace ID</span>
                    <span className="font-mono text-[11px] text-indigo-300 truncate block">{inspectingLog.correlationId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Execution Latency</span>
                    <span className="font-mono text-emerald-400 font-bold">{inspectingLog.durationMs} ms</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Client Device</span>
                    <span className="font-semibold text-slate-200">{inspectingLog.deviceType} ({inspectingLog.platformOs})</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Client IP Address</span>
                    <span className="font-mono text-slate-300">{inspectingLog.clientIp}</span>
                  </div>
                </div>

                {/* Error Banner if any */}
                {inspectingLog.errorMessage && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 space-y-1">
                    <span className="font-bold flex items-center space-x-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Exception / Error Message</span>
                    </span>
                    <p className="font-mono text-xs">{inspectingLog.errorMessage}</p>
                  </div>
                )}

                {/* Request Payload */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-slate-400 font-bold">
                    <span>Request Body (Masked JSON)</span>
                    <span className="text-[10px] text-slate-500">Sensitive credentials auto-masked</span>
                  </div>
                  <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {inspectingLog.requestPayload 
                      ? (() => {
                          try { return JSON.stringify(JSON.parse(inspectingLog.requestPayload), null, 2); }
                          catch { return inspectingLog.requestPayload; }
                        })()
                      : '(Empty request body / GET parameter)'}
                  </pre>
                </div>

                {/* Response Payload */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-slate-400 font-bold">
                    <span>Response Body JSON</span>
                    <span className="text-[10px] text-slate-500">Returned to client</span>
                  </div>
                  <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {inspectingLog.responsePayload
                      ? (() => {
                          try { return JSON.stringify(JSON.parse(inspectingLog.responsePayload), null, 2); }
                          catch { return inspectingLog.responsePayload; }
                        })()
                      : '(Empty response body)'}
                  </pre>
                </div>

                {/* User Agent */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Raw User-Agent Header</span>
                  <p className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-400 truncate">
                    {inspectingLog.userAgent || 'None'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3.5 border-t border-slate-800 bg-slate-850 flex justify-end">
                <button
                  onClick={() => setInspectingLog(null)}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition"
                >
                  Close Trace
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
