// app/api/entrepreneurs/subscriptions/[id]/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('agroking');

    const subscription = await db.collection('entrepreneur_subscriptions').findOne({
      _id: new ObjectId(id)
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Souscription non trouvée' }, { status: 404 });
    }

    let cycle = null;
    if (subscription.cycle_id) {
      cycle = await db.collection('cycles').findOne({ _id: subscription.cycle_id });
    }

    return NextResponse.json({ success: true, subscription, cycle });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
