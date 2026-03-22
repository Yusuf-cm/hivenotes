import express from 'express'
import cors from 'cors'
import path from 'path'
import http from 'http'
import { config } from './config'
import authRoutes  from './routes/auth'
import roomRoutes  from './routes/rooms'
import pageRoutes  from './routes/pages'
import noteRoutes  from './routes/notes'
import uploadRoutes from './routes/upload'
import { initWebSocket } from './ws/server'

const app = express()

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      config.clientUrl,
      'http://localhost:3000',
    ]
    // Allow requests with no origin (mobile apps, curl)
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Static file serving (uploaded images/audio) ───────────────
app.use('/files', express.static(config.uploadsDir))

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() })
})

// ── Routes (stubs for now — we fill these next steps) ─────────
app.use('/auth',  authRoutes)
app.use('/rooms', roomRoutes)
app.use('/pages', pageRoutes)
app.use('/notes', noteRoutes)
app.use('/upload', uploadRoutes)

// ── HTTP server (shared with WebSocket later) ─────────────────
const server = http.createServer(app)

server.listen(config.port, () => {
  console.log(`\n🐝  HiveNotes server running`)
  console.log(`   HTTP  → http://localhost:${config.port}`)
  console.log(`   Files → http://localhost:${config.port}/files\n`)
  initWebSocket(server)
})

export { server, app }