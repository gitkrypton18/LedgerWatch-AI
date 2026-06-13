import React from 'react';

export default function SettingsSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-700/30 bg-slate-900/50">
        {Icon && <Icon size={16} className="text-cyan-400" />}
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="px-5 py-2 space-y-1">
        {children}
      </div>
    </div>
  );
}
