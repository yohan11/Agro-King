import { NextResponse } from 'next/server';
import { sendAdminPushNotification } from '@/lib/push';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('agroking');
    const subscriptions = await db.collection('push_subscriptions').find({}).toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Aucun appareil abonné trouvé dans la base de données. Veuillez d\'abord activer les notifications sur votre tableau de bord admin.' 
      }, { status: 400 });
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ 
        success: false, 
        error: 'Clés VAPID manquantes sur le serveur Vercel. Assurez-vous d\'avoir bien configuré les variables d\'environnement.' 
      }, { status: 500 });
    }

    // Déclencher la notification
    await sendAdminPushNotification(
      "Test Alerte Agroking 🐔", 
      "Les notifications push fonctionnent parfaitement en temps réel !", 
      "/admin"
    );

    return NextResponse.json({ 
      success: true, 
      message: `Notification envoyée avec succès à ${subscriptions.length} appareil(s) abonné(s).` 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
