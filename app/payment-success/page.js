'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const orderId = searchParams.get('order_id');

  // Format a clean readable ID, e.g., AK-2026-001 (based on orderId or transactionId suffix)
  const shortId = orderId ? orderId.substring(orderId.length - 6).toUpperCase() : (transactionId ? transactionId.substring(transactionId.length - 6).toUpperCase() : 'INCONNU');
  const displayId = `AK-${new Date().getFullYear()}-${shortId}`;

  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <img src="/logo.jpeg" alt="AGRO KING Logo" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1.5rem auto', display: 'block', border: '4px solid var(--accent-primary)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
      
      <div className="panel" style={{ padding: '3rem 2rem', background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '2px solid #10b981' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ color: '#065f46', fontSize: '2rem', marginBottom: '0.5rem' }}>Paiement Reçu !</h1>
        <p style={{ fontSize: '1.1rem', color: '#047857', marginBottom: '2rem' }}>
          Merci de votre confiance. Votre commande est confirmée et en cours de préparation.
        </p>

        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #cbd5e1', marginBottom: '2rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Numéro de Commande</span>
          <h2 style={{ fontSize: '2rem', color: 'var(--accent-secondary)', margin: '0.5rem 0 0 0', fontFamily: 'monospace' }}>
            {displayId}
          </h2>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.6' }}>
          Un SMS de confirmation a été envoyé à votre numéro de téléphone (via l'API Orange) avec les détails de la commande.
        </p>

        <Link href="/farmer" className="btn btn-primary" style={{ display: 'inline-block', width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
          Retourner au Tableau de Bord
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem' }}>Chargement...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
