'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [farmers, setFarmers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [feedStock, setFeedStock] = useState({ demarrage: 0, croissance: 0, finition: 0 });
  const [loadingOrder, setLoadingOrder] = useState(null);
  const [isEditingStock, setIsEditingStock] = useState(false);
  const [stockForm, setStockForm] = useState({ demarrage: 0, croissance: 0, finition: 0 });

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (!data.user || data.user.role?.toLowerCase() !== 'admin') router.push('/');
    });

    fetchFarmers();
    fetchOrders();
    fetchStock();

    const interval = setInterval(() => {
      fetchFarmers();
      fetchOrders();
      if (!isEditingStock) fetchStock();
    }, 5000);

    return () => clearInterval(interval);
  }, [router, isEditingStock]);

  const fetchStock = async () => {
    const res = await fetch('/api/stock');
    if (res.ok) {
      const data = await res.json();
      setFeedStock(data);
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/stock', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stockForm)
    });
    if (res.ok) {
      setFeedStock(await res.json());
      setIsEditingStock(false);
      alert('Stock mis à jour avec succès');
    } else {
      alert('Erreur lors de la mise à jour du stock');
    }
  };

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
    const confirmationMsg = status === 'Livrée' 
      ? "Êtes-vous sûr de vouloir marquer cette commande comme livrée ?" 
      : "Confirmer cette commande ?";
    if (!window.confirm(confirmationMsg)) return;

    setLoadingOrder(id);
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setLoadingOrder(null);
    if (res.ok) {
      alert(`Statut mis à jour avec succès : ${status}`);
      fetchOrders();
    } else {
      alert("Erreur lors de la mise à jour");
    }
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

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="panel" style={{ background: '#eff6ff', borderLeft: '4px solid #3b82f6' }}>
          <div className="flex justify-between items-center mb-2">
            <h2 style={{ color: '#1e3a8a', fontSize: '1.2rem', margin: 0 }}>Stock Virtuel (Sacs)</h2>
            {!isEditingStock && <button onClick={() => { setStockForm(feedStock); setIsEditingStock(true); }} className="btn btn-outline" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}}>Modifier</button>}
          </div>
          
          {isEditingStock ? (
            <form onSubmit={handleUpdateStock} className="flex flex-col gap-2 mt-2">
              <div className="flex justify-between items-center">
                <span style={{color: '#1e3a8a'}}>Démarrage:</span>
                <input type="number" min="0" className="input" style={{width: '80px', padding: '0.2rem'}} value={stockForm.demarrage} onChange={e => setStockForm({...stockForm, demarrage: e.target.value})} />
              </div>
              <div className="flex justify-between items-center">
                <span style={{color: '#1e3a8a'}}>Croissance:</span>
                <input type="number" min="0" className="input" style={{width: '80px', padding: '0.2rem'}} value={stockForm.croissance} onChange={e => setStockForm({...stockForm, croissance: e.target.value})} />
              </div>
              <div className="flex justify-between items-center">
                <span style={{color: '#1e3a8a'}}>Finition:</span>
                <input type="number" min="0" className="input" style={{width: '80px', padding: '0.2rem'}} value={stockForm.finition} onChange={e => setStockForm({...stockForm, finition: e.target.value})} />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="submit" className="btn btn-primary" style={{flex: 1, padding: '0.3rem'}}>Enregistrer</button>
                <button type="button" onClick={() => setIsEditingStock(false)} className="btn btn-outline" style={{flex: 1, padding: '0.3rem'}}>Annuler</button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: feedStock.demarrage < 10 ? '#dc2626' : '#2563eb' }}>{feedStock.demarrage}</div>
                <div style={{ fontSize: '0.8rem', color: '#1e3a8a' }}>Démarrage</div>
                {feedStock.demarrage < 10 && <div style={{color: '#dc2626', fontSize: '0.75rem', fontWeight: 'bold'}}>⚠️ Faible</div>}
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: feedStock.croissance < 10 ? '#dc2626' : '#2563eb' }}>{feedStock.croissance}</div>
                <div style={{ fontSize: '0.8rem', color: '#1e3a8a' }}>Croissance</div>
                {feedStock.croissance < 10 && <div style={{color: '#dc2626', fontSize: '0.75rem', fontWeight: 'bold'}}>⚠️ Faible</div>}
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: feedStock.finition < 10 ? '#dc2626' : '#2563eb' }}>{feedStock.finition}</div>
                <div style={{ fontSize: '0.8rem', color: '#1e3a8a' }}>Finition</div>
                {feedStock.finition < 10 && <div style={{color: '#dc2626', fontSize: '0.75rem', fontWeight: 'bold'}}>⚠️ Faible</div>}
              </div>
            </div>
          )}
        </div>
        <div className="panel" style={{ background: '#f0fdf4', borderLeft: '4px solid #10b981' }}>
          <h2 style={{ color: '#064e3b', fontSize: '1.2rem' }}>Éleveurs Inscrits</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#059669', marginTop: '0.5rem' }}>
            {farmers.length}
          </div>
        </div>
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
              {orders.map(o => {
                const orderId = o._id || o.id;
                return (
                <tr key={orderId} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>#{orderId.toString().substring(0, 8)}</td>
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
                    {o.status === 'En attente' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ fontSize:'0.8rem', marginRight:'0.5rem', padding: '0.4rem 0.8rem' }} 
                        onClick={() => updateOrderStatus(orderId, 'Confirmée')}
                        disabled={loadingOrder === orderId}
                      >
                        {loadingOrder === orderId ? <span className="spinner"></span> : 'Confirmer'}
                      </button>
                    )}
                    {o.status === 'Confirmée' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ fontSize:'0.8rem', padding: '0.4rem 0.8rem' }} 
                        onClick={() => updateOrderStatus(orderId, 'Livrée')}
                        disabled={loadingOrder === orderId}
                      >
                        {loadingOrder === orderId ? <span className="spinner"></span> : 'Livrer'}
                      </button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>


    </div>
  );
}
