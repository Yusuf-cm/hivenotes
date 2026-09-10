'use client'

import { useState, useEffect } from 'react'
import { Note, AuthUser, Page } from '@/types'
import { InkStroke, InkTool, WriteMode } from '@/lib/ink'
import StickyNote from '@/components/notes/StickyNote'
import { useRecorder } from '@/hooks/useRecorder'
import dynamic from 'next/dynamic'
import InkLayer from './InkLayer'
import WriteBar from './WriteBar'
import type { DiagramScene } from '@/lib/diagramScene'

const DiagramPad = dynamic(() => import('./DiagramPad'), { ssr: false })

interface NoteActions {
  update:     (id: string, delta: Partial<Note>) => void
  delete:     (id: string) => void
  bringFront: (id: string) => void
}

interface Props {
  user:         AuthUser
  notes:        Note[]
  pages:        Page[]
  currentPage:  number
  onPageChange: (idx: number) => void
  getText:      (idx: number) => string
  getInk?:      (idx: number) => InkStroke[]
  updateText:   (idx: number, text: string) => void
  updateInk?:   (idx: number, ink: InkStroke[]) => void
  onConvert?:   () => void
  canConvert?:  boolean
  converting?:  boolean
  onDiagramChange?: (scene: DiagramScene) => void
  onDiagramPng?: (blob: Blob) => void
  ensurePage?:  (idx: number) => void
  canEdit:      boolean
  writeMode?:   WriteMode
  inkTool?:     InkTool
  inkColor?:    string
  inkWidth?:    number
  onWriteMode?: (mode: WriteMode) => void
  onInkTool?:   (tool: InkTool) => void
  onInkColor?:  (color: string) => void
  onInkWidth?:  (width: number) => void
  noteActions:  NoteActions
  onAddNote:    (pageIndex: number, x: number, y: number) => void
  onAI:         () => void
  onShare:      () => void
  onAudio:      (file: File) => void
  onAddFile?:   (pageIndex: number, x: number, y: number, file: File) => void
  journals?:    { id: string; name: string }[]
  viewingId?:   string
  onOpenJournal?: (id: string) => void
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric',
})

export default function MobilePage({
  user, notes, pages, currentPage, onPageChange,
  getText, getInk, updateText, updateInk, ensurePage, canEdit,
  writeMode = 'type', inkTool = 'pen', inkColor = '#1c0f0c', inkWidth = 0.012,
  onWriteMode, onInkTool, onInkColor, onInkWidth,
  onConvert, canConvert, converting, onDiagramChange, onDiagramPng,
  noteActions, onAddNote,
  onAI, onShare, onAudio, onAddFile,
  journals = [], viewingId, onOpenJournal,
}: Props) {
  const [pi,      setPi]      = useState(currentPage)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    setPi(currentPage)
  }, [currentPage])

  const { recording, seconds, start, stop } = useRecorder(onAudio)

  const indexes = pages.map(p => p.pageIndex).sort((a, b) => a - b)
  const pos = Math.max(0, indexes.indexOf(pi))
  const prevIndex = pos > 0 ? indexes[pos - 1] : undefined
  const nextIndex = pos < indexes.length - 1 ? indexes[pos + 1] : undefined
  const current = pages.find(p => p.pageIndex === pi)
  const ownerLabel = current?.ownerUserId === '__class__'
    ? 'Class revision'
    : current?.ownerName
      ? (canEdit ? 'Your notes' : `${current.ownerName}'s journal`)
      : `Page ${String(pi + 1).padStart(2, '0')}`

  const notesOnPage = notes.filter(n => n.pageIndex === pi)
  const penOn = writeMode === 'pen' && canEdit
  const diagramOn = writeMode === 'diagram' && canEdit
  const pageInk = getInk ? getInk(pi) : []
  const pageDiagram = pages.find(p => p.pageIndex === pi)?.diagram || { elements: [] }

  const goTo = (idx: number) => {
    setPi(idx)
    onPageChange(idx)
    setNavOpen(false)
  }

  const goNext = () => {
    if (nextIndex !== undefined) {
      goTo(nextIndex)
      return
    }
    if (!canEdit || !ensurePage) return
    ensurePage(pi + 1)
    goTo(pi + 1)
  }

  const goPrev = () => {
    if (prevIndex === undefined) return
    goTo(prevIndex)
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
          {ownerLabel}
        </div>

        <button
          onClick={() => canEdit && onAddNote(pi, 40, 100)}
          disabled={!canEdit}
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
            {ownerLabel}
          </h2>
          {onWriteMode && (
            <div style={{ marginTop: 10 }}>
              <WriteBar
                mode={writeMode}
                tool={inkTool}
                color={inkColor}
                width={inkWidth}
                canEdit={canEdit}
                onMode={onWriteMode}
                onTool={t => onInkTool?.(t)}
                onColor={c => onInkColor?.(c)}
                onWidth={w => onInkWidth?.(w)}
                onUndo={() => pageInk.length > 0 && updateInk?.(pi, pageInk.slice(0, -1))}
                onClear={() => updateInk?.(pi, [])}
                onConvert={onConvert}
                canConvert={canConvert}
                converting={converting}
              />
            </div>
          )}
        </div>

        <div
          data-page-ruled="1"
          className="page-ruled"
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            touchAction: penOn || diagramOn ? 'none' : undefined,
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            if (!canEdit || !onAddFile || penOn) return
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            ;[...e.dataTransfer.files].forEach((file, i) => {
              if (file.type.startsWith('image/') || file.type.startsWith('audio/')) {
                onAddFile(pi, e.clientX - rect.left + i * 16, e.clientY - rect.top + i * 16, file)
              }
            })
          }}
        >
          <textarea
            data-page-text="1"
            className="ink-input"
            wrap="off"
            value={getText(pi)}
            onChange={e => canEdit && updateText(pi, e.target.value)}
            disabled={!canEdit || penOn || diagramOn}
            placeholder={canEdit && !penOn && !diagramOn ? 'Write on a line…' : ''}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 12,
              pointerEvents: penOn || diagramOn ? 'none' : 'auto',
            }}
            spellCheck={false}
          />

          {(updateInk || pageInk.length > 0) && (
            <InkLayer
              strokes={pageInk}
              onChange={ink => updateInk?.(pi, ink)}
              tool={inkTool}
              color={inkColor}
              width={inkWidth}
              enabled={!!updateInk && penOn}
            />
          )}

          {(diagramOn || (pageDiagram.elements && pageDiagram.elements.length > 0)) && (
            <DiagramPad
              key={pi}
              scene={{ elements: pageDiagram.elements || [], files: pageDiagram.files }}
              editing={!!onDiagramChange && diagramOn}
              onScene={onDiagramChange || (() => {})}
              onPng={onDiagramPng}
            />
          )}

          <div style={{
            position: 'absolute', inset: 0,
            zIndex: 30, pointerEvents: 'none',
          }}>
            {notesOnPage.map(note => (
              <div key={note.id} data-note="1" style={{ pointerEvents: 'all' }}>
                <StickyNote
                  note={note}
                  user={user}
                  onUpdate={canEdit ? noteActions.update : () => {}}
                  onDelete={canEdit ? noteActions.delete : () => {}}
                  onFront={canEdit ? noteActions.bringFront : () => {}}
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
            disabled={prevIndex === undefined}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: prevIndex === undefined ? 'transparent' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: prevIndex === undefined ? 'rgba(245,237,216,0.2)' : 'var(--cream)',
              fontSize: 24, cursor: prevIndex === undefined ? 'default' : 'pointer',
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
            disabled={nextIndex === undefined && !canEdit}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: (nextIndex === undefined && !canEdit) ? 'transparent' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: (nextIndex === undefined && !canEdit) ? 'rgba(245,237,216,0.2)' : 'var(--cream)',
              fontSize: 24,
              cursor: (nextIndex === undefined && !canEdit) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >›</button>
        </div>

        {journals.length > 1 && onOpenJournal && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {journals.map(j => (
              <button
                key={j.id}
                onClick={() => { onOpenJournal(j.id); setNavOpen(false) }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: j.id === viewingId
                    ? '1px solid rgba(201,168,76,0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: j.id === viewingId
                    ? 'rgba(201,168,76,0.14)'
                    : 'rgba(255,255,255,0.05)',
                  color: 'var(--cream)',
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {j.id === '__class__' ? 'Class revision' : j.id === user.userId ? 'Your book' : `${j.name}'s book`}
              </button>
            ))}
          </div>
        )}

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

          <label
            style={{
              flex: 1, padding: '12px 0',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--cream)',
              fontFamily: 'var(--font-cormorant)',
              fontSize: 15, cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Image
            <input
              type="file"
              accept="image/*"
              disabled={!canEdit}
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file && onAddFile) onAddFile(pi, 40, 80, file)
                e.target.value = ''
                setNavOpen(false)
              }}
            />
          </label>

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