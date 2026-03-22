import { Room, Note, Page } from '@/types'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const req = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  create: (nickname: string, password: string) =>
    req<{ token: string; roomCode: string; nickname: string }>(
      '/auth/create',
      { method: 'POST', body: JSON.stringify({ nickname, password }) }
    ),

  join: (nickname: string, roomCode: string, password: string) =>
    req<{ token: string; roomCode: string; nickname: string }>(
      '/auth/join',
      { method: 'POST', body: JSON.stringify({ nickname, roomCode, password }) }
    ),
}

// ── Rooms ─────────────────────────────────────────────────────
export const roomApi = {
  get: (code: string, token: string) =>
    req<Room>(`/rooms/${code}`, {}, token),
}

// ── Pages ─────────────────────────────────────────────────────
export const pageApi = {
  update: (pageIndex: number, text: string, token: string) =>
    req<Page>(`/pages/${pageIndex}`, {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    }, token),
}

// ── Notes ─────────────────────────────────────────────────────
export const noteApi = {
  create: (data: Partial<Note>, token: string) =>
    req<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  update: (id: string, data: Partial<Note>, token: string) =>
    req<Note>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, token),

  delete: (id: string, token: string) =>
    req<void>(`/notes/${id}`, { method: 'DELETE' }, token),
}

// ── Upload ────────────────────────────────────────────────────
export const uploadApi = {
  file: async (file: File, token: string): Promise<{ url: string }> => {
    const form = new FormData()
    form.append('file', file)

    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })

    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },
}