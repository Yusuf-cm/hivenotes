'use client'

import { useEffect, useRef } from 'react'
import {
  InkPoint,
  InkStroke,
  InkTool,
  isShapeTool,
  drawStroke,
  eraseAt,
  renderInk,
  simplifyPoints,
  snapShapePoint,
  tableSize,
} from '@/lib/ink'

interface Props {
  strokes: InkStroke[]
  onChange: (strokes: InkStroke[]) => void
  tool: InkTool
  color: string
  width: number
  enabled: boolean
}

export default function InkLayer({ strokes, onChange, tool, color, width, enabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef(strokes)
  const liveRef = useRef<InkStroke | null>(null)
  const drawingRef = useRef(false)
  const sawPenRef = useRef(false)
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const widthRef = useRef(width)
  const enabledRef = useRef(enabled)
  const onChangeRef = useRef(onChange)

  strokesRef.current = strokes
  toolRef.current = tool
  colorRef.current = color
  widthRef.current = width
  enabledRef.current = enabled
  onChangeRef.current = onChange

  const paint = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    renderInk(ctx, strokesRef.current, w, h)
    if (liveRef.current) drawStroke(ctx, liveRef.current, w, h)
  }

  const pointFromEvent = (e: PointerEvent): InkPoint | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return null
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      p: e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.55,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const fit = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      paint()
    }

    fit()
    const ro = new ResizeObserver(fit)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    paint()
  }, [strokes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ignorePointer = (e: PointerEvent) => {
      if (!enabledRef.current) return true
      if (e.pointerType === 'pen') {
        sawPenRef.current = true
        return false
      }
      if (e.pointerType === 'touch' && sawPenRef.current) return true
      if (e.pointerType === 'mouse' && e.buttons !== 1 && e.type !== 'pointerdown') return true
      return false
    }

    const onDown = (e: PointerEvent) => {
      if (ignorePointer(e)) return
      const pt = pointFromEvent(e)
      if (!pt) return
      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      drawingRef.current = true

      if (toolRef.current === 'eraser') {
        onChangeRef.current(eraseAt(strokesRef.current, pt.x, pt.y))
        liveRef.current = null
        paint()
        return
      }

      const tool = toolRef.current
      liveRef.current = {
        tool,
        color: colorRef.current,
        width: widthRef.current,
        points: isShapeTool(tool) ? [pt, { ...pt }] : [pt],
      }
      paint()
    }

    const onMove = (e: PointerEvent) => {
      if (!drawingRef.current) return
      if (ignorePointer(e) && e.pointerType === 'touch' && sawPenRef.current) return
      const pt = pointFromEvent(e)
      if (!pt) return
      e.preventDefault()

      if (toolRef.current === 'eraser') {
        onChangeRef.current(eraseAt(strokesRef.current, pt.x, pt.y))
        paint()
        return
      }

      const live = liveRef.current
      if (!live) return
      const start = live.points[0]
      const snapped = snapShapePoint(toolRef.current, start, pt, e.shiftKey)
      if (isShapeTool(toolRef.current)) {
        live.points = [start, snapped]
        paint()
        return
      }
      const last = live.points[live.points.length - 1]
      const dx = pt.x - last.x
      const dy = pt.y - last.y
      if (dx * dx + dy * dy < 0.000001) return
      live.points.push(pt)
      paint()
    }

    const endStroke = () => {
      if (!drawingRef.current) return
      drawingRef.current = false
      const live = liveRef.current
      liveRef.current = null
      if (!live || live.points.length < 2) {
        paint()
        return
      }
      const a = live.points[0]
      const b = live.points[live.points.length - 1]
      if (isShapeTool(live.tool)) {
        if (Math.hypot(b.x - a.x, b.y - a.y) < 0.018) {
          paint()
          return
        }
        if (live.tool === 'table') {
          const size = tableSize(a, b)
          live.rows = size.rows
          live.cols = size.cols
        }
        onChangeRef.current([...strokesRef.current, live])
        return
      }
      live.points = simplifyPoints(live.points)
      onChangeRef.current([...strokesRef.current, live])
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', endStroke)
    canvas.addEventListener('pointercancel', endStroke)
    canvas.addEventListener('lostpointercapture', endStroke)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', endStroke)
      canvas.removeEventListener('pointercancel', endStroke)
      canvas.removeEventListener('lostpointercapture', endStroke)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="ink-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 13,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        mixBlendMode: 'multiply',
        background: 'transparent',
        pointerEvents: enabled ? 'auto' : 'none',
        cursor: enabled
          ? (tool === 'eraser' ? 'cell' : 'crosshair')
          : 'default',
      }}
    />
  )
}
