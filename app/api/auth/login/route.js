import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const { phone, password, requiredRole } = await req.json();
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

    // Vérification stricte du rôle si requis par le portail de connexion
    if (requiredRole) {
      const userRoleNormalized = (user.role || '').toLowerCase();
      const reqRoleNormalized = requiredRole.toLowerCase();
      if (userRoleNormalized !== reqRoleNormalized) {
        if (reqRoleNormalized === 'admin') {
          return NextResponse.json({ error: "Accès refusé. Ce portail est réservé aux administrateurs." }, { status: 403 });
        }
        if (reqRoleNormalized === 'farmer') {
          return NextResponse.json({ error: "Compte administrateur. Veuillez utiliser la page de connexion Administrateur (/admin/login)." }, { status: 403 });
        }
        return NextResponse.json({ error: "Accès refusé pour ce portail." }, { status: 403 });
      }
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