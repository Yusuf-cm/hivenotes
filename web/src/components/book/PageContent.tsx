'use client'

import { useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Note, Page, AuthUser } from '@/types'
import { InkStroke, InkTool, WriteMode } from '@/lib/ink'
import type { DiagramScene } from '@/lib/diagramScene'
import StickyNote from '@/components/notes/StickyNote'
import InkLayer from './InkLayer'

const DiagramPad = dynamic(() => import('./DiagramPad'), { ssr: false })

interface NoteActions {
  update:     (id: string, delta: Partial<Note>) => void
  delete:     (id: string) => void
  bringFront: (id: string) => void
}

interface Props {
  page:         Page | { pageIndex: number; text: string; ink?: InkStroke[]; diagram?: DiagramScene; ownerUserId?: string | null; ownerName?: string | null }
  notes:        Note[]
  onTextChange: (text: string) => void
  onInkChange?: (ink: InkStroke[]) => void
  onDiagramChange?: (scene: DiagramScene) => void
  onDiagramPng?: (blob: Blob) => void
  onAddNote:    (x: number, y: number) => void
  onAddFile?:   (x: number, y: number, file: File) => void
  noteActions:  NoteActions
  interactive:  boolean
  side:         'left' | 'right'
  user:         AuthUser
  writeMode?:   WriteMode
  inkTool?:     InkTool
  inkColor?:    string
  inkWidth?:    number
}

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
})

export default function PageContent({
  page, notes, onTextChange, onInkChange, onDiagramChange, onDiagramPng, onAddNote, onAddFile,
  noteActions, interactive, side, user,
  writeMode = 'type', inkTool = 'pen', inkColor = '#1c0f0c', inkWidth = 0.012,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageText = 'text' in page ? page.text : ''
  const pageInk = 'ink' in page && Array.isArray(page.ink) ? page.ink : []
  const pageDiagram: DiagramScene = 'diagram' in page && page.diagram
    ? { elements: page.diagram.elements || [], files: page.diagram.files }
    : { elements: [] }
  const penOn = writeMode === 'pen' && interactive
  const diagramOn = writeMode === 'diagram' && interactive

  const pointOnPage = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const placeFiles = (files: FileList | File[], clientX: number, clientY: number) => {
    if (!interactive || !onAddFile) return
    const { x, y } = pointOnPage(clientX, clientY)
    ;[...files].forEach((file, i) => {
      if (file.type.startsWith('image/') || file.type.startsWith('audio/')) {
        onAddFile(Math.max(80, x - 40 + i * 18), Math.max(72, y - 20 + i * 18), file)
      }
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    placeFiles(e.dataTransfer.files, e.clientX, e.clientY)
  }, [interactive, onAddFile])

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    if (!interactive || penOn) return
    const files = [...e.clipboardData.files]
    if (files.length === 0) return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    placeFiles(files, (rect?.left || 0) + 220, (rect?.top || 0) + 120)
  }, [interactive, onAddFile, penOn])

  const title = 'ownerUserId' in page && page.ownerUserId === user.userId
    ? `Page ${String(page.pageIndex + 1).padStart(2, '0')}`
    : ('ownerName' in page && page.ownerName
      ? `${page.ownerName} · ${String(page.pageIndex + 1).padStart(2, '0')}`
      : `Page ${String(page.pageIndex + 1).padStart(2, '0')}`)

  return (
    <div
      ref={containerRef}
      className={side === 'right' ? 'tex-page' : 'tex-page-aged'}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={0}
      style={{
        position: 'absolute', inset: 0,
        overflow: 'hidden',
        touchAction: penOn ? 'none' : undefined,
      }}
    >
      <div className={side === 'right' ? 'page-light-right' : 'page-light-left'}/>
      <div className={side === 'right' ? 'spine-gutter-right' : 'spine-gutter-left'}/>
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        zIndex: 11,
        background: 'radial-gradient(ellipse at 50% 50%,transparent 65%,rgba(160,130,90,0.08) 100%)',
      }}/>

      <div style={{
        position: 'absolute',
        left: 80, right: 18, top: 16,
        height: 56,
        zIndex: 20, pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 10,
          color: 'rgba(90,60,40,0.5)',
          letterSpacing: '.22em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-cormorant)',
        }}>
          {today}
        </div>
        <div style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: 20, fontStyle: 'italic', fontWeight: 600,
          color: 'var(--ink)',
          lineHeight: '28px',
        }}>
          {title}
        </div>
      </div>

      <div
        data-page-ruled="1"
        className="page-ruled"
        style={{
          position: 'absolute',
          left: 0, right: 0,
          top: 84,
          bottom: 32,
          overflow: 'hidden',
          zIndex: 12,
        }}
      >
        <textarea
          data-page-text="1"
          className="ink-input"
          wrap="off"
          value={pageText}
          onChange={e => onTextChange(e.target.value)}
          disabled={!interactive || penOn || diagramOn}
          placeholder={interactive && !penOn && !diagramOn ? 'Write on a line…' : ''}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onDoubleClick={e => {
            if (!interactive || penOn) return
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            if (e.clientX - rect.left < 72) {
              e.preventDefault()
              onAddNote(8, Math.max(72, e.clientY - rect.top - 20))
            }
          }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 12,
            pointerEvents: penOn || diagramOn ? 'none' : 'auto',
            caretColor: penOn || diagramOn ? 'transparent' : undefined,
          }}
          spellCheck={false}
        />

        {(onInkChange || pageInk.length > 0) && (
          <InkLayer
            strokes={pageInk}
            onChange={onInkChange || (() => {})}
            tool={inkTool}
            color={inkColor}
            width={inkWidth}
            enabled={!!onInkChange && penOn}
          />
        )}
      </div>

      {(diagramOn || pageDiagram.elements.length > 0) && (
        <DiagramPad
          key={`${'id' in page ? page.id : ''}-${page.pageIndex}`}
          scene={pageDiagram}
          editing={!!onDiagramChange && diagramOn}
          onScene={onDiagramChange || (() => {})}
          onPng={onDiagramPng}
        />
      )}

      <div style={{
        position: 'absolute', inset: 0,
        zIndex: 30, pointerEvents: 'none',
      }}>
        {notes.map(note => (
          <div key={note.id} data-note="1" style={{ pointerEvents: 'all' }}>
            <StickyNote
              note={note}
              user={user}
              onUpdate={interactive ? noteActions.update : () => {}}
              onDelete={interactive ? noteActions.delete : () => {}}
              onFront={interactive ? noteActions.bringFront : () => {}}
            />
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', bottom: 8,
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
