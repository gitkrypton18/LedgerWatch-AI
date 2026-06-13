import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function SelectField({ label, value, onChange, options, description }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="space-y-1.5 relative">
      <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</label>
      {description && <div className="text-xs text-slate-500">{description}</div>}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 hover:border-slate-600 transition-all"
      >
        <span>{selected?.label || 'Select...'}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden" style={{animation: 'fadeIn 0.15s ease-out'}}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-slate-800/50 transition-colors ${value === opt.value ? 'text-cyan-400 bg-cyan-500/5' : 'text-slate-300'}`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
