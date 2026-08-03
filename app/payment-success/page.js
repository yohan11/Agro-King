'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const orderId = searchParams.get('order_id');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (orderId || transactionId) {
      fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, transactionId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) setConfirmed(true);
      })
      .catch(console.error);
    }
  }, [orderId, transactionId]);

  const shortId = orderId ? orderId.substring(orderId.length - 6).toUpperCase() : (transactionId ? transactionId.substring(transactionId.length - 6).toUpperCase() : 'INCONNU');
  const displayId = `AK-${new Date().getFullYear()}-${shortId}`;

  return (
    <div className="app-shell">
      <main className="container" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', margin: '1rem 0' }} className="animate-fade-in">
          <img 
            src="/logo.jpeg" 
            alt="AGRO KING Logo" 
            style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1rem auto', display: 'block', border: '3px solid var(--accent-primary)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} 
          />
          
          <div className="panel" style={{ padding: '1.5rem 1.25rem', background: '#ffffff', borderRadius: '16px', border: '2px solid #10b981' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
            <h1 style={{ color: '#065f46', fontSize: '1.4rem', marginBottom: '0.35rem' }}>Paiement Confirmé !</h1>
            <p style={{ fontSize: '0.88rem', color: '#047857', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              Merci de votre confiance. Votre commande est payée et enregistrée avec succès.
            </p>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px dashed #cbd5e1', marginBottom: '1.25rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Numéro de Commande</span>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-secondary)', margin: '0.25rem 0 0 0', fontFamily: 'monospace' }}>
                {displayId}
              </h2>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              Votre cycle d'élevage est activé et votre reçu est disponible.
            </p>

            <Link href="/farmer" className="btn btn-primary" style={{ textDecoration: 'none', width: '100%' }}>
              Accéder à mes Commandes ➔
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
