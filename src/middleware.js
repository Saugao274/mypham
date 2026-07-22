import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-fallback-secret');

async function isAuthed(req) {
  const token = req.cookies.get('mp_auth')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  const authed = await isAuthed(req);

  if (pathname.startsWith('/api/')) {
    if (!authed) {
      return new NextResponse(JSON.stringify({ error: 'Chưa đăng nhập' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    return NextResponse.next();
  }

  // Protected pages
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
