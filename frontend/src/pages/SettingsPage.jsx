import React, { useState } from 'react';
import { Settings, Server, Palette, Bell, Shield, User, Save, CheckCircle } from 'lucide-react';
import ToggleSwitch from '../components/settings/ToggleSwitch';
import InputField from '../components/settings/InputField';
import SelectField from '../components/settings/SelectField';
import SettingsSection from '../components/settings/SettingsSection';
import DangerZone from '../components/settings/DangerZone';

const themeOptions = [
  { value: 'dark', label: 'Dark (Default)' },
  { value: 'darker', label: 'Darker' },
  { value: 'midnight', label: 'Midnight Blue' },
];

const pageSizeOptions = [
  { value: '10', label: '10 rows' },
  { value: '25', label: '25 rows' },
  { value: '50', label: '50 rows' },
  { value: '100', label: '100 rows' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    apiUrl: 'http://localhost:8000',
    apiKey: '',
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

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('ledgerwatch_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl" style={{animation: 'fadeInUp 0.5s ease-out'}}>
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
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${saved ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'}`}
        >
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* API Configuration */}
      <SettingsSection title="API Configuration" icon={Server}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <InputField
            label="Backend API URL"
            value={settings.apiUrl}
            onChange={(v) => updateSetting('apiUrl', v)}
            placeholder="http://localhost:8000"
            description="FastAPI backend endpoint"
            icon={Server}
          />
          <InputField
            label="API Key"
            value={settings.apiKey}
            onChange={(v) => updateSetting('apiKey', v)}
            type="password"
            placeholder="Enter API key..."
            description="Optional authentication token"
          />
        </div>
        <div className="py-2 border-t border-slate-700/20">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Backend status: <span className="text-emerald-400 font-medium">Connected</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection title="Appearance" icon={Palette}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <SelectField
            label="Theme"
            value={settings.theme}
            onChange={(v) => updateSetting('theme', v)}
            options={themeOptions}
            description="Dashboard color scheme"
          />
          <SelectField
            label="Table Page Size"
            value={settings.pageSize}
            onChange={(v) => updateSetting('pageSize', v)}
            options={pageSizeOptions}
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
      <SettingsSection title="Data & Refresh" icon={Shield}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <ToggleSwitch
            label="Auto Refresh"
            checked={settings.autoRefresh}
            onChange={(v) => updateSetting('autoRefresh', v)}
            description="Automatically refresh transaction data"
          />
          <SelectField
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
      <SettingsSection title="About" icon={User}>
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
      <DangerZone />
    </div>
  );
}
