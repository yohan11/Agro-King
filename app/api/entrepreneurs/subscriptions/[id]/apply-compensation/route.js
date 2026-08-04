// app/api/entrepreneurs/subscriptions/[id]/apply-compensation/route.js
import { NextResponse } from 'next/server';
import { appliquerCompensationFinCycle } from '@/lib/services/entrepreneurService';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const cheptelProduit = body.cheptelProduit || {};

    const compensation = await appliquerCompensationFinCycle({
      subscriptionId: id,
      cheptelProduit
    });

    return NextResponse.json({ success: true, compensation });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
