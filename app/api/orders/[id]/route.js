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

export async function GET(req, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    const currentOrder = await db.getTable('orders').then(orders => orders.find(o => o._id?.toString() === orderId || o.id === orderId));
    
    if (!currentOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    
    // Check if the user is authorized to view this order
    if (user.role?.toLowerCase() !== 'admin' && currentOrder.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(currentOrder, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const user = await getSessionUser();
  if (!user || user.role?.toLowerCase() !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { status } = await req.json();
    const resolvedParams = await params;
    const orderId = resolvedParams.id;
    // Fetch the order first to check its current status
    const currentOrder = await db.getTable('orders').then(orders => orders.find(o => o._id?.toString() === orderId || o.id === orderId));
    
    if (!currentOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const statusLower = (status || '').toLowerCase();
    const isDelivered = statusLower === 'livre' || statusLower === 'livrée' || statusLower === 'livree';

    // Le cycle démarre UNIQUEMENT si la commande est livrée
    if (isDelivered) {
      const chicksCount = Number(currentOrder.chicks_count || currentOrder.chicks || 0);
      const isAlimentsSeuls = currentOrder.is_aliments_seuls || (currentOrder.pack_type && currentOrder.pack_type.toLowerCase().includes('aliments seuls'));

      if (!isAlimentsSeuls && chicksCount > 0) {
        // Create a cycle if one doesn't exist
        const cycles = await db.getTable('cycles');
        const existingCycle = cycles.find(c => c.order_id?.toString() === orderId);
        
        if (!existingCycle) {
          await db.insert('cycles', {
            user_id: currentOrder.user_id,
            farmer_phone: currentOrder.farmer_phone,
            farmer_name: currentOrder.farmer_name,
            order_id: orderId,
            chicks: chicksCount,
            pack_id: currentOrder.pack_type || chicksCount,
            is_reform: !!currentOrder.is_reform,
            status: 'En cours',
            start_date: new Date().toISOString()
          });
        }

        // Deduct global stock
        const stockList = await db.getTable('feed_stock');
        let globalStock = stockList.find(s => s._id?.toString() === 'global' || s.id === 'global');
        if (!globalStock && stockList.length > 0) globalStock = stockList[0];

        if (globalStock) {
          let demarrageDeduction = chicksCount * 0.01;
          let croissanceDeduction = chicksCount * 0.04;
          let finitionDeduction = chicksCount * 0.05;

          await db.update('feed_stock', globalStock._id || globalStock.id, {
            demarrage: Math.max(0, (globalStock.demarrage || 0) - demarrageDeduction),
            croissance: Math.max(0, (globalStock.croissance || 0) - croissanceDeduction),
            finition: Math.max(0, (globalStock.finition || 0) - finitionDeduction)
          });
        }
      } else if (currentOrder.pack_type && currentOrder.pack_type.includes('Réapprovisionnement Aliment')) {
         // Try to parse the number of bags requested
         const match = currentOrder.pack_type.match(/(\d+)\s+sacs/);
         if (match) {
           const bags = Number(match[1]);
           const stockList = await db.getTable('feed_stock');
           let globalStock = stockList.find(s => s._id?.toString() === 'global' || s.id === 'global');
           if (!globalStock && stockList.length > 0) globalStock = stockList[0];
           
           if (globalStock) {
             // By default, assume Croissance if it's a generic restock, as Démarrage is delivered initially.
             await db.update('feed_stock', globalStock._id || globalStock.id, {
               croissance: Math.max(0, (globalStock.croissance || 0) - bags)
             });
           }
         }
      }
    }
    if (!updatedOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
