import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req) {
  try {
    const { username, password, name, phone, location } = await req.json();
    const client = await clientPromise;
    const db = client.db("agroking");
    const users = db.collection("users");

    // Vérifie si l'utilisateur existe déjà
    const existingUser = await users.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Génère un identifiant unique
    const unique_id = "AGRK-" + Math.floor(1000 + Math.random() * 9000);

    // Insère l'utilisateur avec username en minuscule
    const result = await users.insertOne({
      role: "Farmer",
      username: username.toLowerCase(),
      password,
      name,
      phone,
      location,
      unique_id,
    });

    return NextResponse.json({
      message: "Signup successful",
      user: {
        id: result.insertedId,
        role: "Farmer",
        username: username.toLowerCase(),
        name,
        phone,
        location,
        unique_id,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

