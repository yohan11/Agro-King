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

  const reservations = await db.getTable('agrocam_reservations');

  if (user.role?.toLowerCase() === 'admin') {
    return NextResponse.json(reservations);
  } else {
    // For farmers, just return the total available stock across all active reservations
    const totalAvailable = reservations.reduce((sum, r) => sum + r.chicks_available, 0);
    return NextResponse.json({ totalAvailable });
  }
}

export async function POST(req) {
  const user = await getSessionUser();
  if (!user || user.role?.toLowerCase() !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const chicksCount = Number(data.chicks_reserved);
    const amountPaid = Number(data.amount_paid);

    if (!chicksCount || !amountPaid) {
        return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const newReservation = await db.insert('agrocam_reservations', {
      chicks_reserved: chicksCount,
      chicks_available: chicksCount,
      amount_paid: amountPaid,
      created_at: new Date().toISOString()
    });

    return NextResponse.json(newReservation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
