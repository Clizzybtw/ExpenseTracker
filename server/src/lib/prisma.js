import { PrismaClient } from '@prisma/client';

// WHY: one client for the whole process. Instantiating PrismaClient per-module
// opens a separate connection pool each time and exhausts MySQL's max_connections
// (50 on the Aiven free tier). globalThis guards against `node --watch` reloads
// creating a new client on every file change in development.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

export default prisma;
