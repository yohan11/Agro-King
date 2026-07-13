import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    const owner = users.find(u => u.id === o.user_id);
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
    const chicksCount = Number(data.chicks);

    let demarrageDeduction = chicksCount * 0.01;
    let croissanceDeduction = chicksCount * 0.04;
    let finitionDeduction = chicksCount * 0.05;

    // Deduct stock but don't block order
    if (chicksCount > 0) {
      const stockList = await db.getTable('feed_stock');
      let globalStock = stockList.find(s => s._id === 'global' || s.id === 'global');
      if (globalStock) {
        await db.update('feed_stock', globalStock._id || globalStock.id, {
          demarrage: Math.max(0, globalStock.demarrage - demarrageDeduction),
          croissance: Math.max(0, globalStock.croissance - croissanceDeduction),
          finition: Math.max(0, globalStock.finition - finitionDeduction)
        });
      }
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

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
