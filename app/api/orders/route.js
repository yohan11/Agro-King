import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from "@/lib/mongodb";

async function getSessionUser() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get('agroking_session');
  if (!cookie) return null;
  try {
    const parsed = JSON.parse(cookie.value);
    if (parsed && parsed.id) {
      parsed.id = parsed.id.toString();
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isPaidOrder(o) {
  if (!o) return false;
  const s = (o.status || '').toLowerCase();
  const ps = (o.paymentStatus || '').toUpperCase();
  return (
    ps === 'PAID' || 
    ps === 'SUCCESS' ||
    o.paid === true || 
    s === 'payée' || 
    s === 'payee' || 
    s === 'confirmée' || 
    s === 'confirmee' || 
    s === 'livre' || 
    s === 'livrée' || 
    s === 'livree'
  );
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await db.getTable('orders');
  const users = await db.getTable('users');

  let filteredOrders = orders;
  
  // If Farmer, show only their PAID orders (filter out unpaid / pending payment attempts)
  if (user.role === 'Farmer') {
    const userIdStr = (user.id || user._id)?.toString();
    const userPhoneStr = user.phone?.toString()?.replace(/\s+/g, '');
    const userUniqueIdStr = user.unique_id?.toString()?.toUpperCase();

    filteredOrders = orders.filter(o => {
      // 1. Must match farmer identity
      const oUserId = (o.user_id || o.farmer_id)?.toString();
      const oPhone = (o.farmer_phone || o.phone)?.toString()?.replace(/\s+/g, '');
      const oUniqueId = o.unique_id?.toString()?.toUpperCase();

      const isFarmerMatch = (
        (userIdStr && oUserId === userIdStr) ||
        (userPhoneStr && oPhone && oPhone === userPhoneStr) ||
        (userUniqueIdStr && oUniqueId && oUniqueId === userUniqueIdStr)
      );

      // 2. Tant que le client ne paie pas, la commande NE doit PAS s'afficher
      return isFarmerMatch && isPaidOrder(o);
    });
  }

  // Join farmer names and format clean string IDs
  const enriched = filteredOrders.map(o => {
    const uId = (o.user_id || o.farmer_id)?.toString();
    const owner = users.find(u => 
      u._id?.toString() === uId || 
      u.id?.toString() === uId || 
      (u.phone && o.farmer_phone && u.phone.replace(/\s+/g, '') === o.farmer_phone.replace(/\s+/g, ''))
    );
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
      status: o.status || 'Confirmée'
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

    // Fetch full user record to ensure accurate phone/name
    const client = await clientPromise;
    const dbMongo = client.db("agroking");
    let fullUser = null;
    try {
      const { ObjectId } = require('mongodb');
      fullUser = await dbMongo.collection("users").findOne({ _id: new ObjectId(user.id) });
    } catch (e) {
      fullUser = await dbMongo.collection("users").findOne({ phone: user.phone });
    }

    const farmerName = fullUser?.name || user.name || 'Éleveur';
    const farmerPhone = fullUser?.phone || user.phone || 'Non disponible';

    const newOrder = await db.insert('orders', {
      user_id: user.id,
      farmer_id: user.id,
      farmer_name: farmerName,
      farmer_phone: farmerPhone,
      unique_id: fullUser?.unique_id || user.unique_id || null,
      chicks: chicksCount,
      chicks_count: chicksCount,
      pack_type: data.pack_type || 'Sur mesure',
      delivery_location: data.delivery_location,
      delivery_date: data.delivery_date || null,
      next_bags_delivery_preference: data.next_bags_delivery_preference || null,
      coordinates: data.coordinates || null,
      status: 'Confirmée',
      paymentStatus: 'PAID',
      paid: true,
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
      const orderTitle = '🚨 Nouvelle Commande Confirmée !';
      const orderBody = `L'éleveur ${farmerName} (${farmerPhone}) a validé une commande (${data.pack_type || 'Pack'}) à ${data.delivery_location || 'sa ferme'}.`;
      await sendAdminPushNotification(orderTitle, orderBody, 'https://agroking-admin.vercel.app/dashboard');
    } catch (pushErr) {
      console.error("Push notification error on order creation:", pushErr);
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
