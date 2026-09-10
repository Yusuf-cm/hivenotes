import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { groqBriefingAudio, groqChat, groqKey, groqReadHandwriting } from '../lib/groq'
import { getOrCreateOwnedPage } from '../lib/ownedPage'
import { extractFromNote, isPlaceholderContent } from '../lib/processMedia'
import { buildRoomSources, parseJsonLoose, studioFromModel } from '../lib/roomContext'
import { broadcast } from '../ws/server'
import { cache } from '../lib/cache'
import { config } from '../config'

const router = Router()

const missingKey = (res: Response) => {
  if (groqKey()) return false
  res.status(500).json({ error: 'GROQ_API_KEY not set on the server' })
  return true
}

const findNoteForProcess = async (roomId: string, noteId?: string, mediaUrl?: string) => {
  if (noteId && !noteId.startsWith('temp-')) {
    const note = await prisma.note.findUnique({ where: { id: noteId } })
    if (note && note.roomId === roomId) return note
  }
  if (mediaUrl) {
    return prisma.note.findFirst({
      where: { roomId, mediaUrl },
      orderBy: { createdAt: 'desc' },
    })
  }
  return null
}

const applyExtraction = async (note: { id: string; roomId: string; mediaType: string; mediaUrl: string | null }) => {
  const text = await extractFromNote(note.mediaType, note.mediaUrl)
  const updated = await prisma.note.update({
    where: { id: note.id },
    data: { content: text },
  })
  cache.invalidate(note.roomId)
  return updated
}

router.post('/process', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (missingKey(res)) return

  const noteId = typeof req.body?.noteId === 'string' ? req.body.noteId : ''
  const mediaUrl = typeof req.body?.mediaUrl === 'string' ? req.body.mediaUrl : ''

  try {
    let note = await findNoteForProcess(req.user!.roomId, noteId, mediaUrl)
    for (let i = 0; !note && i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 400))
      note = await findNoteForProcess(req.user!.roomId, noteId, mediaUrl)
    }

    if (!note || note.mediaType === 'none' || !note.mediaUrl) {
      res.status(404).json({ error: 'Note media not found yet' })
      return
    }

    const updated = await applyExtraction(note)
    const room = await prisma.room.findUnique({ where: { id: req.user!.roomId }, select: { code: true } })
    if (room) broadcast(room.code, 'note:updated', updated)
    res.json({ note: updated })
  } catch (err: any) {
    console.error('[ai/process]', err)
    res.status(500).json({ error: err.message || 'Processing failed' })
  }
})

router.post('/handwriting', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (missingKey(res)) return

  const image = typeof req.body?.image === 'string' ? req.body.image : ''
  const pageIndex = Number(req.body?.pageIndex)
  const match = image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/)
  if (!match || !Number.isFinite(pageIndex)) {
    res.status(400).json({ error: 'Send a small ink image and pageIndex' })
    return
  }

  const buf = Buffer.from(match[2], 'base64')
  if (buf.length < 40 || buf.length > 1500000) {
    res.status(400).json({ error: 'Ink image is the wrong size' })
    return
  }

  try {
    const page = await getOrCreateOwnedPage(
      req.user!.roomId,
      req.user!.userId,
      req.user!.nickname,
      pageIndex
    )
    if (!page) {
      res.status(404).json({ error: 'Page not found' })
      return
    }

    const text = (await groqReadHandwriting(buf, match[1])).slice(0, 10000)
    const updated = await prisma.page.update({
      where: { id: page.id },
      data: { handText: text },
    })
    const room = await prisma.room.findUnique({ where: { id: req.user!.roomId }, select: { code: true } })
    if (room) {
      broadcast(room.code, 'page:updated', {
        pageIndex,
        text: updated.text,
        ink: updated.ink,
        handText: updated.handText,
        ownerUserId: req.user!.userId,
      }, req.user!.userId)
    }
    res.json({ text })
  } catch (err: any) {
    console.error('[ai/handwriting]', err)
    res.status(500).json({ error: err.message || 'Could not read handwriting' })
  }
})

router.post('/chat', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (missingKey(res)) return

  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
  const history = Array.isArray(req.body?.history) ? req.body.history : []
  if (!content) {
    res.status(400).json({ error: 'Missing message' })
    return
  }

  try {
    const revision = await prisma.classRevision.findUnique({ where: { roomId: req.user!.roomId } })
    const { sources, context } = await buildRoomSources(req.user!.roomId)
    const sourceList = Array.isArray(revision?.sources) && (revision!.sources as any[]).length
      ? revision!.sources
      : sources

    const sourceBlock = Array.isArray(sourceList)
      ? (sourceList as any[]).map((s: any) => `[${s.id}] ${s.label}\n${s.excerpt || ''}`).join('\n\n')
      : context

    const guide = revision?.body ? `\n\nStudy guide:\n${revision.body}` : ''

    const system = sourceBlock
      ? `You are a classroom tutor for ${req.user!.nickname}.
Answer ONLY from the study guide and numbered sources (typed notes, converted handwriting, diagram descriptions, audio, photos). If it is not in the sources, say you do not have it.
Return ONLY JSON: { "text": "markdown answer", "citations": ["S1"] }
Use citations for every factual claim. Be clear. You may explain simply or quiz the student.`
      : `You are a classroom tutor for ${req.user!.nickname}. The journals are empty. Return JSON { "text": "...", "citations": [] }.`

    const messages = [
      ...history.filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content },
    ]

    const raw = await groqChat(`${system}\n\nSources:\n${sourceBlock}${guide}`, messages, 1400)
    let text = raw
    let citations: string[] = []
    try {
      const parsed = parseJsonLoose(raw)
      text = typeof parsed.text === 'string' ? parsed.text : raw
      citations = Array.isArray(parsed.citations) ? parsed.citations.map(String) : []
    } catch {}

    const catalog = Array.isArray(sourceList) ? sourceList as any[] : []
    const cited = citations
      .map(id => catalog.find((s: any) => s.id === id))
      .filter(Boolean)
      .map((s: any) => ({ id: s.id, label: s.label }))

    res.json({ result: text, citations: cited })
  } catch (err: any) {
    console.error('[ai/chat]', err)
    res.status(500).json({ error: err.message || 'Chat failed' })
  }
})

router.post('/note', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (missingKey(res)) return

  const type = String(req.body?.type || '')
  const content = typeof req.body?.content === 'string' ? req.body.content : ''
  if (!content.trim()) {
    res.status(400).json({ error: 'Missing content' })
    return
  }

  const prompts: Record<string, { system: string; user: string }> = {
    expand: {
      system: 'You are a creative journal companion. Be warm, brief, insightful. 2-3 sentences only.',
      user: `Expand this note:\n"${content}"`,
    },
    tasks: {
      system: 'Return ONLY a JSON array of short action item strings. No markdown, no explanation, no preamble.',
      user: `Convert to action items:\n"${content}"`,
    },
    summarize: {
      system: 'Summarize in one concise sentence. Return only the sentence.',
      user: content,
    },
  }

  const p = prompts[type]
  if (!p) {
    res.status(400).json({ error: 'Unknown type' })
    return
  }

  try {
    const text = await groqChat(p.system, [{ role: 'user', content: p.user }], 500)
    let result: any = text
    if (type === 'tasks') {
      try { result = JSON.parse(text.replace(/```json|```/g, '').trim()) }
      catch { result = [] }
    }
    res.json({ result })
  } catch (err: any) {
    console.error('[ai/note]', err)
    res.status(500).json({ error: err.message || 'Note AI failed' })
  }
})

router.post('/compile', requireAuth, async (req: Request, res: Response): Promise<void> => {
  if (missingKey(res)) return

  try {
    const pending = await prisma.note.findMany({
      where: {
        roomId: req.user!.roomId,
        mediaType: { in: ['audio', 'image'] },
        mediaUrl: { not: null },
      },
    })

    for (const note of pending) {
      if (!isPlaceholderContent(note.content) && note.content.trim()) continue
      try {
        const updated = await applyExtraction(note)
        broadcast(req.user!.roomCode, 'note:updated', updated)
      } catch (err) {
        console.error('[ai/compile] skip note', note.id, err)
      }
    }

    const { sources, context } = await buildRoomSources(req.user!.roomId, { readDiagrams: true })
    if (!context.trim()) {
      res.status(400).json({ error: 'Nothing in the journals to compile yet' })
      return
    }

    const studio = await studioFromModel(sources)

    let audioUrl: string | null = null
    if (studio.audioScript.trim()) {
      try {
        const wav = await groqBriefingAudio(studio.audioScript)
        if (wav && wav.length > 44) {
          const filename = `${randomBytes(8).toString('hex')}.wav`
          fs.writeFileSync(path.join(config.uploadsDir, filename), wav)
          audioUrl = `/files/${filename}`
        }
      } catch (err) {
        console.error('[ai/compile] tts', err)
      }
    }

    const revision = await prisma.classRevision.upsert({
      where: { roomId: req.user!.roomId },
      create: {
        roomId: req.user!.roomId,
        title: studio.title,
        body: studio.guide,
        compiledBy: req.user!.nickname,
        sources,
        glossary: studio.glossary,
        faq: studio.faq,
        quiz: studio.quiz,
        gaps: studio.gaps,
        audioScript: studio.audioScript,
        audioUrl,
      },
      update: {
        title: studio.title,
        body: studio.guide,
        compiledBy: req.user!.nickname,
        compiledAt: new Date(),
        sources,
        glossary: studio.glossary,
        faq: studio.faq,
        quiz: studio.quiz,
        gaps: studio.gaps,
        audioScript: studio.audioScript,
        audioUrl,
      },
    })

    broadcast(req.user!.roomCode, 'revision:updated', revision)
    res.json({ revision })
  } catch (err: any) {
    console.error('[ai/compile]', err)
    res.status(500).json({ error: err.message || 'Compile failed' })
  }
})

router.get('/revision', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const revision = await prisma.classRevision.findUnique({
      where: { roomId: req.user!.roomId },
    })
    res.json({ revision })
  } catch (err) {
    console.error('[ai/revision]', err)
    res.status(500).json({ error: 'Failed to load revision' })
  }
})

export default router
