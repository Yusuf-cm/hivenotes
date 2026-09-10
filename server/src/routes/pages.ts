import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { getOrCreateOwnedPage, getRoomPage, isPageOwner } from '../lib/ownedPage'
import { sanitizeInk } from '../lib/ink'
import { sanitizeDiagram } from '../lib/diagram'
import { broadcast } from '../ws/server'

const router = Router()

// ── POST /pages ───────────────────────────────────────────────
// Adds the next page in the caller's own book.
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const pageIndex = parseInt(String(req.body.pageIndex), 10)

  if (isNaN(pageIndex) || pageIndex < 0) {
    res.status(400).json({ error: 'Invalid pageIndex' })
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
      res.status(400).json({ error: 'Cannot create that page' })
      return
    }

    broadcast(req.user!.roomCode, 'page:created', page)
    res.status(201).json(page)
  } catch (err) {
    console.error('[pages/create]', err)
    res.status(500).json({ error: 'Failed to create page' })
  }
})

// ── PATCH /pages/:pageIndex ───────────────────────────────────
// Updates a page in the caller's own book.
router.patch('/:pageIndex', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const pageIndex = parseInt(String(req.params.pageIndex), 10)
  const { text, ink, handText, diagram, diagramUrl } = req.body

  if (isNaN(pageIndex) || pageIndex < 0 || pageIndex > 9999) {
    res.status(400).json({ error: 'Invalid pageIndex' })
    return
  }

  if (text !== undefined && typeof text !== 'string') {
    res.status(400).json({ error: 'text must be a string' })
    return
  }

  if (text !== undefined && text.length > 10000) {
    res.status(400).json({ error: 'text must be 10000 characters or less' })
    return
  }

  if (handText !== undefined && (typeof handText !== 'string' || handText.length > 10000)) {
    res.status(400).json({ error: 'handText must be 10000 characters or less' })
    return
  }

  if (diagramUrl !== undefined && diagramUrl !== null && typeof diagramUrl !== 'string') {
    res.status(400).json({ error: 'diagramUrl must be a string' })
    return
  }

  if (text === undefined && ink === undefined && handText === undefined && diagram === undefined && diagramUrl === undefined) {
    res.status(400).json({ error: 'Nothing to update' })
    return
  }

  try {
    const page = await getRoomPage(req.user!.roomId, req.user!.userId, pageIndex)

    if (!page) {
      res.status(404).json({ error: 'Page not found' })
      return
    }

    if (!isPageOwner(page, req.user!.userId)) {
      res.status(403).json({ error: 'You can only edit your own journal' })
      return
    }

    const data: {
      text?: string
      ink?: Prisma.InputJsonValue
      handText?: string
      diagram?: Prisma.InputJsonValue
      diagramUrl?: string | null
    } = {}
    if (typeof text === 'string') data.text = text
    if (ink !== undefined) data.ink = sanitizeInk(ink) as unknown as Prisma.InputJsonValue
    if (typeof handText === 'string') data.handText = handText.slice(0, 10000)
    if (diagram !== undefined) data.diagram = sanitizeDiagram(diagram) as unknown as Prisma.InputJsonValue
    if (diagramUrl === null) data.diagramUrl = null
    if (typeof diagramUrl === 'string') data.diagramUrl = diagramUrl.slice(0, 2000)

    const updated = await prisma.page.update({
      where: { id: page.id },
      data,
    })

    res.json(updated)
  } catch (err) {
    console.error('[pages/patch]', err)
    res.status(500).json({ error: 'Failed to save page' })
  }
})

export default router
