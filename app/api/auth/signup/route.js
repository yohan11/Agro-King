import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const { username, password, name, phone, location } = await req.json();
    const users = await db.getTable('users');

    if (users.find(u => u.username === username)) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const newUser = await db.insert('users', {
      role: 'Farmer',
      username,
      password,
      name,
      phone,
      location
    });

    const sessionData = JSON.stringify({ id: newUser.id, role: newUser.role, name: newUser.name });
    const cookieStore = await cookies();
    cookieStore.set('agroking_session', sessionData, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return NextResponse.json({ message: 'Signed up successfully', user: { id: newUser.id, role: newUser.role, name: newUser.name } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
