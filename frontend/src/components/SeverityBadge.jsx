import React from 'react';

const SEVERITY_STYLES = {
  Critical: 'bg-red-50 text-red-700 border-red-200 ring-red-600/20',
  High: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-600/20',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20',
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20',
};

const SEVERITY_DOTS = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-500',
};

export default function SeverityBadge({ severity, size = 'sm' }) {
  const style = SEVERITY_STYLES[severity] || 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-600/20';
  const dot = SEVERITY_DOTS[severity] || 'bg-slate-400';
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${sizeClasses} ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {severity || 'Unknown'}
    </span>
  );
}
