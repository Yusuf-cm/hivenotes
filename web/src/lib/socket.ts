import { ServerEvent, ClientEvent } from '@/types'

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'

type EventHandler = (data: any) => void

class SocketClient {
  private ws:       WebSocket | null = null
  private token:    string = ''
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private dead = false

  connect(token: string): void {
    this.token = token
    this.dead  = false
    this._connect()
  }

  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private messageQueue: Array<{ event: string; data: unknown }> = []

  private _connect(): void {
    if (this.dead) return

    const url = `${WS_BASE}/ws?token=${this.token}`
    console.log('[ws] connecting to', url.replace(this.token, this.token.slice(0, 20) + '...'))

    try {
      this.ws = new WebSocket(url)
    } catch (err) {
      console.error('[ws] connection error:', err instanceof Error ? err.message : 'Unknown error')
      this._scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      console.log('[ws] connected')
      this.reconnectAttempts = 0

      // Flush queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()
        if (msg) this.ws!.send(JSON.stringify(msg))
      }

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
    }

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data)
        if (!msg.event || typeof msg.event !== 'string') {
          console.warn('[ws] Invalid message: missing or invalid event')
          return
        }
        const set = this.handlers.get(msg.event)
        if (set) set.forEach(fn => fn(msg.data || {}))
      } catch (err) {
        console.error('[ws] parse error:', err instanceof Error ? err.message : 'Unknown error')
      }
    }

    this.ws.onclose = (e) => {
      if (this.dead) return
      console.log('[ws] closed — code:', e.code, 'reason:', e.reason)
      this._scheduleReconnect()
    }

    this.ws.onerror = (err) => {
      console.error('[ws] error:', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  private _scheduleReconnect(): void {
    if (this.dead || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ws] max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000) // Exponential backoff, max 30s
    console.log(`[ws] reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => this._connect(), delay)
  }

  send(event: ClientEvent['event'], data: unknown): void {
    const message = { event, data }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message if not connected
      this.messageQueue.push(message)
      console.log(`[ws] message queued (queue size: ${this.messageQueue.length})`)
    }
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    // Return unsubscribe function
    return () => this.handlers.get(event)?.delete(handler)
  }

  disconnect(): void {
    this.dead = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }
}

// Singleton — one connection per browser session
export const socket = new SocketClient()