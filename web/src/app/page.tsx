'use client'

import Toolbar from '@/components/ui/Toolbar'
import { useState, useCallback, useEffect } from 'react'
import { AuthUser, Note, Page } from '@/types'
import LoginScreen from '@/components/LoginScreen'
import { SocketProvider, useSocketContext } from '@/context/SocketContext'
import Book from '@/components/book/Book'
import { useNotes } from '@/hooks/useNotes'
import { usePages } from '@/hooks/usePages'
import { roomApi } from '@/lib/api'
import ShareModal from '@/components/ui/ShareModal'
import AIPanel from '@/components/ui/AIPanel'

function BoardInner({ user }: { user: AuthUser }) {
  const [showShare,    setShowShare]    = useState(false)
  const [showAI,       setShowAI]       = useState(false)
  const [initialNotes, setInitialNotes] = useState<Note[]>([])
  const [initialPages, setInitialPages] = useState<Page[]>([])
  const [roomLoaded,   setRoomLoaded]   = useState(false)

  const { presence } = useSocketContext()

  useEffect(() => {
    roomApi.get(user.roomCode, user.token)
      .then(room => {
        setInitialNotes(room.notes)
        setInitialPages(room.pages)
        setRoomLoaded(true)
      })
      .catch(err => {
        console.error('[room] fetch failed', err)
        setRoomLoaded(true)
      })
  }, [user.roomCode, user.token])

  const { notes, addNote, updateNote, deleteNote, bringToFront } =
    useNotes(initialNotes, user)

  const { getText, updateText, ensurePage } =
    usePages(initialPages, user)

  const noteActions = {
    update:     updateNote,
    delete:     deleteNote,
    bringFront: bringToFront,
  }

  const handleAddNote = useCallback((pageIndex: number, x: number, y: number) => {
    addNote(pageIndex, x, y)
  }, [addNote])

  const handleAudio = useCallback(async (audioUrl: string) => {
    try {
      const blob      = await fetch(audioUrl).then(r => r.blob())
      const file      = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
      const form      = new FormData()
      form.append('file', file)
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const res = await fetch(`${API}/upload`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body:    form,
      })
      const data      = await res.json()
      const serverUrl = `${API}${data.url}`
      addNote(0, 80, 80, {
        mediaType: 'audio',
        mediaUrl:  serverUrl,
        color:     'sky',
        content:   '🎙 Voice note',
      })
    } catch {
      addNote(0, 80, 80, {
        mediaType: 'audio',
        mediaUrl:  audioUrl,
        color:     'sky',
        content:   '🎙 Voice note',
      })
    }
  }, [addNote, user.token])

  if (!roomLoaded) {
    return (
      <div className="tex-wood" style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-cormorant)',
          fontStyle: 'italic', fontSize: 22,
          color: 'rgba(245,237,216,0.4)',
          letterSpacing: '.1em',
          animation: 'fade-up .4s ease',
        }}>
          Opening your journal…
        </div>
      </div>
    )
  }

  return (
    <div
      className="tex-wood"
      style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Desk vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 44%,transparent 24%,rgba(0,0,0,0.56) 100%)',
        zIndex: 0,
      }}/>

      {/* Desk spotlight */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 52%,rgba(255,220,150,0.04) 0%,transparent 70%)',
        zIndex: 0,
      }}/>

      <div style={{ position: 'relative', zIndex: 1, marginTop: 40 }}>
        <Book
          user={user}
          notes={notes}
          pages={initialPages}
          getText={getText}
          updateText={updateText}
          ensurePage={ensurePage}
          noteActions={noteActions}
          onAddNote={handleAddNote}
        />
      </div>

      <Toolbar
        user={user}
        onAddNote={() => handleAddNote(0, 80, 120)}
        onAudio={handleAudio}
        onShare={() => setShowShare(true)}
        onAI={() => setShowAI(true)}
        onLogout={() => {
          localStorage.removeItem('hn_user')
          window.location.reload()
        }}
      />

      {showShare && (
        <ShareModal
          user={user}
          presenceCount={presence.length}
          onClose={() => setShowShare(false)}
        />
      )}

      {showAI && (
        <AIPanel
          user={user}
          notes={notes}
          pages={initialPages}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  )
}

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('hn_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
  }, [])

  if (!user) return <LoginScreen onLogin={setUser} />

  return (
    <SocketProvider user={user}>
      <BoardInner user={user} />
    </SocketProvider>
  )
}