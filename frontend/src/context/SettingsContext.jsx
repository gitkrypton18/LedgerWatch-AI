import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const DEFAULT_SETTINGS = {
  apiUrl_clean: 'https://ledgerwatch-ai.onrender.com',
  apiKey: import.meta.env?.VITE_API_KEY || 'demo-key-123',
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
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const loaded = {};
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      const val = localStorage.getItem(`ledgerwatch_${key}`);
      if (val !== null) {
        if (val === 'true') loaded[key] = true;
        else if (val === 'false') loaded[key] = false;
        else loaded[key] = val;
      } else {
        loaded[key] = DEFAULT_SETTINGS[key];
      }
    });
    return loaded;
  });

  const [files, setFiles] = useState([]);

  // Apply visual settings to document element
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme
    root.setAttribute('data-theme', settings.theme);
    
    // Compact mode
    if (settings.compactMode) {
      root.setAttribute('data-compact-mode', 'true');
    } else {
      root.removeAttribute('data-compact-mode');
    }
    
    // High contrast
    if (settings.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }
  }, [settings.theme, settings.compactMode, settings.highContrast]);

  const updateSettings = (newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      Object.entries(newSettings).forEach(([key, val]) => {
        localStorage.setItem(`ledgerwatch_${key}`, val);
      });
      return updated;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, files, setFiles }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
