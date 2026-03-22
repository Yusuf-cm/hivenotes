import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Server } from 'http'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { JwtPayload } from '../middleware/auth'
import { handleMessage } from './handlers'

// ── Types ─────────────────────────────────────────────────────

export interface Client {
  ws:       WebSocket
  userId:   string
  nickname: string
  roomId:   string
  roomCode: string
}

// roomCode → Set of connected clients
const rooms = new Map<string, Set<Client>>()

// ── Helpers ───────────────────────────────────────────────────

export const getRoom = (roomCode: string): Set<Client> => {
  if (!rooms.has(roomCode)) rooms.set(roomCode, new Set())
  return rooms.get(roomCode)!
}

export const broadcast = (
  roomCode: string,
  event:    string,
  data:     unknown,
  exclude?: string  // userId to skip (the sender)
): void => {
  const room = rooms.get(roomCode)
  if (!room) return

  const message = JSON.stringify({ event, data })

  for (const client of room) {
    if (exclude && client.userId === exclude) continue
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message)
    }
  }
}

// ── Boot ──────────────────────────────────────────────────────

export const initWebSocket = (server: Server): void => {
  const wss = new WebSocketServer({ server, path: '/ws' })

 wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {

  // In dev, allow all origins
  const origin  = req.headers.origin
const allowed = [config.clientUrl, 'http://localhost:3000']

if (origin && !allowed.includes(origin)) {
  ws.close(4003, 'Origin not allowed')
  return
}

  // Extract token from query string
  // Extract token from query string
const url   = new URL(req.url!, `http://${req.headers.host}`)
const token = url.searchParams.get('token')

if (!token) {
  ws.close(4001, 'Missing token')
  return
}

// Verify JWT
let payload: JwtPayload
try {
  payload = jwt.verify(token, config.jwtSecret) as unknown as JwtPayload
} catch {
  ws.close(4001, 'Invalid token')
  return
}

    // Register client
    const client: Client = {
      ws,
      userId:   payload.userId,
      nickname: payload.nickname,
      roomId:   payload.roomId,
      roomCode: payload.roomCode,
    }

    const room = getRoom(payload.roomCode)
    room.add(client)

    console.log(`[ws] ${payload.nickname} joined room ${payload.roomCode} (${room.size} online)`)

    // Announce to others in the room
    broadcast(payload.roomCode, 'user:joined', {
      userId:   payload.userId,
      nickname: payload.nickname,
    }, payload.userId)

    // Send current online count to everyone
    broadcast(payload.roomCode, 'room:presence', {
      count: room.size,
      users: [...room].map(c => ({ userId: c.userId, nickname: c.nickname })),
    })

    // ── Incoming messages ──────────────────────────────────────
    ws.on('message', (raw: Buffer) => {
      try {
        const { event, data } = JSON.parse(raw.toString())
        handleMessage(client, event, data)
      } catch (err) {
        console.error('[ws] Bad message', err)
      }
    })

    // ── Disconnect ─────────────────────────────────────────────
    ws.on('close', () => {
      room.delete(client)
      console.log(`[ws] ${payload.nickname} left room ${payload.roomCode} (${room.size} online)`)

      broadcast(payload.roomCode, 'user:left', {
        userId:   payload.userId,
        nickname: payload.nickname,
      })

      broadcast(payload.roomCode, 'room:presence', {
        count: room.size,
        users: [...room].map(c => ({ userId: c.userId, nickname: c.nickname })),
      })

      // Clean up empty rooms from memory
      if (room.size === 0) rooms.delete(payload.roomCode)
    })

    ws.on('error', (err) => {
      console.error(`[ws] Error for ${payload.nickname}:`, err)
    })
  })

  console.log(`   WS    → ws://localhost:${config.port}/ws`)
}