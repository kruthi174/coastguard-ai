import React, { useEffect, useState } from 'react';
import { 
  Search, Filter, Download, Eye, ExternalLink, RefreshCw, 
  MapPin, CheckCircle, Clock, AlertTriangle, Shield 
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import HazardBadge from '../components/HazardBadge';
import Modal from '../components/Modal';

export default function IncidentManagement({ setActivePage, currentRole }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [hazardFilter, setHazardFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Status update form inside modal
  const [newStatus, setNewStatus] = useState('Verified');
  const [remarks, setRemarks] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await api.getIncidents({
        search,
        state: stateFilter,
        hazard_category: hazardFilter,
        severity: severityFilter,
        status: statusFilter,
        limit: 200,
      });
      setIncidents(res.incidents || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [stateFilter, hazardFilter, severityFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIncidents();
  };

  const handleOpenDetail = (inc) => {
    setSelectedIncident(inc);
    setNewStatus(inc.status === 'Pending' ? 'Verified' : inc.status);
    setRemarks(inc.verification_remarks || '');
    setModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedIncident) return;
    try {
      setUpdatingStatus(true);
      await api.updateIncidentStatus(selectedIncident.incident_id, {
        status: newStatus,
        verification_remarks: remarks,
        verified_by: currentRole,
      });
      // Refresh local view
      setSelectedIncident((prev) => ({
        ...prev,
        status: newStatus,
        verification_remarks: remarks,
        verified_by: currentRole,
      }));
      fetchIncidents();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Incident Record Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance log of all citizen and authority submitted coastal hazard incidents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIncidents}
            className="p-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <a
            href={api.getExportUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded bg-navy-800 hover:bg-navy-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by incident ID (e.g. CG-2026-0001), landmark, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-navy-600 focus:outline-none bg-slate-50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-semibold transition"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* State */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">State</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full p-1.5 text-xs border border-slate-300 rounded bg-slate-50 text-slate-700"
            >
              <option value="All">All Coastal States</option>
              {['Gujarat', 'Maharashtra', 'Goa', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Odisha', 'West Bengal'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Hazard */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Hazard Category</label>
            <select
              value={hazardFilter}
              onChange={(e) => setHazardFilter(e.target.value)}
              className="w-full p-1.5 text-xs border border-slate-300 rounded bg-slate-50 text-slate-700"
            >
              <option value="All">All Categories</option>
              <option value="Coastal flooding">Coastal flooding</option>
              <option value="High waves">High waves</option>
              <option value="Coastal erosion">Coastal erosion</option>
              <option value="Oil spills">Oil spills</option>
              <option value="Cyclones">Cyclones</option>
              <option value="Storm surges">Storm surges</option>
              <option value="Tsunami observations">Tsunami observations</option>
              <option value="Marine pollution">Marine pollution</option>
              <option value="Landslides">Landslides</option>
              <option value="Infrastructure damage">Infrastructure damage</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full p-1.5 text-xs border border-slate-300 rounded bg-slate-50 text-slate-700"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-1.5 text-xs border border-slate-300 rounded bg-slate-50 text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Displaying {incidents.length} incidents</span>
          <span className="font-mono">Central Database</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Location & State</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Cluster</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No incidents match current filters.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.incident_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-navy-800">
                      {inc.incident_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <HazardBadge category={inc.hazard_category} showIcon={false} />
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate">{inc.location_name}</div>
                      <div className="text-[11px] text-slate-400">{inc.state}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <SeverityBadge severity={inc.severity} size="xs" />
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inc.status} size="xs" />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {inc.cluster_id ? (
                        <span className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-semibold">
                          {inc.cluster_id}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {inc.is_demo_data ? (
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          Demo
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Citizen
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleOpenDetail(inc)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Detail Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Incident Investigation: ${selectedIncident?.incident_id}`}
        maxWidth="max-w-3xl"
      >
        {selectedIncident && (
          <div className="space-y-4 text-xs">
            {/* Top Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={selectedIncident.severity} />
                <StatusBadge status={selectedIncident.status} />
                <HazardBadge category={selectedIncident.hazard_category} />
              </div>
              <span className="font-mono text-slate-400">
                Reported: {new Date(selectedIncident.reported_at).toLocaleString()}
              </span>
            </div>

            {/* Description & Location */}
            <div>
              <h4 className="font-bold text-sm text-slate-900">{selectedIncident.location_name}</h4>
              <p className="text-slate-500">{selectedIncident.state} | Coordinates: {selectedIncident.latitude}, {selectedIncident.longitude}</p>
              <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                {selectedIncident.description}
              </div>
            </div>

            {/* Evidence Image */}
            {selectedIncident.image_url && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Photograph Evidence</span>
                <img
                  src={selectedIncident.image_url}
                  alt="Hazard Evidence"
                  className="w-full max-h-56 object-cover rounded-lg border border-slate-200"
                />
              </div>
            )}

            {/* Duplicate Flag Info if exists */}
            {selectedIncident.duplicate_of_id && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-amber-800 flex items-center justify-between">
                <span>
                  <strong>NLP Corroboration:</strong> Flagged as potential duplicate of report{' '}
                  <span className="font-mono font-bold">{selectedIncident.duplicate_of_id}</span> ({selectedIncident.duplicate_confidence}% confidence).
                </span>
              </div>
            )}

            {/* Verification Update Section (For Officers/Admins) */}
            <div className="pt-3 border-t border-slate-200 space-y-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal-600" />
                Authority Incident Verification Action
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Update Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Verified">Verified (Confirmed Hazard)</option>
                    <option value="Rejected">Rejected (False Alarm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">Verification Remarks</label>
                  <input
                    type="text"
                    placeholder="Enter inspection remarks or field notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus}
                  className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {updatingStatus ? 'Updating...' : 'Save Verification Status'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
