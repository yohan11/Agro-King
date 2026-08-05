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

    const user = await users.findOne({ 
      $or: [
        { phone: phone },
        { phone: cleanPhone },
        { unique_id: (phone || '').toUpperCase() },
        { unique_id: cleanPhone.toUpperCase() },
        { username: (phone || '').toLowerCase() },
        { username: cleanPhone.toLowerCase() }
      ]
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    if (requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase()) {
      return NextResponse.json({ error: `Identifiants incorrects pour un compte ${requiredRole}.` }, { status: 401 });
    }

    const userIdStr = user._id ? user._id.toString() : (user.id ? user.id.toString() : '');

    const sessionData = JSON.stringify({
      id: userIdStr,
      role: user.role,
      name: user.name,
      phone: user.phone,
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
        id: userIdStr,
        role: user.role,
        name: user.name,
        phone: user.phone,
        unique_id: user.unique_id
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}