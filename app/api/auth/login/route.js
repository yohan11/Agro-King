import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export async function POST(req) {
  console.log("signup route hit"); // <-- ajout pour vérifier
  try {
    const body = await req.json();
    // ... ton code d'insertion MongoDB
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(req) {
  try {
    const { username, password } = await req.json();
    const users = await db.getTable('users');

    // Make username case-insensitive because mobile phones auto-capitalize the first letter!
    const user = users.find(u =>
      (u.username.toLowerCase() === username.toLowerCase() ||
        (u.unique_id && u.unique_id.toLowerCase() === username.toLowerCase()))
      && u.password === password
    );
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Set mock secure cookie
    const sessionData = JSON.stringify({ id: user.id, role: user.role, name: user.name, unique_id: user.unique_id });
    const cookieStore = await cookies();
    cookieStore.set('agroking_session', sessionData, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return NextResponse.json({ message: 'Logged in successfully', user: { id: user.id, role: user.role, name: user.name, unique_id: user.unique_id } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
