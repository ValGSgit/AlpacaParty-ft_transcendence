import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Mirrors the same URL-building logic in src/config/prisma.js
const url =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'alpacaparty'}:${encodeURIComponent(process.env.DB_PASSWORD ?? 'alpacaparty')}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? 5432}/${process.env.DB_NAME ?? 'alpacaparty'}`;

export default defineConfig({
  datasourceUrl: url,
  migrate: {
    async adapter() {
      const pool = new pg.Pool({ connectionString: url });
      return new PrismaPg(pool);
    },
  },
});
