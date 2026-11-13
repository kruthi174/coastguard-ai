import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, Info, AlertTriangle, CheckCircle, TrendingUp, 
  MapPin, HelpCircle, ArrowRight, Layers 
} from 'lucide-react';
import { api } from '../services/api';

export default function RiskIntelligence({ setActivePage }) {
  const [riskData, setRiskData] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        setLoading(true);
        const res = await api.getRiskZones();
        setRiskData(res);
        if (res.zones && res.zones.length > 0) {
          setSelectedZone(res.zones[0]);
        }
      } catch (err) {
        console.error('Failed to load risk zones:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRisk();
  }, []);

  const zones = riskData?.zones || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Explainable Coastal Risk Intelligence Engine
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Algorithmic multi-factor threat indices calculated across all 9 Indian coastal maritime sectors.
        </p>
      </div>

      {/* Official Disclaimer Banner (Prompt Requirement) */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-xs text-xs text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-800">Operational Disclaimer</h4>
            <p className="leading-relaxed">
              {riskData?.disclaimer || (
                "The Coastal Risk Index is an algorithmic decision-support indicator synthesized from crowdsourced hazard reports and spatial density calculations. It is NOT an official oceanographic, meteorological or tsunami forecast. Official warnings must always be corroborated with INCOIS and IMD bulletins."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 5-Factor Methodology Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Factor 1 (25%)</span>
          <h4 className="font-bold text-xs text-slate-800 mt-1">Incident Frequency</h4>
          <p className="text-[11px] text-slate-500 mt-1">Volume of distinct active hazard reports in coastal sector.</p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Factor 2 (30%)</span>
          <h4 className="font-bold text-xs text-slate-800 mt-1">Threat Severity</h4>
          <p className="text-[11px] text-slate-500 mt-1">Weighted composite of peak severity (60%) and average severity (40%).</p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Factor 3 (20%)</span>
          <h4 className="font-bold text-xs text-slate-800 mt-1">Temporal Recency</h4>
          <p className="text-[11px] text-slate-500 mt-1">Exponential decay based on hours elapsed since latest field report.</p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Factor 4 (15%)</span>
          <h4 className="font-bold text-xs text-slate-800 mt-1">Spatial Density</h4>
          <p className="text-[11px] text-slate-500 mt-1">Geographic clustering tightness (incidents per km radius).</p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Factor 5 (10%)</span>
          <h4 className="font-bold text-xs text-slate-800 mt-1">Evidence Credibility</h4>
          <p className="text-[11px] text-slate-500 mt-1">Ratio of officer-verified reports and photo attachments.</p>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State Rankings Table (Left Column) */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Coastal Sector Rankings</h3>
            <span className="text-xs text-slate-400">9 States</span>
          </div>

          <div className="space-y-2">
            {zones.map((zone, idx) => {
              const isSelected = selectedZone?.state === zone.state;
              const score = zone.risk_score;
              const colorClass = 
                score >= 80 ? 'bg-red-50 text-red-700 border-red-200' :
                score >= 55 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                score >= 30 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200';

              return (
                <div
                  key={zone.state}
                  onClick={() => setSelectedZone(zone)}
                  className={`p-3 rounded-lg border cursor-pointer transition text-xs flex items-center justify-between ${
                    isSelected
                      ? 'bg-navy-50/70 border-navy-500 ring-1 ring-navy-500/30'
                      : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-slate-400 font-bold w-4">#{idx + 1}</span>
                    <div>
                      <h4 className="font-bold text-slate-900">{zone.state}</h4>
                      <p className="text-[11px] text-slate-500">{zone.active_incidents} active reports</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold px-2 py-0.5 rounded border text-sm ${colorClass}`}>
                      {score}
                    </span>
                    <span className="text-slate-400 text-xs">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deep Explainability Inspection Panel (Right 2 Columns) */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-6 lg:col-span-2 space-y-5">
          {selectedZone ? (
            <>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{selectedZone.zone_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Coordinated coastal zone risk assessment based on {selectedZone.active_incidents} active crowdsourced reports.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-lg border font-mono text-center ${
                    selectedZone.risk_score >= 80 ? 'bg-red-50 text-red-700 border-red-300' :
                    selectedZone.risk_score >= 55 ? 'bg-orange-50 text-orange-700 border-orange-300' :
                    selectedZone.risk_score >= 30 ? 'bg-amber-50 text-amber-700 border-amber-300' :
                    'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}>
                    <span className="text-[10px] uppercase font-bold block">Risk Score</span>
                    <span className="text-xl font-bold">{selectedZone.risk_score} / 100</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    selectedZone.risk_score >= 80 ? 'bg-red-600 text-white' :
                    selectedZone.risk_score >= 55 ? 'bg-orange-500 text-white' :
                    selectedZone.risk_score >= 30 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {selectedZone.risk_level} Risk
                  </span>
                </div>
              </div>

              {/* Explainable Factor Breakdown */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Transparent Factor Scoring Breakdown
                </h4>

                {Object.entries(selectedZone.breakdown || {}).map(([key, item]) => (
                  <div key={key} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 capitalize">
                        {key.replace('_', ' ')}
                      </span>
                      <span className="font-mono font-bold text-navy-800">
                        {item.points} / {item.max} pts ({item.percentage}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-navy-700 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-600 italic mt-1">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mathematical Formulation */}
              <div className="p-4 rounded-lg bg-navy-50/50 border border-navy-100 text-xs text-navy-900 space-y-1">
                <h5 className="font-bold text-navy-950 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-navy-700" />
                  Mathematical Formulation
                </h5>
                <p className="font-mono text-[11px] text-navy-800">
                  {selectedZone.formula_explanation}
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActivePage('map')}
                  className="px-4 py-2 rounded text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-white transition flex items-center gap-1.5 shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  View Sector on Coastal Map
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a coastal sector from the left to inspect its transparent risk breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
