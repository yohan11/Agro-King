import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const { phone, password, name, location, coordinates } = await req.json();
    const client = await clientPromise;
    const db = client.db("agroking");
    const users = db.collection("users");

    const cleanPhone = phone.replace(/\s+/g, '');

    // Vérifie si l'utilisateur existe déjà (avec ou sans espaces)
    const existingUser = await users.findOne({ 
      $or: [
        { phone: phone },
        { phone: cleanPhone }
      ]
    });
    
    if (existingUser) {
      return NextResponse.json({ error: "Un compte existe déjà avec ce numéro" }, { status: 400 });
    }

    // Génère un identifiant unique
    const unique_id = "AGRK-" + Math.floor(1000 + Math.random() * 9000);

    // Insère l'utilisateur
    const result = await users.insertOne({
      role: "Farmer",
      phone: cleanPhone, // Toujours stocker sans espaces
      password,
      name,
      location,
      coordinates,
      unique_id,
    });

    // Crée la session immédiatement
    const sessionData = JSON.stringify({
      id: result.insertedId,
      role: "Farmer",
      name: name,
      unique_id: unique_id
    });

    const cookieStore = await cookies();
    cookieStore.set("agroking_session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 24 // 1 jour
    });

    return NextResponse.json({
      message: "Signup successful",
      user: {
        id: result.insertedId,
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

