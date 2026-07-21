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

export default function MapPicker({ coordinates, onLocationSelect, autoGPS = false }) {
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
        setZoom(18); // Zoom max pour un calibrage précis sur la ferme
        onLocationSelect(coords);
        setLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLoading(false);
        // On n'alerte pas en mode automatique pour ne pas perturber l'affichage initial
        if (!autoGPS) {
          alert('Erreur: Impossible d\'obtenir votre position précise (vérifiez vos autorisations GPS).');
        }
      },
      {
        enableHighAccuracy: true, // Haute précision GPS (exige le capteur GPS du téléphone)
        timeout: 15000,           // 15 secondes d'attente max
        maximumAge: 0             // Pas de cache pour avoir la position en temps réel
      }
    );
  };

  // Lancer la géolocalisation dès le montage si autoGPS est activé et qu'il n'y a pas encore de coordonnées
  useEffect(() => {
    if (autoGPS && !coordinates) {
      handleGetLocation();
    }
  }, [autoGPS]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button 
        type="button" 
        className="btn btn-outline" 
        onClick={handleGetLocation}
        disabled={loading}
        style={{ width: '100%', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        {loading ? (
          <>
            <span className="spinner" style={{ borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></span>
            Capture de la position précise en cours...
          </>
        ) : (
          <>📍 Capturer ma position exacte (Haute Précision GPS)</>
        )}
      </button>
      
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, textAlign: 'left' }}>
        Ou déplacez-vous sur la carte et cliquez pour ajuster précisément le repère :
      </p>

      <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={zoom} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={(coords) => {
            setPosition(coords);
            onLocationSelect(coords);
          }} setZoom={setZoom} />
          <ChangeMapView center={mapCenter} zoom={zoom} />
        </MapContainer>
      </div>

      {position && (
        <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', margin: 0, textAlign: 'left' }}>
          ✓ Position capturée : {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
