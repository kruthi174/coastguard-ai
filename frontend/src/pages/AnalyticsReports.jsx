import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend 
} from 'recharts';
import { Download, RefreshCw, BarChart2, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

const COLORS = ['#1E3A8A', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B'];

export default function AnalyticsReports() {
  const [hazardData, setHazardData] = useState([]);
  const [stateData, setStateData] = useState([]);
  const [severityData, setSeverityData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hazards, states, severities, trends, summary] = await Promise.all([
        api.getHazardDistribution(),
        api.getStateDistribution(),
        api.getSeverityDistribution(),
        api.getTrends(),
        api.getDashboardSummary(),
      ]);
      setHazardData(hazards);
      setStateData(states);
      setSeverityData(severities);
      setTrendData(trends);

      const kpis = summary.kpis || {};
      setStatusData([
        { status: 'Verified', count: kpis.verified_reports || 0 },
        { status: 'Pending', count: kpis.pending_reports || 0 },
        { status: 'Under Review', count: Math.max(0, (kpis.active_incidents || 0) - (kpis.verified_reports || 0) - (kpis.pending_reports || 0)) },
      ]);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header and Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Coastal Hazard Analytics & Operational Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical aggregation across all 50 baseline demonstration and incoming crowdsourced incidents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <a
            href={api.getExportUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded bg-navy-800 hover:bg-navy-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Download Full CSV Report
          </a>
        </div>
      </div>

      {/* Row 1: Hazard Distribution & Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hazards by Category */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Hazard Categories</h3>
            <p className="text-[11px] text-slate-400">Occurrences per threat typology</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hazardData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="hazard_category" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Bar dataKey="count" fill="#1E3A8A" radius={[4, 4, 0, 0]} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Severity Distribution</h3>
            <p className="text-[11px] text-slate-400">Criticality level breakdown</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="count"
                  nameKey="severity"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={({ severity, percent }) => `${severity} ${(percent * 100).toFixed(0)}%`}
                >
                  {severityData.map((entry, index) => {
                    const color = 
                      entry.severity === 'Critical' ? '#DC2626' :
                      entry.severity === 'High' ? '#EA580C' :
                      entry.severity === 'Medium' ? '#D97706' : '#059669';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: State-wise Density & Verification Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coastal State Breakdown */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">State Breakdown</h3>
            <p className="text-[11px] text-slate-400">Total vs Critical incidents per coastal state</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="state" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" fill="#0D9488" name="Total Incidents" radius={[4, 4, 0, 0]} />
                <Bar dataKey="critical_count" fill="#DC2626" name="Critical Incidents" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Verification Status Distribution */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Incident Verification Progress</h3>
            <p className="text-[11px] text-slate-400">Review workflow distribution</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  <Cell fill="#059669" /> {/* Verified */}
                  <Cell fill="#D97706" /> {/* Pending */}
                  <Cell fill="#2563EB" /> {/* Under Review */}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
