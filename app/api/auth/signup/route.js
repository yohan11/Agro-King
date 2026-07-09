import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb"; // utilitaire de connexion MongoDB

export async function POST(req) {
  try {
    // Récupère les données envoyées par Postman
    const { username, password, name, phone, location } = await req.json();

    // Connexion à MongoDB Atlas
    const client = await clientPromise;
    const db = client.db("agroking"); // nom de ta base
    const users = db.collection("users"); // collection "users"

    // Vérifie si l'utilisateur existe déjà
    const existingUser = await users.findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Génère un ID unique
    const unique_id = `AGRK-${Math.floor(1000 + Math.random() * 9000)}`;

    // Insère le nouvel utilisateur
    const result = await users.insertOne({
      role: "Farmer",
      username,
      password,
      name,
      phone,
      location,
      unique_id,
    });

    // Réponse JSON
    return NextResponse.json({
      message: "Signed up successfully",
      user: {
        id: result.insertedId,
        role: "Farmer",
        name,
        unique_id,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

