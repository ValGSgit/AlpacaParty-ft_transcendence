import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Support both DATABASE_URL (12-factor) and individual DB_* vars (Docker Compose style)
const url =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'alpacaparty'}:${encodeURIComponent(process.env.DB_PASSWORD || 'alpacaparty')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'alpacaparty'}`

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url
  },
})
