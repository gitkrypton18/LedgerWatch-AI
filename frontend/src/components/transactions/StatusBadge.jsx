import React from 'react';

const bandConfig = {
  Low: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400' },
  Medium: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', dot: 'bg-amber-400' },
  High: { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', dot: 'bg-orange-400' },
  Critical: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', dot: 'bg-red-400' },
};

export default function StatusBadge({ band, size = 'md' }) {
  const cfg = bandConfig[band] || bandConfig.Low;
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} ${sizeClasses} font-medium tracking-wide uppercase`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${size === 'sm' ? 'w-1 h-1' : ''}`} />
      {band}
    </span>
  );
}
