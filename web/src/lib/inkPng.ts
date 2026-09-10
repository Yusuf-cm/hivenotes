import { InkStroke, drawStroke, strokeBounds } from './ink'

export const rasterizeInkPng = (strokes: InkStroke[]): string | null => {
  if (typeof document === 'undefined' || strokes.length === 0) return null
  const w = 560
  const h = 780
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  for (const stroke of strokes) {
    drawStroke(ctx, { ...stroke, tool: 'pen', color: '#111111' }, w, h)
  }

  const box = strokeBounds(strokes)
  const padX = 0.04
  const padY = 0.03
  const sx = Math.max(0, Math.floor((box.minX - padX) * w))
  const sy = Math.max(0, Math.floor((box.minY - padY) * h))
  const sw = Math.min(w - sx, Math.max(24, Math.ceil((box.maxX - box.minX + padX * 2) * w)))
  const sh = Math.min(h - sy, Math.max(24, Math.ceil((box.maxY - box.minY + padY * 2) * h)))
  const crop = document.createElement('canvas')
  crop.width = sw
  crop.height = sh
  const cctx = crop.getContext('2d')
  if (!cctx) return canvas.toDataURL('image/png')
  cctx.fillStyle = '#ffffff'
  cctx.fillRect(0, 0, sw, sh)
  cctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
  return crop.toDataURL('image/png')
}
