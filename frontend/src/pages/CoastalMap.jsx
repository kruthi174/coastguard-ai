import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Filter, Layers, MapPin, Eye, ShieldAlert, Sparkles, 
  RotateCcw, AlertTriangle, ExternalLink, Info 
} from 'lucide-react';
import { api } from '../services/api';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import HazardBadge from '../components/HazardBadge';

const STATE_CENTERS = {
  All: { lat: 18.5, lon: 78.5, zoom: 5 },
  Gujarat: { lat: 21.8, lon: 70.2, zoom: 7 },
  Maharashtra: { lat: 18.8, lon: 73.0, zoom: 7 },
  Goa: { lat: 15.4, lon: 73.9, zoom: 10 },
  Karnataka: { lat: 13.5, lon: 74.8, zoom: 8 },
  Kerala: { lat: 10.1, lon: 76.2, zoom: 8 },
  'Tamil Nadu': { lat: 11.2, lon: 79.5, zoom: 7 },
  'Andhra Pradesh': { lat: 16.5, lon: 82.0, zoom: 7 },
  Odisha: { lat: 20.0, lon: 86.0, zoom: 8 },
  'West Bengal': { lat: 21.8, lon: 87.8, zoom: 8 },
};

const SEVERITY_COLORS = {
  Critical: '#DC2626',
  High: '#EA580C',
  Medium: '#D97706',
  Low: '#059669',
};

export default function CoastalMap({ setActivePage, onRunClustering, isClusteringLoading }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const clustersLayerRef = useRef(null);

  const [incidents, setIncidents] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedState, setSelectedState] = useState('All');
  const [selectedHazard, setSelectedHazard] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [showClusters, setShowClusters] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [18.5, 78.5],
      zoom: 5,
      zoomControl: true,
      minZoom: 4,
      maxZoom: 17,
    });

    // Basemap: CartoDB Positron / OSM
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    clustersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [incRes, clusterRes] = await Promise.all([
        api.getIncidents({ limit: 300 }),
        api.getClusters()
      ]);
      setIncidents(incRes.incidents || []);
      setClusters(clusterRes.clusters || []);
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update Map Markers and Cluster Layers when data or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !clustersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    clustersLayerRef.current.clearLayers();

    // Filter incidents
    const filteredIncidents = incidents.filter((inc) => {
      if (selectedState !== 'All' && inc.state !== selectedState) return false;
      if (selectedHazard !== 'All' && inc.hazard_category !== selectedHazard) return false;
      if (selectedSeverity !== 'All' && inc.severity !== selectedSeverity) return false;
      return true;
    });

    // 1. Draw Clusters (if toggled on)
    if (showClusters) {
      clusters.forEach((cl) => {
        if (selectedState !== 'All' && cl.state !== selectedState) return;

        const color = cl.severity_level === 'Critical' ? '#DC2626' : (cl.severity_level === 'High' ? '#EA580C' : '#0D9488');
        
        // Render boundary circle representing cluster spatial epsilon reach
        const circle = L.circle([cl.centroid_latitude, cl.centroid_longitude], {
          radius: cl.radius_km * 1000,
          color: color,
          weight: 2,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: 0.12,
          dashArray: '4, 4',
        });

        circle.bindTooltip(`
          <div class="p-1">
            <p class="font-bold text-xs text-slate-800">${cl.name}</p>
            <p class="text-[11px] text-slate-600">${cl.incident_count} reports | Risk Index: ${cl.risk_score}/100</p>
          </div>
        `, { sticky: true });

        circle.addTo(clustersLayerRef.current);

        // Centroid Cluster Icon
        const clusterIcon = L.divIcon({
          className: 'custom-cluster-centroid',
          html: `
            <div style="background-color: ${color}; width: 28px; height: 28px;" class="rounded-full text-white font-mono font-bold text-xs flex items-center justify-center border-2 border-white shadow-lg">
              ${cl.incident_count}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker([cl.centroid_latitude, cl.centroid_longitude], { icon: clusterIcon })
          .bindPopup(`
            <div class="p-3 max-w-xs font-sans">
              <span class="text-[10px] uppercase font-bold tracking-wider text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                AI DBSCAN Cluster
              </span>
              <h4 class="font-bold text-sm text-slate-900 mt-1">${cl.name}</h4>
              <p class="text-xs text-slate-600 mt-1">
                Dominant Hazard: <span class="font-semibold">${cl.hazard_category}</span><br/>
                Covering ${cl.radius_km} km radius with ${cl.incident_count} corroborated reports.
              </p>
              <div class="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span class="font-bold text-slate-800">Risk Score: ${cl.risk_score}/100</span>
                <span class="text-teal-600 font-semibold uppercase text-[11px]">${cl.severity_level}</span>
              </div>
            </div>
          `)
          .addTo(clustersLayerRef.current);
      });
    }

    // 2. Draw Incident Markers
    filteredIncidents.forEach((inc) => {
      const color = SEVERITY_COLORS[inc.severity] || '#2563EB';
      
      const customIcon = L.divIcon({
        className: 'custom-hazard-pin',
        html: `
          <div style="background-color: ${color};" class="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div class="p-3 max-w-xs font-sans">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="font-mono text-[11px] font-bold text-navy-800">${inc.incident_id}</span>
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded border ${
              inc.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
              inc.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
              inc.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }">
              ${inc.severity}
            </span>
          </div>
          <h4 class="font-bold text-xs text-slate-900">${inc.hazard_category}</h4>
          <p class="text-[11px] text-slate-600 mt-1 line-clamp-3">${inc.description}</p>
          <div class="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span>${inc.location_name}</span>
            <span>${inc.status}</span>
          </div>
          ${inc.image_url ? `
            <div class="mt-2 rounded overflow-hidden max-h-24">
              <img src="${inc.image_url}" alt="Evidence" class="w-full h-24 object-cover" />
            </div>
          ` : ''}
        </div>
      `);

      marker.on('click', () => {
        setSelectedIncident(inc);
      });

      marker.addTo(markersLayerRef.current);
    });
  }, [incidents, clusters, selectedState, selectedHazard, selectedSeverity, showClusters]);

  // Jump to state center
  const handleStateJump = (stateName) => {
    setSelectedState(stateName);
    const target = STATE_CENTERS[stateName] || STATE_CENTERS.All;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([target.lat, target.lon], target.zoom, { duration: 1.2 });
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Top Filter and Coastal State Jump Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* State Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedState}
              onChange={(e) => handleStateJump(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-navy-600"
            >
              {Object.keys(STATE_CENTERS).map((st) => (
                <option key={st} value={st}>{st === 'All' ? 'All Indian Coastline' : st}</option>
              ))}
            </select>
          </div>

          {/* Hazard Filter */}
          <select
            value={selectedHazard}
            onChange={(e) => setSelectedHazard(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-navy-600"
          >
            <option value="All">All Hazard Categories</option>
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

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-navy-600"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High Only</option>
            <option value="Medium">Medium Only</option>
            <option value="Low">Low Only</option>
          </select>

          {/* Toggle Clusters */}
          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showClusters}
              onChange={(e) => setShowClusters(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
            />
            Show AI Clusters ({clusters.length})
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Refresh map incidents"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onRunClustering}
            disabled={isClusteringLoading}
            className="px-2.5 py-1 rounded text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1 shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Run DBSCAN
          </button>
        </div>
      </div>

      {/* Main Map Container with Side Detail Drawer */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100 flex">
        <div ref={mapContainerRef} className="flex-1 h-full z-0" />

        {/* Floating Coastal State Quick Chips */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1 max-w-xl bg-white/95 backdrop-blur p-1.5 rounded-lg border border-slate-200 shadow-md">
          {['Gujarat', 'Maharashtra', 'Goa', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Odisha', 'West Bengal'].map((st) => (
            <button
              key={st}
              onClick={() => handleStateJump(st)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                selectedState === st
                  ? 'bg-navy-800 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur p-2.5 rounded-lg border border-slate-200 shadow-md text-xs space-y-1.5">
          <p className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">Severity Legend</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Critical
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" /> High
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Medium
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Low
            </span>
          </div>
          {showClusters && (
            <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-teal-600 bg-teal-500/20 inline-block" />
              DBSCAN Spatial Cluster Boundary
            </div>
          )}
        </div>

        {/* Selected Incident Drawer */}
        {selectedIncident && (
          <div className="w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto z-10 flex flex-col justify-between shrink-0 shadow-lg">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-mono text-xs font-bold text-navy-800">{selectedIncident.incident_id}</span>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={selectedIncident.severity} />
                  <StatusBadge status={selectedIncident.status} />
                </div>

                <div>
                  <HazardBadge category={selectedIncident.hazard_category} />
                  <h3 className="font-bold text-sm text-slate-900 mt-2">{selectedIncident.location_name}</h3>
                  <p className="text-xs text-slate-500">{selectedIncident.state}</p>
                </div>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {selectedIncident.description}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Latitude</span>
                    <span className="font-mono font-semibold">{selectedIncident.latitude}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Longitude</span>
                    <span className="font-mono font-semibold">{selectedIncident.longitude}</span>
                  </div>
                </div>

                {selectedIncident.cluster_id && (
                  <div className="p-2 rounded bg-teal-50 border border-teal-200 text-xs text-teal-800">
                    <span className="font-semibold">Associated Cluster:</span> {selectedIncident.cluster_id}
                  </div>
                )}

                {selectedIncident.image_url && (
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium mb-1">Field Photo Evidence</span>
                    <img 
                      src={selectedIncident.image_url} 
                      alt="Hazard Evidence" 
                      className="w-full h-36 object-cover rounded border border-slate-200" 
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setActivePage('verification')}
                className="flex-1 py-1.5 rounded text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-white text-center transition"
              >
                Inspect in Verification
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
