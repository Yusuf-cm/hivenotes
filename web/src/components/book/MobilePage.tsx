'use client'

import { useState, useCallback } from 'react'
import { Note, Page, AuthUser } from '@/types'
import StickyNote from '@/components/notes/StickyNote'

interface NoteActions {
  update:     (id: string, delta: Partial<Note>) => void
  delete:     (id: string) => void
  bringFront: (id: string) => void
}

interface Props {
  user:        AuthUser
  notes:       Note[]
  getText:     (idx: number) => string
  updateText:  (idx: number, text: string) => void
  ensurePage:  (idx: number) => void
  noteActions: NoteActions
  onAddNote:   (pageIndex: number, x: number, y: number) => void
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric',
})

export default function MobilePage({
  user, notes, getText, updateText,
  ensurePage, noteActions, onAddNote,
}: Props) {
  const [pi, setPi] = useState(0)

  const notesOnPage = notes.filter(n => n.pageIndex === pi)

  const goNext = () => {
    ensurePage(pi + 1)
    setPi(p => p + 1)
  }

  const goPrev = () => {
    if (pi === 0) return
    setPi(p => p - 1)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--wood-md)',
      overflow: 'hidden',
    }}>

      {/* ── Mobile top bar ─────────────────────────────────── */}
      <div style={{
  display: 'flex', alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
  background: 'rgba(28,8,5,0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderBottom: '1px solid rgba(201,168,76,0.15)',
  flexShrink: 0,
  zIndex: 100,
  minHeight: 56,
}}>
        <div style={{
          fontFamily: 'var(--font-imfell)',
          fontSize: 18, fontStyle: 'italic',
          color: 'var(--gold-lt)',
          letterSpacing: '.08em',
        }}>
          HiveNotes
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* Page indicator */}
          <div style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 13, color: 'rgba(245,237,216,0.5)',
            letterSpacing: '.1em',
          }}>
            Entry {pi + 1}
          </div>

          {/* Add note */}
          <button
            onClick={() => onAddNote(pi, 40, 100)}
            style={{
              background: 'rgba(201,168,76,0.15)',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: 8, padding: '5px 10px',
              fontFamily: 'var(--font-cormorant)',
              fontSize: 13, color: 'var(--gold-lt)',
              cursor: 'pointer',
            }}
          >
            + Note
          </button>
        </div>
      </div>

      {/* ── Page content ───────────────────────────────────── */}
      <div
        className="tex-page"
        style={{
          flex: 1, position: 'relative',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Lighting */}
        <div className="page-light-right"/>
        <div className="spine-gutter-right"/>

        {/* Header */}
        <div style={{
          padding: '16px 20px 10px',
          borderBottom: '1px solid rgba(140,120,90,0.2)',
          flexShrink: 0, zIndex: 20, position: 'relative',
        }}>
          <div style={{
            fontSize: 9, color: 'rgba(90,60,40,0.5)',
            letterSpacing: '.2em', textTransform: 'uppercase',
            fontFamily: 'var(--font-cormorant)', marginBottom: 3,
          }}>
            {today}
          </div>
          <h2 style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 22, fontStyle: 'italic', fontWeight: 600,
            color: 'var(--ink)',
          }}>
            Entry {String(pi + 1).padStart(2, '0')}
          </h2>
        </div>

        {/* Writing area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <textarea
            className="ink-input"
            value={getText(pi)}
            onChange={e => updateText(pi, e.target.value)}
            placeholder="Begin writing…"
            style={{
              position: 'absolute', inset: 0,
              padding: '8px 20px 40px 24px',
              height: '100%',
              fontSize: 16,
            }}
            spellCheck={false}
          />

          {/* Notes layer */}
          <div style={{
            position: 'absolute', inset: 0,
            zIndex: 30, pointerEvents: 'none',
          }}>
            {notesOnPage.map(note => (
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

        {/* Page number */}
        <div style={{
          position: 'absolute', bottom: 8,
          left: 0, right: 0, textAlign: 'center',
          fontFamily: 'var(--font-cormorant)',
          fontStyle: 'italic', fontSize: 12,
          color: 'rgba(90,60,40,0.35)',
          pointerEvents: 'none', zIndex: 20,
        }}>
          — {pi + 1} —
        </div>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────────── */}
      <div style={{
  display: 'flex', alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 20px',
  background: 'rgba(28,8,5,0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderTop: '1px solid rgba(201,168,76,0.15)',
  flexShrink: 0,
  position: 'relative',
  zIndex: 100,
  paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
  minHeight: 60,
}}>
        {/* Prev */}
        <button
          onClick={goPrev}
          disabled={pi === 0}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: pi === 0 ? 'transparent' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: pi === 0 ? 'rgba(245,237,216,0.2)' : 'var(--cream)',
            fontSize: 22, cursor: pi === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >‹</button>

        {/* Room code */}
        <div style={{
          fontFamily: 'monospace', fontSize: 13,
          letterSpacing: '.18em',
          color: 'rgba(240,215,140,0.35)',
        }}>
          {user.roomCode}
        </div>

        {/* Next */}
        <button
          onClick={goNext}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--cream)', fontSize: 22,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >›</button>
      </div>
    </div>
  )
}