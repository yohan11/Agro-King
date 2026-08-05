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
  const [selectedRole, setSelectedRole] = useState('Farmer'); // 'Farmer' ou 'Consumer'
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
          if (data.user) {
            if (data.user.role?.toLowerCase() === 'consumer') {
              router.push('/consumer');
            } else {
              router.push('/farmer');
            }
          }
        });
      }
    });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    
    const payload = isLogin 
      ? { ...formData }
      : { ...formData, role: selectedRole };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (!isLogin) {
          if (formData.location && !locations.some(l => l.name.toLowerCase() === formData.location.toLowerCase())) {
            fetch('/api/locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: formData.location })
            }).catch(console.error);
          }
          setSignupSuccessData(data.user);
        } else {
          if (data.user.role?.toLowerCase() === 'consumer') {
            router.push('/consumer');
          } else {
            router.push('/farmer');
          }
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
    const isConsumer = signupSuccessData.role?.toLowerCase() === 'consumer';
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
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Votre compte {isConsumer ? 'client consommateur' : 'éleveur avicole'} est prêt.
            </p>
            
            <div className="panel" style={{ padding: '1.25rem', marginTop: '1.25rem', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}>Compte créé avec succès</h3>
              <p style={{ margin: '0.75rem 0 0.5rem 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Votre identifiant unique est :
              </p>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '2px dashed var(--accent-primary)', color: 'var(--accent-secondary)', letterSpacing: '0.05em' }}>
                {signupSuccessData.unique_id}
              </div>
              <p className="text-muted" style={{ margin: '0.75rem 0', fontSize: '0.8rem' }}>
                Conservez cet identifiant, il vous servira pour vos accès et vos opérations.
              </p>
              <button 
                onClick={() => { 
                  setIsLoading(true); 
                  router.push(isConsumer ? '/consumer' : '/farmer'); 
                }} 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Accéder à mon espace ➔
              </button>
            </div>

            <InstallAppBanner />

            {isLoading && <GlobalLoader text="Ouverture de votre espace..." />}
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
            Packs de poussins, alimentation & volaille prête à consommer.
          </p>
        </div>

        <InstallAppBanner />

        {/* Main Auth Card */}
        <div className="panel" style={{ padding: '1.25rem' }}>
          
          {/* Segmented Switcher : Connexion vs Inscription */}
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
            
            {/* SÉLECTEUR DE TYPE DE COMPTE (Visible à l'inscription) */}
            {!isLogin && (
              <div style={{ marginBottom: '0.35rem' }}>
                <label className="label" style={{ fontWeight: '700', marginBottom: '0.4rem', display: 'block', color: '#1e293b' }}>
                  Je souhaite m'inscrire en tant que :
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('Farmer')}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: '12px',
                      border: selectedRole === 'Farmer' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: selectedRole === 'Farmer' ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>👨‍🌾</div>
                    <strong style={{ fontSize: '0.82rem', color: selectedRole === 'Farmer' ? '#15803d' : '#334155', display: 'block' }}>
                      Éleveur Avicole
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Packs & Caisse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('Consumer')}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: '12px',
                      border: selectedRole === 'Consumer' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: selectedRole === 'Consumer' ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>🍗</div>
                    <strong style={{ fontSize: '0.82rem', color: selectedRole === 'Consumer' ? '#0369a1' : '#334155', display: 'block' }}>
                      Client / Événement
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Épargne & Marché</span>
                  </button>
                </div>
              </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label className="label">
                    {selectedRole === 'Farmer' ? "Nom complet de l'éleveur" : "Nom complet ou Structure / Traiteur"}
                  </label>
                  <input 
                    type="text" 
                    placeholder={selectedRole === 'Farmer' ? "Ex: Jean Dupont" : "Ex: Marie Ngo (Restaurant Le Festin)"} 
                    className="input" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="label">
                    {selectedRole === 'Farmer' ? "Ville ou Quartier de la ferme" : "Ville ou Quartier de livraison"}
                  </label>
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

                {selectedRole === 'Farmer' && (
                  <div>
                    <label className="label">Position exacte de la ferme (GPS)</label>
                    <MapPicker 
                      coordinates={formData.coordinates} 
                      onLocationSelect={(coords) => setFormData({...formData, coordinates: coords})} 
                      onAddressResolve={(addr) => setFormData(prev => ({...prev, location: addr}))}
                      autoGPS={true}
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="label">{isLogin ? "Téléphone ou Identifiant (AGRK- / AGRC-)" : "Numéro de Téléphone"}</label>
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
