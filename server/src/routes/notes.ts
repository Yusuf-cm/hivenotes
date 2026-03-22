import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

// ── POST /notes ───────────────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { pageIndex, content, color, x, y, zIndex, mediaType, mediaUrl, checkboxes } = req.body

  try {
    const note = await prisma.note.create({
      data: {
        roomId:     req.user!.roomId,
        authorId:   req.user!.userId,
        authorName: req.user!.nickname,
        pageIndex:  pageIndex ?? 0,
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

    const allowed = ['content','color','x','y','zIndex','mediaType','mediaUrl','checkboxes','pageIndex']
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }

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