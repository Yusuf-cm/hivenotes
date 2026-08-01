import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

const validColors = ['amber', 'sage', 'sky', 'blush', 'violet', 'peach']
const validMediaTypes = ['none', 'image', 'audio']
const NOTES_PER_PAGE = 100

const isValidColor = (color: any): boolean => typeof color === 'string' && validColors.includes(color)
const isValidMediaType = (type: any): boolean => typeof type === 'string' && validMediaTypes.includes(type)
const isValidNumber = (val: any): boolean => typeof val === 'number' && isFinite(val)

// ── GET /notes/page/:pageIndex ──────────────────────────────
// Fetch all notes for a specific page
router.get('/page/:pageIndex', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const pageIndex = parseInt(String(req.params.pageIndex), 10)

  if (isNaN(pageIndex) || pageIndex < 0) {
    res.status(400).json({ error: 'Invalid pageIndex' })
    return
  }

  try {
    const notes = await prisma.note.findMany({
      where: {
        roomId: req.user!.roomId,
        pageIndex,
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ notes, pageIndex })
  } catch (err) {
    console.error('[notes/page]', err)
    res.status(500).json({ error: 'Failed to fetch notes' })
  }
})

// ── POST /notes ───────────────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { pageIndex, content, color, x, y, zIndex, mediaType, mediaUrl, checkboxes } = req.body

  // Validate inputs
  if (content !== undefined && (typeof content !== 'string' || content.length > 5000)) {
    res.status(400).json({ error: 'content must be a string of 5000 characters or less' })
    return
  }

  if (!isValidColor(color ?? 'amber')) {
    res.status(400).json({ error: `color must be one of: ${validColors.join(', ')}` })
    return
  }

  if (!isValidNumber(x ?? 80) || !isValidNumber(y ?? 80)) {
    res.status(400).json({ error: 'x and y must be valid numbers' })
    return
  }

  if (!isValidNumber(zIndex ?? 1)) {
    res.status(400).json({ error: 'zIndex must be a valid number' })
    return
  }

  if (!isValidMediaType(mediaType ?? 'none')) {
    res.status(400).json({ error: `mediaType must be one of: ${validMediaTypes.join(', ')}` })
    return
  }

  if (mediaUrl !== null && mediaUrl !== undefined && typeof mediaUrl !== 'string') {
    res.status(400).json({ error: 'mediaUrl must be a string or null' })
    return
  }

  if (!Array.isArray(checkboxes ?? [])) {
    res.status(400).json({ error: 'checkboxes must be an array' })
    return
  }

  try {
    const note = await prisma.note.create({
      data: {
        roomId:     req.user!.roomId,
        authorId:   req.user!.userId,
        authorName: req.user!.nickname,
        pageIndex:  typeof pageIndex === 'number' && isFinite(pageIndex) ? pageIndex : 0,
        content:    content   ?? '',
        color:      color     ?? 'amber',
        x:          x         ?? 80,
        y:          y         ?? 80,
        zIndex:     zIndex    ?? 1,
        mediaType:  mediaType ?? 'none',
        mediaUrl:   mediaUrl  ?? null,
        checkboxes: checkboxes ?? [],
      }
    })

    res.status(201).json(note)
  } catch (err) {
    console.error('[notes/create]', err)
    res.status(500).json({ error: 'Failed to create note' })
  }
})

// ── PATCH /notes/:id ──────────────────────────────────────────
router.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const clientVersion = req.body.version ? parseInt(String(req.body.version), 10) : undefined

  try {
    const existing = await prisma.note.findUnique({ where: { id } })

    if (!existing) {
      res.status(404).json({ error: 'Note not found' })
      return
    }

    if (existing.roomId !== req.user!.roomId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Check version if provided (optimistic locking)
    if (clientVersion !== undefined && clientVersion !== existing.version) {
      res.status(409).json({
        error: 'Conflict: note was modified',
        currentVersion: existing.version,
        clientVersion,
      })
      return
    }

    const data: Record<string, any> = {}

    // Validate and add content
    if (req.body.content !== undefined) {
      if (typeof req.body.content !== 'string' || req.body.content.length > 5000) {
        res.status(400).json({ error: 'content must be a string of 5000 characters or less' })
        return
      }
      data.content = req.body.content
    }

    // Validate and add color
    if (req.body.color !== undefined) {
      if (!isValidColor(req.body.color)) {
        res.status(400).json({ error: `color must be one of: ${validColors.join(', ')}` })
        return
      }
      data.color = req.body.color
    }

    // Validate and add coordinates
    if (req.body.x !== undefined) {
      if (!isValidNumber(req.body.x)) {
        res.status(400).json({ error: 'x must be a valid number' })
        return
      }
      data.x = req.body.x
    }

    if (req.body.y !== undefined) {
      if (!isValidNumber(req.body.y)) {
        res.status(400).json({ error: 'y must be a valid number' })
        return
      }
      data.y = req.body.y
    }

    // Validate and add zIndex
    if (req.body.zIndex !== undefined) {
      if (!isValidNumber(req.body.zIndex)) {
        res.status(400).json({ error: 'zIndex must be a valid number' })
        return
      }
      data.zIndex = req.body.zIndex
    }

    // Validate and add mediaType
    if (req.body.mediaType !== undefined) {
      if (!isValidMediaType(req.body.mediaType)) {
        res.status(400).json({ error: `mediaType must be one of: ${validMediaTypes.join(', ')}` })
        return
      }
      data.mediaType = req.body.mediaType
    }

    // Validate and add mediaUrl
    if (req.body.mediaUrl !== undefined) {
      if (req.body.mediaUrl !== null && typeof req.body.mediaUrl !== 'string') {
        res.status(400).json({ error: 'mediaUrl must be a string or null' })
        return
      }
      data.mediaUrl = req.body.mediaUrl
    }

    // Validate and add checkboxes
    if (req.body.checkboxes !== undefined) {
      if (!Array.isArray(req.body.checkboxes)) {
        res.status(400).json({ error: 'checkboxes must be an array' })
        return
      }
      data.checkboxes = req.body.checkboxes
    }

    // Validate and add pageIndex
    if (req.body.pageIndex !== undefined) {
      if (!isValidNumber(req.body.pageIndex)) {
        res.status(400).json({ error: 'pageIndex must be a valid number' })
        return
      }
      data.pageIndex = req.body.pageIndex
    }

    // Increment version on update
    data.version = existing.version + 1

    const note = await prisma.note.update({ where: { id }, data })
    res.json(note)
  } catch (err) {
    console.error('[notes/patch]', err)
    res.status(500).json({ error: 'Failed to update note' })
  }
})

// ── DELETE /notes/:id ─────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)

  try {
    const existing = await prisma.note.findUnique({ where: { id } })

    if (!existing) {
      res.status(404).json({ error: 'Note not found' })
      return
    }

    if (existing.roomId !== req.user!.roomId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    await prisma.note.delete({ where: { id } })
    res.status(204).send()
  } catch (err) {
    console.error('[notes/delete]', err)
    res.status(500).json({ error: 'Failed to delete note' })
  }
})

export default router