import React, { useEffect, useState } from 'react';
import { 
  Settings, Shield, Database, Cpu, RefreshCw, 
  CheckCircle2, AlertTriangle, FileText, Lock 
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminPortal({ currentRole, setCurrentRole }) {
  const [status, setStatus] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshingDemo, setRefreshingDemo] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [sysStatus, logs] = await Promise.all([
        api.getSystemStatus(),
        api.getAuditLogs(30),
      ]);
      setStatus(sysStatus);
      setAuditLogs(logs.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRefreshDemo = async () => {
    if (!confirm('This will refresh the 50 synthetic demonstration records while strictly preserving all user-created incidents. Proceed?')) {
      return;
    }

    try {
      setRefreshingDemo(true);
      setRefreshMessage(null);
      const res = await api.refreshDemoData();
      setRefreshMessage(res.message || 'Demo data refreshed safely.');
      fetchAdminData();
    } catch (err) {
      alert('Error refreshing demo data: ' + err.message);
    } finally {
      setRefreshingDemo(false);
    }
  };

  const db = status?.database || {};
  const ml = status?.ml_engine || {};

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          System Administration & Audit Operations
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Role-based security permissions, operational audit logs, and demonstration dataset synchronization.
        </p>
      </div>

      {refreshMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-md text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {refreshMessage}
        </div>
      )}

      {/* Row 1: System Info & Role Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Role Permissions Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-purple-600" />
            Active Role & Access Control
          </h3>
          <p className="text-xs text-slate-500">
            Switch profile to simulate authentication access levels across the platform.
          </p>

          <div className="space-y-2 pt-2">
            {[
              { id: 'Citizen', label: 'Citizen', desc: 'Can submit reports, view live map, receive public warnings.' },
              { id: 'Disaster Management Officer', label: 'Disaster Officer', desc: 'Full verification workflow, triggers DBSCAN clustering, reviews duplicates.' },
              { id: 'Administrator', label: 'Administrator', desc: 'Full system control, audit logs, system configuration, database sync.' },
            ].map((role) => (
              <div
                key={role.id}
                onClick={() => setCurrentRole(role.id)}
                className={`p-3 rounded-lg border cursor-pointer text-xs transition ${
                  currentRole === role.id
                    ? 'bg-purple-50/70 border-purple-500 ring-1 ring-purple-500/30'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{role.label}</span>
                  {currentRole === role.id && (
                    <span className="text-[10px] font-bold text-purple-700 uppercase bg-purple-100 px-1.5 py-0.5 rounded">Active</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Database Status Card */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-navy-600" />
            Database Architecture & Storage
          </h3>

          <div className="space-y-2 text-xs pt-1">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Database Location</span>
              <span className="font-mono text-[11px] text-slate-800 break-all">{db.db_file || 'coastguard.db'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 font-sans block">Total Records</span>
                <span className="font-bold text-slate-900 text-sm">{db.total_incidents || 0}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 font-sans block">User Records</span>
                <span className="font-bold text-emerald-600 text-sm">{db.user_created_incidents || 0}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 font-sans block">Demo Records</span>
                <span className="font-bold text-slate-600 text-sm">{db.demonstration_incidents || 0}</span>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 font-sans block">Audit Entries</span>
                <span className="font-bold text-slate-900 text-sm">{db.total_audit_logs || 0}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleRefreshDemo}
                disabled={refreshingDemo}
                className="w-full py-2 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingDemo ? 'animate-spin' : ''}`} />
                Safe Refresh Demo Dataset (Preserve User Records)
              </button>
            </div>
          </div>
        </div>

        {/* AI/ML Engine Specifications */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-teal-600" />
            Machine Learning Engine Specs
          </h3>

          <div className="space-y-2 text-xs pt-1">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-teal-700">Clustering Algorithm</span>
              <p className="font-semibold text-slate-900">DBSCAN (Density-Based Spatial Clustering)</p>
              <p className="text-[11px] text-slate-500">Metric: Haversine great-circle distance on spherical coordinates.</p>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-navy-700">NLP Duplicate Detection</span>
              <p className="font-semibold text-slate-900">TF-IDF Vectorizer + Cosine Similarity</p>
              <p className="text-[11px] text-slate-500">Multi-factor score with spatial radius (25km) & temporal window (72h).</p>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-amber-700">Risk Intelligence Engine</span>
              <p className="font-semibold text-slate-900">5-Factor Explainable Scoring (0–100)</p>
              <p className="text-[11px] text-slate-500">Frequency (25%), Severity (30%), Recency (20%), Density (15%), Evidence (10%).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-600" />
            System Security & Action Audit Trail
          </h3>
          <span className="text-xs text-slate-400 font-mono">Last {auditLogs.length} events</span>
        </div>

        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="py-2 px-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-2 px-3 font-sans font-semibold text-slate-700">{log.user_role}</td>
                  <td className="py-2 px-3 text-slate-600">{log.user_name || 'System'}</td>
                  <td className="py-2 px-3 font-sans font-bold text-navy-800">{log.action}</td>
                  <td className="py-2 px-3 font-sans text-slate-600 max-w-md truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
