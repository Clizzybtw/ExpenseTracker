import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { signToken, cookieOptions, clearCookieOptions, COOKIE_NAME } from '../lib/jwt.js';

const SALT_ROUNDS = 12;

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', color: '#f97316' },
  { name: 'Transport', color: '#3b82f6' },
  { name: 'Rent', color: '#8b5cf6' },
  { name: 'Utilities', color: '#14b8a6' },
  { name: 'Groceries', color: '#22c55e' },
  { name: 'Shopping', color: '#ec4899' },
  { name: 'Health', color: '#ef4444' },
  { name: 'Entertainment', color: '#eab308' },
  { name: 'Other', color: '#64748b' },
];

// WHY: explicit shape. Returning the Prisma object directly would ship
// passwordHash to the client the first time someone adds a field.
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, currency: u.currency });

export async function register(req, res, next) {
  try {
    const { name, email, password, currency } = req.body;

    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        currency,
        passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
        // Same transaction: a user with no categories cannot log an expense.
        categories: { create: DEFAULT_CATEGORIES },
      },
    });

    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // WHY: compare against a dummy hash when the user is missing so the response
    // time is comparable either way and the endpoint can't enumerate accounts.
    const valid = user?.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu');

    if (!user || !valid) return res.status(401).json({ error: 'Invalid email or password' });

    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  res.clearCookie(COOKIE_NAME, clearCookieOptions);
  res.json({ ok: true });
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { currency } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { currency },
    });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}
