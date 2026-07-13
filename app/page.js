'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', phone: '', location: '' });
  const [signupSuccessData, setSignupSuccessData] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
      if (res.ok) {
        res.json().then(data => {
          if (data.user) router.push(data.user.role?.toLowerCase() === 'admin' ? '/admin' : '/farmer');
        });
      }
    });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      const data = await res.json();
      if (!isLogin && data.user.role === 'Farmer') {
        setSignupSuccessData(data.user);
      } else {
        router.push(data.user.role?.toLowerCase() === 'admin' ? '/admin' : '/farmer');
      }
    } else {
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
          <button onClick={() => router.push('/farmer')} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Accéder à mon tableau de bord</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <img src="/logo.jpeg" alt="AGRO KING Logo" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1.5rem auto', display: 'block', border: '4px solid var(--accent-primary)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
      <h1 style={{ marginBottom: '0.5rem', color: 'var(--accent-secondary)' }}>AGRO KING</h1>
      <p className="text-muted" style={{ marginBottom: '2rem', fontWeight: '500', fontSize: '1.1rem' }}>
        Recevez vos poussins et aliments directement à votre ferme, au bon moment.
      </p>
      
      <div className="panel" style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>{isLogin ? 'Connexion' : 'Créer mon compte'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <>
              <input type="text" placeholder="Nom complet" className="input" required onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="text" placeholder="Téléphone" className="input" required onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input type="text" placeholder="Ville ou Quartier" className="input" required onChange={e => setFormData({...formData, location: e.target.value})} />
            </>
          )}
          <input type="text" placeholder={isLogin ? "Nom d'utilisateur ou ID (ex: AGRK-1234)" : "Nom d'utilisateur"} className="input" required onChange={e => setFormData({...formData, username: e.target.value})} />
          <input type="password" placeholder="Mot de passe" className="input" required onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            {isLogin ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
        <div style={{ marginTop: '1.5rem' }}>
          <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}>
            {isLogin ? 'Pas encore de compte ? Créer mon compte' : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
}
