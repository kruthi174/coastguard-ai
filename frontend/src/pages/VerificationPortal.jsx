import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, Eye, CheckCircle2, XCircle, 
  Clock, MapPin, RefreshCw, Layers, ArrowRight, Image as ImageIcon 
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import HazardBadge from '../components/HazardBadge';

export default function VerificationPortal({ currentRole, setActivePage }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [nearbyData, setNearbyData] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Pending');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.getVerificationQueue(statusFilter);
      setQueue(res.queue || []);
      if (res.queue && res.queue.length > 0) {
        handleSelectIncident(res.queue[0]);
      } else {
        setSelectedIncident(null);
        setNearbyData(null);
      }
    } catch (err) {
      console.error('Failed to load verification queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const handleSelectIncident = async (inc) => {
    setSelectedIncident(inc);
    setRemarks(inc.verification_remarks || '');
    try {
      const comp = await api.compareNearby(inc.incident_id, 40);
      setNearbyData(comp);
    } catch (err) {
      console.error('Failed to compare nearby:', err);
      setNearbyData(null);
    }
  };

  const handleAction = async (targetStatus) => {
    if (!selectedIncident) return;
    try {
      setUpdating(true);
      await api.updateIncidentStatus(selectedIncident.incident_id, {
        status: targetStatus,
        verification_remarks: remarks,
        verified_by: currentRole,
      });
      // Refresh queue
      await fetchQueue();
    } catch (err) {
      alert('Verification update error: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Disaster Management Officer Verification Portal
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review incoming crowdsourced hazard observations, inspect photographs, and corroborate with adjacent coastal sensors.
          </p>
        </div>

        {/* Filter and Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
            {['Pending', 'Under Review', 'Verified', 'Rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded font-medium transition ${
                  statusFilter === st
                    ? 'bg-navy-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={fetchQueue}
            className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Queue on Left, Deep Inspection & Comparison on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inspection Queue (Left Column) */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Queue ({queue.length})
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Status: {statusFilter}</span>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No incidents currently in the '{statusFilter}' queue.
              </div>
            ) : (
              queue.map((inc) => {
                const isSelected = selectedIncident?.incident_id === inc.incident_id;
                return (
                  <div
                    key={inc.incident_id}
                    onClick={() => handleSelectIncident(inc)}
                    className={`p-3 rounded-lg border cursor-pointer transition text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-navy-50/70 border-navy-600 ring-1 ring-navy-600/30'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-navy-800 text-[11px]">{inc.incident_id}</span>
                      <SeverityBadge severity={inc.severity} size="xs" />
                    </div>

                    <h4 className="font-bold text-slate-900 truncate">{inc.location_name}</h4>

                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>{inc.state}</span>
                      <span>{inc.reported_at ? new Date(inc.reported_at).toLocaleDateString() : '—'}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2">{inc.description}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Deep Verification & Nearby Comparison Panel (Right 2 Columns) */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-5 lg:col-span-2 space-y-5">
          {selectedIncident ? (
            <>
              {/* Incident Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-navy-800 bg-navy-50 px-2 py-0.5 rounded border border-navy-200">
                      {selectedIncident.incident_id}
                    </span>
                    <h3 className="font-bold text-base text-slate-900">{selectedIncident.location_name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    State: <strong>{selectedIncident.state}</strong> | Coordinates: {selectedIncident.latitude}, {selectedIncident.longitude}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <SeverityBadge severity={selectedIncident.severity} />
                  <StatusBadge status={selectedIncident.status} />
                </div>
              </div>

              {/* Description & Metadata */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Field Description
                </span>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed">
                  {selectedIncident.description}
                </div>
              </div>

              {/* Photograph Evidence */}
              {selectedIncident.image_url ? (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Submitted Photographic Evidence
                  </span>
                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 max-h-56">
                    <img
                      src={selectedIncident.image_url}
                      alt="Field evidence"
                      className="w-full h-56 object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-xs text-center">
                  No photograph attached by reporter.
                </div>
              )}

              {/* Side-by-Side Corroborating Nearby Reports (within 40km) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Geographically Adjacent Reports (within 40 km)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {nearbyData?.nearby_count || 0} adjacent reports found
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {(nearbyData?.nearby_incidents || []).length === 0 ? (
                    <div className="col-span-2 p-3 bg-slate-50 rounded text-center text-xs text-slate-400">
                      No nearby incidents within 40 km radius.
                    </div>
                  ) : (
                    (nearbyData?.nearby_incidents || []).slice(0, 4).map((nb) => (
                      <div key={nb.incident_id} className="p-2.5 rounded border border-slate-200 bg-slate-50/50 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-navy-800">{nb.incident_id}</span>
                          <span className="text-teal-700 font-semibold">{nb.distance_km} km away</span>
                        </div>
                        <p className="font-semibold text-slate-800 truncate">{nb.location_name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{nb.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Ribbon: Verification Status & Remarks */}
              <div className="pt-4 border-t border-slate-200 space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Officer Adjudication
                </h4>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                    Inspection Remarks & Advisory Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter official remarks, field team dispatch note, or reasoning for verification..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-navy-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction('Under Review')}
                      disabled={updating}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => handleAction('Rejected')}
                      disabled={updating}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 transition flex items-center gap-1 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject (False Alarm)
                    </button>
                  </div>

                  <button
                    onClick={() => handleAction('Verified')}
                    disabled={updating}
                    className="px-4 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Verify Incident (Confirmed)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-slate-400 text-xs">
              Select an incident from the queue on the left to inspect evidence and execute verification.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
