import React from 'react';import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api/client';

const icons = {
  Available: '#168653',
  Assigned: '#2563eb',
  'On Trip': '#111827',
  Maintenance: '#d97706',
  Inactive: '#6b7280'
};

function FitVehicles({ vehicles }) {
  const map = useMap();
  useEffect(() => {
    const points = vehicles.filter(v => v.location?.lat && v.location?.lng).map(v => [v.location.lat, v.location.lng]);
    if (points.length) map.fitBounds(points, { padding: [30, 30], maxZoom: 12 });
  }, [vehicles, map]);
  return null;
}

function vehicleIcon(status) {
  return L.divIcon({
    className: 'fleet-marker',
    html: `<div class="fleet-marker-dot" style="background:${icons[status] || '#111827'}">🚚</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
}

export default function FleetMap() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/analytics/map')
      .then(res => { if (alive) setVehicles(res.data?.vehicles || []); })
      .catch(err => { if (alive) setError(err.message || 'Unable to load fleet locations'); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const valid = vehicles.filter(v => v.location?.lat && v.location?.lng);
  const center = valid.length ? [valid[0].location.lat, valid[0].location.lng] : [17.385, 78.4867];

  return (
    <div className="fleet-map-wrap">
      {loading && <div className="map-overlay">Loading live fleet locations…</div>}
      {error && <div className="map-overlay error">{error}</div>}
      <MapContainer center={center} zoom={6} scrollWheelZoom className="fleet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitVehicles vehicles={valid} />
        {valid.map(vehicle => (
          <Marker key={vehicle._id} position={[vehicle.location.lat, vehicle.location.lng]} icon={vehicleIcon(vehicle.status)}>
            <Popup>
              <div className="vehicle-popup">
                <strong>{vehicle.registrationNumber}</strong>
                <span>{vehicle.make} {vehicle.model}</span>
                <span>Status: <b>{vehicle.status}</b></span>
                {vehicle.assignedDriver?.name && <span>Driver: {vehicle.assignedDriver.name}</span>}
                <small>{vehicle.location.address || 'Fleet location'} · Updated {new Date(vehicle.location.lastUpdated).toLocaleTimeString()}</small>
              </div>
            </Popup>
          </Marker>
        ))}
        {!valid.length && <CircleMarker center={center} radius={10} pathOptions={{ color: '#168653' }} />}
      </MapContainer>
      <div className="map-legend">
        {Object.entries(icons).map(([status, color]) => <span key={status}><i style={{ background: color }} />{status}</span>)}
      </div>
      <div className="map-count">{valid.length} vehicle{valid.length === 1 ? '' : 's'} visible</div>
    </div>
  );
}
