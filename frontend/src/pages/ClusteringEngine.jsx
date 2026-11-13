import React, { useEffect, useState } from 'react';
import { 
  Network, Sparkles, Sliders, ShieldAlert, CheckCircle2, 
  MapPin, AlertCircle, RefreshCw, Layers, ArrowRight, Trash2, Info 
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import HazardBadge from '../components/HazardBadge';

export default function ClusteringEngine({ setActivePage, onRunClustering, isClusteringLoading, clusters, setClusters }) {
  const [params, setParams] = useState({
    eps_km: 35.0,
    min_samples: 2,
    group_by_hazard: false,
  });

  const [metrics, setMetrics] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchClusters = async () => {
    try {
      setLoading(true);
      const res = await api.getClusters();
      setClusters(res.clusters || []);
      if (res.clusters && res.clusters.length > 0 && !selectedCluster) {
        setSelectedCluster(res.clusters[0]);
      }
    } catch (err) {
      console.error('Failed to load clusters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  const handleExecuteDBSCAN = async () => {
    try {
      setLoading(true);
      const res = await api.runClustering(params);
      setClusters(res.clusters || []);
      setMetrics(res.metrics);
      if (res.clusters && res.clusters.length > 0) {
        setSelectedCluster(res.clusters[0]);
      }
    } catch (err) {
      alert('Clustering execution error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetClusters = async () => {
    if (!confirm('Are you sure you want to reset all active clusters back to unclustered state?')) return;
    try {
      setResetting(true);
      await api.resetClusters();
      setClusters([]);
      setSelectedCluster(null);
      setMetrics(null);
    } catch (err) {
      alert('Failed to reset: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const totalClusteredIncidents = clusters.reduce((acc, c) => acc + (c.incident_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              AI Incident Clustering Engine (DBSCAN + Haversine)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
              Scikit-Learn Architecture
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Groups crowdsourced coastal reports based on spherical geographic coordinates, severity weighting, and density reachability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetClusters}
            disabled={resetting || clusters.length === 0}
            className="px-3 py-2 rounded text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-rose-600 transition flex items-center gap-1.5 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Clusters
          </button>
          <button
            onClick={handleExecuteDBSCAN}
            disabled={loading || isClusteringLoading}
            className="px-4 py-2 rounded-md text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${loading || isClusteringLoading ? 'animate-spin' : ''}`} />
            {loading || isClusteringLoading ? 'Computing DBSCAN Clusters...' : 'RUN AI CLUSTERING'}
          </button>
        </div>
      </div>

      {/* Control Panel & DBSCAN Parameters */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-4">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-teal-600" />
          DBSCAN Hyperparameters Configuration
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Epsilon (eps_km) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-700">Neighborhood Radius (Epsilon)</span>
              <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {params.eps_km} km
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={params.eps_km}
              onChange={(e) => setParams({ ...params, eps_km: parseFloat(e.target.value) })}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Maximum spherical distance (Haversine metric) between incidents to be considered co-located.
            </p>
          </div>

          {/* Min Samples */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-700">Min Samples (Core Density)</span>
              <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {params.min_samples} incidents
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="6"
              step="1"
              value={params.min_samples}
              onChange={(e) => setParams({ ...params, min_samples: parseInt(e.target.value) })}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum number of incidents within epsilon radius to form a legitimate hazard cluster.
            </p>
          </div>

          {/* Hazard restriction toggle */}
          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={params.group_by_hazard}
                onChange={(e) => setParams({ ...params, group_by_hazard: e.target.checked })}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              Restrict Clusters to Identical Hazard Category
            </label>
            <p className="text-[11px] text-slate-400 mt-1">
              If checked, incidents of different hazard categories in the same coastal bay will not be merged.
            </p>
          </div>
        </div>
      </div>

      {/* Cluster Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Identified Clusters</span>
          <p className="text-2xl font-bold font-mono text-teal-700 mt-1">{clusters.length}</p>
          <span className="text-[11px] text-slate-500">Spatial groups formed</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clustered Incidents</span>
          <p className="text-2xl font-bold font-mono text-navy-800 mt-1">{totalClusteredIncidents}</p>
          <span className="text-[11px] text-slate-500">Corroborated reports</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Noise (Isolated Points)</span>
          <p className="text-2xl font-bold font-mono text-slate-600 mt-1">
            {metrics ? metrics.noise_count : '—'}
          </p>
          <span className="text-[11px] text-slate-500">Below density threshold</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Distance Metric</span>
          <p className="text-base font-bold font-mono text-slate-800 mt-1">Haversine Great Circle</p>
          <span className="text-[11px] text-slate-500">Earth radius 6,371.0 km</span>
        </div>
      </div>

      {/* Cluster Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cluster List (Left Column) */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Identified Cluster Roster</h3>
            <span className="text-xs text-slate-400 font-mono">{clusters.length} active</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {clusters.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No clusters computed yet. Click "RUN AI CLUSTERING" to group active coastal incidents.
              </div>
            ) : (
              clusters.map((cl) => {
                const isSelected = selectedCluster?.cluster_id === cl.cluster_id;
                return (
                  <div
                    key={cl.cluster_id}
                    onClick={() => setSelectedCluster(cl)}
                    className={`p-3 rounded-lg border cursor-pointer transition text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-teal-50/60 border-teal-500 ring-1 ring-teal-500/30'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-teal-800 text-[11px] bg-teal-100/60 px-1.5 py-0.5 rounded">
                        {cl.cluster_id}
                      </span>
                      <SeverityBadge severity={cl.severity_level} size="xs" />
                    </div>

                    <h4 className="font-bold text-slate-900 truncate">{cl.name}</h4>

                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>{cl.state}</span>
                      <span>{cl.incident_count} reports ({cl.radius_km} km)</span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">Cluster Risk: {cl.risk_score}/100</span>
                      <span className="text-teal-700 font-medium">Inspect →</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Cluster Deep Inspection Panel (Right 2 Columns) */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-5 lg:col-span-2 space-y-4">
          {selectedCluster ? (
            <>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-xs">
                      {selectedCluster.cluster_id}
                    </span>
                    <h3 className="font-bold text-base text-slate-900">{selectedCluster.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    State: <strong className="text-slate-700">{selectedCluster.state}</strong> | Primary Threat: <strong className="text-slate-700">{selectedCluster.hazard_category}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivePage('map')}
                    className="px-3 py-1.5 rounded bg-navy-800 hover:bg-navy-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Locate on Coastal Map
                  </button>
                </div>
              </div>

              {/* Cluster Core Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Centroid Coordinates</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedCluster.centroid_latitude}, {selectedCluster.centroid_longitude}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Bounding Radius</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedCluster.radius_km} km</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Corroborated Incidents</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedCluster.incident_count} reports</span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Aggregate Severity</span>
                  <span className="font-semibold text-teal-700">{selectedCluster.severity_level}</span>
                </div>
              </div>

              {/* Constituent Incidents Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Constituent Corroborated Incidents in Cluster
                </h4>
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2 px-3">ID</th>
                        <th className="py-2 px-3">Hazard</th>
                        <th className="py-2 px-3">Location Landmark</th>
                        <th className="py-2 px-3">Severity</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedCluster.incidents || []).map((inc) => (
                        <tr key={inc.incident_id} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-mono font-bold text-navy-800">{inc.incident_id}</td>
                          <td className="py-2 px-3">{inc.hazard_category}</td>
                          <td className="py-2 px-3 text-slate-700">{inc.location_name}</td>
                          <td className="py-2 px-3"><SeverityBadge severity={inc.severity} size="xs" /></td>
                          <td className="py-2 px-3">{inc.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Methodological Context Note */}
              <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Explainable Clustering Logic:</strong> DBSCAN evaluates geographic coordinates converted to radians using Haversine great-circle distances. Isolated incidents that do not satisfy minimum spatial density remain as noise points without false cluster inflation.
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a cluster from the list to view its constituent incidents and spatial geometry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
