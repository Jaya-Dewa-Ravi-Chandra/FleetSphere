import React from 'react';import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const marker = L.divIcon({ className:'picker-marker', html:'<div>📍</div>', iconSize:[34,34], iconAnchor:[17,34] });
function Clicker({ value, onChange }) { useMapEvents({ click(e){ onChange({ lat:Number(e.latlng.lat.toFixed(6)), lng:Number(e.latlng.lng.toFixed(6)) }); } }); return value?.lat && value?.lng ? <Marker position={[value.lat,value.lng]} icon={marker}/> : null; }
export default function LocationPicker({ value, onChange }) {
  const center = value?.lat && value?.lng ? [value.lat,value.lng] : [17.385,78.4867];
  return <div className="location-picker"><MapContainer center={center} zoom={value?.lat ? 13 : 6} scrollWheelZoom className="picker-map"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Clicker value={value} onChange={onChange}/></MapContainer><div className="location-readout">Click the map to place the vehicle · {value?.lat ? `${value.lat}, ${value.lng}` : 'No location selected'}</div></div>;
}
