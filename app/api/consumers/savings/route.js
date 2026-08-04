// app/api/consumers/savings/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { creerCaisseEpargneConsommateur } from '@/lib/services/consommateurService';

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
            { client_id: new ObjectId(sessionUser.id) },
            { client_phone: sessionUser.phone }
          ]
        };
      } catch {
        query = { client_phone: sessionUser.phone };
      }
    }

    const caisses = await db.collection('consommateur_savings')
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({ success: true, caisses });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const sessionUser = await getSessionUser();
    const body = await request.json();
    const { dateEvenement, localisation, periodeEpargneJours, quantitePoulets, prixUnitaire } = body;

    const clientId = sessionUser?.id || body.clientId || null;
    const clientInfo = {
      name: sessionUser?.name || body.name || 'Client Consommateur',
      phone: sessionUser?.phone || body.phone || ''
    };

    const result = await creerCaisseEpargneConsommateur({
      clientId,
      dateEvenement,
      localisation,
      periodeEpargneJours,
      quantitePoulets,
      prixUnitaire,
      clientInfo
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
