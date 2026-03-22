'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Note, AuthUser, NOTE_COLORS, NOTE_COLOR_KEYS, NoteColor, CheckboxItem } from '@/types'

interface Props {
  note:     Note
  user:     AuthUser
  onUpdate: (id: string, delta: Partial<Note>) => void
  onDelete: (id: string) => void
  onFront:  (id: string) => void
}

export default function StickyNote({ note, user, onUpdate, onDelete, onFront }: Props) {
  const [dragging, setDragging] = useState(false)
  const [off, setOff]           = useState({ x: 0, y: 0 })
  const [aiLoading, setAiLoading] = useState(false)

  const col      = NOTE_COLORS[note.color] || NOTE_COLORS.amber
  const rotation = useMemo(() =>
    Math.sin(parseInt(note.id.replace(/-/g,'').slice(0,8), 16) * 0.001) * 3.2
  , [note.id])

  const isCoffee = useMemo(() =>
    parseInt(note.id.replace(/-/g,'').slice(0,4), 16) % 3 === 0
  , [note.id])

  /* ── Drag ──────────────────────────────────────────────── */
  const onDown = useCallback((e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (['TEXTAREA','INPUT','BUTTON','LABEL'].includes(tag)) return
    onFront(note.id)
    setDragging(true)
    setOff({ x: e.clientX - note.x, y: e.clientY - note.y })
    e.preventDefault()
  }, [note.id, note.x, note.y, onFront])

  useEffect(() => {
    if (!dragging) return
    const mv = (e: MouseEvent) => onUpdate(note.id, {
      x: e.clientX - off.x,
      y: e.clientY - off.y,
    })
    const up = () => setDragging(false)
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', mv)
      window.removeEventListener('mouseup', up)
    }
  }, [dragging, off, note.id, onUpdate])

  /* ── AI ────────────────────────────────────────────────── */
  const doAI = async (type: 'expand' | 'tasks' | 'summarize') => {
    if (!note.content.trim() || aiLoading) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content: note.content }),
      })
      const data = await res.json()

      if (type === 'expand' && data.result) {
        onUpdate(note.id, { content: note.content + '\n\n' + data.result })
      } else if (type === 'tasks' && Array.isArray(data.result)) {
        const newBoxes: CheckboxItem[] = data.result.map((t: string) => ({
          id: crypto.randomUUID(), text: t, done: false,
        }))
        onUpdate(note.id, { checkboxes: [...note.checkboxes, ...newBoxes] })
      } else if (type === 'summarize' && data.result) {
        onUpdate(note.id, { content: data.result })
      }
    } catch (e) {
      console.error('[ai]', e)
    }
    setAiLoading(false)
  }

  /* ── Image upload ──────────────────────────────────────── */
  const onImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const res = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: form,
      })
      const data = await res.json()
      onUpdate(note.id, {
        mediaType: 'image',
        mediaUrl: `${API}${data.url}`,
      })
    } catch (e) {
      console.error('[upload]', e)
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: note.x, top: note.y,
        zIndex: note.zIndex,
        animation: 'note-drop 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards',
        ['--note-rot' as any]: `${rotation}deg`,
        pointerEvents: 'all',
      }}
    >
      {/* Coffee ring stain */}
      {isCoffee && (
        <div className="coffee-ring" style={{
          bottom: -16, right: 14,
          width: 38, height: 38,
        }}/>
      )}

      {/* Washi tape */}
      <div className="tape" style={{ background: col.tape }}/>

      {/* Note body */}
      <div
        onMouseDown={onDown}
        style={{
          width: 272, minHeight: 200,
          borderRadius: '2px 2px 10px 2px',
          background: col.bg,
          transform: `rotate(${dragging ? 0 : rotation}deg) scale(${dragging ? 1.05 : 1})`,
          transition: dragging ? 'none' : 'transform .25s ease, box-shadow .25s ease',
          cursor: dragging ? 'grabbing' : 'grab',
          boxShadow: dragging
            ? '0 22px 44px rgba(0,0,0,0.28),0 8px 16px rgba(0,0,0,0.14),inset 0 1px 0 rgba(255,255,255,0.7)'
            : '0 1px 2px rgba(0,0,0,0.06),0 4px 10px rgba(0,0,0,0.1),0 12px 24px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.65)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Folded corner */}
        <div className="fold-corner"/>

        {/* ── Header ───────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 10px',
          background: 'rgba(255,255,255,0.22)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10, color: 'rgba(0,0,0,0.36)',
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic', letterSpacing: '.08em',
          }}>
            {note.authorName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Color swatches */}
            {NOTE_COLOR_KEYS.map(k => (
              <button key={k} onClick={() => onUpdate(note.id, { color: k as NoteColor })}
                title={k}
                style={{
                  width: 11, height: 11, borderRadius: '50%',
                  background: NOTE_COLORS[k as NoteColor].bg,
                  border: note.color === k
                    ? '2px solid rgba(0,0,0,0.5)'
                    : '1px solid rgba(0,0,0,0.12)',
                  transform: note.color === k ? 'scale(1.3)' : 'scale(1)',
                  transition: 'transform .15s',
                  cursor: 'pointer', flexShrink: 0,
                }}
              />
            ))}
            <button
              onClick={() => onDelete(note.id)}
              style={{
                color: 'rgba(0,0,0,0.3)', fontSize: 18,
                lineHeight: 1, padding: '0 2px',
                marginLeft: 2,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Image ────────────────────────────────────── */}
        {note.mediaType === 'image' && note.mediaUrl && (
          <div style={{ position: 'relative' }}>
            <img src={note.mediaUrl} alt=""
              style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }}/>
            <button
              onClick={() => onUpdate(note.id, { mediaType: 'none', mediaUrl: null })}
              style={{
                position: 'absolute', top: 5, right: 5,
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                borderRadius: '50%', width: 20, height: 20,
                fontSize: 13, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>
        )}

        {/* ── Audio ────────────────────────────────────── */}
        {note.mediaType === 'audio' && note.mediaUrl && (
          <div style={{
            padding: '6px 10px',
            background: 'rgba(0,0,0,0.04)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}>
            <audio controls src={note.mediaUrl} style={{ width: '100%', height: 28 }}/>
          </div>
        )}

        {/* ── Text ─────────────────────────────────────── */}
        <textarea
          className="note-text"
          value={note.content}
          onChange={e => onUpdate(note.id, { content: e.target.value })}
          placeholder="Write here…"
          style={{ padding: '10px 14px', minHeight: 80, flex: 1 }}
          spellCheck={false}
          onMouseDown={e => e.stopPropagation()}
        />

        {/* ── Checkboxes ───────────────────────────────── */}
        {note.checkboxes.length > 0 && (
          <div style={{ padding: '4px 12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {note.checkboxes.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <input type="checkbox" checked={item.done}
                  onChange={() => onUpdate(note.id, {
                    checkboxes: note.checkboxes.map(c =>
                      c.id === item.id ? { ...c, done: !c.done } : c
                    )
                  })}
                  style={{ marginTop: 3, accentColor: 'var(--gold)', cursor: 'pointer' }}
                />
                <span style={{
                  fontFamily: 'var(--font-patrick)', fontSize: 14,
                  flex: 1, lineHeight: 1.4,
                  textDecoration: item.done ? 'line-through' : 'none',
                  color: item.done ? 'rgba(0,0,0,0.3)' : col.text,
                }}>
                  {item.text}
                </span>
                <button
                  onClick={() => onUpdate(note.id, {
                    checkboxes: note.checkboxes.filter(c => c.id !== item.id)
                  })}
                  style={{ color: 'rgba(0,0,0,0.22)', fontSize: 14 }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer actions ───────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px',
          background: 'rgba(0,0,0,0.05)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          flexShrink: 0, gap: 4,
        }}>
          {/* Image upload */}
          <label className="liq" title="Attach image"
            style={{
              padding: '3px 9px', borderRadius: 8,
              fontSize: 12, color: 'rgba(0,0,0,0.5)',
              cursor: 'pointer',
            }}>
            🖼
            <input type="file" accept="image/*"
              style={{ display: 'none' }} onChange={onImg}/>
          </label>

          {/* AI buttons */}
          <div style={{ display: 'flex', gap: 3 }}>
            {[
              { type: 'expand'    as const, label: '✦ Expand',    color: 'rgba(80,40,120,0.75)' },
              { type: 'tasks'     as const, label: '☑ Tasks',     color: 'rgba(30,70,140,0.75)' },
              { type: 'summarize' as const, label: '⊡ Sum',       color: 'rgba(30,110,60,0.75)'  },
            ].map(btn => (
              <button key={btn.type}
                className="liq"
                onClick={() => doAI(btn.type)}
                disabled={aiLoading || !note.content.trim()}
                style={{
                  padding: '3px 8px', borderRadius: 8,
                  fontSize: 11, color: btn.color,
                  fontFamily: 'var(--font-cormorant)',
                  letterSpacing: '.05em',
                }}
              >
                {aiLoading ? '…' : btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}