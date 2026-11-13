import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Send, MapPin, Upload, AlertTriangle, CheckCircle2, 
  HelpCircle, ShieldAlert, ArrowRight, Eye, RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';

const HAZARD_CATEGORIES = [
  'Coastal flooding',
  'High waves',
  'Coastal erosion',
  'Oil spills',
  'Cyclones',
  'Storm surges',
  'Tsunami observations',
  'Marine pollution',
  'Landslides',
  'Infrastructure damage'
];

const COASTAL_STATES = [
  'Gujarat',
  'Maharashtra',
  'Goa',
  'Karnataka',
  'Kerala',
  'Tamil Nadu',
  'Andhra Pradesh',
  'Odisha',
  'West Bengal'
];

export default function CitizenReport({ setActivePage }) {
  const pickerMapRef = useRef(null);
  const pickerInstanceRef = useRef(null);
  const pickerMarkerRef = useRef(null);

  const [form, setForm] = useState({
    reporter_name: '',
    reporter_contact: '',
    hazard_category: 'High waves',
    description: '',
    location_name: '',
    state: 'Maharashtra',
    latitude: 18.9438,
    longitude: 72.8232,
    severity: 'High',
    image_url: ''
  });

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [error, setError] = useState(null);

  // Initialize interactive coordinate picker Leaflet map
  useEffect(() => {
    if (!pickerMapRef.current || pickerInstanceRef.current) return;

    const map = L.map(pickerMapRef.current, {
      center: [form.latitude, form.longitude],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO & OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    const marker = L.marker([form.latitude, form.longitude], { draggable: true }).addTo(map);

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      setForm((prev) => ({
        ...prev,
        latitude: parseFloat(pos.lat.toFixed(5)),
        longitude: parseFloat(pos.lng.toFixed(5))
      }));
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      setForm((prev) => ({
        ...prev,
        latitude: parseFloat(e.latlng.lat.toFixed(5)),
        longitude: parseFloat(e.latlng.lng.toFixed(5))
      }));
    });

    pickerInstanceRef.current = map;
    pickerMarkerRef.current = marker;

    return () => {
      map.remove();
      pickerInstanceRef.current = null;
    };
  }, []);

  // Update marker position if manual input changes
  const handleCoordChange = (lat, lon) => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!isNaN(latNum) && !isNaN(lonNum) && pickerMarkerRef.current && pickerInstanceRef.current) {
      pickerMarkerRef.current.setLatLng([latNum, lonNum]);
      pickerInstanceRef.current.panTo([latNum, lonNum]);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const res = await api.uploadImage(file);
      setForm((prev) => ({ ...prev, image_url: res.url }));
    } catch (err) {
      setError('Failed to upload image. You can continue submitting text details.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location_name || !form.description) {
      setError('Please provide a landmark location and description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.createIncident(form);
      setSubmissionResult(res);
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      reporter_name: '',
      reporter_contact: '',
      hazard_category: 'High waves',
      description: '',
      location_name: '',
      state: 'Maharashtra',
      latitude: 18.9438,
      longitude: 72.8232,
      severity: 'High',
      image_url: ''
    });
    setSubmissionResult(null);
  };

  if (submissionResult) {
    const dup = submissionResult.duplicate_detection;
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-slate-900">Coastal Hazard Report Registered</h2>
          <p className="text-xs text-slate-600">
            Thank you for contributing to Indian coastal maritime safety. Your report has been logged and queued for officer verification.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Incident Tracking ID:</span>
              <span className="font-bold text-navy-800">{submissionResult.incident_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Timestamp:</span>
              <span>{new Date(submissionResult.reported_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Initial Status:</span>
              <span className="font-semibold text-amber-600">Pending Review</span>
            </div>
          </div>

          {/* Duplicate Detection Warning if flagged */}
          {dup && dup.is_potential_duplicate && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 text-left text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                NLP Duplicate Corroboration Detected ({dup.duplicate_confidence_percent}% Match)
              </div>
              <p className="text-[11px] text-amber-800">
                This report matches an active nearby report ({dup.matched_incident_id}) reported {dup.distance_km} km away. 
                Both reports have been linked in the verification portal to accelerate validation.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              Submit Another Report
            </button>
            <button
              onClick={() => setActivePage('map')}
              className="px-4 py-2 rounded text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-white transition flex items-center gap-1.5"
            >
              View on Coastal Map
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Citizen Coastal Hazard Reporting Portal</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit crowdsourced observations of storm surges, anomalous swell, erosion, oil sheens, or beach hazards.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200/90 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reporter Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reporter Name <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Patel"
              value={form.reporter_name}
              onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
              className="w-full text-xs rounded-md border border-slate-300 p-2 focus:ring-1 focus:ring-navy-600 focus:outline-none"
            />
          </div>

          {/* Reporter Contact */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone / Email <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. +91 98250 12345"
              value={form.reporter_contact}
              onChange={(e) => setForm({ ...form, reporter_contact: e.target.value })}
              className="w-full text-xs rounded-md border border-slate-300 p-2 focus:ring-1 focus:ring-navy-600 focus:outline-none"
            />
          </div>

          {/* Hazard Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hazard Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.hazard_category}
              onChange={(e) => setForm({ ...form, hazard_category: e.target.value })}
              className="w-full text-xs rounded-md border border-slate-300 p-2 focus:ring-1 focus:ring-navy-600 focus:outline-none bg-slate-50"
            >
              {HAZARD_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Perceived Severity <span className="text-red-500">*</span>
            </label>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className="w-full text-xs rounded-md border border-slate-300 p-2 focus:ring-1 focus:ring-navy-600 focus:outline-none bg-slate-50"
            >
              <option value="Low">Low — Minor noticeable sea anomaly</option>
              <option value="Medium">Medium — Elevated waves / minor beach erosion</option>
              <option value="High">High — Hazardous swell / road inundation</option>
              <option value="Critical">Critical — Seawall breach / human life threat</option>
            </select>
          </div>

          {/* Location Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Location Landmark / Beach Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Dwarka Promenade Seawall or Miramar Beach"
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
              required
              className="w-full text-xs rounded-md border border-slate-300 p-2 focus:ring-1 focus:ring-navy-600 focus:outline-none"
            />
          </div>

          {/* Coastal State */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Coastal State <span className="text-red-500">*</span>
            </label>
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full text-xs rounded-md border border-slate-300 p-2 focus:ring-1 focus:ring-navy-600 focus:outline-none bg-slate-50"
            >
              {COASTAL_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Detailed Hazard Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Describe wave height, extent of inundation, damage to boats/infrastructure, unusual sea recession, or pollution..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            className="w-full text-xs rounded-md border border-slate-300 p-2.5 focus:ring-1 focus:ring-navy-600 focus:outline-none"
          />
        </div>

        {/* Interactive Map Coordinate Picker */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              Geographic Coordinates (Click map to pin exact coastal location)
            </label>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span>Lat: <strong className="text-slate-900">{form.latitude}</strong></span>
              <span>Lon: <strong className="text-slate-900">{form.longitude}</strong></span>
            </div>
          </div>

          <div className="h-52 rounded-md overflow-hidden border border-slate-300">
            <div ref={pickerMapRef} className="w-full h-full" />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Latitude</span>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => {
                  setForm({ ...form, latitude: parseFloat(e.target.value) || 0 });
                  handleCoordChange(e.target.value, form.longitude);
                }}
                className="w-full text-xs font-mono rounded border border-slate-300 p-1.5 focus:ring-1 focus:ring-navy-600"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Longitude</span>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => {
                  setForm({ ...form, longitude: parseFloat(e.target.value) || 0 });
                  handleCoordChange(form.latitude, e.target.value);
                }}
                className="w-full text-xs font-mono rounded border border-slate-300 p-1.5 focus:ring-1 focus:ring-navy-600"
              />
            </div>
          </div>
        </div>

        {/* Photo Evidence Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Upload Photograph Evidence <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
            {uploading && <span className="text-xs text-teal-600 font-medium animate-pulse">Uploading photo...</span>}
            {form.image_url && <span className="text-xs text-emerald-600 font-medium">✓ Photo attached</span>}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Reports are verified by coastal authorities and fed into DBSCAN incident clustering.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-md text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Registering Report...' : 'Submit Hazard Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
