export type InkTool = 'pen' | 'highlighter' | 'eraser'
export type WriteMode = 'type' | 'pen' | 'diagram'
export type InkMark = 'pen' | 'highlighter' | 'line' | 'rect' | 'ellipse' | 'arrow' | 'table'

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

export const INK_COLORS = [
  { id: '#1c0f0c', label: 'Ink' },
  { id: '#1a1a1a', label: 'Black' },
  { id: '#8b1e1e', label: 'Red' },
  { id: '#1e3a6e', label: 'Blue' },
  { id: '#2d6a3f', label: 'Green' },
  { id: '#c9a227', label: 'Gold' },
] as const

export const INK_WIDTHS = [0.006, 0.012, 0.022]

export const DRAW_TOOLS: { id: InkTool; label: string }[] = [
  { id: 'pen', label: 'Write' },
  { id: 'highlighter', label: 'Mark' },
  { id: 'eraser', label: 'Erase' },
]

export const SHAPE_TOOLS: InkMark[] = ['line', 'rect', 'ellipse', 'arrow', 'table']

export const emptyInk = (): InkStroke[] => []

const MARKS: InkMark[] = ['pen', 'highlighter', 'line', 'rect', 'ellipse', 'arrow', 'table']

export const parseInk = (raw: unknown): InkStroke[] => {
  if (!Array.isArray(raw)) return []
  return raw.filter((s): s is InkStroke =>
    !!s &&
    typeof s === 'object' &&
    MARKS.includes(s.tool) &&
    typeof s.color === 'string' &&
    typeof s.width === 'number' &&
    Array.isArray(s.points) &&
    s.points.length >= 2
  )
}

export const strokeBounds = (strokes: InkStroke[]) => {
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const stroke of strokes) {
    for (const p of stroke.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  return { minX, minY, maxX, maxY }
}

const pt = (x: number, y: number, p = 0.7): InkPoint => ({ x, y, p })

const snapAxis = (a: InkPoint, b: InkPoint): InkPoint => {
  if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) return { ...b, y: a.y }
  return { ...b, x: a.x }
}

export const isShapeTool = (tool: string): tool is InkMark =>
  (SHAPE_TOOLS as readonly string[]).includes(tool)

export const snapShapePoint = (tool: InkTool | InkMark, start: InkPoint, end: InkPoint, shift: boolean): InkPoint => {
  if (!shift) return end
  if (tool === 'line' || tool === 'arrow') return snapAxis(start, end)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const s = Math.max(Math.abs(dx), Math.abs(dy))
  return { x: start.x + Math.sign(dx || 1) * s, y: start.y + Math.sign(dy || 1) * s, p: end.p }
}

export const tableSize = (a: InkPoint, b: InkPoint) => {
  const w = Math.abs(b.x - a.x)
  const h = Math.abs(b.y - a.y)
  return {
    cols: Math.max(2, Math.min(6, Math.round(w / 0.11) || 3)),
    rows: Math.max(2, Math.min(8, Math.round(h / 0.08) || 4)),
  }
}

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
    const cols = stroke.cols || tableSize(a, b).cols
    const rows = stroke.rows || tableSize(a, b).rows
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

export const drawStroke = (
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  w: number,
  h: number,
) => {
  for (const part of expandStroke(stroke)) {
    const pts = part.points
    if (pts.length === 0) continue
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = part.color
    if (part.tool === 'highlighter') {
      ctx.globalAlpha = 0.32
      ctx.globalCompositeOperation = 'multiply'
    }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const pressure = part.tool === 'highlighter' ? 1 : 0.38 + (b.p || 0.5) * 0.9
      ctx.beginPath()
      ctx.moveTo(a.x * w, a.y * h)
      ctx.lineTo(b.x * w, b.y * h)
      ctx.lineWidth = Math.max(0.8, part.width * w * pressure * (part.tool === 'highlighter' ? 3.6 : 1))
      ctx.stroke()
    }
    ctx.restore()
  }
}

export const renderInk = (
  ctx: CanvasRenderingContext2D,
  strokes: InkStroke[],
  w: number,
  h: number,
) => {
  ctx.clearRect(0, 0, w, h)
  for (const stroke of strokes) drawStroke(ctx, stroke, w, h)
}

const dist2 = (a: InkPoint, b: { x: number; y: number }) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export const simplifyPoints = (points: InkPoint[], minDist = 0.0024): InkPoint[] => {
  if (points.length < 3) return points
  const out: InkPoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    if (dist2(out[out.length - 1], points[i]) >= minDist * minDist) out.push(points[i])
  }
  out.push(points[points.length - 1])
  return out
}

export const eraseAt = (strokes: InkStroke[], x: number, y: number, radius = 0.028): InkStroke[] => {
  const r2 = radius * radius
  return strokes.filter(stroke => {
    for (const part of expandStroke(stroke)) {
      if (part.points.some(p => dist2(p, { x, y }) <= r2)) return false
    }
    return true
  })
}
