// app/api/consumers/savings/[id]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('agroking');

    const caisse = await db.collection('consommateur_savings').findOne({
      _id: new ObjectId(id)
    });

    if (!caisse) {
      return NextResponse.json({ success: false, error: "Caisse d'épargne non trouvée" }, { status: 404 });
    }

    let cycle = null;
    if (caisse.cycle_id) {
      cycle = await db.collection('cycles').findOne({ _id: caisse.cycle_id });
    }

    return NextResponse.json({ success: true, caisse, cycle });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
