# Expense Analytics Tracker

A full-stack personal finance dashboard for tracking expenses, managing category budgets, and understanding spending patterns through interactive analytics.

> **Portfolio project:** built with React, Express, Node.js, MySQL, and Prisma.

## Live Demo

**Frontend:** Coming soon

**Demo account:** `demo@example.com` / `demo1234`

> The production API is intended to run on Render Free. The service can sleep after periods of inactivity, so the first request after sleeping may take around a minute. The application handles this with an explicit **“Waking up the server…”** state.

## Screenshots

_Add screenshots here after deployment. Recommended: Dashboard, Expenses, Budget Detail, Analytics, and Settings._

## Features

- Secure registration and login with JWT authentication in an `httpOnly` cookie
- Create, edit, delete, filter, search, sort, and paginate expenses
- User-specific expense categories with custom colours and archive support
- Budgets with per-category spending limits and optional overall limits
- Budget progress with spent, remaining, percentage, warning, and over-budget states
- Separate **Unbudgeted** spending so dashboard totals always reconcile with expenses
- Analytics for category breakdown, spending trends, and period comparisons
- Gap-filled trend data so days with no spending appear as zero rather than being skipped
- Dark and light themes with persisted user preference
- Responsive UI for desktop and mobile layouts
- Loading, empty, error, and server-cold-start states

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Charts | Recharts |
| API | Node.js 20+, Express 4, ESM |
| Database | MySQL 8 |
| ORM | Prisma 5 |
| Authentication | JWT + `httpOnly` cookies |
| Validation | Zod |
| Security | Helmet, CORS, rate limiting, server-side validation |
| Deployment | Vercel + Render + Aiven |

## Architecture

```text
┌─────────────────────┐
│   React SPA         │
│   Vercel            │
└──────────┬──────────┘
           │ HTTPS + cookies
           ▼
┌─────────────────────┐
│   Express API       │
│   Render            │
└──────────┬──────────┘
           │ TLS
           ▼
┌─────────────────────┐
│   MySQL 8           │
│   Aiven              │
└─────────────────────┘
```

The backend is intentionally deployed separately from the React frontend. The API uses a long-lived Express process with Prisma, while the React app is deployed as a static SPA.

## Project Structure

```text
expense-analytics-tracker/
├── .github/
│   └── workflows/
│       └── keepalive.yml
├── client/
│   ├── src/
│   │   ├── api/            # Axios client and resource modules
│   │   ├── components/     # UI, layouts, budgets, expenses, charts
│   │   ├── hooks/          # Auth, theme, fetch and toast hooks
│   │   └── pages/          # Dashboard, Expenses, Budgets, Analytics, etc.
│   └── ...
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── controllers/
│   │   ├── lib/            # Prisma, JWT, money and date helpers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── routes/
│   │   ├── services/       # Budget and analytics business logic
│   │   └── validators/
│   └── tests/
├── README.md
└── SPEC.md
```

## Local Setup

### Prerequisites

- Node.js 20+
- MySQL 8+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Clizzybtw/ExpenseTracker.git
cd ExpenseTracker
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/expense_tracker"
JWT_SECRET="your-secret"
CLIENT_URL="http://localhost:5173"
PORT=4000
NODE_ENV=development
```

Create the MySQL database:

```sql
CREATE DATABASE expense_tracker;
```

Generate the Prisma client and create the schema:

```bash
npx prisma generate
npx prisma migrate dev
```

Seed the demo data:

```bash
npm run seed
```

Start the API:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

### 3. Configure the frontend

Open a second terminal:

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL="http://localhost:4000/api"
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Demo Data

The seed script creates:

- Demo user: `demo@example.com`
- Password: `demo1234`
- Default expense categories
- Approximately 120 expenses across recent months
- Two sample budgets

This gives the dashboard and analytics enough data to demonstrate the application without manually entering records first.

## API Overview

All API routes are mounted under `/api`.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Categories

```text
GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id
```

### Expenses

```text
GET    /api/expenses
POST   /api/expenses
PATCH  /api/expenses/:id
DELETE /api/expenses/:id
```

### Budgets

```text
GET    /api/budgets
POST   /api/budgets
GET    /api/budgets/:id
GET    /api/budgets/:id/progress
PATCH  /api/budgets/:id
DELETE /api/budgets/:id
```

### Analytics

```text
GET /api/analytics/summary
GET /api/analytics/by-category
GET /api/analytics/trend
GET /api/analytics/compare
```

## Important Engineering Decisions

### Exact money handling

Expenses and budget limits are stored as Prisma `Decimal(12,2)` values rather than floating-point numbers. API responses convert Decimal values to numbers before returning JSON.

### Calendar dates

Expense and budget dates are stored as MySQL `DATE` values. The client sends `YYYY-MM-DD` strings, avoiding timezone shifts that can move an expense onto the wrong calendar day.

### User data isolation

Authenticated resource queries are scoped to the current user. Expenses, categories, and budgets cannot be accessed across accounts.

### Cookie-based authentication

JWTs are stored in `httpOnly` cookies rather than `localStorage`. In production, cross-origin cookies use `Secure` and `SameSite=None` with explicit CORS credentials.

### Budget calculations

Budgets support overlapping date ranges and per-category allocations. Spending in categories without an allocation is tracked separately as **Unbudgeted** rather than being silently excluded from totals.

### Analytics gap filling

The trend API fills missing dates or months with zero totals so charts represent periods with no spending correctly.

## Tests

Run the backend unit tests with:

```bash
cd server
npm test
```

The current test suite covers the core logic around:

- Budget progress and status thresholds
- Unbudgeted spending
- Trend gap filling
- Period comparison calculations
- Calendar-date handling

## Deployment

The intended production topology is:

```text
React frontend → Vercel
Express API    → Render
MySQL          → Aiven
```

### Frontend — Vercel

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL`

### API — Render

- Root directory: `server`
- Build command: `npm install && npx prisma generate`
- Start command: `npm start`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV`

### Database — Aiven

Use the MySQL connection URI supplied by Aiven and enable SSL for the production connection.

> Free-tier hosting is used for the portfolio deployment, so the API may sleep when idle.

## Security Notes

- Secrets are stored in environment variables and are not committed to Git.
- JWTs are stored in `httpOnly` cookies.
- Login/register endpoints are rate limited.
- Request bodies are validated on the server with Zod.
- Prisma queries are scoped to the authenticated user.
- Raw SQL uses Prisma's tagged-template API rather than interpolated SQL strings.

## Scope

### Included in v1

Expense tracking, categories, budgeting, analytics, authentication, responsive UI, and dual-theme support.

### Not included in v1

Bank synchronization, receipt OCR, recurring expenses, shared budgets, data export, mobile apps, and multi-currency conversion.

## Roadmap

Potential v2 additions include Google OAuth, recurring expenses, receipt uploads, CSV import/export, multi-currency support, savings goals, refresh-token rotation, budget-breach notifications, and offline/PWA support.

## License

This project is intended as a personal portfolio project.
