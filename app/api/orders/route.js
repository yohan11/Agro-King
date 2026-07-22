import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from "@/lib/mongodb";
import webpush from 'web-push';

async function getSessionUser() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get('agroking_session');
  if (!cookie) return null;
  try {
    return JSON.parse(cookie.value);
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await db.getTable('orders');
  const users = await db.getTable('users');

  let filteredOrders = orders;
  // If Farmer, show only their orders
  if (user.role === 'Farmer') {
    filteredOrders = orders.filter(o => o.user_id === user.id);
  }

  // Join farmer names
  const enriched = filteredOrders.map(o => {
    const owner = users.find(u => (u._id && u._id.toString() === o.user_id?.toString()) || (u.id && u.id.toString() === o.user_id?.toString()));
    return {
      ...o,
      farmer_name: owner ? owner.name : 'Unknown',
      phone: owner ? owner.phone : 'Unknown'
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req) {
  const user = await getSessionUser();
  if (!user || user.role !== 'Farmer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const chicksCount = Number(data.chicks) || 0;
    const isAlimentsSeuls = data.pack_type === 'Aliments Seuls';

    // Prevent duplicate orders
    const allOrders = await db.getTable('orders');
    const recentDuplicate = allOrders.find(o => 
      o.user_id === user.id && 
      o.chicks === chicksCount && 
      o.pack_type === (data.pack_type || 'Sur mesure') &&
      o.created_at && 
      (new Date() - new Date(o.created_at)) < 60000 // less than 60 seconds ago
    );

    if (recentDuplicate) {
      return NextResponse.json({ error: 'Commande en double détectée. Veuillez patienter.' }, { status: 409 });
    }

    const newOrder = await db.insert('orders', {
      user_id: user.id,
      chicks: chicksCount,
      pack_type: data.pack_type || 'Sur mesure',
      delivery_location: data.delivery_location,
      delivery_date: data.delivery_date || null,
      next_bags_delivery_preference: data.next_bags_delivery_preference || null,
      coordinates: data.coordinates || null,
      status: 'En attente',
      is_aliments_seuls: isAlimentsSeuls,
      created_at: new Date().toISOString()
    });

    if (data.coordinates && data.delivery_location) {
      const milieus = await db.getTable('milieus');
      const existingMilieu = milieus.find(m => m.name.toLowerCase() === data.delivery_location.toLowerCase());
      if (!existingMilieu) {
        await db.insert('milieus', {
          name: data.delivery_location,
          lat: data.coordinates.lat,
          lng: data.coordinates.lng,
        });
      }
    }

    // Trigger automatic push notification to all admin subscribers
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      if (publicKey && privateKey) {
        webpush.setVapidDetails('mailto:admin@agroking.cm', publicKey, privateKey);
        const client = await clientPromise;
        const dbMongo = client.db("agroking");
        const subs = await dbMongo.collection("push_subscriptions").find({}).toArray();

        if (subs.length > 0) {
          const payload = JSON.stringify({
            title: '🚨 Nouvelle Commande !',
            body: `${user.name || 'Un éleveur'} a passé une commande (${data.pack_type || 'Pack'}) à ${data.delivery_location || 'sa ferme'}.`,
            icon: '/icon512_maskable.png',
            badge: '/icon512_maskable.png',
            url: 'https://agroking-admin.vercel.app/dashboard'
          });
          await Promise.allSettled(subs.map(s => webpush.sendNotification(s.subscription, payload)));
        }
      }
    } catch (pushErr) {
      console.error("Push notification error on order creation:", pushErr);
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
