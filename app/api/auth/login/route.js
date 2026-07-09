import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    const client = await clientPromise;
    const db = client.db("agroking");
    const users = db.collection("users");

    // Vérifie l'utilisateur (username insensible à la casse)
    const user = await users.findOne({
      username: username.toLowerCase(),
      password
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
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
      secure: true,
      sameSite: "none",
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
