import {
  Bell,
  CheckCircle,
  Download,
  Info,
  Key,
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Server,
  Settings,
  ShieldAlert,
  Trash2,
  Wifi,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api, { checkHealth } from '../lib/axios';

// ─── Toggle Switch ──────────────────────────────────────────
const ToggleSwitch = ({ label, checked, onChange, disabled = false, description }) => (
  <div className="flex items-center justify-between py-1">
    <div>
      <span className="text-slate-300 text-sm font-medium">{label}</span>
      {description && <p className="text-slate-500 text-xs mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-cyan-500' : 'bg-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
    </button>
  </div>
);

// ─── Input Field ────────────────────────────────────────────
const InputField = ({ icon: Icon, label, value, onChange, type = 'text', placeholder, description, showToggle }) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = showToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      <label className="text-slate-300 text-sm font-medium">{label}</label>
      {description && <p className="text-slate-500 text-xs">{description}</p>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />}
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-10 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all`}
        />
        {showToggle && (
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Select Field ───────────────────────────────────────────
const SelectField = ({ icon: Icon, label, value, onChange, options, description }) => (
  <div className="space-y-1.5">
    <label className="text-slate-300 text-sm font-medium">{label}</label>
    {description && <p className="text-slate-500 text-xs">{description}</p>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 appearance-none transition-all`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  </div>
);

// ─── Settings Section ───────────────────────────────────────
const SettingsSection = ({ icon: Icon, title, children }) => (
  <div className="glass-panel rounded-2xl p-6 border border-slate-700/30 bg-slate-800/20 backdrop-blur-sm">
    <div className="flex items-center gap-2 mb-5">
      <Icon className="w-5 h-5 text-cyan-400" />
      <h3 className="text-slate-100 font-semibold">{title}</h3>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// ─── Connection Status Badge ────────────────────────────────
const ConnectionBadge = ({ status, message }) => {
  const configs = {
    connected: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    adblocker: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    checking: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    idle: { icon: Wifi, color: 'text-slate-500', bg: 'bg-slate-800/50', border: 'border-slate-700/30' },
  };
  const config = configs[status] || configs.idle;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${config.bg} ${config.color} ${config.border}`}>
      <Icon className={`w-3.5 h-3.5 ${status === 'checking' ? 'animate-spin' : ''}`} />
      <span className="max-w-[300px] truncate">{message}</span>
    </div>
  );
};

// ─── Ad Blocker Warning ───────────────────────────────────
const AdBlockerWarning = () => (
  <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/10 mb-4">
    <div className="flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-amber-200 text-sm font-medium">Ad Blocker Detected</p>
        <p className="text-amber-200/70 text-xs">
          Your browser extension (Brave Shields, uBlock, etc.) is blocking API requests.
        </p>
        <div className="text-amber-200/60 text-xs space-y-0.5 mt-2">
          <p>• Disable shields/extensions for this site</p>
          <p>• Or use Incognito Mode (Ctrl+Shift+N)</p>
          <p>• Then refresh the page</p>
        </div>
      </div>
    </div>
  </div>
);

// ─── Danger Zone ────────────────────────────────────────────
const DangerZone = ({ onClearCache, onExport, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  return (
    <div className="rounded-2xl p-6 border border-red-500/20 bg-red-500/5">
      <div className="flex items-center gap-2 mb-5">
        <Trash2 className="w-5 h-5 text-red-400" />
        <h3 className="text-red-400 font-semibold">Danger Zone</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-3 border-b border-red-500/10">
          <div>
            <p className="text-slate-200 text-sm font-medium">Clear Local Cache</p>
            <p className="text-slate-500 text-xs">Remove cached data and preferences</p>
          </div>
          <button
            onClick={onClearCache}
            className="px-4 py-2 rounded-xl bg-slate-800/50 text-slate-300 text-sm border border-slate-700/30 hover:border-red-500/30 hover:text-red-400 transition-all"
          >
            Clear
          </button>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-red-500/10">
          <div>
            <p className="text-slate-200 text-sm font-medium">Export All Data</p>
            <p className="text-slate-500 text-xs">Download all local data as JSON</p>
          </div>
          <button
            onClick={onExport}
            className="px-4 py-2 rounded-xl bg-slate-800/50 text-slate-300 text-sm border border-slate-700/30 hover:border-cyan-500/30 hover:text-cyan-400 transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-slate-200 text-sm font-medium">Delete All Data</p>
            <p className="text-slate-500 text-xs">Permanently remove all stored data</p>
          </div>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="Type DELETE"
                className="px-3 py-2 bg-slate-800/50 border border-red-500/30 rounded-lg text-slate-200 text-sm w-28 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => {
                  if (deleteText === 'DELETE') {
                    onDelete();
                    setConfirmDelete(false);
                    setDeleteText('');
                  }
                }}
                disabled={deleteText !== 'DELETE'}
                className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteText(''); }}
                className="px-3 py-2 rounded-lg bg-slate-800/50 text-slate-500 text-sm border border-slate-700/30 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Change Password Section ────────────────────────────────
const ChangePasswordSection = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await api.post('/users/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.detail || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsSection title="Security" icon={Key}>
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <InputField
          icon={Key}
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder="Enter current password"
          showToggle
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            icon={Key}
            label="New Password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Enter new password"
            showToggle
          />
          <InputField
            icon={Key}
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm new password"
            showToggle
          />
        </div>
        
        {status && (
          <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
            status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {status.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword}
          className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Change Password'}
        </button>
      </form>
    </SettingsSection>
  );
};

// ─── Main Settings Page ─────────────────────────────────────
export default function SettingsPage() {
  const [settings, setSettings] = useState({
    apiUrl: 'https://ledgerwatch-api.onrender.com',
    apiKey: import.meta.env.VITE_API_KEY || 'demo-key-123',
    theme: 'dark',
    pageSize: '10',
    autoRefresh: false,
    refreshInterval: '30',
    soundAlerts: true,
    emailAlerts: false,
    criticalOnly: true,
    showShap: true,
    compactMode: false,
    highContrast: false,
  });

  const [saved, setSaved] = useState(false);
  const [connStatus, setConnStatus] = useState('idle');
  const [connMessage, setConnMessage] = useState('Not tested');
  const [showAdBlockerWarning, setShowAdBlockerWarning] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = {};
    Object.keys(settings).forEach(key => {
      const val = localStorage.getItem(`ledgerwatch_${key}`);
      if (val !== null) {
        if (val === 'true') stored[key] = true;
        else if (val === 'false') stored[key] = false;
        else stored[key] = val;
      }
    });
    setSettings(prev => ({ ...prev, ...stored }));
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveSettings = () => {
    Object.entries(settings).forEach(([key, value]) => {
      localStorage.setItem(`ledgerwatch_${key}`, value);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Test Connection to Backend
  const testConnection = async () => {
    setConnStatus('checking');
    setConnMessage('Testing connection...');
    setShowAdBlockerWarning(false);

    const prevUrl = localStorage.getItem('ledgerwatch_api_url');
    localStorage.setItem('ledgerwatch_api_url', settings.apiUrl);

    try {
      const result = await checkHealth();
      if (result.status === 'ok') {
        setConnStatus('connected');
        setConnMessage(`Connected — API v${result.version} | Model: ${result.model_loaded ? 'Loaded' : 'Missing'} | OCR: ${result.ocr_available ? 'Ready' : 'Unavailable'}`);
      } else {
        setConnStatus('error');
        setConnMessage('Unexpected response from server');
      }
    } catch (err) {
      if (err.isAdBlocker || err.message?.includes('ad blocker') || err.message?.includes('Brave')) {
        setConnStatus('adblocker');
        setConnMessage('Blocked by ad blocker / Brave Shields');
        setShowAdBlockerWarning(true);
      } else {
        setConnStatus('error');
        setConnMessage(err.message || 'Connection failed');
      }
    } finally {
      if (connStatus === 'error' && prevUrl) {
        localStorage.setItem('ledgerwatch_api_url', prevUrl);
      }
    }
  };

  const clearCache = () => {
    Object.keys(settings).forEach(key => {
      localStorage.removeItem(`ledgerwatch_${key}`);
    });
    window.location.reload();
  };

  const exportData = () => {
    const data = {};
    Object.keys(settings).forEach(key => {
      data[key] = localStorage.getItem(`ledgerwatch_${key}`);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ledgerwatch-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAll = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Settings size={28} className="text-cyan-400" />
            Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure API, appearance, notifications, and preferences</p>
        </div>
        <button
          onClick={saveSettings}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${saved
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'
            }`}
        >
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Ad Blocker Warning */}
      {showAdBlockerWarning && <AdBlockerWarning />}

      {/* API Configuration */}
      <SettingsSection title="API Configuration" icon={Server}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <InputField
            icon={Server}
            label="Backend API URL"
            value={settings.apiUrl}
            onChange={(v) => updateSetting('apiUrl', v)}
            placeholder="https://ledgerwatch-api.onrender.com"
            description="FastAPI backend endpoint"
          />
          <InputField
            icon={Key}
            label="API Key"
            value={settings.apiKey}
            onChange={(v) => updateSetting('apiKey', v)}
            type="password"
            placeholder="Enter API key..."
            description="Optional authentication token"
            showToggle
          />
        </div>
        <div className="flex items-center gap-3 pt-3 border-t border-slate-700/20">
          <button
            onClick={testConnection}
            disabled={connStatus === 'checking'}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/30 rounded-xl text-slate-300 text-sm hover:border-cyan-500/30 hover:text-cyan-400 transition-all disabled:opacity-50"
          >
            {connStatus === 'checking' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            Test Connection
          </button>
          <ConnectionBadge status={connStatus} message={connMessage} />
        </div>
      </SettingsSection>

      {/* Security */}
      <ChangePasswordSection />

      {/* Appearance */}
      <SettingsSection title="Appearance" icon={Palette}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <SelectField
            icon={Palette}
            label="Theme"
            value={settings.theme}
            onChange={(v) => updateSetting('theme', v)}
            options={[
              { value: 'dark', label: 'Dark (Default)' },
              { value: 'darker', label: 'Darker' },
              { value: 'midnight', label: 'Midnight Blue' },
            ]}
            description="Dashboard color scheme"
          />
          <SelectField
            icon={Server}
            label="Table Page Size"
            value={settings.pageSize}
            onChange={(v) => updateSetting('pageSize', v)}
            options={[
              { value: '10', label: '10 rows' },
              { value: '25', label: '25 rows' },
              { value: '50', label: '50 rows' },
              { value: '100', label: '100 rows' },
            ]}
            description="Rows per page in transaction tables"
          />
        </div>
        <div className="py-2 border-t border-slate-700/20 space-y-1">
          <ToggleSwitch
            label="Compact Mode"
            checked={settings.compactMode}
            onChange={(v) => updateSetting('compactMode', v)}
            description="Reduce padding and font sizes for denser layouts"
          />
          <ToggleSwitch
            label="High Contrast"
            checked={settings.highContrast}
            onChange={(v) => updateSetting('highContrast', v)}
            description="Increase contrast for better accessibility"
          />
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title="Notifications" icon={Bell}>
        <div className="py-2 space-y-1">
          <ToggleSwitch
            label="Sound Alerts"
            checked={settings.soundAlerts}
            onChange={(v) => updateSetting('soundAlerts', v)}
            description="Play sound when critical anomaly is detected"
          />
          <ToggleSwitch
            label="Email Alerts"
            checked={settings.emailAlerts}
            onChange={(v) => updateSetting('emailAlerts', v)}
            description="Send email notifications for flagged transactions"
          />
          <ToggleSwitch
            label="Critical Only"
            checked={settings.criticalOnly}
            onChange={(v) => updateSetting('criticalOnly', v)}
            description="Only notify for Critical risk band (91-100)"
          />
        </div>
      </SettingsSection>

      {/* Data & Refresh */}
      <SettingsSection title="Data & Refresh" icon={RefreshCw}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <ToggleSwitch
            label="Auto Refresh"
            checked={settings.autoRefresh}
            onChange={(v) => updateSetting('autoRefresh', v)}
            description="Automatically refresh transaction data"
          />
          <SelectField
            icon={RefreshCw}
            label="Refresh Interval"
            value={settings.refreshInterval}
            onChange={(v) => updateSetting('refreshInterval', v)}
            options={[
              { value: '10', label: '10 seconds' },
              { value: '30', label: '30 seconds' },
              { value: '60', label: '1 minute' },
              { value: '300', label: '5 minutes' },
            ]}
            description="How often to fetch new data"
          />
        </div>
        <div className="py-2 border-t border-slate-700/20">
          <ToggleSwitch
            label="Show SHAP Explanations by Default"
            checked={settings.showShap}
            onChange={(v) => updateSetting('showShap', v)}
            description="Always expand SHAP charts in transaction details"
          />
        </div>
      </SettingsSection>

      {/* About / Version */}
      <SettingsSection title="About" icon={Info}>
        <div className="py-3 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Application</span>
            <span className="text-slate-300 font-medium">LedgerWatch AI</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Version</span>
            <span className="text-slate-300 font-mono">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Frontend</span>
            <span className="text-slate-300 font-mono">React 18 + Tailwind v4</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Backend</span>
            <span className="text-slate-300 font-mono">FastAPI + Isolation Forest</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Dataset</span>
            <span className="text-slate-300 font-mono">PaySim (6.3M rows)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Model</span>
            <span className="text-slate-300 font-mono">isolation_forest_v1.0.0</span>
          </div>
          <div className="pt-2 border-t border-slate-700/20 text-xs text-slate-500">
            Built by Kalpit · Electronics Engineering Student · 2026
          </div>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <DangerZone
        onClearCache={clearCache}
        onExport={exportData}
        onDelete={deleteAll}
      />
    </div>
  );
}
