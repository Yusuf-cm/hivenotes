import express from 'express'
import cors from 'cors'
import compression from 'compression'
import path from 'path'
import http from 'http'
import { config } from './config'
import authRoutes  from './routes/auth'
import roomRoutes  from './routes/rooms'
import pageRoutes  from './routes/pages'
import noteRoutes  from './routes/notes'
import uploadRoutes from './routes/upload'
import { initWebSocket } from './ws/server'
import { rateLimit } from './middleware/rateLimit'
import { securityHeaders } from './middleware/securityHeaders'
import { startFileCleanup } from './lib/fileCleanup'
import { startIdleCleanup } from './lib/idleCleanup'

const app = express()

// ── Middleware ────────────────────────────────────────────────
// Security headers must come first
app.use(securityHeaders)

// Compression for all responses
app.use(compression({
  level: 6, // Balance between compression ratio and speed
  threshold: 1024, // Only compress responses > 1KB
}))

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'https://hivenotes.vercel.app',
    ]

    // Allow Vercel preview deployments only for this exact project
    const isVercelPreview = origin?.match(/^https:\/\/hivenotes-[a-z0-9-]+\.vercel\.app$/)

    if (!origin || allowed.includes(origin) || isVercelPreview) {
      callback(null, true)
    } else {
      console.log('[cors] blocked:', origin)
      callback(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true,
}))

// Limit request sizes
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (duration > 1000) {
      console.log(`[slow] ${req.method} ${req.path} - ${duration}ms`)
    }
  })
  next()
})

// ── Static file serving (uploaded images/audio) ───────────────
app.use('/files', express.static(config.uploadsDir))

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// ── Request ID tracking ──────────────────────────────────────
app.use((req, res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  req.id = requestId
  res.setHeader('X-Request-ID', requestId)
  next()
})

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id?: string
    }
  }
}

// ── Routes ────────────────────────────────────────────────────
// Rate limit auth endpoints more aggressively (5 req/min per IP)
app.use('/auth', rateLimit(60 * 1000, 5), authRoutes)
app.use('/rooms', rateLimit(15 * 60 * 1000, 100), roomRoutes)
app.use('/pages', rateLimit(15 * 60 * 1000, 200), pageRoutes)
app.use('/notes', rateLimit(15 * 60 * 1000, 200), noteRoutes)
app.use('/upload', rateLimit(15 * 60 * 1000, 20), uploadRoutes)

// ── Global error handler ─────────────────────────────────────
app.use((err: any, req: any, res: any, next: any) => {
  const requestId = req.id || 'unknown'
  console.error(`[error] ${requestId}:`, err.message || err)

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId,
  })
})

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    requestId: req.id,
  })
})

// ── HTTP server (shared with WebSocket later) ─────────────────
const server = http.createServer(app)

const gracefulShutdown = async () => {
  console.log('\n[shutdown] Graceful shutdown started...')
  server.close(() => {
    console.log('[shutdown] HTTP server closed')
    process.exit(0)
  })

  setTimeout(() => {
    console.error('[shutdown] Forced exit after 10s')
    process.exit(1)
  }, 10000)
}

// Handle signals
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

server.listen(config.port, () => {
  console.log(`\n🐝  HiveNotes server running`)
  console.log(`   HTTP  → http://localhost:${config.port}`)
  console.log(`   Files → http://localhost:${config.port}/files\n`)
  initWebSocket(server)
  startFileCleanup()
  startIdleCleanup()
})

export { server, app }