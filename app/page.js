'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import GlobalLoader from '@/components/GlobalLoader';
import InstallAppBanner from '@/components/InstallAppBanner';

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

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (!isLogin && data.user.role === 'Farmer') {
          if (formData.location && !locations.some(l => l.name.toLowerCase() === formData.location.toLowerCase())) {
            fetch('/api/locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: formData.location })
            }).catch(console.error);
          }
          
          setSignupSuccessData(data.user);
        } else {
          router.push('/farmer');
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Échec de l\'authentification');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau. Veuillez vérifier votre connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  if (signupSuccessData) {
    return (
      <div className="app-shell">
        <main className="container" style={{ maxWidth: '440px' }}>
          <div style={{ textAlign: 'center', marginTop: '1rem' }} className="animate-fade-in">
            <img 
              src="/logo.jpeg" 
              alt="AGRO KING Logo" 
              style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1rem auto', display: 'block', border: '3px solid var(--accent-primary)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} 
            />
            <h1 style={{ marginBottom: '0.25rem', color: 'var(--accent-secondary)' }}>Félicitations !</h1>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Votre compte éleveur est prêt.</p>
            
            <div className="panel" style={{ padding: '1.25rem', marginTop: '1.25rem', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}>Compte créé avec succès</h3>
              <p style={{ margin: '0.75rem 0 0.5rem 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>Votre identifiant unique éleveur est :</p>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '2px dashed var(--accent-primary)', color: 'var(--accent-secondary)', letterSpacing: '0.05em' }}>
                {signupSuccessData.unique_id}
              </div>
              <p className="text-muted" style={{ margin: '0.75rem 0', fontSize: '0.8rem' }}>Conservez cet identifiant, il vous servira pour vos commandes et votre suivi.</p>
              <button onClick={() => { setIsLoading(true); router.push('/farmer'); }} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Accéder à mon espace éleveur ➔
              </button>
            </div>

            <InstallAppBanner />

            {isLoading && <GlobalLoader text="Ouverture du tableau de bord..." />}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="container" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', margin: '0.75rem 0 1rem 0' }} className="animate-fade-in">
          <img 
            src="/logo.jpeg" 
            alt="AGRO KING Logo" 
            style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.75rem auto', display: 'block', border: '3px solid var(--accent-primary)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} 
          />
          <h1 style={{ marginBottom: '0.2rem', color: 'var(--accent-secondary)' }}>AGRO KING</h1>
          <p className="text-muted" style={{ fontSize: '0.88rem', lineHeight: 1.3, maxWidth: '320px', margin: '0 auto' }}>
            La solution complète pour vos poussins et aliments d'élevage.
          </p>
        </div>

        <InstallAppBanner />

        {/* Main Auth Card */}
        <div className="panel" style={{ padding: '1.25rem' }}>
          
          {/* Segmented Switcher */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '1.25rem' }}>
            <button 
              type="button" 
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1,
                padding: '0.6rem 0',
                border: 'none',
                borderRadius: '8px',
                fontWeight: isLogin ? '700' : '500',
                fontSize: '0.88rem',
                cursor: 'pointer',
                background: isLogin ? '#ffffff' : 'transparent',
                color: isLogin ? 'var(--accent-secondary)' : '#64748b',
                boxShadow: isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Se Connecter
            </button>
            <button 
              type="button" 
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1,
                padding: '0.6rem 0',
                border: 'none',
                borderRadius: '8px',
                fontWeight: !isLogin ? '700' : '500',
                fontSize: '0.88rem',
                cursor: 'pointer',
                background: !isLogin ? '#ffffff' : 'transparent',
                color: !isLogin ? 'var(--accent-secondary)' : '#64748b',
                boxShadow: !isLogin ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Créer un Compte
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {!isLogin && (
              <>
                <div>
                  <label className="label">Nom complet de l'éleveur</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Jean Dupont" 
                    className="input" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="label">Ville ou Quartier</label>
                  <input 
                    type="text" 
                    list="locations-list" 
                    className="input" 
                    placeholder="Ex: Yaoundé - Nkoabang" 
                    required 
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                  />
                  <datalist id="locations-list">
                    {locations.map(loc => (
                      <option key={loc._id} value={loc.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="label">Position exacte de la ferme (GPS)</label>
                  <MapPicker 
                    coordinates={formData.coordinates} 
                    onLocationSelect={(coords) => setFormData({...formData, coordinates: coords})} 
                    onAddressResolve={(addr) => setFormData(prev => ({...prev, location: addr}))}
                    autoGPS={true}
                  />
                </div>
              </>
            )}

            <div>
              <label className="label">{isLogin ? "Téléphone ou Identifiant AGRK" : "Numéro de Téléphone"}</label>
              <input 
                type="text" 
                placeholder={isLogin ? "Ex: 699123456 ou AGRK-1234" : "Ex: 699123456"} 
                className="input" 
                required 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <input 
                type="password" 
                placeholder="Votre mot de passe" 
                className="input" 
                required 
                onChange={e => setFormData({...formData, password: e.target.value})} 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              {isLogin ? 'Connexion à mon espace' : 'Valider et Créer mon Compte'}
            </button>
          </form>

          <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            🔒 Connexion sécurisée et données chiffrées.
          </div>
        </div>

        {isLoading && <GlobalLoader text={isLogin ? "Connexion en cours..." : "Création du compte..."} />}
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<GlobalLoader text="Chargement..." />}>
      <AuthContent />
    </Suspense>
  );
}
