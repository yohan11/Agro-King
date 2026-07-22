'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        return { user: null };
      })
      .then(data => {
        if (data.user && data.user.role?.toLowerCase() === 'admin') {
          router.push('/admin');
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => setCheckingAuth(false));
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requiredRole: 'Admin'
        })
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin');
      } else {
        setError(data.error || 'Identifiants invalides');
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p className="text-muted">Vérification de la session...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '440px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <div style={{ display: 'inline-block', position: 'relative', marginBottom: '1.5rem' }}>
        <img 
          src="/logo.jpeg" 
          alt="AGRO KING Logo" 
          style={{ 
            width: '110px', 
            height: '110px', 
            borderRadius: '50%', 
            objectFit: 'cover', 
            margin: '0 auto', 
            display: 'block', 
            border: '4px solid #1e293b', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)' 
          }} 
        />
        <span style={{
          position: 'absolute',
          bottom: '0',
          right: '-10px',
          background: '#1e293b',
          color: '#f8fafc',
          fontSize: '0.75rem',
          fontWeight: '700',
          padding: '0.2rem 0.6rem',
          borderRadius: '20px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          ADMIN
        </span>
      </div>

      <h1 style={{ marginBottom: '0.25rem', color: '#1e293b', fontSize: '1.8rem' }}>AGRO KING</h1>
      <p style={{ marginBottom: '2rem', fontWeight: '600', color: '#64748b', fontSize: '1.05rem' }}>
        Espace Administration
      </p>

      <div className="panel" style={{ 
        padding: '2.5rem 2rem', 
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          background: '#f1f5f9', 
          color: '#334155', 
          padding: '0.75rem', 
          borderRadius: '10px', 
          marginBottom: '1.5rem', 
          fontSize: '0.88rem', 
          fontWeight: '500',
          display: 'flex', 
          alignItems: 'center', 
          justify: 'center', 
          gap: '0.5rem' 
        }}>
          <span>🔐</span> Portail de gestion sécurisé réservé aux administrateurs
        </div>

        {error && (
          <div style={{ 
            background: '#fef2f2', 
            color: '#dc2626', 
            padding: '0.8rem', 
            borderRadius: '10px', 
            marginBottom: '1.25rem', 
            fontSize: '0.9rem', 
            border: '1px solid #fecaca',
            textAlign: 'left'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
              Identifiant / Téléphone Admin
            </label>
            <input 
              type="text" 
              placeholder="Ex: admin ou 699..." 
              className="input" 
              required 
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })} 
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
              Mot de passe
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input" 
              required 
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })} 
              style={{ width: '100%' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn" 
            disabled={loading}
            style={{ 
              marginTop: '0.5rem', 
              padding: '0.9rem',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              fontWeight: '600',
              borderRadius: '10px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(30,41,59,0.25)'
            }}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter à l\'Admin'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <a 
            href="/" 
            style={{ 
              color: '#64748b', 
              fontSize: '0.88rem', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            ← Retour à l'espace éleveur / client
          </a>
        </div>
      </div>
    </div>
  );
}
