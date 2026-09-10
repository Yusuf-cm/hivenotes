'use client'

import { useState, useCallback, useEffect } from 'react'
import { Page, AuthUser, OTOperation } from '@/types'
import { socket } from '@/lib/socket'
import {
  OTState,
  createOTState,
  applyRemoteOp,
  createLocalOp,
  ackOp,
  getClientVersion,
  applyOp,
  createInsertOp,
  createDeleteOp,
} from '@/lib/ot'

interface PageState {
  [pageIndex: number]: OTState
}

export const useOTPages = (initialPages: Page[], user: AuthUser) => {
  const [pages, setPages] = useState<PageState>({})

  // Initialize pages from server data
  useEffect(() => {
    const state: PageState = {}
    for (const page of initialPages) {
      state[page.pageIndex] = createOTState(page.text, 0)
    }
    setPages(state)
  }, [])

  // Listen for remote page edits
  useEffect(() => {
    const offPageEdited = socket.on('page:edited', (data: any) => {
      const { pageIndex, operation, version } = data
      setPages(prev => {
        const pageState = prev[pageIndex] || createOTState()
        const newState = applyRemoteOp(pageState, operation, version)
        return { ...prev, [pageIndex]: newState }
      })
    })

    return () => offPageEdited()
  }, [])

  // Get text for a page
  const getText = useCallback((pageIndex: number): string => {
    return pages[pageIndex]?.text ?? ''
  }, [pages])

  // Get version for a page
  const getVersion = useCallback((pageIndex: number): number => {
    return pages[pageIndex]?.version ?? 0
  }, [pages])

  // Handle local text insert
  const insertText = useCallback((pageIndex: number, index: number, text: string) => {
    setPages(prev => {
      const pageState = prev[pageIndex] || createOTState()

      // Apply locally
      const newText = applyOp(pageState.text, createInsertOp(index, text))
      const newState = createLocalOp({ ...pageState, text: newText }, createInsertOp(index, text))

      // Send to server
      const version = getClientVersion(pageState)
      socket.send('page:edit', {
        pageIndex,
        type: 'insert',
        index,
        content: text,
        version,
      })

      return { ...prev, [pageIndex]: newState }
    })
  }, [])

  // Handle local text delete
  const deleteText = useCallback((pageIndex: number, index: number, length: number, deletedText: string) => {
    setPages(prev => {
      const pageState = prev[pageIndex] || createOTState()

      // Apply locally
      const newText = applyOp(pageState.text, createDeleteOp(index, length, deletedText))
      const newState = createLocalOp(
        { ...pageState, text: newText },
        createDeleteOp(index, length, deletedText)
      )

      // Send to server
      const version = getClientVersion(pageState)
      socket.send('page:edit', {
        pageIndex,
        type: 'delete',
        index,
        content: deletedText,
        version,
      })

      return { ...prev, [pageIndex]: newState }
    })
  }, [])

  // Ensure page exists
  const ensurePage = useCallback((pageIndex: number) => {
    setPages(prev => {
      if (prev[pageIndex]) return prev
      return { ...prev, [pageIndex]: createOTState() }
    })
  }, [])

  return { getText, getVersion, insertText, deleteText, ensurePage }
}
