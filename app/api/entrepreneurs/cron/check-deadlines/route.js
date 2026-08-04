// app/api/entrepreneurs/cron/check-deadlines/route.js
import { NextResponse } from 'next/server';
import { verifierEcheancesEtRappels } from '@/lib/services/entrepreneurService';

export async function GET() {
  try {
    const rappels = await verifierEcheancesEtRappels();
    return NextResponse.json({ success: true, rappelsDeclenches: rappels.length, details: rappels });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const rappels = await verifierEcheancesEtRappels();
    return NextResponse.json({ success: true, rappelsDeclenches: rappels.length, details: rappels });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
