// app/api/consumers/savings/[id]/deposit/route.js
import { NextResponse } from 'next/server';
import { enregistrerDepotConsommateur } from '@/lib/services/consommateurService';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { montant, modePaiement, referenceTransaction } = body;

    const result = await enregistrerDepotConsommateur({
      caisseId: id,
      montant,
      modePaiement: modePaiement || 'OM',
      referenceTransaction
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
