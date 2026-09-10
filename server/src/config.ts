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

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/
const LAN_ORIGIN = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):\d+$/
const TUNNEL_ORIGIN = /^https:\/\/[a-z0-9-]+\.(trycloudflare\.com|loca\.lt|ngrok-free\.app|ngrok\.io)$/i
const VERCEL_PREVIEW = /^https:\/\/hivenotes-[a-z0-9-]+\.vercel\.app$/
const RENDER_ORIGIN = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i
const CAPACITOR_ORIGIN = /^(capacitor|ionic):\/\/localhost$/i

export const isAllowedOrigin = (origin?: string | null): boolean => {
  if (!origin) return true
  if (origin === config.clientUrl) return true
  if (LOCAL_ORIGIN.test(origin)) return true
  if (LAN_ORIGIN.test(origin)) return true
  if (TUNNEL_ORIGIN.test(origin)) return true
  if (RENDER_ORIGIN.test(origin)) return true
  if (CAPACITOR_ORIGIN.test(origin)) return true
  if (origin === 'https://hivenotes.vercel.app') return true
  return VERCEL_PREVIEW.test(origin)
}