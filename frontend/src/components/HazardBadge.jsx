import React from 'react';
import { 
  Waves, AlertTriangle, ShieldAlert, Droplets, Wind, Flame, 
  HelpCircle, Mountain, Building2, Eye 
} from 'lucide-react';

const HAZARD_CONFIG = {
  'High waves': { icon: Waves, color: 'text-sky-700 bg-sky-50 border-sky-200' },
  'Coastal flooding': { icon: Droplets, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'Coastal erosion': { icon: Mountain, color: 'text-amber-800 bg-amber-50 border-amber-200' },
  'Oil spills': { icon: Flame, color: 'text-purple-800 bg-purple-50 border-purple-200' },
  'Cyclones': { icon: Wind, color: 'text-teal-800 bg-teal-50 border-teal-200' },
  'Storm surges': { icon: ShieldAlert, color: 'text-indigo-800 bg-indigo-50 border-indigo-200' },
  'Tsunami observations': { icon: AlertTriangle, color: 'text-red-800 bg-red-50 border-red-200' },
  'Marine pollution': { icon: Droplets, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  'Landslides': { icon: Mountain, color: 'text-orange-800 bg-orange-50 border-orange-200' },
  'Infrastructure damage': { icon: Building2, color: 'text-slate-800 bg-slate-50 border-slate-300' },
};

export default function HazardBadge({ category, showIcon = true }) {
  const config = HAZARD_CONFIG[category] || { icon: HelpCircle, color: 'text-slate-700 bg-slate-50 border-slate-200' };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}>
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {category}
    </span>
  );
}
