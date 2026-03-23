'use client'

import { useState } from 'react'
import { Note, AuthUser } from '@/types'
import StickyNote from '@/components/notes/StickyNote'
import { useRecorder } from '@/hooks/useRecorder'

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
  onAI:        () => void
  onShare:     () => void
  onAudio:     (url: string) => void
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric',
})

export default function MobilePage({
  user, notes, getText, updateText,
  ensurePage, noteActions, onAddNote,
  onAI, onShare, onAudio,
}: Props) {
  const [pi,      setPi]      = useState(0)
  const [navOpen, setNavOpen] = useState(false)

  const { recording, seconds, start, stop } = useRecorder(onAudio)

  const notesOnPage = notes.filter(n => n.pageIndex === pi)

  const goNext = () => {
    ensurePage(pi + 1)
    setPi(p => p + 1)
    setNavOpen(false)
  }

  const goPrev = () => {
    if (pi === 0) return
    setPi(p => p - 1)
    setNavOpen(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--wood-md)',
      overflow: 'hidden',
    }}>

      {/* ── Top bar ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'rgba(28,8,5,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        flexShrink: 0,
        zIndex: 100,
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
          fontFamily: 'var(--font-cormorant)',
          fontSize: 13, color: 'rgba(245,237,216,0.5)',
          letterSpacing: '.1em',
        }}>
          Entry {pi + 1}
        </div>

        <button
          onClick={() => onAddNote(pi, 40, 100)}
          style={{
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: 8, padding: '6px 12px',
            fontFamily: 'var(--font-cormorant)',
            fontSize: 14, color: 'var(--gold-lt)',
            cursor: 'pointer',
          }}
        >
          + Note
        </button>
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
              padding: '8px 20px 80px 24px',
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

      {/* ── Floating toggle button ─────────────────────────── */}
      <button
        onClick={() => setNavOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 24, right: 20,
          width: 52, height: 52,
          borderRadius: '50%',
          background: recording ? 'rgba(217,92,92,0.9)' : 'rgba(28,8,5,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${recording ? 'rgba(217,92,92,0.6)' : 'rgba(201,168,76,0.35)'}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: recording ? '#fff' : 'var(--gold-lt)',
          zIndex: 999, cursor: 'pointer',
          transition: 'transform .2s ease, background .2s ease',
          transform: navOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          animation: recording ? 'rec-pulse 1.2s ease infinite' : 'none',
        }}
      >
        {recording ? `⏹` : navOpen ? '×' : '☰'}
      </button>

      {/* ── Slide-up nav panel ─────────────────────────────── */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0,
        bottom: navOpen ? 0 : '-400px',
        height: 380,
        background: 'rgba(18,6,3,0.96)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderTop: '1px solid rgba(201,168,76,0.2)',
        borderRadius: '20px 20px 0 0',
        zIndex: 998,
        transition: 'bottom .3s cubic-bezier(0.34,1.56,0.64,1)',
        padding: '20px 24px 40px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* Drag handle */}
        <div style={{
          width: 36, height: 4,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 2,
          margin: '0 auto 4px',
        }}/>

        {/* Page navigation */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14, padding: '10px 16px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <button
            onClick={goPrev}
            disabled={pi === 0}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: pi === 0 ? 'transparent' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: pi === 0 ? 'rgba(245,237,216,0.2)' : 'var(--cream)',
              fontSize: 24, cursor: pi === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >‹</button>

          <div style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 16, color: 'rgba(245,237,216,0.6)',
            letterSpacing: '.15em', textAlign: 'center',
          }}>
            <div style={{
              fontSize: 11, color: 'rgba(245,237,216,0.3)',
              letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 2,
            }}>
              Page
            </div>
            {pi + 1}
          </div>

          <button
            onClick={goNext}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--cream)', fontSize: 24,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >›</button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { onAI(); setNavOpen(false) }}
            style={{
              flex: 1, padding: '12px 0',
              borderRadius: 12,
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.22)',
              color: 'var(--gold-lt)',
              fontFamily: 'var(--font-cormorant)',
              fontSize: 15, cursor: 'pointer',
            }}
          >
            ✦ AI
          </button>

          <button
            onClick={() => { onShare(); setNavOpen(false) }}
            style={{
              flex: 1, padding: '12px 0',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--cream)',
              fontFamily: 'var(--font-cormorant)',
              fontSize: 15, cursor: 'pointer',
            }}
          >
            ⇧ Share
          </button>

          <button
            onClick={() => {
              if (recording) { stop(); setNavOpen(false) }
              else start()
            }}
            style={{
              flex: 1, padding: '12px 0',
              borderRadius: 12,
              background: recording ? 'rgba(217,92,92,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${recording ? 'rgba(217,92,92,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: recording ? 'var(--red)' : 'var(--cream)',
              fontFamily: 'var(--font-cormorant)',
              fontSize: 15, cursor: 'pointer',
              animation: recording ? 'rec-pulse 1.2s ease infinite' : 'none',
            }}
          >
            {recording ? `⏹ ${seconds}s` : '🎙 Rec'}
          </button>
        </div>

        {/* Room code + logout */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10, padding: '10px 14px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{
              fontSize: 9, letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: 'rgba(245,237,216,0.3)',
              fontFamily: 'var(--font-cormorant)', marginBottom: 3,
            }}>
              Room
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: 16,
              letterSpacing: '.18em', color: 'var(--gold-lt)',
            }}>
              {user.roomCode}
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('hn_user')
              window.location.reload()
            }}
            style={{
              padding: '10px 16px', borderRadius: 10,
              background: 'rgba(217,92,92,0.12)',
              border: '1px solid rgba(217,92,92,0.2)',
              color: 'rgba(217,92,92,0.7)',
              fontFamily: 'var(--font-cormorant)',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            zIndex: 997,
            background: 'rgba(0,0,0,0.3)',
          }}
        />
      )}
    </div>
  )
}