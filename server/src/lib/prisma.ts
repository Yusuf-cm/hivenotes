import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from '../config'

const adapter = new PrismaPg({ connectionString: config.db.url })

export const prisma = new PrismaClient({ adapter } as any)