// app/api/entrepreneurs/subscriptions/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { creerSouscriptionPack } from '@/lib/services/entrepreneurService';

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

export async function GET(request) {
  try {
    const sessionUser = await getSessionUser();
    const client = await clientPromise;
    const db = client.db('agroking');

    let query = {};
    if (sessionUser && sessionUser.id) {
      try {
        query = {
          $or: [
            { entrepreneur_id: new ObjectId(sessionUser.id) },
            { entrepreneur_phone: sessionUser.phone }
          ]
        };
      } catch {
        query = { entrepreneur_phone: sessionUser.phone };
      }
    }

    const subscriptions = await db.collection('entrepreneur_subscriptions')
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({ success: true, subscriptions });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionUser = await getSessionUser();
    const body = await request.json();
    const { packType, clauseAcceptee } = body;

    const entrepreneurId = sessionUser?.id || body.entrepreneurId || null;
    const entrepreneurInfo = {
      name: sessionUser?.name || body.name || 'Entrepreneur Partenaire',
      phone: sessionUser?.phone || body.phone || ''
    };

    const newSub = await creerSouscriptionPack({
      entrepreneurId,
      packType,
      clauseAcceptee,
      entrepreneurInfo
    });

    return NextResponse.json({ success: true, subscription: newSub }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
