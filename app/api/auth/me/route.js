import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const sessionData = cookieStore.get('agroking_session');

  if (!sessionData) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const user = JSON.parse(sessionData.value);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
