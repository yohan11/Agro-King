'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import GlobalLoader from '@/components/GlobalLoader';
import InstallAppBanner from '@/components/InstallAppBanner';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

export default function FarmerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('order'); // 'order' | 'orders' | 'cycles' | 'account'
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isPageLoading, setIsPageLoading] = useState(false);
  
  // Order flow state
  const [selectedPack, setSelectedPack] = useState(null);
  const [customChicks, setCustomChicks] = useState('');
  const [feedBags, setFeedBags] = useState({ demarrage: 0, croissance: 0, finition: 0 });
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [nextDeliveryPref, setNextDeliveryPref] = useState('auto');
  const [nextDeliveryDate, setNextDeliveryDate] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [expandedCycleId, setExpandedCycleId] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const packs = [
    {
      id: "100",
      chicks: 100,
      name: "Pack 100 poussins",
      price: "150 000 FCFA",
      badge: "Recommandé",
      details: [
        "100 poussins d'un jour vaccinés",
        "1 sac aliment démarrage (50kg)",
        "2 sacs aliment croissance 1",
        "2 sacs aliment croissance 2",
        "5 sacs aliment finition",
        "Livraison progressive selon vos stades"
      ]
    },
    {
      id: "200",
      chicks: 200,
      name: "Pack 200 poussins",
      price: "300 000 FCFA",
      badge: "Populaire",
      details: [
        "200 poussins d'un jour vaccinés",
        "2 sacs aliment démarrage",
        "4 sacs aliment croissance 1",
        "4 sacs aliment croissance 2",
        "10 sacs aliment finition",
        "Livraison progressive selon vos stades"
      ]
    },
    {
      id: "custom",
      name: "Pack Sur Mesure",
      price: "Calcul automatique",
      badge: "Flexibilité",
      details: [
        "Choisissez votre quantité exacte de poussins.",
        "Calcul automatique du plan d'alimentation.",
        "10 sacs d'aliments par tranche de 100 poussins.",
        "Suivi et livraisons échelonnées."
      ]
    },
    {
      id: "aliments",
      name: "Aliments Seuls",
      price: "Au choix par sac",
      badge: "Alimentation",
      details: [
        "Démarrage : 22 500 FCFA / sac",
        "Croissance : 21 500 FCFA / sac",
        "Finition : 19 500 FCFA / sac",
        "Idéal si vos poussins sont déjà en ferme."
      ]
    }
  ];

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCycles = async () => {
    try {
      const res = await fetch('/api/cycles');
      if (res.ok) setCycles(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) setLocations(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (!data.user || data.user.role !== 'Farmer') {
        router.push('/');
      } else {
        setUser(data.user);
        if (data.user.location) setDeliveryLocation(data.user.location);
        if (data.user.coordinates) setCoordinates(data.user.coordinates);
        fetchOrders();
        fetchCycles();
        fetchLocations();
      }
    });

    const interval = setInterval(() => {
      fetchOrders();
      fetchCycles();
      fetchLocations();
    }, 6000);

    return () => clearInterval(interval);
  }, [router]);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPack) return;
    
    if (selectedPack.id === 'custom' && Number(customChicks) <= 0) {
      return alert('Veuillez entrer un nombre valide de poussins.');
    }
    if (selectedPack.id === 'aliments' && feedBags.demarrage === 0 && feedBags.croissance === 0 && feedBags.finition === 0) {
      return alert('Veuillez sélectionner au moins 1 sac d\'aliment.');
    }

    // Auto-add new location if it doesn't exist
    if (deliveryLocation && !locations.some(l => l.name.toLowerCase() === deliveryLocation.toLowerCase())) {
      fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deliveryLocation })
      }).catch(console.error);
    }

    setShowPayment(true);
  };

  const confirmPaymentAndSubmit = async () => {
    let pref = nextDeliveryPref === 'date' ? `Date demandée: ${nextDeliveryDate}` : 'Rappels automatiques activés';
    setLoadingPayment(true);

    let amount = 0;
    let orderDetails = {
      delivery_location: deliveryLocation,
      delivery_date: deliveryDate,
      next_bags_delivery_preference: pref,
      coordinates,
      is_aliments_seuls: selectedPack.id === 'aliments'
    };

    if (selectedPack.id === '100') {
      amount = 150000;
      orderDetails.chicks = 100;
      orderDetails.pack_type = selectedPack.name;
    } else if (selectedPack.id === '200') {
      amount = 300000;
      orderDetails.chicks = 200;
      orderDetails.pack_type = selectedPack.name;
    } else if (selectedPack.id === 'aliments') {
      amount = (feedBags.demarrage * 22500) + (feedBags.croissance * 21500) + (feedBags.finition * 19500);
      orderDetails.chicks = 0;
      orderDetails.bags = feedBags.demarrage + feedBags.croissance + feedBags.finition;
      orderDetails.feed_breakdown = feedBags;
      orderDetails.pack_type = 'Aliments Seuls';
    } else {
      amount = Number(customChicks) * 1500;
      orderDetails.chicks = Number(customChicks);
      orderDetails.pack_type = 'Pack Sur Mesure';
    }

    try {
      const payRes = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          packType: orderDetails.pack_type,
          farmerId: user.id,
          orderDetails
        })
      });

      if (payRes.ok) {
        const payData = await payRes.json();
        if (payData.transactionUrl) {
          window.location.href = payData.transactionUrl;
          return;
        }
      }
      
      const errorData = await payRes.json();
      alert(`Erreur PayUnit : ${errorData.error || 'Impossible d\'initialiser le paiement.'}`);
      setLoadingPayment(false);
    } catch (e) {
      console.error('PayUnit init error:', e);
      alert('Erreur de connexion au système de paiement.');
      setLoadingPayment(false);
    }
  };

  const handleRestockRequest = async (cycle) => {
    const sacsReq = cycle.next_stage_sacs || 'les prochains';
    const confirmer = window.confirm(`Confirmer la demande de livraison des sacs pour l'étape suivante (${sacsReq} sacs) ?`);
    if (!confirmer) return;

    setIsPageLoading(true);
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chicks: 0,
        pack_type: `Réapprovisionnement Aliment (${sacsReq} sacs)`,
        delivery_location: user.location || "À la ferme (Lieu habituel)",
      })
    });
    await fetchOrders();
    setIsPageLoading(false);
    setActiveTab('orders');
    alert('Demande de réapprovisionnement transmise ! Vous pouvez la suivre dans l\'onglet Mes Commandes.');
  };

  const handleLogout = async () => {
    setIsPageLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (!user) return <GlobalLoader text="Chargement de votre espace..." />;

  const pendingOrdersCount = orders.filter(o => !['livré', 'livrée', 'livree', 'annulé', 'annulée', 'annulee'].includes((o.status || '').toLowerCase())).length;
  const activeCyclesCount = cycles.filter(c => c.current_stage !== 'Cycle Terminé').length;

  return (
    <div className="app-shell">
      
      {/* Top Mobile Bar */}
      <header className="mobile-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <img 
            src="/logo.jpeg" 
            alt="Logo" 
            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} 
          />
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--accent-secondary)', lineHeight: 1.2 }}>
              {user.name}
            </div>
            {user.unique_id && (
              <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                {user.unique_id}
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={handleLogout} 
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}
        >
          <span>🚪</span> Déconnexion
        </button>
      </header>

      {/* Main Content Area */}
      <main className="container">
        
        {/* TAB 1: COMMANDER */}
        {activeTab === 'order' && (
          <div className="animate-fade-in">
            <InstallAppBanner />
            
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--accent-secondary)', marginBottom: '0.2rem' }}>Commander Poussins & Aliments</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Sélectionnez votre formule pour lancer votre élevage.
              </p>
            </div>

            {!selectedPack ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {packs.map(pack => (
                  <div 
                    key={pack.id} 
                    className="pack-card"
                    onClick={() => setSelectedPack(pack)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--accent-secondary)' }}>{pack.name}</strong>
                      <span className="badge badge-success">{pack.price}</span>
                    </div>

                    <ul style={{ paddingLeft: '1.1rem', color: '#475569', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                      {pack.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>

                    <button className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '0.88rem' }}>
                      Choisir ce pack ➔
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
                  <button 
                    onClick={() => { setSelectedPack(null); setShowPayment(false); }} 
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.82rem' }}
                  >
                    ← Changer de pack
                  </button>
                  <strong style={{ color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{selectedPack.name}</strong>
                </div>

                {showPayment ? (
                  <div style={{ background: '#eff6ff', padding: '1.2rem', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                    <h3 style={{ color: '#1e3a8a', marginBottom: '0.5rem', fontSize: '1.05rem' }}>Paiement Sécurisé</h3>
                    <p style={{ color: '#1e40af', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.4 }}>
                      Vous allez être redirigé vers le portail <strong>PayUnit</strong> pour régler par <strong>Orange Money, MTN Mobile Money</strong> ou Carte Bancaire.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={() => setShowPayment(false)} 
                        disabled={loadingPayment}
                        style={{ flex: 1 }}
                      >
                        Annuler
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={confirmPaymentAndSubmit} 
                        disabled={loadingPayment}
                        style={{ flex: 2 }}
                      >
                        {loadingPayment ? 'Connexion...' : 'Valider & Payer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedPack.id === 'custom' && (
                      <div>
                        <label className="label">Nombre de poussins souhaités</label>
                        <input 
                          type="number" 
                          min="1" 
                          required 
                          className="input"
                          value={customChicks}
                          onChange={e => setCustomChicks(e.target.value)}
                          placeholder="Ex: 150"
                        />
                      </div>
                    )}

                    {selectedPack.id === 'aliments' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label className="label">Quantités d'aliments (Sacs de 50kg)</label>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="number" 
                            min="0" 
                            className="input" 
                            style={{ width: '80px', textAlign: 'center' }} 
                            value={feedBags.demarrage || ''} 
                            onChange={e => setFeedBags({...feedBags, demarrage: parseInt(e.target.value) || 0})} 
                            placeholder="0" 
                          />
                          <span style={{ fontSize: '0.82rem', color: '#334155' }}>Démarrage (22 500 F)</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="number" 
                            min="0" 
                            className="input" 
                            style={{ width: '80px', textAlign: 'center' }} 
                            value={feedBags.croissance || ''} 
                            onChange={e => setFeedBags({...feedBags, croissance: parseInt(e.target.value) || 0})} 
                            placeholder="0" 
                          />
                          <span style={{ fontSize: '0.82rem', color: '#334155' }}>Croissance (21 500 F)</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="number" 
                            min="0" 
                            className="input" 
                            style={{ width: '80px', textAlign: 'center' }} 
                            value={feedBags.finition || ''} 
                            onChange={e => setFeedBags({...feedBags, finition: parseInt(e.target.value) || 0})} 
                            placeholder="0" 
                          />
                          <span style={{ fontSize: '0.82rem', color: '#334155' }}>Finition (19 500 F)</span>
                        </div>

                        <div style={{ fontWeight: '700', color: 'var(--accent-primary)', textAlign: 'right', fontSize: '0.95rem' }}>
                          Total : {((feedBags.demarrage * 22500) + (feedBags.croissance * 21500) + (feedBags.finition * 19500)).toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="label">Date de livraison souhaitée (Poussins & 1ers sacs)</label>
                      <input 
                        type="date" 
                        min={todayStr} 
                        className="input" 
                        required 
                        value={deliveryDate} 
                        onChange={e => setDeliveryDate(e.target.value)} 
                      />
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                      <label className="label">Livraison des étapes suivantes (Sacs restants)</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <button 
                          type="button" 
                          onClick={() => setNextDeliveryPref('auto')} 
                          className={`btn btn-sm ${nextDeliveryPref === 'auto' ? 'btn-primary' : 'btn-outline'}`} 
                          style={{ flex: 1, fontSize: '0.78rem' }}
                        >
                          🔔 Rappel automatique
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setNextDeliveryPref('date')} 
                          className={`btn btn-sm ${nextDeliveryPref === 'date' ? 'btn-primary' : 'btn-outline'}`} 
                          style={{ flex: 1, fontSize: '0.78rem' }}
                        >
                          📅 Définir date
                        </button>
                      </div>
                      
                      {nextDeliveryPref === 'date' && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <label className="label" style={{ fontSize: '0.78rem' }}>Date estimée de la prochaine étape</label>
                          <input 
                            type="date" 
                            min={todayStr} 
                            className="input" 
                            required={nextDeliveryPref === 'date'} 
                            value={nextDeliveryDate} 
                            onChange={e => setNextDeliveryDate(e.target.value)} 
                          />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="label">Localisation de la ferme</label>
                      <input 
                        type="text" 
                        list="locations-list" 
                        className="input" 
                        placeholder="Ex: Douala - Logbessou" 
                        required 
                        value={deliveryLocation}
                        onChange={e => setDeliveryLocation(e.target.value)} 
                      />
                      <datalist id="locations-list">
                        {locations.map(loc => (
                          <option key={loc._id} value={loc.name} />
                        ))}
                      </datalist>
                      
                      <div style={{ marginTop: '0.65rem' }}>
                        <MapPicker 
                          coordinates={coordinates} 
                          onLocationSelect={setCoordinates} 
                          onAddressResolve={setDeliveryLocation}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                      Continuer vers le paiement ➔
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MES COMMANDES */}
        {activeTab === 'orders' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--accent-secondary)', marginBottom: '0.2rem' }}>Mes Commandes</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Historique et suivi de vos approvisionnements.
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="panel" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
                <h3 style={{ color: '#475569', fontSize: '1rem' }}>Aucune commande pour le moment</h3>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Vos commandes de poussins et aliments apparaîtront ici.
                </p>
                <button onClick={() => setActiveTab('order')} className="btn btn-primary btn-sm">
                  Passer ma première commande
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {orders.map(o => {
                  const s = (o.status || '').toLowerCase();
                  const isDelivered = s === 'livre' || s === 'livrée' || s === 'livree';
                  const isPaid = s === 'payée' || s === 'payee' || s === 'confirmée' || s === 'confirmee' || o.paymentStatus === 'PAID' || o.paid === true;
                  const isCancelled = s === 'annule' || s === 'annulée' || s === 'annulee';

                  let badgeClass = 'badge-warning';
                  let badgeText = o.status || 'En attente';
                  if (isDelivered) {
                    badgeClass = 'badge-success';
                    badgeText = 'Livrée ✅';
                  } else if (isPaid) {
                    badgeClass = 'badge-primary';
                    badgeText = 'Payée 💳';
                  } else if (isCancelled) {
                    badgeClass = 'badge-outline';
                    badgeText = 'Annulée ❌';
                  }

                  return (
                    <div key={o.id || o._id} className="panel" style={{ margin: 0, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--accent-secondary)' }}>
                          {o.pack_type || `${o.chicks} Poussins`}
                        </strong>
                        <span className={`badge ${badgeClass}`}>
                          {badgeText}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {o.chicks > 0 && <div>🐣 <strong>{o.chicks}</strong> poussins</div>}
                        <div>📍 {o.delivery_location}</div>
                        {o.delivery_date && <div>📅 Prévue le : {new Date(o.delivery_date).toLocaleDateString('fr-FR')}</div>}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.5rem' }}>
                        <button 
                          onClick={() => router.push(`/receipt/${o.id || o._id}`)} 
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.78rem' }}
                        >
                          📄 Voir le Reçu
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MON ELEVAGE (CYCLES) */}
        {activeTab === 'cycles' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--accent-secondary)', marginBottom: '0.2rem' }}>Mon Élevage & Suivi</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Suivez la croissance de vos poussins et anticipez les aliments.
              </p>
            </div>

            {cycles.length === 0 ? (
              <div className="panel" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📈</div>
                <h3 style={{ color: '#475569', fontSize: '1rem' }}>Aucun cycle d'élevage actif</h3>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  Votre cycle s'active automatiquement dès la validation d'une commande de poussins.
                </p>
                <button onClick={() => setActiveTab('order')} className="btn btn-primary btn-sm">
                  Commander des poussins
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {cycles.map(c => {
                  const isExpanded = expandedCycleId === (c.id || c._id);
                  return (
                    <div key={c.id || c._id} className="panel" style={{ margin: 0, padding: '1.1rem' }}>
                      <div 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setExpandedCycleId(isExpanded ? null : (c.id || c._id))}
                      >
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--accent-secondary)', display: 'block' }}>
                            {c.chicks} Poussins
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pack {c.pack_id}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-success" style={{ fontSize: '0.82rem' }}>
                            Jour {c.current_day}
                          </span>
                          <span style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            ▾
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--panel-border)' }} className="animate-fade-in">
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Étape Actuelle</div>
                              <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{c.current_stage}</strong>
                              {c.sacs_needed > 0 && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--accent-secondary)', marginTop: '0.2rem' }}>
                                  {c.sacs_needed} sacs requis
                                </div>
                              )}
                            </div>

                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Guide de Croissance</div>
                              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem', lineHeight: 1.3 }}>
                                • J1-14: Démarrage<br />
                                • J15-28: Croissance<br />
                                • J29-45: Finition
                              </div>
                            </div>
                          </div>

                          {/* Quick Restock Action */}
                          {c.reminder_active && c.next_stage_sacs > 0 ? (
                            <div style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '0.85rem', borderRadius: '10px', marginTop: '0.5rem' }}>
                              <strong style={{ color: '#065f46', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem' }}>
                                🔔 Fin d'étape imminente
                              </strong>
                              <p style={{ fontSize: '0.78rem', color: '#047857', marginBottom: '0.6rem' }}>
                                Demandez vos <strong>{c.next_stage_sacs} sacs</strong> d'aliment pour la prochaine étape de croissance.
                              </p>
                              <button onClick={() => handleRestockRequest(c)} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                                ✅ Confirmer la livraison des sacs
                              </button>
                            </div>
                          ) : (
                            c.current_stage !== 'Cycle Terminé' && (
                              <button 
                                onClick={() => handleRestockRequest(c)} 
                                className="btn btn-outline btn-sm" 
                                style={{ width: '100%', fontSize: '0.8rem', marginTop: '0.35rem' }}
                              >
                                🚚 Demander les sacs de l'étape suivante en avance
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MON COMPTE */}
        {activeTab === 'account' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--accent-secondary)', marginBottom: '0.2rem' }}>Mon Compte Éleveur</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Vos informations et paramètres de l'application.
              </p>
            </div>

            <InstallAppBanner />

            <div className="panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--accent-light)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: '800'
                }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'E'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{user.name}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📞 {user.phone}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Identifiant Unique</span>
                  <strong style={{ color: 'var(--accent-secondary)' }}>{user.unique_id || 'Non assigné'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Localisation enregistrée</span>
                  <strong style={{ color: '#334155' }}>{user.location || 'Non renseignée'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Type de compte</span>
                  <span className="badge badge-success">Éleveur Partenaire</span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <a 
                  href="https://wa.me/237699000000?text=Bonjour%20Agro-King,%20j'ai%20une%20question%20concernant%20mon%20élevage."
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#047857' }}
                >
                  <span>💬</span> Contacter l'Assistance WhatsApp
                </a>

                <button 
                  onClick={handleLogout} 
                  className="btn btn-outline btn-sm"
                  style={{ color: '#dc2626', borderColor: '#fecaca' }}
                >
                  🚪 Déconnexion de mon compte
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Modern Smartphone Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button 
          onClick={() => { setActiveTab('order'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
          className={`nav-tab ${activeTab === 'order' ? 'active' : ''}`}
        >
          <span className="nav-icon">🐣</span>
          <span className="nav-label">Commander</span>
        </button>

        <button 
          onClick={() => { setActiveTab('orders'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
          className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
        >
          <span className="nav-icon" style={{ position: 'relative' }}>
            📦
            {pendingOrdersCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-8px',
                background: '#e11d48',
                color: '#fff',
                borderRadius: '50%',
                fontSize: '0.65rem',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
              }}>
                {pendingOrdersCount}
              </span>
            )}
          </span>
          <span className="nav-label">Commandes</span>
        </button>

        <button 
          onClick={() => { setActiveTab('cycles'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
          className={`nav-tab ${activeTab === 'cycles' ? 'active' : ''}`}
        >
          <span className="nav-icon" style={{ position: 'relative' }}>
            📈
            {activeCyclesCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-8px',
                background: 'var(--accent-primary)',
                color: '#fff',
                borderRadius: '50%',
                fontSize: '0.65rem',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
              }}>
                {activeCyclesCount}
              </span>
            )}
          </span>
          <span className="nav-label">Élevage</span>
        </button>

        <button 
          onClick={() => { setActiveTab('account'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
          className={`nav-tab ${activeTab === 'account' ? 'active' : ''}`}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Compte</span>
        </button>
      </nav>

      {/* Global Loaders */}
      {(loadingPayment || isPageLoading) && (
        <GlobalLoader text={loadingPayment ? "Connexion sécurisée PayUnit..." : "Traitement en cours..."} />
      )}

    </div>
  );
}
