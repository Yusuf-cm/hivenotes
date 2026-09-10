'use client'

import PageContent from './PageContent'
import WriteBar from './WriteBar'
import { Note, Page, AuthUser } from '@/types'
import { InkStroke, InkTool, WriteMode } from '@/lib/ink'
import type { DiagramScene } from '@/lib/diagramScene'

interface NoteActions {
  update:     (id: string, delta: Partial<Note>) => void
  delete:     (id: string) => void
  bringFront: (id: string) => void
}

interface Props {
  user: AuthUser
  page: Page | { pageIndex: number; text: string; ink?: InkStroke[]; ownerUserId?: string | null; ownerName?: string | null }
  notes: Note[]
  canEdit: boolean
  writeMode: WriteMode
  tool: InkTool
  color: string
  width: number
  onMode: (mode: WriteMode) => void
  onTool: (tool: InkTool) => void
  onColor: (color: string) => void
  onWidth: (width: number) => void
  onUndo: () => void
  onClear: () => void
  onConvert?: () => void
  canConvert?: boolean
  converting?: boolean
  onTextChange: (text: string) => void
  onInkChange: (ink: InkStroke[]) => void
  onDiagramChange?: (scene: DiagramScene) => void
  onDiagramPng?: (blob: Blob) => void
  onAddNote: (x: number, y: number) => void
  onAddFile?: (x: number, y: number, file: File) => void
  noteActions: NoteActions
  onPrev?: () => void
  onNext?: () => void
  canPrev?: boolean
  canNext?: boolean
  onClose?: () => void
}

export default function WritingDesk(props: Props) {
  const {
    user, page, notes, canEdit, writeMode, tool, color, width,
    onMode, onTool, onColor, onWidth, onUndo, onClear, onConvert, canConvert, converting,
    onTextChange, onInkChange, onDiagramChange, onDiagramPng, onAddNote, onAddFile, noteActions,
    onPrev, onNext, canPrev, canNext, onClose,
  } = props

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 450,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'var(--wood-md)',
      padding: '72px 16px 18px',
    }}>
      <div style={{
        width: 'min(820px, 100%)',
        flex: 1,
        minHeight: 0,
        position: 'relative',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 2px 0 rgba(255,255,255,0.08) inset',
      }}>
        <PageContent
          page={page}
          notes={notes}
          onTextChange={onTextChange}
          onInkChange={onInkChange}
          onDiagramChange={onDiagramChange}
          onDiagramPng={onDiagramPng}
          onAddNote={onAddNote}
          onAddFile={onAddFile}
          noteActions={noteActions}
          interactive={canEdit}
          writeMode={writeMode}
          inkTool={tool}
          inkColor={color}
          inkWidth={width}
          side="right"
          user={user}
        />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {(onPrev || onNext) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="liq"
              onClick={onPrev}
              disabled={!canPrev}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                color: canPrev ? 'var(--cream)' : 'rgba(245,237,216,0.22)',
                fontSize: 22,
              }}
            >‹</button>
            <span style={{
              fontFamily: 'var(--font-cormorant)',
              color: 'rgba(245,237,216,0.65)',
              letterSpacing: '.16em',
              fontSize: 14,
              minWidth: 36,
              textAlign: 'center',
            }}>
              {page.pageIndex + 1}
            </span>
            <button
              type="button"
              className="liq"
              onClick={onNext}
              disabled={!canNext}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                color: canNext ? 'var(--cream)' : 'rgba(245,237,216,0.22)',
                fontSize: 22,
              }}
            >›</button>
          </div>
        )}

        <WriteBar
          mode={writeMode}
          tool={tool}
          color={color}
          width={width}
          canEdit={canEdit}
          onMode={onMode}
          onTool={onTool}
          onColor={onColor}
          onWidth={onWidth}
          onUndo={onUndo}
          onClear={onClear}
          onConvert={onConvert}
          canConvert={canConvert}
          converting={converting}
          variant="dark"
        />

        {onClose && (writeMode === 'pen' || writeMode === 'diagram') && (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 12px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'rgba(245,237,216,0.7)',
              fontFamily: 'var(--font-cormorant)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Back to book
          </button>
        )}
      </div>
    </div>
  )
}
