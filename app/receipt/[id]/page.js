'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function ReceiptPage({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else {
          alert("Reçu introuvable.");
          router.push('/farmer');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, router]);

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>Chargement du reçu...</div>;
  }

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '750px', margin: '1rem auto', padding: '0 0.75rem', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem' }} className="no-print">
        <button onClick={() => router.back()} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
          ⬅ Retour
        </button>
        <button onClick={handlePrint} className="btn btn-primary btn-sm" style={{ flex: 2 }}>
          🖨️ Imprimer / Sauvegarder PDF
        </button>
      </div>

      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} id="receipt-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #10b981', paddingBottom: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ color: '#065f46', margin: 0, fontSize: '1.8rem' }}>AGRO KING</h1>
            <p style={{ color: '#64748b', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>La royauté de l'élevage</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ color: '#1e293b', margin: 0, fontSize: '1rem' }}>REÇU DE PAIEMENT</h3>
            <p style={{ color: '#64748b', margin: '0.2rem 0 0 0', fontWeight: 'bold', fontSize: '0.85rem' }}>N° {order._id.substring(order._id.length - 8).toUpperCase()}</p>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.75rem' }}>Date: {new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.35rem', marginTop: 0 }}>Informations Client</h4>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1rem' }}>{order.farmer_name || 'Client'}</p>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>📞 {order.farmer_phone}</p>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>📍 {order.delivery_location}</p>
          </div>
          
          <div style={{ background: '#ecfdf5', padding: '0.85rem', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            <h4 style={{ color: '#047857', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.35rem', marginTop: 0 }}>Statut</h4>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.05rem', color: '#059669' }}>Payé & Confirmé ✅</p>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#047857' }}>via PayUnit</p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#334155' }}>
              <th style={{ padding: '0.6rem', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Description</th>
              <th style={{ padding: '0.6rem', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Qté</th>
              <th style={{ padding: '0.6rem', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.75rem 0.6rem', borderBottom: '1px solid #e2e8f0' }}>
                <strong>{order.pack_type}</strong>
                {order.feed_requirements && order.feed_requirements.demarrage !== undefined && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Détails : Démarrage ({order.feed_requirements.demarrage}), Croissance ({order.feed_requirements.croissance}), Finition ({order.feed_requirements.finition})
                  </div>
                )}
              </td>
              <td style={{ padding: '0.75rem 0.6rem', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                {order.chicks_count > 0 ? order.chicks_count + ' poussins' : (order.feed_requirements ? (order.feed_requirements.demarrage + order.feed_requirements.croissance + order.feed_requirements.finition) + ' sacs' : '1')}
              </td>
              <td style={{ padding: '0.75rem 0.6rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                {order.amount ? order.amount.toLocaleString('fr-FR') : '---'} FCFA
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2" style={{ padding: '0.75rem 0.6rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1rem', color: '#1e293b' }}>TOTAL :</td>
              <td style={{ padding: '0.75rem 0.6rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.15rem', color: '#10b981' }}>
                {order.amount ? order.amount.toLocaleString('fr-FR') : '---'} FCFA
              </td>
            </tr>
          </tfoot>
        </table>

        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.78rem', marginTop: '1.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
          <p style={{ margin: '0 0 0.2rem 0' }}>Merci pour votre confiance. Pour toute question, contactez le support Agro King.</p>
          <p style={{ margin: 0 }}>Reçu généré électroniquement — Preuve de paiement.</p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible; }
          #receipt-content { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}
