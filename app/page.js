'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import GlobalLoader from '@/components/GlobalLoader';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ phone: '', password: '', name: '', location: '', coordinates: null });
  const [signupSuccessData, setSignupSuccessData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'register') {
      setIsLogin(false);
      setFormData(prev => ({
        ...prev,
        phone: searchParams.get('phone') || '',
        name: searchParams.get('name') || '',
        location: searchParams.get('location') || ''
      }));
    }
    
    // Fetch dynamic locations
    fetch('/api/locations').then(res => res.ok && res.json()).then(data => {
      if (data) setLocations(data);
    });
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
      if (res.ok) {
        res.json().then(data => {
          if (data.user && data.user.role?.toLowerCase() === 'farmer') router.push('/farmer');
        });
      }
    });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    
    const payload = isLogin 
      ? { ...formData, requiredRole: 'Farmer' }
      : formData;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const data = await res.json();
      if (!isLogin && data.user.role === 'Farmer') {
        // Auto-add new location if it doesn't exist (machine learning pour les humains)
        if (formData.location && !locations.some(l => l.name.toLowerCase() === formData.location.toLowerCase())) {
          fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formData.location })
          }).catch(console.error); // Fire and forget
        }
        
        setSignupSuccessData(data.user);
        setIsLoading(false);
      } else {
        router.push('/farmer');
      }
    } else {
      setIsLoading(false);
      const data = await res.json();
      alert(data.error || 'Échec de l\'authentification');
    }
  };

  if (signupSuccessData) {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <img src="/logo.jpeg" alt="AGRO KING Logo" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1.5rem auto', display: 'block', border: '4px solid var(--accent-primary)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--accent-secondary)' }}>Félicitations !</h1>
        <div className="panel" style={{ padding: '2rem', marginTop: '2rem' }}>
          <h3 style={{ color: 'var(--accent-primary)' }}>Compte créé avec succès</h3>
          <p style={{ margin: '1rem 0' }}>Votre identifiant unique est :</p>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '2px dashed var(--accent-primary)', color: 'var(--accent-secondary)' }}>
            {signupSuccessData.unique_id}
          </div>
          <p className="text-muted" style={{ margin: '1rem 0', fontSize: '0.9rem' }}>Veuillez conserver cet identifiant, il vous servira de référence pour votre ferme.</p>
          <button onClick={() => { setIsLoading(true); router.push('/farmer'); }} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Accéder à mon tableau de bord</button>
        </div>
        {isLoading && <GlobalLoader text="Redirection vers le tableau de bord..." />}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <img src="/logo.jpeg" alt="AGRO KING Logo" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1.5rem auto', display: 'block', border: '4px solid var(--accent-primary)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
      <h1 style={{ marginBottom: '0.5rem', color: 'var(--accent-secondary)' }}>AGRO KING</h1>
      <p className="text-muted" style={{ marginBottom: '1rem', fontWeight: '500', fontSize: '1.1rem' }}>
        Recevez vos poussins et aliments directement à votre ferme, au bon moment.
      </p>

      <div style={{ background: '#ecfdf5', color: '#047857', padding: '0.8rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem', border: '1px dashed #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <span>🤝</span> Rejoignez plus de 500 éleveurs qui nous font confiance. Partenaire AGROCAM.
      </div>
      
      <div className="panel" style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>{isLogin ? 'Connexion' : 'Créer mon compte'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <>
              <input type="text" placeholder="Nom complet de l'éleveur" className="input" required onChange={e => setFormData({...formData, name: e.target.value})} />
              
              <input 
                type="text" 
                list="locations-list" 
                className="input" 
                placeholder="Ville ou Quartier (tapez ou choisissez)" 
                required 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})} 
              />
              <datalist id="locations-list">
                {locations.map(loc => (
                  <option key={loc._id} value={loc.name} />
                ))}
              </datalist>

              <div style={{ marginTop: '0.5rem' }}>
                <MapPicker 
                  coordinates={formData.coordinates} 
                  onLocationSelect={(coords) => setFormData({...formData, coordinates: coords})} 
                  onAddressResolve={(addr) => setFormData(prev => ({...prev, location: addr}))}
                  autoGPS={true}
                />
              </div>
            </>
          )}
          <input type="tel" placeholder={isLogin ? "Téléphone (ex: 699...)" : "Téléphone"} className="input" required onChange={e => setFormData({...formData, phone: e.target.value})} />
          <input type="password" placeholder="Mot de passe" className="input" required onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            {isLogin ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
          <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}>
            {isLogin ? 'Pas encore de compte ? Créer mon compte' : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
      {isLoading && <GlobalLoader text={isLogin ? "Connexion en cours..." : "Création du compte..."} />}
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <AuthContent />
    </Suspense>
  );
}
