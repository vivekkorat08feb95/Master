import React, { useState } from 'react';
import { Store, Upload, X, Check, Image as ImageIcon, Shield, Clock, ShieldCheck } from 'lucide-react';
import { Tenant } from '../types';
import { api } from '../services/api';
import { 
  getSessionTimeoutMins, 
  setSessionTimeoutMins, 
  getTimeoutAction, 
  setTimeoutAction, 
  getPreventBackExit, 
  setPreventBackExit,
  getPreventMultiTab,
  setPreventMultiTab,
  TimeoutAction 
} from '../utils/sessionSecurity';

interface StoreSettingsModalProps {
  tenant: Tenant;
  isOpen: boolean;
  onClose: () => void;
  onTenantUpdated: (updatedTenant: Tenant) => void;
}

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onTenantUpdated,
}) => {
  const [logoUrl, setLogoUrl] = useState<string>(tenant.logoUrl || '');
  const [tagline, setTagline] = useState<string>(tenant.tagline || '');
  const [gstin, setGstin] = useState<string>(tenant.gstin || '');
  const [phone, setPhone] = useState<string>(tenant.phone || '');
  const [address, setAddress] = useState<string>(tenant.address || '');
  const [printHeaderNote, setPrintHeaderNote] = useState<string>(tenant.printHeaderNote || '');
  const [printFooterNote, setPrintFooterNote] = useState<string>(tenant.printFooterNote || '');
  const [upiId, setUpiId] = useState<string>(tenant.upiId || '');
  const [upiPayeeName, setUpiPayeeName] = useState<string>(tenant.upiPayeeName || '');
  const [sessionTimeoutMins, setSessionTimeoutMinsState] = useState<number>(() => getSessionTimeoutMins());
  const [timeoutAction, setTimeoutActionState] = useState<TimeoutAction>(() => getTimeoutAction());
  const [preventBackExit, setPreventBackExitState] = useState<boolean>(() => getPreventBackExit());
  const [enforceSingleSession, setEnforceSingleSession] = useState<boolean>(tenant.enforceSingleSession || false);
  const [preventMultiTab, setPreventMultiTabState] = useState<boolean>(() => getPreventMultiTab());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const res = await api.updateTenantBranding(tenant.code, {
        logoUrl: logoUrl.trim() || undefined,
        tagline: tagline.trim() || undefined,
        gstin: gstin.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        printHeaderNote: printHeaderNote.trim() || undefined,
        printFooterNote: printFooterNote.trim() || undefined,
        upiId: upiId.trim() || undefined,
        upiPayeeName: upiPayeeName.trim() || undefined,
        enforceSingleSession: enforceSingleSession,
      });

      const updated = {
        ...tenant,
        logoUrl: res.data.logoUrl,
        tagline: res.data.tagline,
        gstin: res.data.gstin,
        phone: res.data.phone,
        address: res.data.address,
        printHeaderNote: res.data.printHeaderNote,
        printFooterNote: res.data.printFooterNote,
        upiId: res.data.upiId,
        upiPayeeName: res.data.upiPayeeName,
        enforceSingleSession: res.data.enforceSingleSession,
        currentSessionToken: res.data.currentSessionToken,
        lastLoginDevice: res.data.lastLoginDevice,
        lastLoginAt: res.data.lastLoginAt,
      };

      localStorage.setItem('active_tenant', JSON.stringify(updated));
      setSessionTimeoutMins(sessionTimeoutMins);
      setTimeoutAction(timeoutAction);
      setPreventBackExit(preventBackExit);
      setPreventMultiTab(preventMultiTab);

      onTenantUpdated(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update store branding', err);
      setErrorMsg('Failed to update store branding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base text-slate-900">Shop Branding & Invoice Print Setup</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Shop Logo Preview & Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Shop Logo (Appears on Bills & Header)
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image File (JPG/PNG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="block text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Remove Logo
                  </button>
                )}
                <p className="text-[10px] text-slate-400">
                  Recommended size: 200x200 px. Saved locally in database.
                </p>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Shop Tagline / Slogan
            </label>
            <input
              type="text"
              placeholder="e.g. Quality Seeds & Pesticides Since 1995"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* GSTIN & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                GSTIN / Tax No
              </label>
              <input
                type="text"
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Shop Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Store Address (Printed on Bill Header)
            </label>
            <input
              type="text"
              placeholder="e.g. Market Yard Road, Shop No. 12, Pune"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Print Header & Footer Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Receipt Header Note
              </label>
              <input
                type="text"
                placeholder="e.g. Subject to local jurisdiction"
                value={printHeaderNote}
                onChange={(e) => setPrintHeaderNote(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Receipt Footer Note
              </label>
              <input
                type="text"
                placeholder="e.g. Goods once sold cannot be returned"
                value={printFooterNote}
                onChange={(e) => setPrintFooterNote(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* UPI & Dynamic QR Configuration */}
          <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100">
            <div className="flex items-center space-x-2 mb-2.5">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                ⚡ Dynamic UPI QR Code (Thermal Bill & POS Screen)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  UPI ID (VPA)
                </label>
                <input
                  type="text"
                  placeholder="e.g. kisanagro@okaxis or 9876543210@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Exact amount QR code auto-generates on bills
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payee Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kisan Agro Agency"
                  value={upiPayeeName}
                  onChange={(e) => setUpiPayeeName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Name shown on customer's PhonePe/GPay app
                </span>
              </div>
            </div>
          </div>

          {/* Security, Session Timeout & Navigation Guard */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                🛡️ Security, Session Timeout & Back-Button Guard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Inactivity Auto-Logout Timeout</span>
                </label>
                <select
                  value={sessionTimeoutMins}
                  onChange={(e) => setSessionTimeoutMinsState(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={15}>15 Minutes of inactivity</option>
                  <option value={30}>30 Minutes of inactivity (Recommended)</option>
                  <option value={60}>1 Hour of inactivity</option>
                  <option value={120}>2 Hours of inactivity</option>
                  <option value={0}>Never (Keep session active)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Warns 60s before auto-locking unattended screen
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Action on Inactivity Timeout
                </label>
                <select
                  value={timeoutAction}
                  onChange={(e) => setTimeoutActionState(e.target.value as TimeoutAction)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="LOCK">Lock Screen (Quick PIN/Password Unlock - Saves Cart)</option>
                  <option value="LOGOUT">Full Logout (Sign out completely)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Locking preserves active billing counter items
                </span>
              </div>
            </div>

            {/* Single Device Policy Checkbox */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={enforceSingleSession}
                  onChange={(e) => setEnforceSingleSession(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    📱 Enforce Single Active Device / Session
                    {enforceSingleSession && (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Logging in from mobile automatically logs out web desktop (and vice-versa). Eliminates concurrent unauthorized logins.
                  </span>
                  {tenant.lastLoginDevice && (
                    <span className="text-[10px] text-indigo-600 font-medium block mt-0.5">
                      Last logged in from: {tenant.lastLoginDevice}
                    </span>
                  )}
                </div>
              </label>
            </div>

            {/* Multi-Tab Prevention Checkbox */}
            <div className="pt-2">
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={preventMultiTab}
                  onChange={(e) => setPreventMultiTabState(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    📑 Prevent Concurrent Multi-Tab Usage (Single Tab Lock)
                    {preventMultiTab && (
                      <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                        Protected
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Restricts cashier billing to a single browser tab to prevent cart collisions, duplicate bill numbers, and stock discrepancies.
                  </span>
                </div>
              </label>
            </div>

            {/* Back Button Exit Protection Checkbox */}
            <div className="pt-2">
              <label className="flex items-start space-x-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={preventBackExit}
                  onChange={(e) => setPreventBackExitState(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-800 block">
                    🛡️ Prevent Accidental Logout on Browser Back Button
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Navigates between store tabs instead of kicking you out of the application
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Branding'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
