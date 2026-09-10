import { Room, Note, Page, AuthUser } from '@/types'
import { apiBase } from './backend'

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

  const res = await fetch(`${apiBase()}${path}`, { ...options, headers })

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
    req<{ token: string; roomCode: string; nickname: string; userId: string; pageIndex: number } & Pick<AuthUser, 'isTeacher' | 'plan' | 'compileCount' | 'canCompile' | 'needsPro'>>(
      '/auth/create',
      { method: 'POST', body: JSON.stringify({ nickname, password }) }
    ),

  join: (nickname: string, roomCode: string, password: string) =>
    req<{ token: string; roomCode: string; nickname: string; userId: string; pageIndex: number } & Pick<AuthUser, 'isTeacher' | 'plan' | 'compileCount' | 'canCompile' | 'needsPro'>>(
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
  create: (pageIndex: number, token: string) =>
    req<Page>('/pages', {
      method: 'POST',
      body: JSON.stringify({ pageIndex }),
    }, token),

  update: (pageIndex: number, data: {
    text?: string
    ink?: unknown
    handText?: string
    diagram?: unknown
    diagramUrl?: string | null
  }, token: string) =>
    req<Page>(`/pages/${pageIndex}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
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

    const res = await fetch(`${apiBase()}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })

    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },
}