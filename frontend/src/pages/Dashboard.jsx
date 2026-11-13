import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, Layers, CheckCircle2, Clock, Network, 
  TrendingUp, MapPin, AlertTriangle, ArrowRight, RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import StatCard from '../components/StatCard';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import HazardBadge from '../components/HazardBadge';
import { api } from '../services/api';

const COLORS = ['#1E3A8A', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B'];

export default function Dashboard({ setActivePage, onRunClustering, isClusteringLoading }) {
  const [data, setData] = useState(null);
  const [hazardDist, setHazardDist] = useState([]);
  const [stateDist, setStateDist] = useState([]);
  const [trends, setTrends] = useState([]);
  const [riskZones, setRiskZones] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summary, hazards, states, trendData, zones] = await Promise.all([
        api.getDashboardSummary(),
        api.getHazardDistribution(),
        api.getStateDistribution(),
        api.getTrends(),
        api.getRiskZones()
      ]);
      setData(summary);
      setHazardDist(hazards);
      setStateDist(states);
      setTrends(trendData);
      setRiskZones(zones.zones || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-navy-900 text-white rounded-lg p-4 shadow-sm border border-navy-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-wide uppercase text-teal-400 font-mono">
              National Coastal Hazard Intelligence Command Center
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Real-time crowdsourced surveillance covering 7,516 km of Indian coastline across 9 maritime states. 
            Automated DBSCAN spatio-temporal clustering and explainable coastal risk scoring operational.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadDashboardData}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button
            onClick={() => setActivePage('map')}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 transition shadow"
          >
            <MapPin className="w-3.5 h-3.5" />
            Live Map
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Incidents"
          value={kpis.total_incidents ?? '—'}
          subtitle={`${kpis.demo_incidents || 0} demonstration records`}
          icon={Layers}
          color="blue"
        />
        <StatCard
          title="Active Hazards"
          value={kpis.active_incidents ?? '—'}
          subtitle="Non-rejected reports"
          icon={TrendingUp}
          color="teal"
        />
        <StatCard
          title="Critical Incidents"
          value={kpis.critical_incidents ?? '—'}
          subtitle="Immediate action req."
          icon={ShieldAlert}
          color="red"
        />
        <StatCard
          title="Verified Reports"
          value={kpis.verified_reports ?? '—'}
          subtitle="Confirmed by officers"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Pending Review"
          value={kpis.pending_reports ?? '—'}
          subtitle="Awaiting field verification"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Active Clusters"
          value={kpis.active_clusters ?? '—'}
          subtitle="Identified by DBSCAN"
          icon={Network}
          color="purple"
        />
      </div>

      {/* Row 2: Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Trends Chart */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Incident Volume Trends</h3>
              <p className="text-[11px] text-slate-400">Crowdsourced reporting frequency over observation window</p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Last 14 Days
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSevere" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="report_date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Area type="monotone" dataKey="total" stroke="#1E3A8A" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total Reports" />
                <Area type="monotone" dataKey="severe_count" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSevere)" name="Severe Incidents" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hazard Category Distribution */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Hazards by Category</h3>
              <p className="text-[11px] text-slate-400">Classification of coastal threats</p>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hazardDist}
                  dataKey="count"
                  nameKey="hazard_category"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {hazardDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2 max-h-24 overflow-y-auto">
            {hazardDist.slice(0, 5).map((h, i) => (
              <div key={h.hazard_category} className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {h.hazard_category}
                </span>
                <span className="font-semibold">{h.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: State Distribution & Recent Incident Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coastal State Breakdown Chart */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Incidents by Coastal State</h3>
              <p className="text-[11px] text-slate-400">Density across all 9 maritime states</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateDist} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="state" type="category" tick={{ fontSize: 10 }} width={75} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Bar dataKey="count" fill="#0D9488" radius={[0, 4, 4, 0]} name="Total Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Incident Feed Table */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Incident Activity</h3>
                <p className="text-[11px] text-slate-400">Incoming crowdsourced reports</p>
              </div>
              <button
                onClick={() => setActivePage('incidents')}
                className="text-xs text-navy-600 hover:text-navy-800 font-semibold flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5">ID</th>
                    <th className="py-2 px-2.5">Hazard</th>
                    <th className="py-2 px-2.5">Location</th>
                    <th className="py-2 px-2.5">Severity</th>
                    <th className="py-2 px-2.5">Status</th>
                    <th className="py-2 px-2.5 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.recent_activity || []).map((inc) => (
                    <tr key={inc.incident_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2.5 font-mono font-semibold text-navy-700">
                        {inc.incident_id}
                      </td>
                      <td className="py-2 px-2.5">
                        <HazardBadge category={inc.hazard_category} showIcon={false} />
                      </td>
                      <td className="py-2 px-2.5 max-w-[180px] truncate text-slate-700 font-medium">
                        {inc.location_name}
                      </td>
                      <td className="py-2 px-2.5">
                        <SeverityBadge severity={inc.severity} size="xs" />
                      </td>
                      <td className="py-2 px-2.5">
                        <StatusBadge status={inc.status} size="xs" />
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-400 text-[11px]">
                        {inc.reported_at ? new Date(inc.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Synchronized with central database</span>
            <span className="font-mono">Demo Dataset Active</span>
          </div>
        </div>
      </div>

      {/* Row 4: Coastal Risk Zone Ranking Summary */}
      <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Coastal Sector Risk Indices (0–100)</h3>
            <p className="text-[11px] text-slate-400">Algorithmic risk scores derived from frequency, severity, recency, and clustering</p>
          </div>
          <button
            onClick={() => setActivePage('risk')}
            className="text-xs text-navy-600 hover:text-navy-800 font-semibold flex items-center gap-1"
          >
            Explore Risk Methodology
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-3">
          {riskZones.map((zone) => {
            const score = zone.risk_score;
            const badgeColor = 
              score >= 80 ? 'bg-red-50 text-red-700 border-red-200 ring-red-500/20' :
              score >= 55 ? 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20' :
              score >= 30 ? 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20' :
              'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';

            return (
              <div 
                key={zone.state}
                onClick={() => setActivePage('risk')}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition text-center"
              >
                <p className="text-xs font-semibold text-slate-800 truncate">{zone.state}</p>
                <div className="my-1.5 flex justify-center">
                  <span className={`text-xl font-bold font-mono px-2 py-0.5 rounded border ${badgeColor}`}>
                    {score}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">{zone.active_incidents} reports</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
