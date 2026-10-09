import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Phone, 
  Mail, 
  User, 
  Store, 
  Wheat, 
  ShoppingCart, 
  Pill, 
  Wrench, 
  Smartphone, 
  CheckCircle2, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Tenant } from '../types';
import { getDeviceIdentifier } from '../utils/sessionSecurity';

interface AuthViewProps {
  onLoginSuccess: (tenant: Tenant, user: any, sessionToken?: string) => void;
  onOpenAdmin: () => void;
  sessionNotice?: string | null;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, onOpenAdmin, sessionNotice }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Login form state
  const [loginTerm, setLoginTerm] = useState('agro1');
  const [loginPassword, setLoginPassword] = useState('123456');

  // Register form state
  const [storeName, setStoreName] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [businessType, setBusinessType] = useState('Agro');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginTerm.trim() || !loginPassword) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.storeLogin({
        storeCodeOrEmail: loginTerm.trim(),
        password: loginPassword,
        deviceInfo: getDeviceIdentifier(),
      });

      onLoginSuccess(res.data.tenant, res.data.user, res.data.sessionToken);
    } catch (err: any) {
      console.error('Login failed', err);
      setErrorMsg(err.response?.data || 'Invalid store code or credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !storeCode.trim() || !password) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.registerStore({
        storeCode: storeCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        storeName: storeName.trim(),
        businessType,
        ownerName: ownerName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        address: address.trim() || undefined,
      });

      onLoginSuccess(res.data.tenant, res.data.user);
    } catch (err: any) {
      console.error('Registration failed', err);
      setErrorMsg(err.response?.data || 'Failed to provision retailer database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 mx-auto flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-indigo-600/30">
          S
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">
          StockStore<span className="text-indigo-400">Khata</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Smart Inventory, POS Billing &amp; Khata Ledger Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-800 text-slate-100">
          {sessionNotice && (
            <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center space-x-2.5 text-xs text-amber-300 font-semibold text-left">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{sessionNotice}</span>
            </div>
          )}

          {/* Tab Selector */}
          <div className="flex bg-slate-800 p-1 rounded-2xl mb-6">
            <button
              onClick={() => {
                setIsRegister(false);
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                !isRegister
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Retailer Login
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                isRegister
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register New Business
            </button>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {!isRegister ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Store Code / Email / Phone
                </label>
                <div className="relative">
                  <Store className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. agro1, kirana1 or your email"
                    value={loginTerm}
                    onChange={(e) => setLoginTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>{loading ? 'Logging in...' : 'Sign In to My Store'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs text-slate-400">
                💡 <strong>Demo Accounts:</strong> Enter store code <code>agro1</code> or <code>kirana1</code> with password <code>123456</code>.
              </div>
            </form>
          ) : (
            /* Self-Registration Form */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Industry Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Select Retailer Industry
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Agro', label: 'Agro Store', icon: Wheat },
                    { id: 'Kirana', label: 'Kirana / Grocery', icon: ShoppingCart },
                    { id: 'Pharmacy', label: 'Medical Store', icon: Pill },
                    { id: 'Garage', label: 'Vehicle Garage', icon: Wrench },
                    { id: 'Electronics', label: 'Electronics', icon: Smartphone },
                    { id: 'General', label: 'General Shop', icon: Store },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = businessType === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setBusinessType(p.id)}
                        className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/60 text-white ring-2 ring-indigo-500/50'
                            : 'border-slate-800 hover:bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1 text-indigo-400" />
                        <div className="text-xs font-bold">{p.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Store Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. agro2"
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Unique store code</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Business / Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kisan Agro Center"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="owner@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Create Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 4 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-800/60 text-xs text-indigo-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                <span>
                  Automatic Setup: We'll create a dedicated database <strong>khatabook_tenant_{storeCode || 'code'}</strong> with industry items and units.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Creating Database & Setting Up...' : 'Register & Launch Store'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Platform Admin Footer Link */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>KhataERP Platform v1.0</span>
            <button
              onClick={onOpenAdmin}
              className="text-indigo-400 hover:text-indigo-300 underline font-medium"
            >
              Super Admin Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
