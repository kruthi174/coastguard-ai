import React, { useEffect, useState } from 'react';
import { 
  Bell, CheckCheck, ShieldAlert, Sparkles, AlertTriangle, 
  RefreshCw, MapPin, CheckCircle, Info 
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

export default function AlertsCenter({ unreadCount, setUnreadCount, setActivePage }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts({ unread_only: unreadOnly });
      setAlerts(res.alerts || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [unreadOnly]);

  const handleMarkRead = async (alertId) => {
    try {
      await api.markAlertRead(alertId);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Coastal Operational Alerts & Notifications
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System dispatch alerts triggered on critical waves, cluster identification, and verification actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded text-navy-600 focus:ring-navy-500 w-3.5 h-3.5"
            />
            Unread Only
          </label>

          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 shadow-xs disabled:opacity-40"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All Read
          </button>

          <button
            onClick={fetchAlerts}
            className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-2.5">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-12 text-center text-xs text-slate-400">
            No active alerts matching criteria.
          </div>
        ) : (
          alerts.map((al) => {
            const isRead = al.is_read;
            const alertBg = !isRead ? 'bg-white border-l-4 border-l-navy-700 shadow-sm' : 'bg-slate-50/60 opacity-80';

            return (
              <div
                key={al.id}
                className={`p-4 rounded-lg border border-slate-200 transition ${alertBg} flex items-start justify-between gap-4`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {al.alert_type}
                    </span>
                    <SeverityBadge severity={al.severity} size="xs" />
                    {al.state && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        State: {al.state}
                      </span>
                    )}
                    {al.incident_id && (
                      <span className="text-[10px] font-mono text-navy-700 font-bold bg-navy-50 px-1.5 py-0.5 rounded">
                        {al.incident_id}
                      </span>
                    )}
                    {al.cluster_id && (
                      <span className="text-[10px] font-mono text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded">
                        {al.cluster_id}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{al.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{al.message}</p>

                  <span className="text-[10px] text-slate-400 block pt-1 font-mono">
                    {new Date(al.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {!isRead && (
                    <button
                      onClick={() => handleMarkRead(al.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
