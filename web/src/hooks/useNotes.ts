'use client'

import { useState, useEffect, useCallback } from 'react'
import { Note, AuthUser } from '@/types'
import { socket } from '@/lib/socket'
import { noteApi } from '@/lib/api'

export const useNotes = (initialNotes: Note[], user: AuthUser) => {
  const [notes, setNotes] = useState<Note[]>(initialNotes)

  useEffect(() => {
    if (initialNotes.length > 0) setNotes(initialNotes)
  }, []) // Only run on mount

  // ── Listen for WS events ──────────────────────────────────
  useEffect(() => {
    const offCreated = socket.on('note:created', (note: Note) => {
      setNotes(prev => {
        // Avoid duplicates if we were the sender
        if (prev.find(n => n.id === note.id)) return prev
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

  // ── Actions ───────────────────────────────────────────────
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

    socket.send('note:create', {
      pageIndex,
      content:    optimistic.content,
      color:      optimistic.color,
      x, y,
      zIndex:     optimistic.zIndex,
      mediaType:  optimistic.mediaType,
      mediaUrl:   optimistic.mediaUrl,
      checkboxes: [],
      ...overrides,
    })

    // One-shot listener: swap the optimistic note for the server's copy, then
    // detach. socket.on returns its own unsubscribe function - there is no
    // socket.off - so hold onto it rather than trying to remove by reference.
    let unsubscribe: (() => void) | undefined

    const handleCreated = (note: Note) => {
      setNotes(prev => prev.map(n => n.id === tempId ? note : n))
      unsubscribe?.()
    }

    unsubscribe = socket.on('note:created', handleCreated)
  }, [notes.length, user])

  const updateNote = useCallback((id: string, delta: Partial<Note>) => {
    // Optimistic update
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...delta } : n))

    // Send to server
    socket.send('note:update', { id, ...delta })
  }, [])

  const deleteNote = useCallback((id: string) => {
    // Optimistic delete
    setNotes(prev => prev.filter(n => n.id !== id))
    socket.send('note:delete', { id })
  }, [])

  const bringToFront = useCallback((id: string) => {
    setNotes(prev => {
      const maxZ = Math.max(...prev.map(n => n.zIndex), 0)
      const updated = prev.map(n => n.id === id ? { ...n, zIndex: maxZ + 1 } : n)
      const note = updated.find(n => n.id === id)
      if (note) socket.send('note:update', { id, zIndex: maxZ + 1 })
      return updated
    })
  }, [])

  const notesOnPage = useCallback((pageIndex: number) =>
    notes.filter(n => n.pageIndex === pageIndex),
  [notes])

  return { notes, addNote, updateNote, deleteNote, bringToFront, notesOnPage }
}