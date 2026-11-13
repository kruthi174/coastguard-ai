import React from 'react';

const STATUS_STYLES = {
  Verified: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  'Under Review': 'bg-blue-50 text-blue-800 border-blue-300',
  Pending: 'bg-amber-50 text-amber-800 border-amber-300',
  Rejected: 'bg-rose-50 text-rose-800 border-rose-300',
};

export default function StatusBadge({ status, size = 'sm' }) {
  const style = STATUS_STYLES[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${style}`}>
      {status || 'Pending'}
    </span>
  );
}
