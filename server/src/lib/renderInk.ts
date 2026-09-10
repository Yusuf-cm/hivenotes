import { deflateSync } from 'zlib'
import { InkStroke, expandStroke, sanitizeInk } from './ink'

const W = 720
const H = 1020
const PAPER = [245, 237, 216]
const LINE = [176, 196, 214]
const MARGIN = [210, 120, 120]

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

const crc32 = (buf: Buffer) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const encodePng = (width: number, height: number, rgb: Buffer) => {
  const stride = width * 3
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    const dest = y * (stride + 1)
    raw[dest] = 0
    rgb.copy(raw, dest + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const hexRgb = (hex: string): [number, number, number] => {
  const n = hex.replace('#', '')
  return [
    parseInt(n.slice(0, 2), 16) || 28,
    parseInt(n.slice(2, 4), 16) || 15,
    parseInt(n.slice(4, 6), 16) || 12,
  ]
}

const mix = (buf: Buffer, i: number, r: number, g: number, b: number, a: number) => {
  buf[i] = Math.round(buf[i] * (1 - a) + r * a)
  buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + g * a)
  buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + b * a)
}

const stamp = (
  buf: Buffer,
  x: number,
  y: number,
  radius: number,
  rgb: [number, number, number],
  alpha: number,
) => {
  const r = Math.max(1, Math.ceil(radius))
  const r2 = radius * radius
  const xi = Math.round(x)
  const yi = Math.round(y)
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy
      if (d2 > r2) continue
      const px = xi + dx
      const py = yi + dy
      if (px < 0 || py < 0 || px >= W || py >= H) continue
      const fall = 1 - d2 / (r2 + 0.001)
      mix(buf, (py * W + px) * 3, rgb[0], rgb[1], rgb[2], alpha * fall)
    }
  }
}

const drawSeg = (
  buf: Buffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  rgb: [number, number, number],
  alpha: number,
) => {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(1, radius * 0.55)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    stamp(buf, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, rgb, alpha)
  }
}

export const renderNotebookPng = (rawInk: unknown): Buffer => {
  const rgb = Buffer.alloc(W * H * 3)
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = PAPER[0]
    rgb[i + 1] = PAPER[1]
    rgb[i + 2] = PAPER[2]
  }

  const lineH = 28 * (H / 560)
  for (let y = 72 * (H / 560); y < H; y += lineH) {
    const yi = Math.round(y)
    if (yi < 0 || yi >= H) continue
    for (let x = 0; x < W; x++) mix(rgb, (yi * W + x) * 3, LINE[0], LINE[1], LINE[2], 0.28)
  }
  const mx = Math.round(70 * (W / 380))
  for (let y = 0; y < H; y++) {
    mix(rgb, (y * W + mx) * 3, MARGIN[0], MARGIN[1], MARGIN[2], 0.45)
    if (mx + 1 < W) mix(rgb, (y * W + mx + 1) * 3, MARGIN[0], MARGIN[1], MARGIN[2], 0.35)
  }

  const strokes = sanitizeInk(rawInk)
  for (const stroke of strokes) {
    for (const part of expandStroke(stroke)) {
      const color = hexRgb(part.color)
      const highlighter = part.tool === 'highlighter'
      const radius = Math.max(1.2, part.width * W * (highlighter ? 2.8 : 0.7))
      const alpha = highlighter ? 0.28 : 0.92
      const pts = part.points
      for (let i = 1; i < pts.length; i++) {
        drawSeg(
          rgb,
          pts[i - 1].x * W,
          pts[i - 1].y * H,
          pts[i].x * W,
          pts[i].y * H,
          radius,
          color,
          alpha,
        )
      }
    }
  }

  return encodePng(W, H, rgb)
}
