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
  if (!user || user.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stockList = await db.getTable('feed_stock');
  let globalStock = stockList.find(s => s._id === 'global' || s.id === 'global');

  if (!globalStock) {
    globalStock = { id: 'global', demarrage: 0, croissance: 0, finition: 0 };
    await db.insert('feed_stock', { _id: 'global', demarrage: 0, croissance: 0, finition: 0 });
  }

  return NextResponse.json(globalStock);
}

export async function PUT(req) {
  const user = await getSessionUser();
  if (!user || user.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { demarrage, croissance, finition } = data;

    const stockList = await db.getTable('feed_stock');
    let globalStock = stockList.find(s => s._id === 'global' || s.id === 'global');
    let idToUpdate = 'global';

    if (globalStock && globalStock._id) {
      idToUpdate = globalStock._id;
    }

    if (!globalStock) {
      await db.insert('feed_stock', { _id: 'global', demarrage: Number(demarrage) || 0, croissance: Number(croissance) || 0, finition: Number(finition) || 0 });
    } else {
      await db.update('feed_stock', idToUpdate, { 
        demarrage: Number(demarrage) || 0, 
        croissance: Number(croissance) || 0, 
        finition: Number(finition) || 0 
      });
    }

    const updatedStockList = await db.getTable('feed_stock');
    return NextResponse.json(updatedStockList.find(s => s._id === 'global' || s.id === 'global') || data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
