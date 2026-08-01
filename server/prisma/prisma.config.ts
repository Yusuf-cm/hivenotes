import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/hivenotes'

export default defineConfig({
  datasources: {
    db: {
      adapter: 'postgresql',
      url: databaseUrl,
    },
  },
})