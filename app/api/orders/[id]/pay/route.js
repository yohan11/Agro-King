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

export async function POST(req, { params }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'Farmer') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    
    const updatedOrder = await db.update('orders', orderId, { status: 'Confirmée', paid: true });
    if (!updatedOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
