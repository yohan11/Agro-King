'use client';
import { useState, useEffect } from 'react';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSPrompt(true);
    } else {
      alert("Pour installer l'application sur votre smartphone, ouvrez le menu de votre navigateur (les 3 points ⋮ en haut à droite) et appuyez sur 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.");
    }
  };

  if (isInstalled) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
      color: '#ffffff',
      padding: '0.85rem 1rem',
      borderRadius: '14px',
      margin: '0.75rem 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(27, 94, 32, 0.25)',
      gap: '0.75rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
        <div style={{
          fontSize: '1.4rem',
          background: 'rgba(255,255,255,0.2)',
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          📲
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', lineHeight: 1.2 }}>Installer l'Application</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Accès direct et rapide depuis votre écran d'accueil</div>
        </div>
      </div>
      
      <button
        onClick={handleInstallClick}
        style={{
          background: '#ffffff',
          color: '#1B5E20',
          border: 'none',
          padding: '0.5rem 0.9rem',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '0.8rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        Installer
      </button>

      {showIOSPrompt && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '16px',
          right: '16px',
          background: '#ffffff',
          color: '#0f172a',
          padding: '1.25rem',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          border: '2px solid #2E7D32'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#1B5E20' }}>Installation sur iPhone / iPad :</h4>
          <p style={{ fontSize: '0.85rem', margin: '0 0 0.8rem 0', color: '#475569' }}>
            1. Appuyez sur le bouton <strong>Partager</strong> (icône ⬆️ en bas de Safari).<br />
            2. Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil" ➕</strong>.
          </p>
          <button
            onClick={() => setShowIOSPrompt(false)}
            style={{
              width: '100%',
              background: '#2E7D32',
              color: '#fff',
              border: 'none',
              padding: '0.5rem',
              borderRadius: '8px',
              fontWeight: '600'
            }}
          >
            Compris
          </button>
        </div>
      )}
    </div>
  );
}
