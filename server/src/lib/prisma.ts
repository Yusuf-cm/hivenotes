import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')

// The driver adapter does not read the `?schema=` parameter from the connection
// string the way the Prisma CLI does, so it has to be passed explicitly. Without
// this the client resolves every table against `public` while migrations were
// applied to DATABASE_SCHEMA, and queries fail with TableDoesNotExist.
const schema = process.env.DATABASE_SCHEMA
const adapter = new PrismaPg({ connectionString }, schema ? { schema } : undefined)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new (PrismaClient as any)({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
