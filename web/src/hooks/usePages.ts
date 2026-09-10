'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Page, AuthUser } from '@/types'
import { InkStroke, emptyInk, parseInk } from '@/lib/ink'
import { socket } from '@/lib/socket'
import { pageApi } from '@/lib/api'

type PagePatch = {
  text?: string
  ink?: InkStroke[]
  handText?: string
  diagram?: Page['diagram']
  diagramUrl?: string | null
}

const parseDiagram = (raw: unknown): Page['diagram'] => {
  if (!raw || typeof raw !== 'object') return { elements: [] }
  const scene = raw as { elements?: unknown[]; files?: Record<string, unknown> }
  return {
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    files: scene.files && typeof scene.files === 'object' ? scene.files : {},
  }
}

export const usePages = (initialPages: Page[], user: AuthUser) => {
  const [pages, setPages] = useState<Page[]>(initialPages)
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pagesRef = useRef(pages)
  pagesRef.current = pages

  useEffect(() => {
    setPages(initialPages)
  }, [initialPages])

  useEffect(() => {
    const offUpdated = socket.on('page:updated', (data: {
      pageIndex: number
      text?: string
      ink?: unknown
      handText?: string
      diagram?: unknown
      diagramUrl?: string | null
      ownerUserId?: string
    }) => {
      setPages(prev => {
        const match = prev.find(p =>
          p.pageIndex === data.pageIndex &&
          (data.ownerUserId ? p.ownerUserId === data.ownerUserId : true)
        )
        if (!match) return prev
        return prev.map(p => p.id === match.id ? {
          ...p,
          ...(typeof data.text === 'string' ? { text: data.text } : {}),
          ...(data.ink !== undefined ? { ink: parseInk(data.ink) } : {}),
          ...(typeof data.handText === 'string' ? { handText: data.handText } : {}),
          ...(data.diagram !== undefined ? { diagram: parseDiagram(data.diagram) } : {}),
          ...(data.diagramUrl !== undefined ? { diagramUrl: data.diagramUrl } : {}),
        } : p)
      })
    })

    const offCreated = socket.on('page:created', (page: Page) => {
      setPages(prev => {
        const next = { ...page, ink: parseInk(page.ink), diagram: parseDiagram(page.diagram) }
        if (prev.find(p => p.id === page.id)) {
          return prev.map(p => p.id === page.id ? { ...p, ...next } : p)
        }
        if (prev.find(p => p.ownerUserId === page.ownerUserId && p.pageIndex === page.pageIndex)) {
          return prev.map(p =>
            p.ownerUserId === page.ownerUserId && p.pageIndex === page.pageIndex
              ? { ...p, ...next }
              : p
          )
        }
        return [...prev, next].sort((a, b) => a.pageIndex - b.pageIndex)
      })
    })

    return () => {
      offUpdated()
      offCreated()
    }
  }, [])

  const pendingRef = useRef<Record<string, PagePatch>>({})
  const userRef = useRef(user)
  userRef.current = user

  const flushKey = useCallback((key: string, forceRest = false) => {
    const merged = pendingRef.current[key]
    if (!merged) return
    delete pendingRef.current[key]
    if (debounceRef.current[key]) {
      clearTimeout(debounceRef.current[key])
      delete debounceRef.current[key]
    }
    const current = userRef.current
    const pageIndex = Number(key.slice(key.lastIndexOf(':') + 1))
    const page = pagesRef.current.find(p => p.pageIndex === pageIndex && p.ownerUserId === current.userId)
    const data = {
      text: merged.text ?? page?.text ?? '',
      ink: merged.ink ?? parseInk(page?.ink),
      handText: merged.handText ?? page?.handText ?? '',
      diagram: merged.diagram ?? parseDiagram(page?.diagram),
      diagramUrl: merged.diagramUrl !== undefined ? merged.diagramUrl : page?.diagramUrl,
    }
    socket.send('page:update', { pageIndex, ...data })
    // REST is the durability path when the socket is down, and on hide so
    // a closing tab still writes even if the WS frame never lands.
    if (forceRest || !socket.isOpen) {
      pageApi.update(pageIndex, data, current.token).catch(console.error)
    }
  }, [])

  const flushAll = useCallback(() => {
    Object.keys(pendingRef.current).forEach(key => flushKey(key, true))
  }, [flushKey])

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushAll()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushAll)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushAll)
      flushAll()
    }
  }, [flushAll])

  const persist = useCallback((pageIndex: number, payload: PagePatch) => {
    const key = `${user.userId}:${pageIndex}`
    pendingRef.current[key] = { ...pendingRef.current[key], ...payload }
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(() => flushKey(key), 700)
  }, [user.userId, flushKey])

  const patchPage = useCallback((pageIndex: number, payload: PagePatch) => {
    setPages(prev => prev.map(p =>
      p.pageIndex === pageIndex && p.ownerUserId === user.userId
        ? { ...p, ...payload }
        : p
    ))
    persist(pageIndex, payload)
  }, [user, persist])

  const getText = useCallback((pageIndex: number, ownerUserId: string) =>
    pages.find(p => p.pageIndex === pageIndex && p.ownerUserId === ownerUserId)?.text || '',
  [pages])

  const getInk = useCallback((pageIndex: number, ownerUserId: string): InkStroke[] =>
    parseInk(pages.find(p => p.pageIndex === pageIndex && p.ownerUserId === ownerUserId)?.ink),
  [pages])

  const getPage = useCallback((pageIndex: number, ownerUserId: string) =>
    pages.find(p => p.pageIndex === pageIndex && p.ownerUserId === ownerUserId),
  [pages])

  const updateText = useCallback((pageIndex: number, text: string) => {
    patchPage(pageIndex, { text })
  }, [patchPage])

  const updateInk = useCallback((pageIndex: number, ink: InkStroke[]) => {
    patchPage(pageIndex, { ink })
  }, [patchPage])

  const updateHandText = useCallback((pageIndex: number, handText: string) => {
    patchPage(pageIndex, { handText })
  }, [patchPage])

  const updateDiagram = useCallback((pageIndex: number, diagram: Page['diagram'], diagramUrl?: string | null) => {
    patchPage(pageIndex, diagramUrl !== undefined ? { diagram, diagramUrl } : { diagram })
  }, [patchPage])

  const updateDiagramUrl = useCallback((pageIndex: number, diagramUrl: string | null) => {
    patchPage(pageIndex, { diagramUrl })
  }, [patchPage])

  const ensurePage = useCallback((pageIndex: number) => {
    setPages(prev => {
      if (prev.find(p => p.pageIndex === pageIndex && p.ownerUserId === user.userId)) {
        return prev
      }
      return [...prev, {
        id: '',
        roomId: user.roomId,
        pageIndex,
        text: '',
        ink: emptyInk(),
        handText: '',
        diagram: { elements: [] },
        ownerUserId: user.userId,
        ownerName: user.nickname,
        updatedAt: '',
      }].sort((a, b) => a.pageIndex - b.pageIndex)
    })

    pageApi.create(pageIndex, user.token).catch(console.error)
  }, [user])

  return {
    pages, getText, getInk, getPage,
    updateText, updateInk, updateHandText, updateDiagram, updateDiagramUrl, ensurePage,
  }
}
