import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("agroking");
    const locations = await db.collection("locations").find({}).toArray();
    
    // Sort locations alphabetically by name
    locations.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name } = await req.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("agroking");
    
    // Vérifier si la localisation existe déjà (insensible à la casse)
    const existing = await db.collection("locations").findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: "Cette localisation existe déjà" }, { status: 400 });
    }

    const result = await db.collection("locations").insertOne({
      name: name.trim(),
      created_at: new Date()
    });

    return NextResponse.json({ message: "Localisation ajoutée", id: result.insertedId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
