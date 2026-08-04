// app/api/consumers/market/route.js
import { NextResponse } from 'next/server';
import { getMarcheConsommateurs } from '@/lib/services/consommateurService';

export async function GET() {
  try {
    const marketData = await getMarcheConsommateurs();
    return NextResponse.json({ success: true, ...marketData });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
