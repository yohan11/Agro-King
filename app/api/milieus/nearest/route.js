import db from '@/lib/db';
import { NextResponse } from 'next/server';

function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function POST(req) {
  try {
    const { lat, lng } = await req.json();
    if (lat == null || lng == null) return NextResponse.json({ error: 'Coordonnées GPS requises' }, { status: 400 });

    const milieus = await db.getTable('milieus');
    let nearest = null;
    let minDistance = 10; // Maximun search radius of 10km

    for (const m of milieus) {
      const d = haversineDist(lat, lng, m.lat, m.lng);
      if (d < minDistance) {
        minDistance = d;
        nearest = m;
      }
    }

    if (nearest) {
      return NextResponse.json({ milieu: nearest, distance: minDistance });
    } else {
      return NextResponse.json({ milieu: null });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
