/**
 * Prisma Client singleton
 * @owner DavidPoetsch, ValGSgit
 *
 * Supports both DATABASE_URL (12-factor) and individual DB_* vars (Docker Compose).
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { defineConfig, env } from "prisma/config";

/*
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // seed: 'node prisma/seed.js'
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
 */

dotenv.config(); 

const url =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'alpacaparty'}:${encodeURIComponent(process.env.DB_PASSWORD || 'alpacaparty')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'alpacaparty'}`;

const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
