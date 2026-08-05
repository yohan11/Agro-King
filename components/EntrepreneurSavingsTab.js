'use client';
import { useState, useEffect } from 'react';
const PACK_PRICES = {
  'pack-100': { name: 'Pack 100 Poussins', price: 280000, chicksCount: 100 },
  'pack-200': { name: 'Pack 200 Poussins', price: 560000, chicksCount: 200 },
  'pack-500': { name: 'Pack 500 Poussins', price: 1400000, chicksCount: 500 }
};

export default function EntrepreneurSavingsTab({ user }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState('pack-100');
  const [clauseAcceptee, setClauseAcceptee] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('MOMO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/entrepreneurs/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    if (!clauseAcceptee) {
      return alert("Vous devez obligatoirement accepter la clause de compensation en nature pour souscrire.");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/entrepreneurs/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packType: selectedPack,
          clauseAcceptee: true,
          entrepreneurInfo: {
            name: user?.name,
            phone: user?.phone
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("🎉 Souscription créée avec succès ! Votre caisse virtuelle est active.");
        setShowNewModal(false);
        setClauseAcceptee(false);
        await fetchSubscriptions();
      } else {
        alert(`Erreur : ${data.error || 'Impossible de créer la souscription'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors de la souscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeposit = async (subId) => {
    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      return alert("Veuillez saisir un montant de versement valide.");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/entrepreneurs/subscriptions/${subId}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant: amount,
          modePaiement: paymentMode
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.seuil75Atteint) {
          alert("🚀 FÉLICITATIONS ! Vous avez atteint le seuil de 75%.\nAgroKing a débloqué les fonds auprès du couvoir/fournisseur et votre cycle d'élevage est officiellement lancé !");
        } else {
          alert(`✅ Versement de ${amount.toLocaleString('fr-FR')} FCFA enregistré avec succès.`);
        }
        setShowDepositModal(null);
        setDepositAmount('');
        await fetchSubscriptions();
      } else {
        alert(`Erreur : ${data.error || 'Impossible d\'enregistrer le dépôt'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors du dépôt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.25rem',
        boxShadow: '0 8px 24px rgba(27, 94, 32, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.15)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.4rem' }}>
              <span>💰</span> Financement Échelonné Partenaire
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: '#ffffff' }}>
              Caisse Virtuelle & Déblocage à 75%
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.9, maxWidth: '480px' }}>
              Alimentez votre caisse à votre rythme via OM / MOMO. À <strong>75%</strong>, AgroKing commande vos poussins & aliments et démarre votre cycle.
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              background: '#ffffff',
              color: '#1B5E20',
              fontWeight: '700',
              fontSize: '0.85rem',
              border: 'none',
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            + Nouvelle Souscription
          </button>
        </div>
      </div>

      {/* Subscriptions List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          Chargement de vos souscriptions...
        </div>
      ) : subscriptions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px dashed #cbd5e1'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🐣</div>
          <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.35rem' }}>Aucune caisse active</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
            Choisissez un pack d'élevage et commencez à alimenter votre caisse par tranches pour lancer votre cheptel.
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              background: '#1B5E20',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '0.85rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Souscrire à un Pack
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {subscriptions.map((sub) => {
            const isUnlocked = (sub.pourcentage_avancement || 0) >= 75;
            const isSolded = (sub.pourcentage_avancement || 0) >= 100;
            const montantVerse = sub.montant_verse || 0;
            const montantTotal = sub.montant_total_pack || 258200;
            const montantRestant = sub.montant_restant || Math.max(0, montantTotal - montantVerse);
            const pct = sub.pourcentage_avancement || 0;

            return (
              <div
                key={sub._id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: isUnlocked ? '2px solid #22c55e' : '1px solid #e2e8f0',
                  padding: '1.25rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Status Badge Top Right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.15rem 0', fontSize: '1.05rem', color: '#0f172a' }}>
                      {sub.pack_name || 'Pack Élevage'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {sub.chicks_count || 100} poussins vaccinés + aliments complets
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '20px',
                    background: isSolded ? '#dcfce7' : isUnlocked ? '#fef9c3' : '#f1f5f9',
                    color: isSolded ? '#15803d' : isUnlocked ? '#854d0e' : '#475569'
                  }}>
                    {isSolded ? '✅ 100% Soldé' : isUnlocked ? '🚀 Débloqué à 75% (Cycle en cours)' : '⏳ En financement'}
                  </span>
                </div>

                {/* Progress Bar with 75% threshold indicator */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#1B5E20' }}>
                      {montantVerse.toLocaleString('fr-FR')} FCFA versés
                    </span>
                    <span style={{ color: '#64748b' }}>
                      Objectif : {montantTotal.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>

                  <div style={{
                    width: '100%',
                    height: '14px',
                    background: '#e2e8f0',
                    borderRadius: '10px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(100, pct)}%`,
                      height: '100%',
                      background: isUnlocked ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #ca8a04, #eab308)',
                      borderRadius: '10px',
                      transition: 'width 0.4s ease'
                    }}></div>
                  </div>

                  {/* Threshold mark */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    <span>0%</span>
                    <span style={{ color: '#16a34a', fontWeight: '700' }}>⭐ Seuil Déblocage (75%)</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Info Cards Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.65rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Reste à verser</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: montantRestant > 0 ? '#b91c1c' : '#15803d' }}>
                      {montantRestant.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Progression</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>
                      {pct}%
                    </div>
                  </div>

                  {sub.date_limite_solde && (
                    <div style={{ background: '#fef2f2', padding: '0.65rem', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                      <div style={{ fontSize: '0.7rem', color: '#991b1b' }}>Échéance solde (15j)</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b91c1c' }}>
                        {new Date(sub.date_limite_solde).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {montantRestant > 0 && (
                    <button
                      onClick={() => setShowDepositModal(sub._id)}
                      style={{
                        flex: 1,
                        background: '#1B5E20',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '0.82rem',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      💳 Faire un Versement (OM / MOMO)
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL : NOUVELLE SOUSCRIPTION AVEC CLAUSE OBLIGATOIRE */}
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
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.25rem' }}>
              Nouvelle Caisse Virtuelle Partenaire
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Choisissez votre pack et souscrivez au programme de paiement échelonné AgroKing.
            </p>

            <form onSubmit={handleCreateSubscription}>
              {/* Choix du pack */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                  Sélectionnez votre Pack d'Élevage
                </label>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {Object.entries(PACK_PRICES).map(([key, config]) => (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        border: selectedPack === key ? '2px solid #1B5E20' : '1px solid #e2e8f0',
                        background: selectedPack === key ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <input
                          type="radio"
                          name="pack"
                          value={key}
                          checked={selectedPack === key}
                          onChange={(e) => setSelectedPack(e.target.value)}
                        />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>{config.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{config.chicksCount} poussins + aliments</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#1B5E20' }}>
                        {config.price.toLocaleString('fr-FR')} F
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* CLAUSE LÉGALE DE COMPENSATION EN NATURE (OBLIGATOIRE) */}
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '12px',
                padding: '0.9rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>⚖️</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#92400e' }}>
                      Clause contractuelle de compensation en nature
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#78350f', lineHeight: 1.4 }}>
                      Dès 75% versés, AgroKing avance les fonds et démarre votre cycle. Vous disposez de <strong>15 jours</strong> pour verser les 25% restants. En cas de solde impayé, AgroKing retiendra le nombre équivalent de poulets en fin de cycle (à 3 500 FCFA/poulet) pour couvrir le montant dû.
                    </p>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={clauseAcceptee}
                    onChange={(e) => setClauseAcceptee(e.target.checked)}
                    required
                  />
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400e' }}>
                    J'accepte expressément cette clause de compensation en nature
                  </span>
                </label>
              </div>

              {/* Boutons */}
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
                  disabled={!clauseAcceptee || isSubmitting}
                  style={{
                    flex: 2,
                    background: clauseAcceptee ? '#1B5E20' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: clauseAcceptee ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isSubmitting ? 'Création...' : 'Valider & Ouvrir la Caisse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : FAIRE UN DÉPÔT */}
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
              Alimenter ma Caisse Virtuelle
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Effectuez un versement sécurisé par Orange Money ou MTN MOMO.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.4rem' }}>
                Montant du versement (FCFA)
              </label>
              <input
                type="number"
                placeholder="Ex: 50000"
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
                  background: '#1B5E20',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Validation...' : 'Confirmer le Dépôt'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
