// app/api/cycles/[id]/report-incident/route.js
import { NextResponse } from 'next/server';
import { gererIncidentCycle } from '@/lib/services/consommateurService';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { descriptionIncident, gravite } = body;

    const result = await gererIncidentCycle({
      cycleId: id,
      descriptionIncident: descriptionIncident || 'Mortalité ou maladie signalée',
      gravite: gravite || 'majeure'
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
