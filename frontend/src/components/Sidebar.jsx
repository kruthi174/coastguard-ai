import React from 'react';
import { 
  LayoutDashboard, Map, Send, Layers, Network, 
  ShieldCheck, Bell, BarChart3, Settings, ShieldAlert, Waves
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
  { id: 'map', label: 'Coastal Intelligence Map', icon: Map, badge: 'GIS' },
  { id: 'report', label: 'Citizen Hazard Reporting', icon: Send },
  { id: 'incidents', label: 'Incident Management', icon: Layers },
  { id: 'clustering', label: 'AI Incident Clustering', icon: Network, highlight: true },
  { id: 'risk', label: 'Coastal Risk Intelligence', icon: ShieldAlert },
  { id: 'verification', label: 'Report Verification', icon: ShieldCheck, role: 'officer' },
  { id: 'alerts', label: 'Alerts & Notifications', icon: Bell },
  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { id: 'admin', label: 'Administration', icon: Settings, role: 'admin' },
];

export default function Sidebar({ activePage, setActivePage, clusterCount = 0, alertCount = 0, currentRole }) {
  return (
    <aside className="w-64 bg-navy-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 bg-navy-900/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-wider text-sm font-mono">COASTGUARD</span>
              <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded border border-teal-500/30">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-tight">SIH Maritime Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Core Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-navy-700 text-white shadow-sm border-l-2 border-teal-400 pl-2.5'
                  : 'text-slate-300 hover:bg-navy-900/80 hover:text-white'
              } ${item.highlight ? 'font-semibold' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1">
                {item.id === 'clustering' && clusterCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded">
                    {clusterCount}
                  </span>
                )}
                {item.id === 'alerts' && alertCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                    {alertCount}
                  </span>
                )}
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold bg-slate-800 text-slate-400 rounded">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Roster & Role Status */}
      <div className="p-3 border-t border-slate-800/80 bg-navy-900/40">
        <div className="bg-navy-900 rounded-lg p-2.5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Profile</p>
            <p className="text-xs font-medium text-white truncate max-w-[120px]">{currentRole}</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse" />
        </div>
      </div>
    </aside>
  );
}
