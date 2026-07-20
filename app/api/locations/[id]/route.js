import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { name } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("agroking");

    await db.collection("locations").updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: name.trim() } }
    );

    return NextResponse.json({ message: "Localisation mise à jour" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const client = await clientPromise;
    const db = client.db("agroking");

    await db.collection("locations").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ message: "Localisation supprimée" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
