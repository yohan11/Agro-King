'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';

// Composant pour capter les clics sur la carte
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapPicker({ coordinates, onLocationSelect }) {
  // Par défaut, centrer sur Douala ou Yaoundé
  const defaultCenter = { lat: 4.0511, lng: 9.7679 }; // Douala
  const [position, setPosition] = useState(coordinates || null);
  const [mapCenter, setMapCenter] = useState(coordinates || defaultCenter);

  useEffect(() => {
    if (position) {
      onLocationSelect({ lat: position.lat, lng: position.lng });
    }
  }, [position]);

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(coords);
          setMapCenter(coords);
        },
        (err) => {
          alert('Erreur: Impossible d\'obtenir votre position actuelle.');
        }
      );
    } else {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button 
        type="button" 
        className="btn btn-outline" 
        onClick={handleGetLocation}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      >
        📍 Capturer ma position exacte
      </button>
      
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, textAlign: 'left' }}>
        Ou déplacez-vous sur la carte et cliquez pour placer le repère sur votre ferme :
      </p>

      <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>

      {position && (
        <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', margin: 0, textAlign: 'left' }}>
          ✓ Position enregistrée
        </p>
      )}
    </div>
  );
}
