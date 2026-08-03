'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Composant pour capter les clics sur la carte
function LocationMarker({ position, setPosition, setZoom }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      setZoom(18); // Zoom précis lors d'un clic manuel
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

// Composant pour déplacer la vue de la carte dynamiquement
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapPicker({ coordinates, onLocationSelect, onAddressResolve, autoGPS = false }) {
  // Par défaut, centrer sur Douala ou Yaoundé
  const defaultCenter = { lat: 4.0511, lng: 9.7679 }; // Douala
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(13);
  const [loading, setLoading] = useState(false);

  // Synchroniser la position initiale avec les coordonnées reçues en props
  useEffect(() => {
    if (coordinates && coordinates.lat && coordinates.lng) {
      const coords = { lat: Number(coordinates.lat), lng: Number(coordinates.lng) };
      setPosition(coords);
      setMapCenter(coords);
      setZoom(18); // Zoom élevé s'il y a déjà des coordonnées enregistrées
    }
  }, [coordinates]);

  const triggerReverseGeocoding = async (lat, lng) => {
    if (!onAddressResolve) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.address) return;
      
      const addr = data.address;
      const city = addr.city || addr.town || addr.village || addr.municipality || '';
      const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '';
      
      let resolved = '';
      if (city && neighborhood) {
        resolved = `${city} - ${neighborhood}`;
      } else if (city) {
        resolved = city;
      } else if (neighborhood) {
        resolved = neighborhood;
      } else if (data.display_name) {
        resolved = data.display_name.split(',').slice(0, 2).join(', ').trim();
      }
      
      if (resolved) {
        onAddressResolve(resolved);
      }
    } catch (e) {
      console.error('Reverse geocoding failed:', e);
    }
  };

  const handleGetLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(coords);
        setMapCenter(coords);
        setZoom(18); // Zoom max pour calibrage précis sur la ferme
        onLocationSelect(coords);
        triggerReverseGeocoding(coords.lat, coords.lng);
        setLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLoading(false);
        if (!autoGPS) {
          alert('Erreur: Impossible d\'obtenir votre position précise (vérifiez les autorisations GPS de votre smartphone).');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (autoGPS && !coordinates) {
      handleGetLocation();
    }
  }, [autoGPS]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <button 
        type="button" 
        className="btn btn-outline" 
        onClick={handleGetLocation}
        disabled={loading}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.88rem', padding: '0.6rem 0.8rem' }}
      >
        {loading ? (
          <>
            <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(46,125,50,0.3)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></span>
            Capture GPS en cours...
          </>
        ) : (
          <>📍 Localiser ma ferme (GPS Haute Précision)</>
        )}
      </button>
      
      <div style={{ height: '210px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--panel-border)', position: 'relative' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={(coords) => {
            setPosition(coords);
            onLocationSelect(coords);
            triggerReverseGeocoding(coords.lat, coords.lng);
          }} setZoom={setZoom} />
          <ChangeMapView center={mapCenter} zoom={zoom} />
        </MapContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Toucher la carte pour ajuster</span>
        {position && (
          <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>
            ✓ GPS: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
