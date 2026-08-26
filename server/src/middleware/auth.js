import { verifyToken, COOKIE_NAME, clearCookieOptions } from '../lib/jwt.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    req.userId = verifyToken(token).sub;
    next();
  } catch {
    res.clearCookie(COOKIE_NAME, clearCookieOptions);
    return res.status(401).json({ error: 'Session expired' });
  }
}
