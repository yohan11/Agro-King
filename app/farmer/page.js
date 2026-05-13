'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FarmerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [cycles, setCycles] = useState([]);
  
  // Order flow state
  const [selectedPack, setSelectedPack] = useState(null);
  const [customChicks, setCustomChicks] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  
  const [nextDeliveryPref, setNextDeliveryPref] = useState('auto');
  const [nextDeliveryDate, setNextDeliveryDate] = useState('');
  
  const [coordinates, setCoordinates] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const packs = [
    {
      id: "100",
      chicks: 100,
      name: "Pack 100 poussins",
      price: "Estimation: 150 000 FCFA",
      details: [
        "100 poussins d'un jour",
        "1 sac aliment démarrage",
        "2 sacs aliment croissance",
        "2 sacs aliment croissance 2",
        "5 sacs aliment finition",
        "Livraison progressive selon les stades"
      ]
    },
    {
      id: "200",
      chicks: 200,
      name: "Pack 200 poussins",
      price: "Estimation: 300 000 FCFA",
      details: [
        "200 poussins d'un jour",
        "2 sacs aliment démarrage",
        "4 sacs aliment croissance",
        "4 sacs aliment croissance 2",
        "10 sacs aliment finition",
        "Livraison progressive selon les stades"
      ]
    },
    {
      id: "custom",
      name: "Pack Sur Mesure",
      price: "Prix sur demande",
      details: [
        "Choisissez vous-même le nombre de poussins.",
        "Nous calculons automatiquement la nourriture.",
        "10 sacs par tranche de 100 poussins",
        "Livraison progressive selon les stades"
      ]
    }
  ];

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoordinates({ lat, lng });

        try {
          const res = await fetch('/api/milieus/nearest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.milieu) {
              const accept = window.confirm(`Lieu proche détecté : "${data.milieu.name}".\nVoulez-vous l'utiliser comme lieu de livraison ?`);
              if (accept) {
                setDeliveryLocation(data.milieu.name);
              }
            } else {
              alert("Position acquise. Veuillez préciser le texte manuellement.");
            }
          }
        } catch (e) {
          console.log('Milieu lookup error', e);
        }
        
        setGettingLocation(false);
      },
      (err) => {
        alert("Impossible de récupérer la position.");
        setGettingLocation(false);
      }
    );
  };

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (!data.user || data.user.role !== 'Farmer') {
        router.push('/');
      } else {
        setUser(data.user);
        fetchOrders();
        fetchCycles();
      }
    });

    const interval = setInterval(() => {
      fetchOrders();
      fetchCycles();
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  const fetchOrders = async () => setOrders(await (await fetch('/api/orders')).json());
  const fetchCycles = async () => setCycles(await (await fetch('/api/cycles')).json());

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPack) return;
    
    let chicksCount = selectedPack.id === 'custom' ? Number(customChicks) : selectedPack.chicks;
    if (chicksCount <= 0) return alert('Veuillez entrer un nombre valide.');

    // Proceed to inline payment screen
    setShowPayment(true);
  };

  const confirmPaymentAndSubmit = async () => {
    let chicksCount = selectedPack.id === 'custom' ? Number(customChicks) : selectedPack.chicks;
    let pref = nextDeliveryPref === 'date' ? `Date demandée: ${nextDeliveryDate}` : 'Rappels automatiques activés';
    
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chicks: chicksCount,
        pack_type: selectedPack.id === 'custom' ? 'Pack Sur Mesure' : selectedPack.name,
        delivery_location: deliveryLocation,
        delivery_date: deliveryDate,
        next_bags_delivery_preference: pref,
        coordinates 
      })
    });
    setDeliveryLocation(''); 
    setDeliveryDate('');
    setCustomChicks('');
    setNextDeliveryDate('');
    setNextDeliveryPref('auto');
    setSelectedPack(null);
    setCoordinates(null);
    setShowPayment(false);
    fetchOrders();
    alert('Paiement reporté et commande confirmée avec succès !');
  };

  const handleRestockRequest = async (cycle) => {
    const sacsReq = cycle.next_stage_sacs || 'les prochains';
    const confirmer = window.confirm(`Voulez-vous demander la livraison de vos sacs de la prochaine étape (${sacsReq} sacs) maintenant ?`);
    if (!confirmer) return;

    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chicks: 0,
        pack_type: `Réapprovisionnement Aliment (${sacsReq} sacs)`,
        delivery_location: user.location || "À la ferme (Lieu habituel)",
      })
    });
    fetchOrders();
    alert('Demande de réapprovisionnement envoyée à l\'administrateur ! Vous verrez une commande en attente.');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-4 mt-2">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.jpeg" alt="AGRO KING Logo" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
          <h1 style={{color: 'var(--accent-secondary)', fontSize: '1.25rem', margin: 0}}>Bonjour, {user.name}</h1>
        </div>
        <button onClick={handleLogout} className="btn btn-outline" style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}}>Déconnexion</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        
        {/* Order Form */}
        <div className="panel" style={{ alignSelf: 'start' }}>
          <h2 style={{color: 'var(--accent-secondary)'}}>Commander</h2>
          
          {!selectedPack ? (
            <div className="mt-4">
              <p className="text-muted mb-4">Choisissez un pack pour votre prochain élevage.</p>
              <div className="flex flex-col gap-4">
                {packs.map(pack => (
                  <div key={pack.id} className="panel" style={{ padding: '1rem', border: '2px solid var(--panel-border)', cursor: 'pointer', transition: 'border-color 0.2s', background: pack.id === 'custom' ? '#f0fdf4' : 'white' }} onClick={() => setSelectedPack(pack)}>
                    <div className="flex justify-between items-center mb-2">
                      <strong style={{ fontSize: '1.2rem', color: 'var(--accent-primary)'}}>{pack.name}</strong>
                      <span className="badge badge-success">{pack.price}</span>
                    </div>
                    <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                      {pack.details.map((detail, index) => (
                        <li key={index}>{detail}</li>
                      ))}
                    </ul>
                    <button className="btn btn-primary mt-4" style={{ width: '100%' }}>Choisir ce pack</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setSelectedPack(null)} className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.9rem' }}>← Retour</button>
                <strong style={{ fontSize: '1.1rem' }}>{selectedPack.name}</strong>
              </div>
              
              {showPayment ? (
                <div style={{ background: '#fff7ed', padding: '1.5rem', borderRadius: '8px', border: '2px solid #fdba74', marginTop: '1rem' }}>
                  <h3 style={{ color: '#ea580c', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>Paiement de la Commande</h3>
                  <p style={{ marginBottom: '1rem', color: '#9a3412', fontSize: '0.95rem' }}>
                    Pour confirmer votre commande, veuillez effectuer le paiement via Orange Money.
                  </p>
                  
                  <div style={{ background: '#ffedd5', padding: '1rem', borderRadius: '8px', textAlign: 'center', marginBottom: '1.5rem' }}>
                    <strong style={{ display: 'block', color: '#c2410c', fontSize: '1rem', textTransform: 'uppercase' }}>Orange Money Cameroun</strong>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ea580c', margin: '0.5rem 0', letterSpacing: '2px' }}>697 59 05 68</div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => setShowPayment(false)} className="btn btn-outline" style={{ flex: 1 }}>Annuler / Modifier</button>
                    <a href="tel:%23150%2A1%2A1%2A697590568%23" 
                       onClick={() => {
                         setTimeout(() => {
                           confirmPaymentAndSubmit();
                         }, 500);
                       }} 
                       className="btn" 
                       style={{ flex: 2, background: '#ea580c', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexDirection: 'column', lineHeight: '1.2' }}>
                       <span>Ouvrir l'application Téléphone</span>
                       <span style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.9 }}>(Composez #150*1*1*697590568#)</span>
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleOrderSubmit} className="flex flex-col gap-4">
                  {selectedPack.id === 'custom' && (
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                      <label className="label">Nombre de poussins exact :</label>
                      <input type="number" placeholder="Ex: 50, 150..." className="input" required value={customChicks} onChange={e => setCustomChicks(e.target.value)} min="1" step="1"/>
                    </div>
                  )}

                  <div>
                    <label className="label">Date de livraison souhaitée (Poussins & 1ère étape)</label>
                    <input type="date" className="input" required value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                  </div>

                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                    <label className="label">Connaissez-vous la date de livraison pour les sacs restants (prochaines étapes) ?</label>
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => setNextDeliveryPref('auto')} className={`btn ${nextDeliveryPref === 'auto' ? 'btn-primary' : 'btn-outline'}`} style={{flex: 1, fontSize:'0.9rem'}}>Non, rappelez-moi</button>
                      <button type="button" onClick={() => setNextDeliveryPref('date')} className={`btn ${nextDeliveryPref === 'date' ? 'btn-primary' : 'btn-outline'}`} style={{flex: 1, fontSize:'0.9rem'}}>Oui, indiquer date</button>
                    </div>
                    
                    {nextDeliveryPref === 'date' && (
                      <div className="mt-4">
                        <label className="label" style={{fontSize: '0.8rem'}}>Date de la prochaine livraison (estimation)</label>
                        <input type="date" className="input" required={nextDeliveryPref === 'date'} value={nextDeliveryDate} onChange={e => setNextDeliveryDate(e.target.value)} />
                      </div>
                    )}
                    {nextDeliveryPref === 'auto' && (
                      <p className="text-muted mt-3" style={{fontSize: '0.85rem'}}>
                        * Le système calculera votre stade et un rappel automatique vous sera envoyé 1 jour avant la fin de chaque étape pour demander la livraison des sacs suivants.
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="label">Localisation de la ferme</label>
                    <input type="text" placeholder="Entrez la ville ou quartier" className="input" required value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} />
                    <button type="button" onClick={handleGetLocation} className="btn btn-outline mt-2" style={{fontSize: '0.85rem', padding: '0.5rem', width: 'fit-content'}}>
                      {gettingLocation ? 'Recherche...' : (coordinates ? '📍 Position GPS trouvée' : '📌 Utiliser mon GPS')}
                    </button>
                  </div>

                  <button type="submit" className="btn btn-primary mt-2">Continuer vers le paiement</button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Existing Orders */}
        <div className="panel" style={{ alignSelf: 'start' }}>
          <h2 style={{color: 'var(--accent-secondary)'}}>Mes Commandes</h2>
          {orders.length === 0 ? <p className="text-muted mt-2">Aucune commande pour le moment.</p> : (
            <div className="flex flex-col gap-4 mt-4">
              {orders.map(o => (
                <div key={o.id} style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
                  <div className="flex justify-between items-center">
                    <strong>{o.pack_type || `${o.chicks} Poussins`}</strong>
                    <span className={`badge ${o.status === 'Livrée' ? 'badge-success' : 'badge-warning'}`}>{o.status}</span>
                  </div>
                  <div className="text-muted mt-2" style={{fontSize: '0.9rem'}}>
                    {o.chicks > 0 && <div>{o.chicks} poussins au total</div>}
                    <div>Lieu : {o.delivery_location}</div>
                    {o.delivery_date && <div>Poussins prévus : {new Date(o.delivery_date).toLocaleDateString('fr-FR')}</div>}
                    {o.next_bags_delivery_preference && <div style={{marginTop:'0.3rem', color: 'var(--text-main)', fontSize: '0.8rem'}}>Livraisons suivantes : {o.next_bags_delivery_preference}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Cycles */}
      <div className="panel mt-4">
        <h2 style={{color: 'var(--accent-secondary)'}}>Mon élevage (Cycles actifs)</h2>
        <p className="text-muted mb-4">Gérez le réapprovisionnement progressif de l'alimentation selon votre stade.</p>
        <div>
          {cycles.length === 0 ? <p className="text-muted">Aucun élevage en cours.</p> : (
            <div className="grid grid-cols-2 gap-4">
              {cycles.map(c => (
                <div key={c.id} style={{ padding: '1.5rem', background: '#ffffff', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-soft)' }}>
                  <div className="flex justify-between mb-4">
                    <strong style={{fontSize: '1.2rem', color: 'var(--accent-secondary)'}}>{c.chicks} Poussins</strong>
                    <span className="badge badge-success" style={{fontSize: '0.9rem'}}>Jour {c.current_day}</span>
                  </div>
                  <div style={{padding: '1rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)'}}>
                    <div className="text-muted" style={{fontSize: '0.9rem', marginBottom: '0.2rem'}}>Étape Actuelle</div>
                    <strong style={{display: 'block', fontSize: '1.1rem'}}>{c.current_stage}</strong>
                    {c.sacs_needed > 0 && (
                      <div className="mt-2" style={{color: 'var(--accent-secondary)', fontWeight: '500', fontSize: '0.95rem'}}>
                        Utiliser {c.sacs_needed} sacs d'aliment.
                      </div>
                    )}
                  </div>
                  
                  {/* Replenishment Dialogue System */}
                  <div className="mt-4 pt-4" style={{borderTop: '1px solid var(--panel-border)'}}>
                    {c.reminder_active && c.next_stage_sacs > 0 && (
                      <div style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        <strong style={{ color: '#065f46', display: 'block', marginBottom: '0.5rem' }}>⚠️ Rappel (Fin d'étape imminente)</strong>
                        <p style={{ fontSize: '0.9rem', color: '#047857', marginBottom: '0.8rem' }}>
                          Demain, vous entrez dans une nouvelle étape de croissance. Confirmez maintenant pour recevoir vos <strong>{c.next_stage_sacs} sacs</strong> d'aliment requis !
                        </p>
                        <button onClick={() => handleRestockRequest(c)} className="btn btn-primary" style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem' }}>
                          ✅ Confirmer la livraison des sacs
                        </button>
                      </div>
                    )}

                    {(!c.reminder_active || c.next_stage_sacs == 0) && c.current_stage !== 'Cycle Terminé' && (
                       <button onClick={() => handleRestockRequest(c)} className="btn btn-outline" style={{ width: '100%', fontSize: '0.85rem' }}>
                         Demander l'aliment de la prochaine étape en avance
                       </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
