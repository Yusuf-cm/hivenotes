'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Note, AuthUser, NOTE_COLORS, NOTE_COLOR_KEYS, NoteColor, CheckboxItem } from '@/types'
import { aiNote, processMedia, uploadMedia } from '@/lib/media'

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
  const [active, setActive]     = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const col  = NOTE_COLORS[note.color] || NOTE_COLORS.amber
  const seed = useMemo(() => {
    const hex = note.id.replace(/[^0-9a-f]/gi, '').slice(0, 8) || '1'
    return parseInt(hex, 16) || 1
  }, [note.id])
  const rotation = Math.sin(seed * 0.001) * 2.4

  const kind = note.mediaType === 'image' ? 'image'
    : note.mediaType === 'audio' ? 'audio'
    : 'text'
  const width = kind === 'image' ? 148 : kind === 'audio' ? 168 : 156

  const onDown = useCallback((e: React.PointerEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (['TEXTAREA', 'INPUT', 'BUTTON', 'LABEL', 'AUDIO'].includes(tag)) return
    onFront(note.id)
    setActive(true)
    setDragging(true)
    setOff({ x: e.clientX - note.x, y: e.clientY - note.y })
    e.preventDefault()
    e.stopPropagation()
  }, [note.id, note.x, note.y, onFront])

  useEffect(() => {
    if (!dragging) return
    const mv = (e: PointerEvent) => onUpdate(note.id, {
      x: Math.max(-16, e.clientX - off.x),
      y: Math.max(-16, e.clientY - off.y),
    })
    const up = () => setDragging(false)
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
    }
  }, [dragging, off, note.id, onUpdate])

  useEffect(() => {
    if (!active) return
    const hide = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(`[data-clip="${note.id}"]`)) {
        setActive(false)
      }
    }
    window.addEventListener('pointerdown', hide)
    return () => window.removeEventListener('pointerdown', hide)
  }, [active, note.id])

  const doAI = async (type: 'expand' | 'tasks' | 'summarize') => {
    if (!note.content.trim() || aiLoading) return
    setAiLoading(true)
    try {
      const data = await aiNote(user.token, type, note.content)
      if (type === 'expand' && data) {
        onUpdate(note.id, { content: note.content + '\n\n' + data })
      } else if (type === 'tasks' && Array.isArray(data)) {
        const newBoxes: CheckboxItem[] = data.map((t: string) => ({
          id: crypto.randomUUID(), text: t, done: false,
        }))
        onUpdate(note.id, { checkboxes: [...note.checkboxes, ...newBoxes] })
      } else if (type === 'summarize' && data) {
        onUpdate(note.id, { content: data })
      }
    } catch (e) {
      console.error('[ai]', e)
    }
    setAiLoading(false)
  }

  const onImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const url = await uploadMedia(file, user.token)
      onUpdate(note.id, {
        mediaType: 'image',
        mediaUrl: url,
      })
      await processMedia(user.token, {
        noteId: note.id.startsWith('temp-') ? undefined : note.id,
        mediaUrl: url,
      }).catch(err => console.error('[upload]', err))
    } catch (err) {
      console.error('[upload]', err)
    }
  }

  return (
    <div
      data-clip={note.id}
      style={{
        position: 'absolute',
        left: note.x, top: note.y,
        zIndex: note.zIndex,
        animation: 'note-drop 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards',
        pointerEvents: 'all',
      }}
    >
      <div className="tape" style={{ background: col.tape, width: 36, height: 14, top: -8 }}/>

      <div
        onPointerDown={onDown}
        style={{
          width,
          touchAction: 'none',
          borderRadius: kind === 'image' ? 2 : '2px 2px 8px 2px',
          background: kind === 'image' ? '#f7f1e4' : col.bg,
          transform: `rotate(${dragging ? 0 : rotation}deg) scale(${dragging ? 1.04 : 1})`,
          transition: dragging ? 'none' : 'transform .2s ease, box-shadow .2s ease',
          cursor: dragging ? 'grabbing' : 'grab',
          boxShadow: dragging
            ? '0 16px 28px rgba(0,0,0,0.22)'
            : '0 1px 2px rgba(0,0,0,0.06), 0 6px 14px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {kind === 'image' && note.mediaUrl && (
          <img
            src={note.mediaUrl}
            alt=""
            style={{ width: '100%', height: 118, objectFit: 'cover', display: 'block' }}
          />
        )}

        {kind === 'audio' && note.mediaUrl && (
          <div style={{ padding: '8px 8px 4px' }}>
            <audio controls src={note.mediaUrl} style={{ width: '100%', height: 28 }}/>
          </div>
        )}

        <textarea
          className="note-text"
          value={note.content}
          onChange={e => onUpdate(note.id, { content: e.target.value })}
          placeholder={kind === 'audio' ? 'Transcript…' : kind === 'image' ? 'Caption…' : 'A quick slip…'}
          style={{
            padding: kind === 'text' ? '10px 10px 8px' : '5px 8px 6px',
            minHeight: kind === 'text' ? 64 : 28,
            fontSize: kind === 'text' ? 16 : 13,
            lineHeight: 1.4,
          }}
          spellCheck={false}
          onPointerDown={e => { e.stopPropagation(); setActive(true) }}
        />

        {note.checkboxes.length > 0 && (
          <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {note.checkboxes.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <input type="checkbox" checked={item.done}
                  onChange={() => onUpdate(note.id, {
                    checkboxes: note.checkboxes.map(c =>
                      c.id === item.id ? { ...c, done: !c.done } : c
                    )
                  })}
                  style={{ marginTop: 3, accentColor: 'var(--gold)', cursor: 'pointer' }}
                />
                <span style={{
                  fontFamily: 'var(--font-patrick)', fontSize: 13,
                  flex: 1, lineHeight: 1.35,
                  textDecoration: item.done ? 'line-through' : 'none',
                  color: item.done ? 'rgba(0,0,0,0.3)' : col.text,
                }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {active && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 6px',
            background: 'rgba(0,0,0,0.05)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            gap: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {NOTE_COLOR_KEYS.map(k => (
                <button key={k} onClick={() => onUpdate(note.id, { color: k as NoteColor })}
                  title={k}
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: NOTE_COLORS[k as NoteColor].bg,
                    border: note.color === k ? '2px solid rgba(0,0,0,0.45)' : '1px solid rgba(0,0,0,0.12)',
                    cursor: 'pointer',
                  }}
                />
              ))}
              <label title="Attach image" style={{ cursor: 'pointer', fontSize: 12, marginLeft: 2 }}>
                🖼
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onImg}/>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {kind === 'text' && (
                <button
                  onClick={() => doAI('expand')}
                  disabled={aiLoading || !note.content.trim()}
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-cormorant)',
                    color: 'rgba(80,40,120,0.75)',
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  {aiLoading ? '…' : '✦'}
                </button>
              )}
              <button
                onClick={() => onDelete(note.id)}
                style={{
                  color: 'rgba(0,0,0,0.35)', fontSize: 16,
                  lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
