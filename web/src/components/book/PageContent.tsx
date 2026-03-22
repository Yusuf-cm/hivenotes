'use client'

import { useRef, useCallback } from 'react'
import { Note, Page, AuthUser } from '@/types'
import StickyNote from '@/components/notes/StickyNote'

interface NoteActions {
  update:     (id: string, delta: Partial<Note>) => void
  delete:     (id: string) => void
  bringFront: (id: string) => void
}

interface Props {
  page:         Page | { pageIndex: number; text: string }
  notes:        Note[]
  onTextChange: (text: string) => void
  onAddNote:    (x: number, y: number) => void
  noteActions:  NoteActions
  interactive:  boolean
  side:         'left' | 'right'
  user:         AuthUser
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
})

export default function PageContent({
  page, notes, onTextChange, onAddNote,
  noteActions, interactive, side, user,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const onDblClick = useCallback((e: React.MouseEvent) => {
    if (!interactive) return
    if ((e.target as HTMLElement).closest('[data-note]')) return
    const rect = containerRef.current!.getBoundingClientRect()
    onAddNote(e.clientX - rect.left - 135, e.clientY - rect.top - 95)
  }, [interactive, onAddNote])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!interactive) return
    const rect = containerRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left - 135
    const y = e.clientY - rect.top - 95
    ;[...e.dataTransfer.files]
      .filter(f => f.type.startsWith('image/'))
      .forEach(f => {
        const rd = new FileReader()
        rd.onloadend = () => onAddNote(x, y)
        rd.readAsDataURL(f)
      })
  }, [interactive, onAddNote])

  return (
    <div
      ref={containerRef}
      className={side === 'right' ? 'tex-page' : 'tex-page-aged'}
      onDoubleClick={onDblClick}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
      style={{
        position: 'absolute', inset: 0,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >

      {/* ── Layer 1: Directional light — strongest depth cue ── */}
      <div className={side === 'right' ? 'page-light-right' : 'page-light-left'}/>

      {/* ── Layer 2: Spine gutter shadow ──────────────────────── */}
      <div className={side === 'right' ? 'spine-gutter-right' : 'spine-gutter-left'}/>

      {/* ── Layer 3: Page edge vignette ───────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        zIndex: 11,
        background: 'radial-gradient(ellipse at 50% 50%,transparent 65%,rgba(160,130,90,0.08) 100%)',
      }}/>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{
        padding: '22px 28px 12px',
        borderBottom: '1px solid rgba(140,120,90,0.2)',
        position: 'relative', zIndex: 20, flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10,
          color: 'rgba(90,60,40,0.55)',
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-cormorant)',
          marginBottom: 4,
        }}>
          {today}
        </div>
        <div style={{
          display: 'flex', alignItems: 'baseline',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 26, fontStyle: 'italic', fontWeight: 600,
            color: 'var(--ink)',
          }}>
            Entry {String(page.pageIndex + 1).padStart(2, '0')}
          </h2>
          {interactive && (
            <button
              onClick={() => onAddNote(80, 120)}
              style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 12,
                color: 'rgba(90,60,40,0.4)',
                letterSpacing: '.1em',
              }}
              title="Add note (or double-click anywhere)"
            >
              + note
            </button>
          )}
        </div>
      </div>

      {/* ── Writing area ──────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <textarea
          className="ink-input"
          value={'text' in page ? page.text : ''}
          onChange={e => onTextChange(e.target.value)}
          disabled={!interactive}
          placeholder={interactive ? 'Begin writing…' : ''}
          style={{
            position: 'absolute', inset: 0,
            padding: '8px 24px 36px 80px',
            height: '100%',
          }}
          spellCheck={false}
        />

        {/* ── Notes layer ─────────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0,
          zIndex: 30, pointerEvents: 'none',
        }}>
          {notes.map(note => (
            <div key={note.id} data-note="1" style={{ pointerEvents: 'all' }}>
              <StickyNote
                note={note}
                user={user}
                onUpdate={noteActions.update}
                onDelete={noteActions.delete}
                onFront={noteActions.bringFront}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Page number ───────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 10,
        left: 0, right: 0, textAlign: 'center',
        fontFamily: 'var(--font-cormorant)',
        fontStyle: 'italic', fontSize: 13,
        color: 'rgba(90,60,40,0.38)',
        pointerEvents: 'none', zIndex: 20,
      }}>
        — {page.pageIndex + 1} —
      </div>

    </div>
  )
}