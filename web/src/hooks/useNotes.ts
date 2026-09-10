'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Note, AuthUser } from '@/types'
import { socket } from '@/lib/socket'

export const useNotes = (initialNotes: Note[], user: AuthUser) => {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const pendingRef = useRef<Record<string, Partial<Note>[]>>({})

  useEffect(() => {
    if (initialNotes.length > 0) setNotes(initialNotes)
  }, [initialNotes])

  useEffect(() => {
    const offCreated = socket.on('note:created', (note: Note) => {
      setNotes(prev => {
        if (prev.find(n => n.id === note.id)) return prev
        const tempIdx = prev.findIndex(n =>
          n.id.startsWith('temp-') &&
          n.authorId === note.authorId &&
          n.pageIndex === note.pageIndex &&
          (n.pageOwnerId || n.authorId) === (note.pageOwnerId || note.authorId)
        )
        if (tempIdx !== -1) {
          const temp = prev[tempIdx]
          const queued = pendingRef.current[temp.id] || []
          delete pendingRef.current[temp.id]
          let merged: Note = { ...note }
          if (!merged.mediaUrl && temp.mediaUrl) {
            merged.mediaUrl = temp.mediaUrl
            merged.mediaType = temp.mediaType
          }
          if (!merged.content && temp.content) merged.content = temp.content
          for (const delta of queued) merged = { ...merged, ...delta }
          queued.forEach(delta => socket.send('note:update', { id: note.id, ...delta }))
          const next = [...prev]
          next[tempIdx] = merged
          return next
        }
        return [...prev, note]
      })
    })

    const offUpdated = socket.on('note:updated', (note: Note) => {
      setNotes(prev => prev.map(n => n.id === note.id ? note : n))
    })

    const offDeleted = socket.on('note:deleted', ({ id }: { id: string }) => {
      setNotes(prev => prev.filter(n => n.id !== id))
    })

    return () => { offCreated(); offUpdated(); offDeleted() }
  }, [])

  const addNote = useCallback((
    pageIndex: number,
    x: number,
    y: number,
    overrides: Partial<Note> = {}
  ) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const optimistic: Note = {
      id:         tempId,
      roomId:     user.roomId,
      pageIndex,
      pageOwnerId: user.userId,
      authorId:   user.userId,
      authorName: user.nickname,
      content:    '',
      color:      'sky',
      x, y,
      zIndex:     notes.length + 1,
      mediaType:  'none',
      mediaUrl:   null,
      checkboxes: [],
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      ...overrides,
    }

    setNotes(prev => [...prev, optimistic])

    const persistUrl = optimistic.mediaUrl && !optimistic.mediaUrl.startsWith('blob:')
      ? optimistic.mediaUrl
      : null

    socket.send('note:create', {
      pageIndex,
      pageOwnerId: user.userId,
      content:    optimistic.content,
      color:      optimistic.color,
      x, y,
      zIndex:     optimistic.zIndex,
      mediaType:  persistUrl ? optimistic.mediaType : (overrides.mediaType || 'none'),
      mediaUrl:   persistUrl,
      checkboxes: [],
    })

    return tempId
  }, [notes.length, user])

  const updateNote = useCallback((id: string, delta: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...delta } : n))
    if (id.startsWith('temp-')) {
      pendingRef.current[id] = [...(pendingRef.current[id] || []), delta]
      return
    }
    socket.send('note:update', { id, ...delta })
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    socket.send('note:delete', { id })
  }, [])

  const bringToFront = useCallback((id: string) => {
    setNotes(prev => {
      const maxZ = Math.max(...prev.map(n => n.zIndex), 0)
      const updated = prev.map(n => n.id === id ? { ...n, zIndex: maxZ + 1 } : n)
      const note = updated.find(n => n.id === id)
      if (note && !id.startsWith('temp-')) socket.send('note:update', { id, zIndex: maxZ + 1 })
      return updated
    })
  }, [])

  const notesOnPage = useCallback((pageIndex: number) =>
    notes.filter(n => n.pageIndex === pageIndex),
  [notes])

  return { notes, addNote, updateNote, deleteNote, bringToFront, notesOnPage }
}
