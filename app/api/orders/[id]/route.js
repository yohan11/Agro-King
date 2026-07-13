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

export async function PUT(req, { params }) {
  const user = await getSessionUser();
  if (!user || user.role?.toLowerCase() !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { status } = await req.json();
    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    
    // Update the order status
    const updatedOrder = await db.update('orders', orderId, { status });
    if (!updatedOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Cycle Activation Logic: trigger when status becomes Livrée
    if (status === 'Livrée') {
      const cycles = await db.getTable('cycles');
      const existingCycle = cycles.find(c => c.order_id === orderId);
      if (!existingCycle) {
        await db.insert('cycles', {
          user_id: updatedOrder.user_id,
          order_id: updatedOrder.id,
          chicks: updatedOrder.chicks,
          pack_id: updatedOrder.pack_id || updatedOrder.chicks,
          start_date: new Date().toISOString()
        });
      }
    }

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
