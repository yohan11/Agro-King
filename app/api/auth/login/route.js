import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const { phone, password } = await req.json();
    const client = await clientPromise;
    const db = client.db("agroking");
    const users = db.collection("users");

    // Permettre la connexion par numéro de téléphone ou ID unique
    const user = await users.findOne({ 
      $or: [
        { phone: phone },
        { unique_id: phone.toUpperCase() },
        { username: phone.toLowerCase() } // Keep for backward compatibility with old users
      ]
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // Crée une session
    const sessionData = JSON.stringify({
      id: user._id,
      role: user.role,
      name: user.name,
      unique_id: user.unique_id
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
      message: "Login successful",
      user: {
        id: user._id,
        role: user.role,
        name: user.name,
        unique_id: user.unique_id
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}