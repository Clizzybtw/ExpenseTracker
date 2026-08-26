# Expense Analytics Tracker

Track expenses, set per-category budgets, and see where the money actually went.

**Live demo:** _add your Vercel URL_
**Demo login:** `demo@example.com` / `demo1234`

> The API runs on a free tier that sleeps after 15 minutes idle. The first
> request can take about a minute — the app shows a "waking up the server"
> state rather than an unexplained spinner.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, Tailwind, Recharts, React Router |
| API | Express 4 on Node 20+, ESM |
| Database | MySQL 8 via Prisma |
| Auth | JWT in an httpOnly cookie |

## Architecture

```
React SPA (Vercel) ──HTTPS + cookie──> Express API (Render) ──TLS──> MySQL (Aiven)
```

The API is **not** on Vercel deliberately. Vercel runs Node as serverless
functions; each cold instance would open its own Prisma connection pool and
exhaust MySQL's connection limit. A long-lived Express process is the right
shape for this workload.

## Local setup

Requires Node 20+ and a MySQL 8 database.

```bash
git clone <your-repo-url> && cd expense-tracker

# API
cd server
cp .env.example .env          # then fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run seed                  # demo user + ~120 expenses + 2 budgets
npm run dev                   # http://localhost:4000

# Web — in a second terminal
cd ../client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Tests

```bash
cd server && npm test
```

23 unit tests over the logic that carries real risk: budget progress and status
thresholds, unbudgeted spend accounting, chart gap-filling, period-over-period
comparison, and calendar-date handling.

## Design decisions

**Money is `Decimal(12,2)`, never `Float`.** Binary floating point can't
represent 0.10 exactly; summed over hundreds of rows the totals drift and the
dashboard stops matching the expense list.

**Expense dates are `DATE`, not `DATETIME`.** An expense on 3 March is on
3 March for everyone. Storing an instant means a user in IST logging at 2am
sees it land on the previous day after UTC conversion.

**The token lives in an httpOnly cookie, not localStorage.** `localStorage` is
readable by any JavaScript on the page, so one XSS from any dependency hands
over every account. The cost is `withCredentials` on the client and an exact
CORS origin on the server.

**Budgets store explicit start/end dates.** `periodType` is a display label,
not logic, so a one-off trip budget needs no special-casing — every spend query
is the same `BETWEEN`.

**Categories are archived, not deleted.** `onDelete: Restrict` enforces it at
the database level, so deleting a category with history fails loudly instead of
destroying data.

**Each theme has its own status colours.** The dark palette's green and amber
measure 2.35:1 and 2.04:1 on white — far below the 4.5:1 minimum. Reusing one
set across both themes fails silently: nothing errors, the "approaching limit"
warning just stops being readable.

## Project layout

```
server/src/
  lib/          prisma singleton, jwt, money and date helpers
  middleware/   auth, validation, error handling
  routes/       thin route definitions
  controllers/  request handling and database access
  services/     pure business logic (unit tested, no DB)
  validators/   zod schemas
client/src/
  api/          axios instance and resource modules
  hooks/        auth, theme, toast, fetch
  components/   ui primitives, layout, feature components, charts
  pages/        one per route
```

Business logic lives in `services/` as pure functions taking plain data, which
is why budget math and gap-filling can be tested without a database.
