// ── Auth ──────────────────────────────────────────────────────
export interface AuthUser {
  userId:   string
  nickname: string
  roomId:   string
  roomCode: string
  token:    string
}

// ── Checkbox ──────────────────────────────────────────────────
export interface CheckboxItem {
  id:   string
  text: string
  done: boolean
}

// ── Note ──────────────────────────────────────────────────────
export type NoteColor =
  | 'amber'
  | 'sage'
  | 'sky'
  | 'blush'
  | 'violet'
  | 'peach'

export interface Note {
  id:         string
  roomId:     string
  pageIndex:  number
  authorId:   string
  authorName: string
  content:    string
  color:      NoteColor
  x:          number
  y:          number
  zIndex:     number
  mediaType:  'none' | 'image' | 'audio'
  mediaUrl:   string | null
  checkboxes: CheckboxItem[]
  createdAt:  string
  updatedAt:  string
}

// ── Page ──────────────────────────────────────────────────────
export interface Page {
  id:        string
  roomId:    string
  pageIndex: number
  text:      string
  updatedAt: string
}

// ── Room ──────────────────────────────────────────────────────
export interface Room {
  id:        string
  code:      string
  pages:     Page[]
  notes:     Note[]
  createdAt: string
}

// ── WebSocket Events ──────────────────────────────────────────
// Events the CLIENT sends to server
export type ClientEvent =
  | { event: 'note:create'; data: Omit<Note, 'id'|'roomId'|'authorId'|'authorName'|'createdAt'|'updatedAt'> }
  | { event: 'note:update'; data: { id: string } & Partial<Note> }
  | { event: 'note:delete'; data: { id: string } }
  | { event: 'page:update'; data: { pageIndex: number; text: string } }

// Events the SERVER sends to client
export type ServerEvent =
  | { event: 'note:created';   data: Note }
  | { event: 'note:updated';   data: Note }
  | { event: 'note:deleted';   data: { id: string } }
  | { event: 'page:updated';   data: { pageIndex: number; text: string } }
  | { event: 'user:joined';    data: { userId: string; nickname: string } }
  | { event: 'user:left';      data: { userId: string; nickname: string } }
  | { event: 'room:presence';  data: { count: number; users: { userId: string; nickname: string }[] } }

// ── Note color definitions ────────────────────────────────────
export const NOTE_COLORS: Record<NoteColor, {
  bg:   string
  tape: string
  text: string
}> = {
  amber:  { bg: 'linear-gradient(148deg,#FFFDE7 0%,#FFE066 100%)', tape: 'rgba(255,215,60,.52)',  text: '#5a3e00' },
  sage:   { bg: 'linear-gradient(148deg,#F1F8E9 0%,#AED581 100%)', tape: 'rgba(108,188,80,.48)',  text: '#1a3a00' },
  sky:    { bg: 'linear-gradient(148deg,#E3F2FD 0%,#90CAF9 100%)', tape: 'rgba(80,165,230,.48)',  text: '#003060' },
  blush:  { bg: 'linear-gradient(148deg,#FCE4EC 0%,#F48FB1 100%)', tape: 'rgba(238,100,150,.48)', text: '#4a0020' },
  violet: { bg: 'linear-gradient(148deg,#EDE7F6 0%,#CE93D8 100%)', tape: 'rgba(170,100,210,.48)', text: '#2a004a' },
  peach:  { bg: 'linear-gradient(148deg,#FFF3E0 0%,#FFCC80 100%)', tape: 'rgba(255,165,60,.48)',  text: '#4a2400' },
}

export const NOTE_COLOR_KEYS = Object.keys(NOTE_COLORS) as NoteColor[]