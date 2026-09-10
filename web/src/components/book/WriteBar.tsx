'use client'

import type { CSSProperties } from 'react'
import { DRAW_TOOLS, INK_COLORS, INK_WIDTHS, InkTool, WriteMode } from '@/lib/ink'

interface Props {
  mode: WriteMode
  tool: InkTool
  color: string
  width: number
  canEdit: boolean
  onMode: (mode: WriteMode) => void
  onTool: (tool: InkTool) => void
  onColor: (color: string) => void
  onWidth: (width: number) => void
  onUndo: () => void
  onClear: () => void
  onConvert?: () => void
  canConvert?: boolean
  converting?: boolean
  variant?: 'light' | 'dark'
}

export default function WriteBar({
  mode, tool, color, width, canEdit,
  onMode, onTool, onColor, onWidth, onUndo, onClear, onConvert, canConvert, converting,
  variant = 'light',
}: Props) {
  const dark = variant === 'dark'
  const ink = dark ? 'rgba(245,237,216,0.78)' : 'var(--ink)'
  const muted = dark ? 'rgba(245,237,216,0.4)' : 'rgba(90,60,40,0.45)'
  const border = dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(90,60,40,0.14)'
  const bg = dark ? 'rgba(18,6,3,0.92)' : 'rgba(245,237,216,0.94)'
  const active = dark ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.28)'

  const btn = (on: boolean): CSSProperties => ({
    padding: '6px 11px',
    borderRadius: 16,
    border: 'none',
    background: on ? active : 'transparent',
    color: on ? ink : muted,
    fontFamily: 'var(--font-cormorant)',
    fontSize: 13,
    letterSpacing: '.06em',
    cursor: canEdit || on ? 'pointer' : 'default',
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        padding: '6px 8px',
        borderRadius: 22,
        background: bg,
        border,
        boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.35)' : '0 6px 18px rgba(40,20,10,0.12)',
      }}
    >
      <button type="button" style={btn(mode === 'type')} onClick={() => onMode('type')}>Type</button>
      <button type="button" style={btn(mode === 'pen')} onClick={() => onMode('pen')} disabled={!canEdit && mode !== 'pen'}>Pen</button>
      <button type="button" style={btn(mode === 'diagram')} onClick={() => onMode('diagram')} disabled={!canEdit && mode !== 'diagram'}>Diagram</button>

      {mode === 'pen' && (
        <>
          <span style={{ width: 1, height: 16, background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(90,60,40,0.16)' }} />
          {DRAW_TOOLS.map(t => (
            <button
              key={t.id}
              type="button"
              style={btn(tool === t.id)}
              onClick={() => onTool(t.id)}
              disabled={!canEdit}
            >
              {t.label}
            </button>
          ))}

          {INK_COLORS.map(c => (
            <button
              key={c.id}
              type="button"
              title={c.label}
              disabled={!canEdit}
              onClick={() => { onColor(c.id); if (tool === 'eraser') onTool('pen') }}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: c.id,
                border: color === c.id ? '2px solid #c9a84c' : '2px solid transparent',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
                cursor: canEdit ? 'pointer' : 'default',
              }}
            />
          ))}

          {INK_WIDTHS.map(w => (
            <button
              key={w}
              type="button"
              disabled={!canEdit}
              onClick={() => onWidth(w)}
              title="Stroke size"
              style={{
                width: 22, height: 22, borderRadius: '50%',
                border: width === w ? '1px solid #c9a84c' : border,
                background: width === w ? active : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: canEdit ? 'pointer' : 'default',
              }}
            >
              <span style={{
                width: 4 + w * 220, height: 4 + w * 220,
                borderRadius: '50%', background: ink, display: 'block',
              }} />
            </button>
          ))}

          <button type="button" style={btn(false)} onClick={onUndo} disabled={!canEdit}>Undo</button>
          <button type="button" style={btn(false)} onClick={onClear} disabled={!canEdit}>Clear</button>
          {onConvert && (
            <button
              type="button"
              style={btn(false)}
              onClick={onConvert}
              disabled={!canEdit || !canConvert || converting}
            >
              {converting ? 'Becoming text…' : 'Convert leftover'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
