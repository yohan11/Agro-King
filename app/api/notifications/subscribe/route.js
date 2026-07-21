import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
  const cookieStore = await cookies();
  const sessionData = cookieStore.get('agroking_session');

  if (!sessionData) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const sessionUser = JSON.parse(sessionData.value);
    
    // Vérifier que l'utilisateur est admin (cas insensible)
    if (sessionUser.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
    }

    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('agroking');

    // Enregistrer ou mettre à jour l'abonnement push
    await db.collection('push_subscriptions').updateOne(
      { 'subscription.endpoint': subscription.endpoint },
      {
        $set: {
          adminId: sessionUser.id,
          subscription: subscription,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ message: 'Abonnement enregistré avec succès' });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
