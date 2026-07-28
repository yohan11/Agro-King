import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const { phone, password, name, location, coordinates } = await req.json();
    const client = await clientPromise;
    const db = client.db("agroking");
    const users = db.collection("users");

    const cleanPhone = (phone || '').replace(/\s+/g, '');

    const existingUser = await users.findOne({ 
      $or: [
        { phone: phone },
        { phone: cleanPhone }
      ]
    });
    
    if (existingUser) {
      return NextResponse.json({ error: "Un compte existe déjà avec ce numéro" }, { status: 400 });
    }

    const unique_id = "AGRK-" + Math.floor(1000 + Math.random() * 9000);

    const result = await users.insertOne({
      role: "Farmer",
      phone: cleanPhone,
      password,
      name,
      location,
      coordinates,
      unique_id,
      created_at: new Date().toISOString()
    });

    const insertedIdStr = result.insertedId.toString();

    const sessionData = JSON.stringify({
      id: insertedIdStr,
      role: "Farmer",
      name: name,
      phone: cleanPhone,
      unique_id: unique_id
    });

    const cookieStore = await cookies();
    cookieStore.set("agroking_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 24
    });

    return NextResponse.json({
      message: "Signup successful",
      user: {
        id: insertedIdStr,
        role: "Farmer",
        name,
        phone: cleanPhone,
        location,
        unique_id,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
