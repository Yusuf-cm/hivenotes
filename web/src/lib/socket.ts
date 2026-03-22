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

  private _connect(): void {
  if (this.dead) return

  const url = `${WS_BASE}/ws?token=${this.token}`
  console.log('[ws] connecting to', url.replace(this.token, this.token.slice(0,20)+'...'))
  this.ws = new WebSocket(url)

    this.ws = new WebSocket(`${WS_BASE}/ws?token=${this.token}`)

    this.ws.onopen = () => {
      console.log('[ws] connected')
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
    }

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const { event, data } = JSON.parse(e.data) as ServerEvent
        const set = this.handlers.get(event)
        if (set) set.forEach(fn => fn(data))
      } catch (err) {
        console.error('[ws] parse error', err)
      }
    }

    this.ws.onclose = (e) => {
  if (this.dead) return
  console.log('[ws] closed — code:', e.code, 'reason:', e.reason)
  this.reconnectTimer = setTimeout(() => this._connect(), 2000)
}

    this.ws.onerror = (err) => {
      console.error('[ws] error', err)
    }
  }

  send(event: ClientEvent['event'], data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }))
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