import React from 'react';
import { Bell, Shield, User, HelpCircle, AlertCircle, PlusCircle, Sparkles } from 'lucide-react';

const ROLES = [
  { id: 'Citizen', label: 'Citizen Portal', color: 'text-sky-700 bg-sky-50 border-sky-200' },
  { id: 'Disaster Management Officer', label: 'Officer Mode', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  { id: 'Administrator', label: 'Admin Ops', color: 'text-purple-700 bg-purple-50 border-purple-200' },
];

export default function Navbar({ 
  currentRole, 
  setCurrentRole, 
  activePage, 
  setActivePage, 
  unreadAlertCount, 
  onRunClustering,
  isClusteringLoading 
}) {
  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Title & Demo Watermark */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-slate-900 tracking-tight capitalize">
          {activePage.replace('-', ' ')}
        </h1>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-300">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          Demonstration Mode (Synthetic Data)
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick action buttons */}
        <button
          onClick={() => setActivePage('report')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-navy-800 text-white hover:bg-navy-700 transition shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Report Hazard
        </button>

        <button
          onClick={onRunClustering}
          disabled={isClusteringLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition shadow-sm disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isClusteringLoading ? 'animate-spin' : ''}`} />
          {isClusteringLoading ? 'Clustering...' : 'Run DBSCAN'}
        </button>

        {/* Notifications */}
        <button
          onClick={() => setActivePage('alerts')}
          className="relative p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          title="Alerts and Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
          )}
        </button>

        {/* Role Switcher */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <User className="w-4 h-4 text-slate-400" />
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-300 text-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy-600 cursor-pointer"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.id})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
