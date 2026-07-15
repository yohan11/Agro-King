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
    const owner = users.find(u => (u._id && u._id.toString() === o.user_id?.toString()) || (u.id && u.id.toString() === o.user_id?.toString()));
    return {
      ...o,
      farmer_name: owner ? owner.name : 'Unknown',
      phone: owner ? owner.phone : 'Unknown'
    };
  });

  console.log('--- ENRICHED ORDERS DEBUG ---');
  console.log(enriched.slice(0, 2).map(o => ({ id: o._id, farmer_name: o.farmer_name, user_id: o.user_id })));

  return NextResponse.json(enriched);
}

export async function POST(req) {
  const user = await getSessionUser();
  if (!user || user.role !== 'Farmer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const chicksCount = Number(data.chicks) || 0;
    const isAlimentsSeuls = data.pack_type === 'Aliments Seuls';

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

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
