import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CoastalMap from './pages/CoastalMap';
import CitizenReport from './pages/CitizenReport';
import IncidentManagement from './pages/IncidentManagement';
import ClusteringEngine from './pages/ClusteringEngine';
import RiskIntelligence from './pages/RiskIntelligence';
import VerificationPortal from './pages/VerificationPortal';
import AlertsCenter from './pages/AlertsCenter';
import AnalyticsReports from './pages/AnalyticsReports';
import AdminPortal from './pages/AdminPortal';
import { api } from './services/api';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [currentRole, setCurrentRole] = useState('Disaster Management Officer');
  const [clusters, setClusters] = useState([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [isClusteringLoading, setIsClusteringLoading] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState(null);

  // Initial load of clusters and unread alert count
  const loadInitialState = async () => {
    try {
      const [clusterRes, alertRes] = await Promise.all([
        api.getClusters(),
        api.getAlerts({ unread_only: true }),
      ]);
      setClusters(clusterRes.clusters || []);
      setUnreadAlertCount(alertRes.unread_count || 0);
    } catch (err) {
      console.warn('Initial state sync warning:', err);
    }
  };

  useEffect(() => {
    loadInitialState();
  }, []);

  // Shared DBSCAN Clustering Runner
  const handleRunClustering = async () => {
    try {
      setIsClusteringLoading(true);
      const res = await api.runClustering({ eps_km: 35.0, min_samples: 2, group_by_hazard: false });
      setClusters(res.clusters || []);
      
      // Update alerts count
      const alertRes = await api.getAlerts({ unread_only: true });
      setUnreadAlertCount(alertRes.unread_count || 0);

      setNotificationBanner({
        type: 'success',
        message: `DBSCAN Clustering Complete: Grouped ${res.metrics.clustered_count} incidents into ${res.clusters.length} geographic clusters!`,
      });
      setTimeout(() => setNotificationBanner(null), 6000);
    } catch (err) {
      setNotificationBanner({
        type: 'error',
        message: 'Clustering error: ' + err.message,
      });
    } finally {
      setIsClusteringLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Deep Navy Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        clusterCount={clusters.length}
        alertCount={unreadAlertCount}
        currentRole={currentRole}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* White Header Navbar */}
        <Navbar
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
          activePage={activePage}
          setActivePage={setActivePage}
          unreadAlertCount={unreadAlertCount}
          onRunClustering={handleRunClustering}
          isClusteringLoading={isClusteringLoading}
        />

        {/* Global Notification Banner */}
        {notificationBanner && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
            notificationBanner.type === 'success' 
              ? 'bg-teal-600 text-white border-teal-700' 
              : 'bg-rose-600 text-white border-rose-700'
          }`}>
            <span>{notificationBanner.message}</span>
            <button onClick={() => setNotificationBanner(null)} className="font-bold opacity-80 hover:opacity-100 ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Dynamic Page Viewport */}
        <main className="flex-1 overflow-y-auto p-6">
          {activePage === 'dashboard' && (
            <Dashboard 
              setActivePage={setActivePage} 
              onRunClustering={handleRunClustering}
              isClusteringLoading={isClusteringLoading}
            />
          )}

          {activePage === 'map' && (
            <CoastalMap 
              setActivePage={setActivePage} 
              onRunClustering={handleRunClustering}
              isClusteringLoading={isClusteringLoading}
            />
          )}

          {activePage === 'report' && (
            <CitizenReport setActivePage={setActivePage} />
          )}

          {activePage === 'incidents' && (
            <IncidentManagement 
              setActivePage={setActivePage} 
              currentRole={currentRole} 
            />
          )}

          {activePage === 'clustering' && (
            <ClusteringEngine 
              setActivePage={setActivePage}
              onRunClustering={handleRunClustering}
              isClusteringLoading={isClusteringLoading}
              clusters={clusters}
              setClusters={setClusters}
            />
          )}

          {activePage === 'risk' && (
            <RiskIntelligence setActivePage={setActivePage} />
          )}

          {activePage === 'verification' && (
            <VerificationPortal 
              currentRole={currentRole} 
              setActivePage={setActivePage} 
            />
          )}

          {activePage === 'alerts' && (
            <AlertsCenter 
              unreadCount={unreadAlertCount}
              setUnreadCount={setUnreadAlertCount}
              setActivePage={setActivePage}
            />
          )}

          {activePage === 'analytics' && (
            <AnalyticsReports />
          )}

          {activePage === 'admin' && (
            <AdminPortal 
              currentRole={currentRole} 
              setCurrentRole={setCurrentRole} 
            />
          )}
        </main>
      </div>
    </div>
  );
}
