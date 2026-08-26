import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '7d';
export const COOKIE_NAME = 'token';

if (!SECRET) throw new Error('JWT_SECRET is not set. Refusing to start.');

export function signToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// WHY: centralised so login and logout can never disagree on flags. In production
// the SPA (vercel.app) and API (onrender.com) are different sites, so the cookie
// needs SameSite=None + Secure or the browser silently refuses to send it — login
// returns 200 and the very next request is 401.
const isProd = process.env.NODE_ENV === 'production';

export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export const clearCookieOptions = { ...cookieOptions, maxAge: undefined };
