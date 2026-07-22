import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const { phone, password, requiredRole } = await req.json();
    const client = await clientPromise;
    const db = client.db("agroking");
    const users = db.collection("users");

    const cleanPhone = (phone || '').replace(/\s+/g, '');

    // Permettre la connexion par numéro de téléphone (avec ou sans espaces) ou ID unique
    const user = await users.findOne({ 
      $or: [
        { phone: phone },
        { phone: cleanPhone },
        { unique_id: (phone || '').toUpperCase() },
        { unique_id: cleanPhone.toUpperCase() },
        { username: (phone || '').toLowerCase() },
        { username: cleanPhone.toLowerCase() } // Keep for backward compatibility with old users
      ]
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // L'application client autorise uniquement les comptes éleveurs (Farmer)
    const targetRole = requiredRole || 'Farmer';
    if (user.role?.toLowerCase() !== targetRole.toLowerCase()) {
      return NextResponse.json({ error: "Identifiants ou nom d'utilisateur incorrects." }, { status: 401 });
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