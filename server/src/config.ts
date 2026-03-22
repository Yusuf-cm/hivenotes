import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  port:       parseInt(process.env.PORT || '4000', 10),
  jwtSecret:  required('JWT_SECRET'),
  clientUrl:  process.env.CLIENT_URL || 'http://localhost:3000',
  uploadsDir: path.resolve(__dirname, '../uploads'),
  db: {
    url: required('DATABASE_URL'),
  },
}