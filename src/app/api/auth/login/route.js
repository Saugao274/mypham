import { NextResponse } from 'next/server';
import { createToken, setAuthCookie } from '@/lib/auth';

export async function POST(req) {
  const { username, password } = await req.json();
  const U = process.env.ADMIN_USERNAME || 'admin';
  const P = process.env.ADMIN_PASSWORD || 'admin123';
  if (username !== U || password !== P) {
    return NextResponse.json({ error: 'Sai tài khoản hoặc mật khẩu' }, { status: 401 });
  }
  const token = await createToken({ u: username });
  await setAuthCookie(token);
  return NextResponse.json({ ok: true });
}
