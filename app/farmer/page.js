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
  const [includeReformOption, setIncludeReformOption] = useState(false);
  const [feedBags, setFeedBags] = useState({ demarrage: 0, croissance: 0, finition: 0 });
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [nextDeliveryPref, setNextDeliveryPref] = useState('auto');
  const [nextDeliveryDate, setNextDeliveryDate] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [expandedCycleId, setExpandedCycleId] = useState(null);

  // Mortality declaration state
  const [editingMortalityCycleId, setEditingMortalityCycleId] = useState(null);
  const [mortalityInput, setMortalityInput] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const packs = [
    {
      id: "100",
      chicks: 100,
      name: "Pack 100 poussins",
      price: "270 000 FCFA",
      rawPrice: 270000,
      badge: "Formule Complète",
      details: [
        "🐣 100 poussins d'un jour vaccinés",
        "🥣 10 sacs d'aliments 50kg au total :",
        "   • 1 sac Démarrage (J1 à J14)",
        "   • 4 sacs Croissance (J15 à J28)",
        "   • 5 sacs Finition (J29 à J45)",
        "🚚 Livraisons échelonnées incluses",
        "📈 Suivi de croissance & rappels automatiques"
      ]
    },
    {
      id: "200",
      chicks: 200,
      name: "Pack 200 poussins",
      price: "540 000 FCFA",
      rawPrice: 540000,
      badge: "Recommandé Pro",
      details: [
        "🐣 200 poussins d'un jour vaccinés",
        "🥣 20 sacs d'aliments 50kg au total :",
        "   • 2 sacs Démarrage (J1 à J14)",
        "   • 8 sacs Croissance (J15 à J28)",
        "   • 10 sacs Finition (J29 à J45)",
        "🚚 Livraisons échelonnées incluses",
        "📈 Suivi de croissance & rappels automatiques"
      ]
    },
    {
      id: "reform",
      name: "Pack Extension Réforme",
      price: "97 500 FCFA",
      rawPrice: 97500,
      badge: "Poulets Lourds 60J",
      details: [
        "🏆 Pour vente à ~6 500 FCFA l'unité (au lieu de 3 500 F)",
        "🥣 4 sacs de Finition supplémentaires (50kg)",
        "📅 Prolongation du cycle de 45 à 60 jours",
        "💰 Maximise le bénéfice net de votre élevage"
      ]
    },
    {
      id: "custom",
      name: "Pack Sur Mesure",
      price: "2 700 FCFA / poussin",
      badge: "Flexibilité",
      details: [
        "🐣 Quantité libre de poussins (ex: 150, 300, 500...)",
        "🥣 Ratio exact : 10 sacs d'aliments pour 100 poussins",
        "🚚 Livraisons échelonnées à votre rythme",
        "💰 Calcul automatique du montant et du plan d'alimentation"
      ]
    },
    {
      id: "aliments",
      name: "Aliments Seuls",
      price: "Au choix par sac",
      badge: "Alimentation",
      details: [
        "🥣 Démarrage (50kg) : 22 500 FCFA / sac",
        "🥣 Croissance (50kg) : 21 500 FCFA / sac",
        "🥣 Finition (50kg) : 19 500 FCFA / sac",
        "🚚 Idéal pour réapprovisionner une bande existante"
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

  // Total order amount calculation
  const computeOrderAmount = () => {
    if (!selectedPack) return 0;
    if (selectedPack.id === '100') {
      return 270000 + (includeReformOption ? 97500 : 0);
    }
    if (selectedPack.id === '200') {
      return 540000 + (includeReformOption ? 195000 : 0);
    }
    if (selectedPack.id === 'reform') {
      return 97500;
    }
    if (selectedPack.id === 'aliments') {
      return (feedBags.demarrage * 22500) + (feedBags.croissance * 21500) + (feedBags.finition * 19500);
    }
    if (selectedPack.id === 'custom') {
      const cnt = Number(customChicks) || 0;
      const base = cnt * 2700;
      const reformAdd = includeReformOption ? (cnt * 975) : 0;
      return base + reformAdd;
    }
    return 0;
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPack) return;
    
    if (selectedPack.id === 'custom' && Number(customChicks) <= 0) {
      return alert('Veuillez entrer un nombre valide de poussins.');
    }
    if (selectedPack.id === 'aliments' && feedBags.demarrage === 0 && feedBags.croissance === 0 && feedBags.finition === 0) {
      return alert('Veuillez sélectionner au moins 1 sac d\'aliment.');
    }

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

    const amount = computeOrderAmount();
    let orderDetails = {
      delivery_location: deliveryLocation,
      delivery_date: deliveryDate,
      next_bags_delivery_preference: pref,
      coordinates,
      is_aliments_seuls: selectedPack.id === 'aliments',
      is_reform: selectedPack.id === 'reform' || includeReformOption
    };

    if (selectedPack.id === '100') {
      orderDetails.chicks = 100;
      orderDetails.pack_type = includeReformOption ? "Pack 100 poussins (+ Extension Réforme 60J)" : "Pack 100 poussins";
      orderDetails.feed_breakdown = { demarrage: 1, croissance: 4, finition: includeReformOption ? 9 : 5 };
    } else if (selectedPack.id === '200') {
      orderDetails.chicks = 200;
      orderDetails.pack_type = includeReformOption ? "Pack 200 poussins (+ Extension Réforme 60J)" : "Pack 200 poussins";
      orderDetails.feed_breakdown = { demarrage: 2, croissance: 8, finition: includeReformOption ? 18 : 10 };
    } else if (selectedPack.id === 'reform') {
      orderDetails.chicks = 0;
      orderDetails.bags = 4;
      orderDetails.pack_type = "Pack Extension Réforme (4 sacs finition)";
      orderDetails.feed_breakdown = { demarrage: 0, croissance: 0, finition: 4 };
    } else if (selectedPack.id === 'aliments') {
      orderDetails.chicks = 0;
      orderDetails.bags = feedBags.demarrage + feedBags.croissance + feedBags.finition;
      orderDetails.feed_breakdown = feedBags;
      orderDetails.pack_type = 'Aliments Seuls';
    } else {
      const cnt = Number(customChicks);
      const mult = cnt / 100;
      orderDetails.chicks = cnt;
      orderDetails.pack_type = includeReformOption ? `Pack Sur Mesure (${cnt} poussins + Réforme 60J)` : `Pack Sur Mesure (${cnt} poussins)`;
      orderDetails.feed_breakdown = {
        demarrage: Math.round(1 * mult),
        croissance: Math.round(4 * mult),
        finition: Math.round((includeReformOption ? 9 : 5) * mult)
      };
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
        pack_type: `Livraison Échelonnée (${sacsReq} sacs)`,
        delivery_location: user.location || "À la ferme (Lieu habituel)",
      })
    });
    await fetchOrders();
    setIsPageLoading(false);
    setActiveTab('orders');
    alert('Demande de livraison transmise ! Vous pouvez la suivre dans l\'onglet Mes Commandes.');
  };

  const handleActivateReformOnCycle = async (cycle) => {
    const mult = (cycle.chicks || 100) / 100;
    const sacs = 4 * mult;
    const price = 97500 * mult;

    const confirmer = window.confirm(
      `Voulez-vous activer l'Extension Réforme pour vos ${cycle.chicks} volailles ?\n\n` +
      `• Prolongation du cycle de 45 à 60 jours\n` +
      `• Commande de ${sacs} sacs de Finition supplémentaires (${price.toLocaleString('fr-FR')} FCFA)\n` +
      `• Vente estimée à ~6 500 FCFA / poulet lourd\n\n` +
      `Cliquez sur OK pour commander le réapprovisionnement.`
    );
    if (!confirmer) return;

    setSelectedPack(packs.find(p => p.id === 'reform'));
    setActiveTab('order');
  };

  const handleSaveMortality = async (cycleId) => {
    const count = Number(mortalityInput);
    if (isNaN(count) || count < 0) {
      return alert('Veuillez entrer un nombre valide de pertes.');
    }

    setIsPageLoading(true);
    try {
      const res = await fetch('/api/cycles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId,
          mortality_count: count
        })
      });

      if (res.ok) {
        await fetchCycles();
        setEditingMortalityCycleId(null);
        setMortalityInput('');
      } else {
        alert('Erreur lors de l\'enregistrement de la mortalité.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau.');
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsPageLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (!user) return <GlobalLoader text="Chargement de votre espace..." />;

  const pendingOrdersCount = orders.filter(o => !['livré', 'livrée', 'livree', 'annulé', 'annulée', 'annulee'].includes((o.status || '').toLowerCase())).length;
  const activeCyclesCount = cycles.filter(c => !c.current_stage?.includes('Terminé')).length;

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

      {/* Modern Top Segmented Tabs Navigation Bar */}
      <nav className="top-tabs-wrapper">
        <div className="top-tabs-nav">
          <button 
            onClick={() => setActiveTab('order')} 
            className={`top-tab-btn ${activeTab === 'order' ? 'active' : ''}`}
          >
            <span className="tab-icon">🐣</span>
            <span className="tab-label">Commander</span>
          </button>

          <button 
            onClick={() => setActiveTab('orders')} 
            className={`top-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          >
            <span className="tab-icon">📦</span>
            <span className="tab-label">Commandes</span>
            {pendingOrdersCount > 0 && <span className="top-tab-badge">{pendingOrdersCount}</span>}
          </button>

          <button 
            onClick={() => setActiveTab('cycles')} 
            className={`top-tab-btn ${activeTab === 'cycles' ? 'active' : ''}`}
          >
            <span className="tab-icon">📈</span>
            <span className="tab-label">Élevage</span>
            {activeCyclesCount > 0 && <span className="top-tab-badge">{activeCyclesCount}</span>}
          </button>

          <button 
            onClick={() => setActiveTab('account')} 
            className={`top-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          >
            <span className="tab-icon">👤</span>
            <span className="tab-label">Profil</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="container">
        
        {/* TAB 1: COMMANDER */}
        {activeTab === 'order' && (
          <div className="animate-fade-in">
            <InstallAppBanner />
            
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--accent-secondary)', marginBottom: '0.2rem' }}>Formules & Commandes</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Poussins d'un jour vaccinés + Aliments complets + Livraisons échelonnées.
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
                      Sélectionner ➔
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
                    <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                        <span>Montant à régler :</span>
                        <strong style={{ fontSize: '1.15rem', color: '#1d4ed8' }}>{computeOrderAmount().toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Formule : {selectedPack.name} {includeReformOption ? '(avec Option Réforme 60J)' : ''}
                      </div>
                    </div>

                    <p style={{ color: '#1e40af', fontSize: '0.82rem', marginBottom: '1rem', lineHeight: 1.4 }}>
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
                    
                    {/* Custom Chicks Input */}
                    {selectedPack.id === 'custom' && (
                      <div>
                        <label className="label">Nombre de poussins souhaités</label>
                        <input 
                          type="number" 
                          min="10" 
                          step="10"
                          required 
                          className="input"
                          value={customChicks}
                          onChange={e => setCustomChicks(e.target.value)}
                          placeholder="Ex: 150, 300, 500..."
                        />
                        {customChicks > 0 && (
                          <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#047857', background: '#ecfdf5', padding: '0.5rem', borderRadius: '6px' }}>
                            🥣 <strong>Plan d'aliment inclus :</strong> {Math.round(1 * (customChicks / 100))} sac(s) Démarrage, {Math.round(4 * (customChicks / 100))} sacs Croissance, {Math.round(5 * (customChicks / 100))} sacs Finition (Total : {Math.round(10 * (customChicks / 100))} sacs).
                          </div>
                        )}
                      </div>
                    )}

                    {/* Aliments Seuls Input */}
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
                      </div>
                    )}

                    {/* Optional Extension Reform Checkbox */}
                    {(selectedPack.id === '100' || selectedPack.id === '200' || selectedPack.id === 'custom') && (
                      <div style={{ background: '#fdf4ff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #f0abfc' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={includeReformOption} 
                            onChange={e => setIncludeReformOption(e.target.checked)}
                            style={{ width: '18px', height: '18px', marginTop: '0.2rem' }}
                          />
                          <div>
                            <strong style={{ color: '#86198f', fontSize: '0.88rem', display: 'block' }}>
                              🏆 Option Extension Réforme (Poulets Lourds 60 jours)
                            </strong>
                            <span style={{ color: '#701a75', fontSize: '0.78rem', lineHeight: 1.3, display: 'block' }}>
                              Ajoute 4 sacs de finition supplémentaires par tranche de 100 poussins (+{selectedPack.id === '200' ? '195 000' : '97 500'} FCFA) pour prolonger jusqu'à 60 jours et vendre à ~6 500 FCFA l'unité.
                            </span>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Order Total Highlight */}
                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.9rem' }}>TOTAL DE LA COMMANDE :</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>
                        {computeOrderAmount().toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>

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
                        placeholder="Ex: Yaoundé - Nkoabang" 
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
                Historique, paiements et suivi des livraisons.
              </p>
            </div>

            {(() => {
              const paidOrders = (orders || []).filter(o => {
                const s = (o.status || '').toLowerCase();
                const ps = (o.paymentStatus || '').toUpperCase();
                return (
                  ps === 'PAID' || 
                  ps === 'SUCCESS' ||
                  o.paid === true || 
                  s === 'payée' || 
                  s === 'payee' || 
                  s === 'confirmée' || 
                  s === 'confirmee' || 
                  s === 'livre' || 
                  s === 'livrée' || 
                  s === 'livree'
                );
              });

              if (paidOrders.length === 0) {
                return (
                  <div className="panel" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
                    <h3 style={{ color: '#475569', fontSize: '1rem' }}>Aucune commande payée pour le moment</h3>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                      Vos commandes de poussins et aliments apparaîtront ici dès confirmation de votre paiement.
                    </p>
                    <button onClick={() => setActiveTab('order')} className="btn btn-primary btn-sm">
                      Passer une commande
                    </button>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {paidOrders.map(o => {
                    const s = (o.status || '').toLowerCase();
                    const isDelivered = s === 'livre' || s === 'livrée' || s === 'livree';
                    const isCancelled = s === 'annule' || s === 'annulée' || s === 'annulee';

                    let badgeClass = 'badge-primary';
                    let badgeText = 'Payée 💳';
                    if (isDelivered) {
                      badgeClass = 'badge-success';
                      badgeText = 'Livrée ✅';
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
                          {o.amount && <div>💰 Montant payé : <strong>{o.amount.toLocaleString('fr-FR')} FCFA</strong></div>}
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
              );
            })()}
          </div>
        )}

        {/* TAB 3: MON ELEVAGE (CYCLES & RENTABILITÉ) */}
        {activeTab === 'cycles' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--accent-secondary)', marginBottom: '0.2rem' }}>Mon Élevage & Suivi</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Suivi de croissance, mortalité déclarée et calcul de rentabilité.
              </p>
            </div>

            {(() => {
              const pendingChickOrders = (orders || []).filter(o => {
                const s = (o.status || '').toLowerCase();
                const ps = (o.paymentStatus || '').toUpperCase();
                const isPaid = ps === 'PAID' || ps === 'SUCCESS' || o.paid === true || s === 'confirmée' || s === 'confirmee' || s === 'payée' || s === 'payee';
                const isDelivered = s === 'livre' || s === 'livrée' || s === 'livree';
                return isPaid && !isDelivered && ((o.chicks && o.chicks > 0) || (o.chicks_count && o.chicks_count > 0));
              });

              if (cycles.length === 0 && pendingChickOrders.length === 0) {
                return (
                  <div className="panel" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📈</div>
                    <h3 style={{ color: '#475569', fontSize: '1rem' }}>Aucun cycle d'élevage actif</h3>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                      Votre cycle démarre automatiquement dès la livraison de vos poussins à votre ferme.
                    </p>
                    <button onClick={() => setActiveTab('order')} className="btn btn-primary btn-sm">
                      Commander des poussins
                    </button>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Pending Deliveries Info Cards */}
                  {pendingChickOrders.map(po => (
                    <div 
                      key={`pending-${po.id || po._id}`} 
                      className="panel" 
                      style={{ margin: 0, padding: '1.15rem', background: '#fffbeb', border: '1.5px solid #fef3c7', borderLeft: '4px solid #f59e0b' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <strong style={{ color: '#92400e', fontSize: '0.98rem' }}>
                          🚚 Poussins en cours de livraison
                        </strong>
                        <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                          Livraison en attente
                        </span>
                      </div>

                      <div style={{ fontSize: '0.84rem', color: '#78350f', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                        <div>📦 <strong>{po.pack_type || `${po.chicks} Poussins`}</strong></div>
                        <div>📍 Lieu : <strong>{po.delivery_location}</strong></div>
                        {po.delivery_date && (
                          <div>📅 Prévue le : <strong>{new Date(po.delivery_date).toLocaleDateString('fr-FR')}</strong></div>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#b45309', background: 'rgba(254, 243, 199, 0.8)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px dashed #fcd34d' }}>
                        ⏳ <strong>Note :</strong> Votre cycle d'élevage (Jour 1) démarrera dès que l'équipe AGRO KING aura livré les poussins à votre ferme.
                      </div>
                    </div>
                  ))}

                  {/* Active Delivered Cycles */}
                  {cycles.map(c => {
                  const isExpanded = expandedCycleId === (c.id || c._id);
                  const initialChicks = c.chicks || 100;
                  const liveBirds = c.live_birds !== undefined ? c.live_birds : initialChicks;
                  const mortality = c.mortality_count || 0;
                  const isReform = !!c.is_reform;
                  
                  // Financial Simulation
                  const estimatedBirdPrice = isReform ? 6500 : 3500;
                  const projectedRevenue = liveBirds * estimatedBirdPrice;
                  const estimatedCost = (initialChicks / 100) * (isReform ? (270000 + 97500) : 270000);
                  const estimatedProfit = projectedRevenue - estimatedCost;

                  return (
                    <div key={c.id || c._id} className="panel" style={{ margin: 0, padding: '1.1rem' }}>
                      <div 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setExpandedCycleId(isExpanded ? null : (c.id || c._id))}
                      >
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--accent-secondary)', display: 'block' }}>
                            {c.chicks} Poussins {isReform ? '⭐ (Réforme 60J)' : ''}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {liveBirds} volailles vivantes ({c.survival_rate || 100}% survie)
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-success" style={{ fontSize: '0.82rem' }}>
                            Jour {c.current_day} {isReform ? '/ 60' : '/ 45'}
                          </span>
                          <span style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            ▾
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--panel-border)' }} className="animate-fade-in">
                          
                          {/* Growth Stage Boxes */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Étape Actuelle</div>
                              <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', marginTop: '0.2rem' }}>
                                {c.current_stage}
                              </strong>
                              {c.sacs_needed > 0 && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--accent-secondary)', marginTop: '0.2rem' }}>
                                  {c.sacs_needed} sac(s) pour ce stade
                                </div>
                              )}
                            </div>

                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Calendrier Officiel</div>
                              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem', lineHeight: 1.3 }}>
                                • J1-14: Démarrage (1 sac)<br />
                                • J15-28: Croissance (4 sacs)<br />
                                • J29-45: Finition (5 sacs)<br />
                                • J46-60: Réforme (+4 sacs)
                              </div>
                            </div>
                          </div>

                          {/* Live Mortality & Profit Simulator Box */}
                          <div style={{ background: '#f0fdf4', padding: '0.85rem', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#166534' }}>
                                📊 Suivi Mortalité & Rentabilité Éleveur
                              </span>
                              <button 
                                onClick={() => { setEditingMortalityCycleId(c.id || c._id); setMortalityInput(mortality.toString()); }}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                              >
                                Déclarer mortalité
                              </button>
                            </div>

                            {editingMortalityCycleId === (c.id || c._id) ? (
                              <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #86efac', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                                  Nombre de pertes constatées à la ferme :
                                </label>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max={initialChicks} 
                                    className="input" 
                                    style={{ width: '80px', padding: '0.4rem' }} 
                                    value={mortalityInput} 
                                    onChange={e => setMortalityInput(e.target.value)} 
                                  />
                                  <button onClick={() => handleSaveMortality(c.id || c._id)} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
                                    Enregistrer
                                  </button>
                                  <button onClick={() => setEditingMortalityCycleId(null)} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.78rem' }}>
                              <div>
                                <span style={{ color: '#64748b' }}>Pertes déclarées :</span> <strong>{mortality} poulet(s)</strong>
                              </div>
                              <div>
                                <span style={{ color: '#64748b' }}>Volailles vendables :</span> <strong style={{ color: '#15803d' }}>{liveBirds}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#64748b' }}>Prix unitaire estimé :</span> <strong>{estimatedBirdPrice.toLocaleString('fr-FR')} F</strong>
                              </div>
                              <div>
                                <span style={{ color: '#64748b' }}>Bénéfice net estimé :</span> <strong style={{ color: estimatedProfit >= 0 ? '#15803d' : '#dc2626' }}>+{estimatedProfit.toLocaleString('fr-FR')} F</strong>
                              </div>
                            </div>
                          </div>

                          {/* Quick Restock Action & Reform CTA */}
                          {c.reminder_active && c.next_stage_sacs > 0 ? (
                            <div style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '0.85rem', borderRadius: '10px', marginTop: '0.5rem' }}>
                              <strong style={{ color: '#065f46', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem' }}>
                                🔔 Étape suivante imminente
                              </strong>
                              <p style={{ fontSize: '0.78rem', color: '#047857', marginBottom: '0.6rem' }}>
                                Demandez vos <strong>{c.next_stage_sacs} sacs</strong> d'aliment pour la prochaine étape.
                              </p>
                              <button onClick={() => handleRestockRequest(c)} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                                ✅ Confirmer la livraison des sacs
                              </button>
                            </div>
                          ) : (
                            !c.current_stage?.includes('Terminé') && (
                              <button 
                                onClick={() => handleRestockRequest(c)} 
                                className="btn btn-outline btn-sm" 
                                style={{ width: '100%', fontSize: '0.8rem', marginTop: '0.35rem' }}
                              >
                                🚚 Demander les sacs de l'étape suivante en avance
                              </button>
                            )
                          )}

                          {/* Extension Reform Button if eligible */}
                          {!isReform && c.current_day >= 30 && (
                            <div style={{ background: '#fdf4ff', border: '1px solid #f0abfc', padding: '0.85rem', borderRadius: '10px', marginTop: '0.65rem' }}>
                              <strong style={{ color: '#86198f', fontSize: '0.85rem', display: 'block', marginBottom: '0.3rem' }}>
                                🏆 Prolonger en Réforme (Poulets Lourds 60J)
                              </strong>
                              <p style={{ fontSize: '0.78rem', color: '#701a75', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                                Vendez vos poulets plus lourds à <strong>~6 500 FCFA</strong> au lieu de 3 500 FCFA.
                              </p>
                              <button onClick={() => handleActivateReformOnCycle(c)} className="btn btn-primary btn-sm" style={{ width: '100%', background: '#a21caf', borderColor: '#a21caf' }}>
                                ⭐ Activer l'Extension Réforme (+4 sacs)
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          </div>
        )}

        {/* TAB 4: MON COMPTE */}
        {activeTab === 'account' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--accent-secondary)', marginBottom: '0.2rem' }}>Mon Compte Éleveur</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Vos informations et assistance AgroKing.
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
                  href="https://wa.me/237699000000" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline" 
                  style={{ width: '100%', textAlign: 'center', textDecoration: 'none', color: '#16a34a', borderColor: '#86efac' }}
                >
                  💬 Assistance WhatsApp Directe
                </a>

                <button 
                  onClick={handleLogout} 
                  className="btn btn-outline" 
                  style={{ width: '100%', color: '#ef4444', borderColor: '#fca5a5' }}
                >
                  🚪 Se Déconnecter
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {isPageLoading && <GlobalLoader text="Veuillez patienter..." />}
    </div>
  );
}
