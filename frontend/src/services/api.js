/**
 * API Service Client for CoastGuard AI Backend
 */

// Base URL defaults to empty string in production (same-origin relative URLs)
// or uses VITE_API_URL if configured for separate frontend/backend deployments
const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP Error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Incidents
  getIncidents: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'All') query.append(k, v);
    });
    return request(`/api/incidents?${query.toString()}`);
  },
  getIncidentById: (id) => request(`/api/incidents/${id}`),
  createIncident: (data) => request('/api/incidents', { method: 'POST', body: JSON.stringify(data) }),
  updateIncidentStatus: (id, data) => request(`/api/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/incidents/upload-image`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload image file');
    return await res.json();
  },

  // AI Clusters
  getClusters: () => request('/api/clusters'),
  getClusterById: (id) => request(`/api/clusters/${id}`),
  runClustering: (params) => request('/api/clusters/run-dbscan', { method: 'POST', body: JSON.stringify(params) }),
  resetClusters: () => request('/api/clusters/reset', { method: 'DELETE' }),

  // Risk Intelligence
  getRiskZones: () => request('/api/risk/zones'),
  getStateRisk: (state) => request(`/api/risk/explain/${encodeURIComponent(state)}`),

  // Verification
  getVerificationQueue: (status) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/api/verification/queue${q}`);
  },
  compareNearby: (id, radiusKm = 40) => request(`/api/verification/compare/${id}?radius_km=${radiusKm}`),

  // Alerts
  getAlerts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/alerts?${q}`);
  },
  markAlertRead: (id) => request(`/api/alerts/${id}/read`, { method: 'PATCH' }),
  markAllAlertsRead: () => request('/api/alerts/mark-all-read', { method: 'POST' }),

  // Analytics
  getDashboardSummary: () => request('/api/analytics/dashboard'),
  getHazardDistribution: () => request('/api/analytics/hazard-distribution'),
  getStateDistribution: () => request('/api/analytics/state-distribution'),
  getSeverityDistribution: () => request('/api/analytics/severity-distribution'),
  getTrends: () => request('/api/analytics/trends'),
  getExportUrl: () => `${BASE_URL}/api/analytics/export-csv`,

  // Admin
  getAuditLogs: (limit = 50) => request(`/api/admin/audit-logs?limit=${limit}`),
  getSystemStatus: () => request('/api/admin/system-status'),
  refreshDemoData: () => request('/api/admin/refresh-demo-data', { method: 'POST' }),
};
