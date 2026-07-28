import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  const cookieStore = await cookies();
  const sessionData = cookieStore.get('agroking_session');

  if (!sessionData) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const sessionUser = JSON.parse(sessionData.value);
    const client = await clientPromise;
    const db = client.db("agroking");

    let query = {};
    if (sessionUser.id) {
      try {
        query = { _id: new ObjectId(sessionUser.id) };
      } catch {
        query = { _id: sessionUser.id };
      }
    } else if (sessionUser.phone) {
      query = { phone: sessionUser.phone };
    }

    let dbUser = await db.collection("users").findOne(query);

    if (!dbUser && sessionUser.phone) {
      dbUser = await db.collection("users").findOne({ phone: sessionUser.phone });
    }

    if (!dbUser) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: dbUser._id.toString(),
        role: dbUser.role,
        name: dbUser.name,
        phone: dbUser.phone,
        location: dbUser.location,
        coordinates: dbUser.coordinates,
        unique_id: dbUser.unique_id
      }
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
