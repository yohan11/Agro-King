import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Supprime le cookie de session
    cookieStore.delete("agroking_session");

    return NextResponse.json({ message: "Logout successful" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

