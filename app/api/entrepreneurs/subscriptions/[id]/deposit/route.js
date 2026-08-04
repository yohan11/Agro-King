// app/api/entrepreneurs/subscriptions/[id]/deposit/route.js
import { NextResponse } from 'next/server';
import { enregistrerDepotEntrepreneur } from '@/lib/services/entrepreneurService';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { montant, modePaiement, referenceTransaction } = body;

    const result = await enregistrerDepotEntrepreneur({
      subscriptionId: id,
      montant,
      modePaiement: modePaiement || 'MOMO',
      referenceTransaction
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
