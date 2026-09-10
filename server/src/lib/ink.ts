export type InkTool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'arrow' | 'table'
export type InkMark = Exclude<InkTool, 'eraser'>

export interface InkPoint {
  x: number
  y: number
  p: number
}

export interface InkStroke {
  tool: InkMark
  color: string
  width: number
  points: InkPoint[]
  rows?: number
  cols?: number
}

const MAX_STROKES = 500
const MAX_POINTS = 400
const COLORS = new Set(['#1c0f0c', '#1a1a1a', '#8b1e1e', '#1e3a6e', '#c9a227', '#2d6a3f'])
const MARKS = new Set<InkMark>(['pen', 'highlighter', 'line', 'rect', 'ellipse', 'arrow', 'table'])

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

const asPoint = (raw: unknown): InkPoint | null => {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  if (typeof p.x !== 'number' || typeof p.y !== 'number') return null
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
  return {
    x: clamp01(p.x),
    y: clamp01(p.y),
    p: typeof p.p === 'number' && Number.isFinite(p.p) ? clamp01(p.p) : 0.5,
  }
}

export const sanitizeInk = (raw: unknown): InkStroke[] => {
  if (!Array.isArray(raw)) return []
  const strokes: InkStroke[] = []
  for (const item of raw.slice(0, MAX_STROKES)) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    const tool = MARKS.has(s.tool as InkMark) ? s.tool as InkMark : 'pen'
    if (tool === 'eraser' as string) continue
    const color = typeof s.color === 'string' && COLORS.has(s.color) ? s.color : '#1c0f0c'
    const width = typeof s.width === 'number' && Number.isFinite(s.width)
      ? Math.max(0.002, Math.min(0.08, s.width))
      : 0.012
    if (!Array.isArray(s.points)) continue
    const points = s.points.map(asPoint).filter((p): p is InkPoint => !!p).slice(0, MAX_POINTS)
    if (points.length < 2) continue
    const stroke: InkStroke = { tool, color, width, points }
    if (typeof s.rows === 'number' && s.rows >= 2 && s.rows <= 10) stroke.rows = Math.round(s.rows)
    if (typeof s.cols === 'number' && s.cols >= 2 && s.cols <= 10) stroke.cols = Math.round(s.cols)
    strokes.push(stroke)
  }
  return strokes
}

export const inkHasMarks = (raw: unknown): boolean => {
  if (!Array.isArray(raw) || raw.length === 0) return false
  return sanitizeInk(raw).length > 0
}

const pt = (x: number, y: number, p = 0.7): InkPoint => ({
  x: Math.max(0, Math.min(1, x)),
  y: Math.max(0, Math.min(1, y)),
  p,
})

export const expandStroke = (stroke: InkStroke): InkStroke[] => {
  const a = stroke.points[0]
  const b = stroke.points[stroke.points.length - 1]
  const mk = (points: InkPoint[]): InkStroke => ({
    tool: 'pen',
    color: stroke.color,
    width: stroke.width,
    points,
  })

  if (stroke.tool === 'pen' || stroke.tool === 'highlighter') return [stroke]
  if (stroke.tool === 'line') return [mk([a, b])]

  if (stroke.tool === 'rect') {
    const x0 = Math.min(a.x, b.x)
    const x1 = Math.max(a.x, b.x)
    const y0 = Math.min(a.y, b.y)
    const y1 = Math.max(a.y, b.y)
    return [mk([pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1), pt(x0, y0)])]
  }

  if (stroke.tool === 'ellipse') {
    const cx = (a.x + b.x) / 2
    const cy = (a.y + b.y) / 2
    const rx = Math.abs(b.x - a.x) / 2
    const ry = Math.abs(b.y - a.y) / 2
    const points: InkPoint[] = []
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2
      points.push(pt(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry))
    }
    return [mk(points)]
  }

  if (stroke.tool === 'arrow') {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const head = Math.min(0.045, len * 0.22)
    const px = -uy
    const py = ux
    return [
      mk([a, b]),
      mk([b, pt(b.x - ux * head + px * head * 0.45, b.y - uy * head + py * head * 0.45)]),
      mk([b, pt(b.x - ux * head - px * head * 0.45, b.y - uy * head - py * head * 0.45)]),
    ]
  }

  if (stroke.tool === 'table') {
    const x0 = Math.min(a.x, b.x)
    const x1 = Math.max(a.x, b.x)
    const y0 = Math.min(a.y, b.y)
    const y1 = Math.max(a.y, b.y)
    const cols = Math.max(2, Math.min(8, stroke.cols || 3))
    const rows = Math.max(2, Math.min(10, stroke.rows || 4))
    const lines: InkStroke[] = []
    for (let c = 0; c <= cols; c++) {
      const x = x0 + (x1 - x0) * (c / cols)
      lines.push(mk([pt(x, y0), pt(x, y1)]))
    }
    for (let r = 0; r <= rows; r++) {
      const y = y0 + (y1 - y0) * (r / rows)
      lines.push(mk([pt(x0, y), pt(x1, y)]))
    }
    return lines
  }

  return [stroke]
}
