'use client'

import Toolbar from '@/components/ui/Toolbar'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { AuthUser, CLASS_REVISION_ID, ClassRevision, Note, Page } from '@/types'
import LoginScreen from '@/components/LoginScreen'
import { SocketProvider, useSocketContext } from '@/context/SocketContext'
import Book from '@/components/book/Book'
import WritingDesk from '@/components/book/WritingDesk'
import WriteBar from '@/components/book/WriteBar'
import { useNotes } from '@/hooks/useNotes'
import { usePages } from '@/hooks/usePages'
import { roomApi } from '@/lib/api'
import { socket } from '@/lib/socket'
import { processMedia, uploadMedia, aiHandwriting } from '@/lib/media'
import { mergeHiveUser } from '@/lib/billing'
import { InkStroke, InkTool, WriteMode, parseInk, strokeBounds } from '@/lib/ink'
import { rasterizeInkPng } from '@/lib/inkPng'
import { insertOnRuledLine, lineIndexFromY, colFromX } from '@/lib/pageLines'
import ShareModal from '@/components/ui/ShareModal'
import AIPanel from '@/components/ui/AIPanel'
import StudyDesk from '@/components/ui/StudyDesk'
import MobilePage from '@/components/book/MobilePage'

function BoardInner({ user, onUser }: { user: AuthUser; onUser: (user: AuthUser) => void }) {
  const [showShare,    setShowShare]    = useState(false)
  const [showAI,       setShowAI]       = useState(false)
  const [initialNotes, setInitialNotes] = useState<Note[]>([])
  const [initialPages, setInitialPages] = useState<Page[]>([])
  const [roomLoaded,   setRoomLoaded]   = useState(false)
  const [isMobile,     setIsMobile]     = useState<boolean | null>(null)
  const [currentPage,     setCurrentPage]     = useState(0)
  const [viewingOwnerId,  setViewingOwnerId]  = useState(user.userId)
  const [revision,        setRevision]        = useState<ClassRevision | null>(null)
  const [writeMode,       setWriteMode]       = useState<WriteMode>('type')
  const [inkTool,         setInkTool]         = useState<InkTool>('pen')
  const [inkColor,        setInkColor]        = useState('#1c0f0c')
  const [inkWidth,        setInkWidth]        = useState(0.012)
  const [converting,      setConverting]      = useState(false)

  // ── Mobile detection — must know screen size before rendering ─
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      const tablet = navigator.maxTouchPoints > 0 && w < 1400
      setIsMobile(w < 769 || tablet)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (coarse || navigator.maxTouchPoints > 1) setWriteMode('pen')
  }, [])

  const { presence } = useSocketContext()

  // ── Fetch room data on mount ──────────────────────────────
  useEffect(() => {
    roomApi.get(user.roomCode, user.token)
      .then(room => {
        setInitialNotes(room.notes)
        setInitialPages(room.pages.map(p => ({
          ...p,
          ink: parseInk(p.ink),
          diagram: p.diagram && typeof p.diagram === 'object'
            ? p.diagram
            : { elements: [] },
        })))
        setRevision(room.revision || null)
        onUser(mergeHiveUser(user, room))
        setCurrentPage(0)
        setViewingOwnerId(user.userId)
        try {
          const stored = localStorage.getItem('hn_user')
          if (stored) {
            const parsed = JSON.parse(stored)
            localStorage.setItem('hn_user', JSON.stringify({ ...parsed, pageIndex: 0 }))
          }
        } catch {}
        setRoomLoaded(true)
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : ''
        if (/invalid|expired|token|401/i.test(msg)) {
          localStorage.removeItem('hn_user')
          window.location.reload()
          return
        }
        setRoomLoaded(true)
      })
  }, [user.roomCode, user.token, user.userId, user.pageIndex])

  useEffect(() => {
    socket.send('page:view', { pageIndex: currentPage })
  }, [currentPage])

  useEffect(() => {
    return socket.on('revision:updated', (next: ClassRevision) => setRevision(next))
  }, [])

  const { notes, addNote, updateNote, deleteNote, bringToFront } =
    useNotes(initialNotes, user)

  const { pages, getText, getInk, getPage, updateText, updateInk, updateHandText, updateDiagram, updateDiagramUrl, ensurePage } =
    usePages(initialPages, user)

  const viewingClass = viewingOwnerId === CLASS_REVISION_ID
  const viewingMine = !viewingClass && viewingOwnerId === user.userId
  const bookPages = viewingClass
    ? [{
        id: revision?.id || 'class',
        roomId: user.roomId,
        pageIndex: 0,
        text: revision?.body || 'Compile a class revision from the AI panel after everyone has saved their lecture notes.',
        ownerUserId: CLASS_REVISION_ID,
        ownerName: 'Class revision',
        updatedAt: revision?.updatedAt || '',
      }]
    : pages.filter(p => p.ownerUserId === viewingOwnerId)
  const bookNotes = viewingClass ? [] : notes.filter(n => (n.pageOwnerId || n.authorId) === viewingOwnerId)
  const bookGetText = useCallback((idx: number) => {
    if (viewingOwnerId === CLASS_REVISION_ID) {
      return revision?.body || 'Compile a class revision from the AI panel after everyone has saved their lecture notes.'
    }
    return getText(idx, viewingOwnerId)
  }, [getText, revision, viewingOwnerId])

  const bookGetInk = useCallback((idx: number): InkStroke[] => {
    if (viewingOwnerId === CLASS_REVISION_ID) return []
    return getInk(idx, viewingOwnerId)
  }, [getInk, viewingOwnerId])

  const openJournal = useCallback((ownerId: string) => {
    setViewingOwnerId(ownerId)
    setCurrentPage(0)
  }, [])

  const journals = useMemo(() => {
    const map = new Map<string, string>()
    map.set(user.userId, user.nickname)
    for (const page of pages) {
      if (page.ownerUserId && page.ownerName) map.set(page.ownerUserId, page.ownerName)
    }
    for (const person of presence) map.set(person.userId, person.nickname)
    return [
      { id: CLASS_REVISION_ID, name: 'Class revision' },
      ...[...map.entries()].map(([id, name]) => ({ id, name })),
    ]
  }, [pages, presence, user.nickname, user.userId])

  const viewingName = journals.find(j => j.id === viewingOwnerId)?.name || user.nickname

  const pageIndexes = bookPages.map(p => p.pageIndex).sort((a, b) => a - b)
  const pagePos = Math.max(0, pageIndexes.indexOf(currentPage))
  const prevPage = pagePos > 0 ? pageIndexes[pagePos - 1] : undefined
  const nextPage = pagePos < pageIndexes.length - 1 ? pageIndexes[pagePos + 1] : undefined
  const foundPage = bookPages.find(p => p.pageIndex === currentPage)
  const activePage = {
    id: foundPage?.id || '',
    roomId: user.roomId,
    pageIndex: currentPage,
    text: bookGetText(currentPage),
    ink: bookGetInk(currentPage),
    handText: foundPage?.handText || '',
    diagram: foundPage?.diagram || { elements: [] },
    diagramUrl: foundPage?.diagramUrl,
    ownerUserId: foundPage?.ownerUserId ?? viewingOwnerId,
    ownerName: foundPage?.ownerName ?? viewingName,
    updatedAt: foundPage?.updatedAt || '',
  }

  const noteActions = {
    update:     updateNote,
    delete:     deleteNote,
    bringFront: bringToFront,
  }

  const handleAddNote = useCallback((pageIndex: number, x: number, y: number) => {
    if (!viewingMine) return
    addNote(pageIndex, x, y)
  }, [addNote, viewingMine])

  const placeOffset = useCallback(() => {
    const count = bookNotes.filter(n => n.pageIndex === currentPage).length
    return { x: 214 + (count % 3) * 14, y: 88 + (count % 4) * 16 }
  }, [bookNotes, currentPage])

  const handleAddFile = useCallback(async (pageIndex: number, x: number, y: number, file: File) => {
    if (!viewingMine) return
    const isAudio = file.type.startsWith('audio/') || /\.(webm|m4a|mp3|ogg|wav|aac)$/i.test(file.name)
    const preview = URL.createObjectURL(file)
    const id = addNote(pageIndex, x, y, {
      mediaType: isAudio ? 'audio' : 'image',
      mediaUrl: preview,
      color: isAudio ? 'sky' : 'peach',
      content: isAudio ? 'Listening…' : '',
    })

    try {
      const url = await uploadMedia(file, user.token)
      updateNote(id, { mediaUrl: url, mediaType: isAudio ? 'audio' : 'image' })
      URL.revokeObjectURL(preview)
      await processMedia(user.token, { mediaUrl: url }).catch(err => {
        console.error('[media]', err)
      })
    } catch (err) {
      console.error('[media]', err)
      updateNote(id, { content: isAudio ? 'Voice note — upload failed' : 'Image — upload failed' })
    }
  }, [addNote, updateNote, user.token, viewingMine])

  const handleAudio = useCallback(async (file: File) => {
    const { x, y } = placeOffset()
    await handleAddFile(currentPage, x, y, file)
  }, [currentPage, handleAddFile, placeOffset])

  const handlePickImage = useCallback((file: File) => {
    const { x, y } = placeOffset()
    handleAddFile(currentPage, x, y, file)
  }, [currentPage, handleAddFile, placeOffset])

  const myInk = viewingMine ? getInk(currentPage, user.userId) : []
  const penInk = myInk.filter(s => s.tool === 'pen')
  const inkRev = `${currentPage}:${penInk.length}:${penInk.at(-1)?.points.length || 0}`
  const failedInkRev = useRef('')
  const skipAutoConvert = useRef(false)

  const settlePenInk = useCallback(async () => {
    if (!viewingMine || converting) return false
    const ink = getInk(currentPage, user.userId)
    const pens = ink.filter(s => s.tool === 'pen')
    if (!pens.length) return true
    setConverting(true)
    try {
      const png = rasterizeInkPng(pens)
      const { text: hand, error } = png
        ? await aiHandwriting(user.token, png, currentPage)
        : { text: '' }
      if (error && /GROQ_API_KEY|Too many requests/i.test(error)) skipAutoConvert.current = true
      if (!hand.trim()) return false
      const typed = getText(currentPage, user.userId)
      const box = strokeBounds(pens)
      const ruled = document.querySelector('[data-page-ruled]') as HTMLElement | null
      const ta = document.querySelector('[data-page-text="1"]') as HTMLTextAreaElement | null
      const h = ruled?.clientHeight || ta?.clientHeight || 1
      const w = ruled?.clientWidth || ta?.clientWidth || 1
      const midY = (box.minY + box.maxY) / 2
      const line = lineIndexFromY(midY, h)
      const cs = ta ? getComputedStyle(ta) : null
      const font = cs ? `${cs.fontSize} ${cs.fontFamily}` : '21px Gochi Hand'
      const padL = cs ? parseFloat(cs.paddingLeft) || 84 : 84
      const col = colFromX(box.minX, w, font, padL)
      const next = insertOnRuledLine(typed, hand.trim(), line, col)
      updateText(currentPage, next)
      updateInk(currentPage, ink.filter(s => s.tool !== 'pen'))
      updateHandText(currentPage, '')
      return true
    } catch {
      return false
    } finally {
      setConverting(false)
    }
  }, [converting, currentPage, getInk, getText, updateHandText, updateInk, updateText, user.token, user.userId, viewingMine])

  useEffect(() => {
    if (!viewingMine || writeMode !== 'pen' || converting) return
    if (penInk.length === 0 || skipAutoConvert.current) return
    if (failedInkRev.current === inkRev) return
    const timer = setTimeout(async () => {
      const ok = await settlePenInk()
      if (!ok) failedInkRev.current = inkRev
    }, 700)
    return () => clearTimeout(timer)
  }, [inkRev, viewingMine, writeMode, converting, penInk.length, settlePenInk])

  const convertHandwriting = useCallback(async () => {
    await settlePenInk()
  }, [settlePenInk])

  const handleDiagram = useCallback((scene: { elements: unknown[]; files?: Record<string, unknown> }) => {
    if (!viewingMine) return
    updateDiagram(currentPage, scene)
  }, [currentPage, updateDiagram, viewingMine])

  const handleDiagramPng = useCallback(async (blob: Blob) => {
    if (!viewingMine) return
    try {
      const file = new File([blob], `diagram-${Date.now()}.png`, { type: 'image/png' })
      const url = await uploadMedia(file, user.token)
      updateDiagramUrl(currentPage, url)
    } catch (err) {
      console.error('[diagram]', err)
    }
  }, [currentPage, updateDiagramUrl, user.token, viewingMine])

  const deskOpen = writeMode === 'diagram'

  // ── Loading states ────────────────────────────────────────
  if (isMobile === null || !roomLoaded) {
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
      {/* Desk vignette — desktop only */}
      {!isMobile && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 44%,transparent 24%,rgba(0,0,0,0.56) 100%)',
          zIndex: 0,
        }}/>
      )}

      {/* Desk spotlight — desktop only */}
      {!isMobile && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 40% at 50% 52%,rgba(255,220,150,0.04) 0%,transparent 70%)',
          zIndex: 0,
        }}/>
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        marginTop: isMobile ? 0 : 40,
        width: isMobile ? '100%' : 'auto',
        height: isMobile ? '100%' : 'auto',
      }}>
        {viewingClass ? (
          <StudyDesk
            user={user}
            revision={revision}
            onAI={() => setShowAI(true)}
            onBack={() => openJournal(user.userId)}
          />
        ) : isMobile ? (
          <MobilePage
            user={user}
            notes={bookNotes}
            pages={bookPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            getText={bookGetText}
            getInk={bookGetInk}
            updateText={updateText}
            updateInk={viewingMine ? updateInk : undefined}
            ensurePage={viewingMine ? ensurePage : undefined}
            canEdit={viewingMine}
            writeMode={writeMode}
            inkTool={inkTool}
            inkColor={inkColor}
            inkWidth={inkWidth}
            onWriteMode={setWriteMode}
            onInkTool={setInkTool}
            onInkColor={setInkColor}
            onInkWidth={setInkWidth}
            onConvert={viewingMine ? convertHandwriting : undefined}
            canConvert={penInk.length > 0}
            converting={converting}
            onDiagramChange={viewingMine ? handleDiagram : undefined}
            onDiagramPng={viewingMine ? handleDiagramPng : undefined}
            noteActions={noteActions}
            onAddNote={handleAddNote}
            onAI={() => setShowAI(true)}
            onShare={() => setShowShare(true)}
            onAudio={handleAudio}
            onAddFile={handleAddFile}
            journals={journals}
            viewingId={viewingOwnerId}
            onOpenJournal={openJournal}
          />
        ) : (
          <>
            <div style={{ display: !isMobile && deskOpen ? 'none' : undefined }}>
              <Book
                user={user}
                notes={bookNotes}
                pages={bookPages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                getText={bookGetText}
                getInk={bookGetInk}
                updateText={updateText}
                updateInk={viewingMine ? updateInk : undefined}
                ensurePage={viewingMine ? ensurePage : undefined}
                canEdit={viewingMine}
                noteActions={noteActions}
                onAddNote={handleAddNote}
                onAddFile={handleAddFile}
                bookOwnerName={viewingName}
                writeMode={writeMode}
                inkTool={inkTool}
                inkColor={inkColor}
                inkWidth={inkWidth}
              />
            </div>
            {!isMobile && deskOpen && (
              <WritingDesk
                user={user}
                page={activePage}
                notes={bookNotes.filter(n => n.pageIndex === currentPage)}
                canEdit={viewingMine}
                writeMode={writeMode}
                tool={inkTool}
                color={inkColor}
                width={inkWidth}
                onMode={setWriteMode}
                onTool={setInkTool}
                onColor={setInkColor}
                onWidth={setInkWidth}
                onUndo={() => {
                  if (!viewingMine) return
                  const ink = bookGetInk(currentPage)
                  if (ink.length) updateInk(currentPage, ink.slice(0, -1))
                }}
                onClear={() => viewingMine && updateInk(currentPage, [])}
                onTextChange={t => viewingMine && updateText(currentPage, t)}
                onInkChange={ink => viewingMine && updateInk(currentPage, ink)}
                onDiagramChange={viewingMine ? handleDiagram : undefined}
                onDiagramPng={viewingMine ? handleDiagramPng : undefined}
                onConvert={viewingMine ? convertHandwriting : undefined}
                canConvert={penInk.length > 0}
                converting={converting}
                onAddNote={(x, y) => handleAddNote(currentPage, x, y)}
                onAddFile={handleAddFile ? (x, y, file) => handleAddFile(currentPage, x, y, file) : undefined}
                noteActions={noteActions}
                onPrev={prevPage !== undefined ? () => setCurrentPage(prevPage) : undefined}
                onNext={() => {
                  if (nextPage !== undefined) {
                    setCurrentPage(nextPage)
                    return
                  }
                  if (!viewingMine) return
                  ensurePage(currentPage + 1)
                  setCurrentPage(currentPage + 1)
                }}
                canPrev={prevPage !== undefined}
                canNext={nextPage !== undefined || viewingMine}
                onClose={() => setWriteMode('type')}
              />
            )}
          </>
        )}
      </div>

      {!isMobile && writeMode === 'pen' && viewingMine && (
        <div style={{
          position: 'fixed',
          bottom: 22,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 520,
        }}>
          <WriteBar
            mode={writeMode}
            tool={inkTool}
            color={inkColor}
            width={inkWidth}
            canEdit={viewingMine}
            onMode={setWriteMode}
            onTool={setInkTool}
            onColor={setInkColor}
            onWidth={setInkWidth}
            onUndo={() => {
              const ink = getInk(currentPage, user.userId)
              if (ink.length) updateInk(currentPage, ink.slice(0, -1))
            }}
            onClear={() => updateInk(currentPage, myInk.filter(s => s.tool !== 'pen'))}
            onConvert={convertHandwriting}
            canConvert={penInk.length > 0}
            converting={converting}
            variant="dark"
          />
        </div>
      )}

      {!isMobile && !deskOpen && journals.length > 1 && (
        <div style={{
          position: 'fixed',
          left: 20, top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 400,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 10, letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'rgba(245,237,216,0.35)',
            marginBottom: 4,
          }}>
            Journals
          </div>
          {journals.map(j => (
            <button
              key={j.id}
              onClick={() => openJournal(j.id)}
              style={{
                padding: '8px 12px',
                borderRadius: 12,
                border: j.id === viewingOwnerId
                  ? '1px solid rgba(201,168,76,0.45)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: j.id === viewingOwnerId
                  ? 'rgba(201,168,76,0.16)'
                  : 'rgba(18,6,3,0.55)',
                color: 'rgba(245,237,216,0.8)',
                fontFamily: 'var(--font-cormorant)',
                fontSize: 14,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {j.id === CLASS_REVISION_ID
                ? 'Class revision'
                : j.id === user.userId ? 'Your book' : `${j.name}'s book`}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar — desktop only */}
      {!isMobile && (
        <Toolbar
          user={user}
          viewingUserId={viewingOwnerId}
          canEdit={viewingMine}
          onOpenJournal={openJournal}
          onAddNote={() => handleAddNote(currentPage, placeOffset().x, placeOffset().y)}
          onAudio={handleAudio}
          onImage={handlePickImage}
          onShare={() => setShowShare(true)}
          onAI={() => setShowAI(true)}
          writeMode={writeMode}
          onWriteMode={setWriteMode}
          onLogout={() => {
            localStorage.removeItem('hn_user')
            window.location.reload()
          }}
        />
      )}

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
          pages={pages}
          journals={journals}
          onCompiled={next => {
            setRevision(next)
            setViewingOwnerId(CLASS_REVISION_ID)
            setCurrentPage(0)
            setShowAI(false)
          }}
          onUser={onUser}
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
      <BoardInner user={user} onUser={setUser} />
    </SocketProvider>
  )
}