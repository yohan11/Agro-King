// app/api/consumers/savings/[id]/cancel/route.js
import { NextResponse } from 'next/server';
import { annulerEtRembourserCaisse } from '@/lib/services/consommateurService';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { tauxRetenue, motif } = body;

    const result = await annulerEtRembourserCaisse({
      caisseId: id,
      tauxRetenue: tauxRetenue !== undefined ? Number(tauxRetenue) : undefined,
      motif
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
