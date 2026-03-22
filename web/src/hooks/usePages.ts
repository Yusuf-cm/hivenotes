'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, AuthUser } from '@/types'
import { socket } from '@/lib/socket'
import { pageApi } from '@/lib/api'

export const usePages = (initialPages: Page[], user: AuthUser) => {
  const [pages, setPages] = useState<Page[]>(initialPages)
  const debounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
  if (initialPages.length > 0) setPages(initialPages)
}, [initialPages.length])

  // ── Listen for WS events ──────────────────────────────────
  useEffect(() => {
    const offUpdated = socket.on('page:updated', ({ pageIndex, text }: { pageIndex: number; text: string }) => {
      setPages(prev => {
        const exists = prev.find(p => p.pageIndex === pageIndex)
        if (exists) return prev.map(p => p.pageIndex === pageIndex ? { ...p, text } : p)
        return [...prev, { id: '', roomId: user.roomId, pageIndex, text, updatedAt: '' }]
      })
    })

    return () => { offUpdated() }
  }, [user.roomId])

  // ── Actions ───────────────────────────────────────────────
  const getText = useCallback((pageIndex: number) =>
    pages.find(p => p.pageIndex === pageIndex)?.text || '',
  [pages])

  const updateText = useCallback((pageIndex: number, text: string) => {
    // Optimistic
    setPages(prev => {
      const exists = prev.find(p => p.pageIndex === pageIndex)
      if (exists) return prev.map(p => p.pageIndex === pageIndex ? { ...p, text } : p)
      return [...prev, { id:'', roomId: user.roomId, pageIndex, text, updatedAt:'' }]
    })

    // Debounce WS + REST — don't hammer server on every keystroke
    if (debounceRef.current[pageIndex]) clearTimeout(debounceRef.current[pageIndex])
    debounceRef.current[pageIndex] = setTimeout(() => {
      socket.send('page:update', { pageIndex, text })
      pageApi.update(pageIndex, text, user.token).catch(console.error)
    }, 600)
  }, [user])

  const ensurePage = useCallback((pageIndex: number) => {
    setPages(prev => {
      if (prev.find(p => p.pageIndex === pageIndex)) return prev
      return [...prev, { id:'', roomId: user.roomId, pageIndex, text:'', updatedAt:'' }]
    })
  }, [user.roomId])

  return { pages, getText, updateText, ensurePage }
}