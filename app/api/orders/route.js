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
    const currentUserIdStr = user.id?.toString();
    filteredOrders = orders.filter(o => {
      const orderUserIdStr = (o.user_id || o.farmer_id)?.toString();
      return orderUserIdStr === currentUserIdStr;
    });
  }

  // Join farmer names and format clean string IDs
  const enriched = filteredOrders.map(o => {
    const uId = (o.user_id || o.farmer_id)?.toString();
    const owner = users.find(u => u._id?.toString() === uId || u.id?.toString() === uId);
    const idStr = o._id?.toString() || o.id?.toString();
    return {
      ...o,
      _id: idStr,
      id: idStr,
      farmer_name: o.farmer_name || (owner ? owner.name : 'Éleveur'),
      farmer_phone: o.farmer_phone || (owner ? owner.phone : 'Non spécifié'),
      phone: o.farmer_phone || (owner ? owner.phone : 'Non spécifié'),
      chicks_count: o.chicks_count !== undefined ? o.chicks_count : (o.chicks || 0),
      chicks: o.chicks !== undefined ? o.chicks : (o.chicks_count || 0),
      status: o.status || 'En attente'
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
      farmer_id: user.id,
      farmer_name: user.name || 'Éleveur',
      farmer_phone: user.phone || 'Non disponible',
      chicks: chicksCount,
      chicks_count: chicksCount,
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

    // Trigger automatic push & WhatsApp notification to Admin
    try {
      const { sendAdminPushNotification } = require('@/lib/push');
      const orderTitle = '🚨 Nouvelle Commande !';
      const orderBody = `L'éleveur ${user.name || 'Un éleveur'} (${user.phone || 'N/A'}) a passé une commande (${data.pack_type || 'Pack'}) à ${data.delivery_location || 'sa ferme'}.`;
      await sendAdminPushNotification(orderTitle, orderBody, 'https://agroking-admin.vercel.app/dashboard');
    } catch (pushErr) {
      console.error("Push notification error on order creation:", pushErr);
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
