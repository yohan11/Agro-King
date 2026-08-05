'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConsumerSavingsTab from '@/components/ConsumerSavingsTab';
import InstallAppBanner from '@/components/InstallAppBanner';

export default function ConsumerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) {
          router.push('/');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data?.user) {
          setUser(data.user);
        } else {
          router.push('/');
        }
      })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', animation: 'pulse 1.5s infinite' }}>🍗</div>
          <div style={{ marginTop: '0.75rem', fontWeight: '600', color: '#475569' }}>Chargement de votre espace client...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Header */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/logo.jpeg"
            alt="AgroKing"
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7' }}
          />
          <div>
            <div style={{ fontWeight: '800', fontSize: '1rem', color: '#0f172a' }}>
              AGRO KING <span style={{ color: '#0284c7', fontSize: '0.85rem' }}>| Espace Client</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              🍗 {user?.name || 'Client Partenaire'} {user?.unique_id ? `(${user.unique_id})` : ''}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: 'none',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <span>🚪</span>
          <span>Déconnexion</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        <InstallAppBanner />
        <ConsumerSavingsTab user={user} />
      </main>
    </div>
  );
}
