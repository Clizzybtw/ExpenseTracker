import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORIES } from '../src/controllers/auth.controller.js';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo1234';

// Deterministic PRNG so reseeding produces the same demo data.
let seed = 42;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 100) / 100;

const NOTES = {
  'Food & Dining': ['Lunch', 'Dinner with friends', 'Coffee', 'Takeaway', 'Brunch'],
  Transport: ['Auto fare', 'Metro card', 'Airport cab', 'Fuel', 'Ride share'],
  Rent: ['Monthly rent'],
  Utilities: ['Electricity', 'Internet', 'Water', 'Gas cylinder'],
  Groceries: ['Weekly shop', 'Vegetables', 'Supermarket run'],
  Shopping: ['T-shirt', 'Headphones', 'Shoes', 'Backpack'],
  Health: ['Pharmacy', 'Doctor visit', 'Gym membership'],
  Entertainment: ['Cinema', 'Concert tickets', 'Streaming'],
  Other: ['Misc', 'Gift', 'Repairs'],
};

const RANGES = {
  'Food & Dining': [150, 1400], Transport: [60, 900], Rent: [18000, 18000],
  Utilities: [400, 2200], Groceries: [500, 3200], Shopping: [600, 5000],
  Health: [200, 2500], Entertainment: [250, 1800], Other: [100, 1200],
};

const iso = (d) => d.toISOString().slice(0, 10);
const dateOnly = (s) => new Date(`${s}T00:00:00.000Z`);

async function main() {
  console.log('Seeding…');

  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: 'Demo User',
      currency: 'INR',
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      categories: { create: DEFAULT_CATEGORIES },
    },
    include: { categories: true },
  });

  const catByName = new Map(user.categories.map((c) => [c.name, c]));

  // ~6 months of expenses.
  const expenses = [];
  const today = new Date();
  for (let m = 5; m >= 0; m--) {
    const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 1));
    const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();

    // Rent once a month.
    expenses.push({
      userId: user.id,
      categoryId: catByName.get('Rent').id,
      amount: 18000,
      date: dateOnly(iso(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 2)))),
      note: 'Monthly rent',
    });

    const n = 18 + Math.floor(rand() * 10);
    for (let i = 0; i < n; i++) {
      const name = pick(Object.keys(NOTES).filter((k) => k !== 'Rent'));
      const day = 1 + Math.floor(rand() * daysInMonth);
      const d = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day));
      if (d > today) continue;
      const [lo, hi] = RANGES[name];
      expenses.push({
        userId: user.id,
        categoryId: catByName.get(name).id,
        amount: between(lo, hi),
        date: dateOnly(iso(d)),
        note: pick(NOTES[name]),
      });
    }
  }

  await prisma.expense.createMany({ data: expenses });

  // Current-month budget.
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  const monthName = monthStart.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

  await prisma.budget.create({
    data: {
      userId: user.id,
      name: `${monthName} ${monthStart.getUTCFullYear()}`,
      periodType: 'MONTHLY',
      startDate: dateOnly(iso(monthStart)),
      endDate: dateOnly(iso(monthEnd)),
      totalLimit: 50000,
      allocations: {
        create: [
          { categoryId: catByName.get('Food & Dining').id, limit: 15000 },
          { categoryId: catByName.get('Rent').id, limit: 18000 },
          { categoryId: catByName.get('Transport').id, limit: 6000 },
          { categoryId: catByName.get('Groceries').id, limit: 4000 },
          { categoryId: catByName.get('Entertainment').id, limit: 2000 },
        ],
      },
    },
  });

  // A second, overlapping budget to exercise §7.4.
  await prisma.budget.create({
    data: {
      userId: user.id,
      name: 'Weekend trip',
      periodType: 'CUSTOM',
      startDate: dateOnly(iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 10)))),
      endDate: dateOnly(iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 13)))),
      totalLimit: 8000,
      allocations: {
        create: [
          { categoryId: catByName.get('Transport').id, limit: 3000 },
          { categoryId: catByName.get('Food & Dining').id, limit: 3000 },
        ],
      },
    },
  });

  console.log(`Done. ${expenses.length} expenses, 2 budgets.`);
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
