'use client';
import { useState, useEffect } from 'react';

export default function ConsumerSavingsTab({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('savings'); // 'savings' | 'market'
  const [caisses, setCaisses] = useState([]);
  const [marketItems, setMarketItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('MOMO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Caisse Form
  const [eventName, setEventName] = useState('Mariage');
  const [quantitePoulets, setQuantitePoulets] = useState(30);
  const [dateEvenement, setDateEvenement] = useState('');
  const [villeLivraison, setVilleLivraison] = useState(user?.location || 'Douala');
  const [matchedPreview, setMatchedPreview] = useState(null);

  const fetchCaisses = async () => {
    try {
      const res = await fetch('/api/consumers/savings');
      if (res.ok) {
        const data = await res.json();
        setCaisses(data.caisses || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMarket = async () => {
    try {
      const res = await fetch('/api/consumers/market');
      if (res.ok) {
        const data = await res.json();
        setMarketItems(data.produits || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaisses();
    fetchMarket();
  }, []);

  const handleCreateCaisse = async (e) => {
    e.preventDefault();
    if (!dateEvenement) {
      return alert("Veuillez sélectionner la date de votre événement.");
    }
    const qty = Number(quantitePoulets);
    if (isNaN(qty) || qty <= 0) {
      return alert("Veuillez saisir une quantité valide de poulets.");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/consumers/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evenement: eventName,
          quantitePoulets: qty,
          dateEvenement,
          villeLivraison,
          consommateurInfo: {
            name: user?.name,
            phone: user?.phone
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("🎉 Caisse Épargne Volaille créée avec succès ! Votre cycle d'élevage est synchronisé.");
        setShowNewModal(false);
        await fetchCaisses();
      } else {
        alert(`Erreur : ${data.error || 'Impossible de créer la caisse'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors de la création de la caisse.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeposit = async (caisseId) => {
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      return alert("Veuillez saisir un montant de versement valide.");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/consumers/savings/${caisseId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant: amount,
          modePaiement: paymentMode
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.objectifAtteint) {
          alert("🎉 FÉLICITATIONS ! 100% de votre objectif d'épargne est atteint.\nVos poulets sont intégralement réservés et garantis pour votre événement !");
        } else {
          alert(`✅ Versement de ${amount.toLocaleString('fr-FR')} FCFA validé.`);
        }
        setShowDepositModal(null);
        setDepositAmount('');
        await fetchCaisses();
      } else {
        alert(`Erreur : ${data.error || 'Impossible d\'enregistrer le versement'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCaisse = async (caisseId) => {
    const confirmer = window.confirm("⚠️ Attention : En annulant cette caisse, 90% du montant versé vous sera remboursé par OM/MOMO (10% de retenue légale pour frais de gestion & réservation cheptel).\n\nConfirmer l'annulation ?");
    if (!confirmer) return;

    try {
      const res = await fetch(`/api/consumers/savings/${caisseId}/cancel`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Caisse annulée.\nMontant remboursé (90%) : ${data.montantRembourse?.toLocaleString('fr-FR')} FCFA\nRetenue (10%) : ${data.fraisRetenue?.toLocaleString('fr-FR')} FCFA`);
        await fetchCaisses();
      } else {
        alert(`Erreur : ${data.error || 'Impossible d\'annuler la caisse'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau.");
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.25rem',
        boxShadow: '0 8px 24px rgba(2, 132, 199, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.15)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.4rem' }}>
              <span>🛒</span> Espace Consommateurs & Événements
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: '#ffffff' }}>
              Épargne Volaille & Réservation Événements
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.9, maxWidth: '480px' }}>
              Planifiez vos mariages, fêtes et réceptions. Épargnez par tranches (100% à terme) et recevez vos poulets frais livrés à la date exacte.
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              background: '#ffffff',
              color: '#0369a1',
              fontWeight: '700',
              fontSize: '0.85rem',
              border: 'none',
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            + Programmer un Événement
          </button>
        </div>
      </div>

      {/* Sub tabs: Mes Caisses Épargne vs Vitrine Marché */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: '12px',
        marginBottom: '1.25rem'
      }}>
        <button
          onClick={() => setActiveSubTab('savings')}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '700',
            fontSize: '0.82rem',
            background: activeSubTab === 'savings' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'savings' ? '#0369a1' : '#64748b',
            boxShadow: activeSubTab === 'savings' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer'
          }}
        >
          🍗 Mes Réservations & Caisses ({caisses.length})
        </button>
        <button
          onClick={() => setActiveSubTab('market')}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '700',
            fontSize: '0.82rem',
            background: activeSubTab === 'market' ? '#ffffff' : 'transparent',
            color: activeSubTab === 'market' ? '#0369a1' : '#64748b',
            boxShadow: activeSubTab === 'market' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer'
          }}
        >
          🏪 Vitrine Poulets Disponibles
        </button>
      </div>

      {/* SUBTAB 1 : MES CAISSES ÉPARGNE */}
      {activeSubTab === 'savings' && (
        <div>
          {caisses.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px dashed #cbd5e1'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
              <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.35rem' }}>Aucune réservation en cours</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
                Vous préparez un événement (mariage, fête, réception) ? Créez une caisse d'épargne pour bloquer vos poulets au meilleur prix.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Créer une Caisse Événement
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {caisses.map((caisse) => {
                const isComplete = (caisse.pourcentage_avancement || 0) >= 100;
                const montantVerse = caisse.montant_verse || 0;
                const montantTotal = caisse.montant_cible || 0;
                const montantRestant = Math.max(0, montantTotal - montantVerse);
                const pct = caisse.pourcentage_avancement || 0;

                return (
                  <div
                    key={caisse._id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: isComplete ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      padding: '1.25rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.15rem 0', fontSize: '1.05rem', color: '#0f172a' }}>
                          {caisse.evenement} ({caisse.quantite_poulets} poulets)
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          📅 Date de livraison : {new Date(caisse.date_evenement).toLocaleDateString('fr-FR')} • 📍 {caisse.ville_livraison}
                        </span>
                      </div>

                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '20px',
                        background: isComplete ? '#e0f2fe' : '#f1f5f9',
                        color: isComplete ? '#0369a1' : '#475569'
                      }}>
                        {isComplete ? '✅ 100% Garanti & Prêt' : `⏳ ${pct}% Épargné`}
                      </span>
                    </div>

                    {/* Progress Bar towards 100% */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                        <span style={{ color: '#0284c7' }}>
                          {montantVerse.toLocaleString('fr-FR')} FCFA versés
                        </span>
                        <span style={{ color: '#64748b' }}>
                          Cible (100%) : {montantTotal.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>

                      <div style={{
                        width: '100%',
                        height: '14px',
                        background: '#e2e8f0',
                        borderRadius: '10px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(100, pct)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                          borderRadius: '10px',
                          transition: 'width 0.4s ease'
                        }}></div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {!isComplete && (
                        <button
                          onClick={() => setShowDepositModal(caisse._id)}
                          style={{
                            flex: 2,
                            background: '#0284c7',
                            color: '#ffffff',
                            fontWeight: '600',
                            fontSize: '0.82rem',
                            padding: '0.6rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          💳 Épargner par OM / MOMO
                        </button>
                      )}
                      <button
                        onClick={() => handleCancelCaisse(caisse._id)}
                        style={{
                          flex: 1,
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontWeight: '600',
                          fontSize: '0.82rem',
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          cursor: 'pointer'
                        }}
                      >
                        Annuler (Remboursement 90%)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2 : VITRINE MARCHÉ VOLAILLE */}
      {activeSubTab === 'market' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              Poulets Frais Disponibles & Élevages en Finition
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              Consultez les volailles prêtes à l'abattage ou les cycles de plus de 30 jours pour vos commandes immédiates.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            {marketItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '1rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    background: item.type === 'mature' ? '#dcfce7' : '#fef9c3',
                    color: item.type === 'mature' ? '#15803d' : '#854d0e'
                  }}>
                    {item.type === 'mature' ? '🍗 Prêt à l\'abattage' : `📅 Finition (${item.ageJours}j)`}
                  </span>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0284c7' }}>
                    {item.prixUnitaire?.toLocaleString('fr-FR')} FCFA / unité
                  </span>
                </div>

                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.92rem', color: '#1e293b' }}>
                  {item.quantite} poulets disponibles
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  📍 Ferme : {item.localisation || 'Région du Littoral / Centre'}
                </div>

                <button
                  onClick={() => alert(`Commande directe de ${item.quantite} poulets : contactez le service logistique AgroKing au 621 27 76 96.`)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Commander ce lot
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL : PROGRAMMER UN ÉVÉNEMENT */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '500px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.25rem' }}>
              Programmer une Caisse Événement
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Nous synchronisons votre commande avec un cycle d'élevage qui se terminera 1 à 2 jours avant votre événement.
            </p>

            <form onSubmit={handleCreateCaisse}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.35rem' }}>
                  Nature de l'Événement
                </label>
                <select
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="Mariage">💍 Mariage</option>
                  <option value="Cérémonie / Fête">🎉 Cérémonie / Grande Fête</option>
                  <option value="Restauration / Traiteur">🍽️ Ravitaillement Restaurant / Traiteur</option>
                  <option value="Fêtes de Fin d'Année">🎄 Fêtes de Fin d'Année</option>
                  <option value="Autre">📦 Autre Événement</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.35rem' }}>
                    Nombre de poulets
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={quantitePoulets}
                    onChange={(e) => setQuantitePoulets(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.35rem' }}>
                    Ville / Zone
                  </label>
                  <input
                    type="text"
                    value={villeLivraison}
                    onChange={(e) => setVilleLivraison(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.35rem' }}>
                  Date de l'Événement
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={dateEvenement}
                  onChange={(e) => setDateEvenement(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              {/* Estimation */}
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #e0f2fe',
                borderRadius: '12px',
                padding: '0.85rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: '600' }}>Budget Total Estimé (à 3 700 F/poulet) :</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0284c7' }}>
                    {(Number(quantitePoulets || 0) * 3700).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#475569',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Création...' : 'Créer ma Caisse Épargne'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : FAIRE UN DÉPÔT ÉPARGNE */}
      {showDepositModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.25rem' }}>
              Alimenter mon Épargne Volaille
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Versement sécurisé via Orange Money ou MTN Mobile Money.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                Montant du versement (FCFA)
              </label>
              <input
                type="number"
                placeholder="Ex: 25000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '1rem',
                  fontWeight: '700'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                Mode de Paiement
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMode('MOMO')}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: paymentMode === 'MOMO' ? '2px solid #eab308' : '1px solid #e2e8f0',
                    background: paymentMode === 'MOMO' ? '#fefce8' : '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    color: '#854d0e',
                    cursor: 'pointer'
                  }}
                >
                  🟡 MTN Mobile Money
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('OM')}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: paymentMode === 'OM' ? '2px solid #ea580c' : '1px solid #e2e8f0',
                    background: paymentMode === 'OM' ? '#fff7ed' : '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    color: '#9a3412',
                    cursor: 'pointer'
                  }}
                >
                  🟠 Orange Money
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowDepositModal(null)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeposit(showDepositModal)}
                disabled={isSubmitting}
                style={{
                  flex: 2,
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Validation...' : 'Valider le Versement'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
