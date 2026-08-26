import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import budgetRoutes from './routes/budget.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// WHY: Render terminates TLS at a proxy. Without this Express believes the
// connection is plain HTTP and silently refuses to set a `secure` cookie —
// login returns 200 and every subsequent request is 401.
if (isProd) app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// WHY: credentials:true forbids origin:'*'. It must be the exact frontend
// origin with no trailing slash, or the browser drops the cookie.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));

app.use(
  cors({
    origin(origin, cb) {
      // Same-origin/curl requests send no Origin header.
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return cb(null, true);
      return cb(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', requireAuth, categoryRoutes);
app.use('/api/expenses', requireAuth, expenseRoutes);
app.use('/api/budgets', requireAuth, budgetRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

// WHY: guard so the test runner can import this file without binding a port.
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

export default app;
