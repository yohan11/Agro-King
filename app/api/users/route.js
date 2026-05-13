import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const usersTable = await db.getTable('users');
  const users = usersTable.map(u => ({
    id: u.id,
    role: u.role,
    name: u.name,
    phone: u.phone,
    location: u.location
  })); // filter sensitive info
  return NextResponse.json(users);
}
