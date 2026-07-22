import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'mp_auth';
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-fallback-secret');

export async function createToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function setAuthCookie(token) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  cookies().delete(COOKIE_NAME);
}

// Guard cho API route — trả về Response 401 nếu chưa login
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { session: null, error: new Response(JSON.stringify({ error: 'Chưa đăng nhập' }), { status: 401 }) };
  }
  return { session, error: null };
}
