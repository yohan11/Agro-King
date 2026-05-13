'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [farmers, setFarmers] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (!data.user || data.user.role !== 'Admin') router.push('/');
    });

    fetchFarmers();
    fetchOrders();

    const interval = setInterval(() => {
      fetchFarmers();
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  const fetchFarmers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setFarmers(Array.isArray(data) ? data.filter(u => u.role === 'Farmer') : []);
  };

  const fetchOrders = async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
  };

  const updateOrderStatus = async (id, status) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchOrders();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-4 mt-2">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.jpeg" alt="AGRO KING Logo" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
          <h1 style={{color: 'var(--accent-secondary)'}}>Tableau de Bord Administrateur</h1>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{padding: '0.5rem 1rem'}}>Déconnexion</button>
      </div>

      <div className="panel mb-4">
        <h2 style={{color: 'var(--accent-secondary)'}}>Réseau d'Éleveurs</h2>
        {farmers.length === 0 ? <p className="text-muted">Aucun éleveur inscrit.</p> : (
          <table style={{ width: '100%', textAlign: 'left', marginTop: '1rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Nom</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Téléphone</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Localisation</th>
              </tr>
            </thead>
            <tbody>
              {farmers.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--accent-secondary)' }}>{f.name}</td>
                  <td style={{ padding: '0.75rem' }}>{f.phone}</td>
                  <td style={{ padding: '0.75rem' }}>{f.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2 style={{color: 'var(--accent-secondary)'}}>Commandes Globales</h2>
        {orders.length === 0 ? <p className="text-muted">Aucune commande passée.</p> : (
          <table style={{ width: '100%', textAlign: 'left', marginTop: '1rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Commande N°</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Éleveur</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Téléphone</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Pack</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Dates</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Lieu de Livraison</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Statut</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>#{o.id}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--accent-secondary)' }}>{o.farmer_name}</td>
                  <td style={{ padding: '0.75rem' }}>{o.phone}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                    {o.pack_type || `${o.chicks} Poussins`}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                    Cmd: {new Date(o.created_at || Date.now()).toLocaleDateString('fr-FR')}<br/>
                    {o.delivery_date && <span style={{color: 'var(--accent-primary)', fontWeight: '500'}}>Livr: {new Date(o.delivery_date).toLocaleDateString('fr-FR')}</span>}
                    {o.next_bags_delivery_preference && <div style={{color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem'}}>Suiv: {o.next_bags_delivery_preference}</div>}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {o.delivery_location}
                    {o.coordinates && (
                      <div className="text-muted" style={{fontSize: '0.8rem', marginTop: '0.2rem'}}>
                        📍 <a href={`https://www.google.com/maps?q=${o.coordinates.lat},${o.coordinates.lng}`} target="_blank" rel="noreferrer" style={{color: 'var(--accent-info)', textDecoration: 'none'}}>Carte GPS</a>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${o.status === 'Livrée' ? 'badge-success' : 'badge-warning'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {o.status === 'En attente' && <button className="btn btn-outline" style={{ fontSize:'0.8rem', marginRight:'0.5rem', padding: '0.4rem 0.8rem' }} onClick={() => updateOrderStatus(o.id, 'Confirmée')}>Confirmer</button>}
                    {o.status === 'Confirmée' && <button className="btn btn-primary" style={{ fontSize:'0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => updateOrderStatus(o.id, 'Livrée')}>Livrer</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
