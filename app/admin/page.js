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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (!data.user || data.user.role?.toLowerCase() !== 'admin') router.push('/admin/login');
    });

    fetchFarmers();
    fetchOrders();
    fetchStock();
    fetchLocations();

    const interval = setInterval(() => {
      fetchFarmers();
      fetchOrders();
      if (!isEditingStock) fetchStock();
      fetchLocations();
    }, 5000);

    return () => clearInterval(interval);
  }, [router, isEditingStock]);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setPushEnabled(!!subscription);
        });
      });
    }
  }, []);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert("Votre navigateur ne supporte pas les notifications push.");
      return;
    }

    setPushLoading(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("Vous devez autoriser les notifications pour activer les alertes.");
        setPushLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("Clé publique VAPID introuvable.");
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      if (res.ok) {
        setPushEnabled(true);
        alert("🔔 Alertes activées avec succès sur cet appareil !");
      } else {
        const errData = await res.json();
        alert(`Échec de l'activation : ${errData.error || 'Erreur inconnue'}`);
      }
    } catch (e) {
      console.error('Subscription failed:', e);
      alert(`Erreur d'activation : ${e.message}`);
    }

    setPushLoading(false);
  };

  const fetchLocations = async () => {
    const res = await fetch('/api/locations');
    if (res.ok) {
      setLocations(await res.json());
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLocation })
    });
    if (res.ok) {
      setNewLocation('');
      fetchLocations();
    } else {
      const data = await res.json();
      alert(data.error || 'Erreur lors de l\'ajout de la zone');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette zone ?')) return;
    const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchLocations();
    }
  };

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
    const res = await fetch('/api/orders', { cache: 'no-store' });
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
    router.push('/admin/login');
  };

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-4 mt-2">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.jpeg" alt="AGRO KING Logo" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
          <h1 style={{color: 'var(--accent-secondary)'}}>Tableau de Bord Administrateur</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            onClick={handleSubscribePush} 
            className="btn btn-outline" 
            disabled={pushLoading}
            style={{ 
              padding: '0.5rem 1rem', 
              borderColor: pushEnabled ? 'var(--accent-primary)' : 'inherit',
              color: pushEnabled ? 'var(--accent-primary)' : 'inherit',
              fontWeight: pushEnabled ? 'bold' : 'normal'
            }}
          >
            {pushLoading ? 'Activation...' : (pushEnabled ? '🔔 Alertes Actives' : '🔕 Activer les alertes')}
          </button>
          <button onClick={handleLogout} className="btn btn-outline" style={{padding: '0.5rem 1rem'}}>Déconnexion</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--panel-border)' }}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'dashboard' ? '2px solid var(--accent-primary)' : 'none', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', color: activeTab === 'dashboard' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal', cursor: 'pointer' }}
        >
          Tableau de Bord
        </button>
        <button 
          onClick={() => setActiveTab('locations')} 
          style={{ padding: '0.5rem 1rem', borderBottom: activeTab === 'locations' ? '2px solid var(--accent-primary)' : 'none', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', color: activeTab === 'locations' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'locations' ? 'bold' : 'normal', cursor: 'pointer' }}
        >
          Zones de Livraison
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {orders.map(o => {
              const orderId = o._id || o.id;
              
              // Calculate specific stage content for display
              let orderContentList = [];
              if (o.is_aliments_seuls) {
                orderContentList.push(`${o.bags || 0} sacs d'Aliments (${o.pack_type})`);
              } else if (o.pack_type === 'Pack Sur Mesure') {
                orderContentList.push(`${o.chicks || 0} Poussins d'un jour`);
                orderContentList.push(`Sacs au prorata (${Math.ceil(o.chicks / 100 * 10)} total)`);
              } else if (o.chicks) {
                orderContentList.push(`${o.chicks || 0} Poussins d'un jour`);
                orderContentList.push('Aliments Démarrage + Croissance + Finition');
              } else {
                 orderContentList.push(o.pack_type);
              }

              return (
                <div key={orderId} style={{ background: '#ffffff', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-soft)' }}>
                  <div className="flex justify-between items-start mb-4" style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reçu N° {orderId.toString().substring(0, 8).toUpperCase()}</span>
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-secondary)', marginTop: '0.2rem' }}>{o.farmer_name}</h3>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                        <span>📞 {o.phone}</span>
                      </div>
                    </div>
                    <span className={`badge ${o.status === 'Livrée' ? 'badge-success' : (o.status === 'Confirmée' ? 'badge-primary' : 'badge-warning')}`}>
                      {o.status}
                    </span>
                  </div>

                  <div className="mb-4">
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contenu de la commande</strong>
                    <ul style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: 'var(--accent-secondary)' }}>
                      {orderContentList.map((item, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ color: 'var(--accent-primary)' }}>•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
                      <span className="text-muted">Date de commande:</span>
                      <strong>{new Date(o.created_at || o._id.getTimestamp?.() || '2024-01-01').toLocaleDateString('fr-FR')}</strong>
                    </div>
                    <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
                      <span className="text-muted">Date 1ère livraison:</span>
                      <strong style={{ color: o.delivery_date ? 'var(--accent-primary)' : 'inherit' }}>
                        {o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('fr-FR') : 'Non spécifiée'}
                      </strong>
                    </div>
                    <div className="flex justify-between" style={{ fontSize: '0.9rem' }}>
                      <span className="text-muted">Lieu de livraison:</span>
                      <strong>
                        {o.delivery_location}
                        {o.coordinates && (
                          <a href={`https://www.google.com/maps?q=${o.coordinates.lat},${o.coordinates.lng}`} target="_blank" rel="noreferrer" style={{ marginLeft: '0.5rem', color: 'var(--accent-info)', textDecoration: 'none' }}>📍</a>
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {o.status === 'En attente' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '0.6rem' }} 
                        onClick={() => updateOrderStatus(orderId, 'Confirmée')}
                        disabled={loadingOrder === orderId}
                      >
                        {loadingOrder === orderId ? <span className="spinner"></span> : 'Valider la commande'}
                      </button>
                    )}
                    {o.status === 'Confirmée' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ flex: 1, padding: '0.6rem', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }} 
                        onClick={() => updateOrderStatus(orderId, 'Livrée')}
                        disabled={loadingOrder === orderId}
                      >
                        {loadingOrder === orderId ? <span className="spinner"></span> : 'Marquer l\'étape comme Livrée'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  )}

      {activeTab === 'locations' && (
        <div className="panel">
          <div className="flex justify-between items-center mb-4">
            <h2 style={{color: 'var(--accent-secondary)'}}>Zones de Livraison</h2>
          </div>
          
          <form onSubmit={handleAddLocation} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Ex: Yaoundé - Mendong" 
              value={newLocation} 
              onChange={(e) => setNewLocation(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            <button type="submit" className="btn btn-primary">Ajouter</button>
          </form>

          {locations.length === 0 ? (
            <p className="text-muted">Aucune zone de livraison configurée.</p>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Nom de la zone</th>
                  <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '100px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => (
                  <tr key={loc._id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--accent-secondary)' }}>{loc.name}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <button 
                        onClick={() => handleDeleteLocation(loc._id)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
}
