import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

// ── PATCH /pages/:pageIndex ───────────────────────────────────
// Upserts a page's text content
// Called on every keystroke (debounced on the client)
router.patch('/:pageIndex', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const pageIndex = parseInt(String(req.params.pageIndex), 10)
  const { text } = req.body

  if (isNaN(pageIndex) || pageIndex < 0) {
    res.status(400).json({ error: 'Invalid pageIndex' })
    return
  }

  if (typeof text !== 'string') {
    res.status(400).json({ error: 'text must be a string' })
    return
  }

  try {
    const page = await prisma.page.upsert({
      where: {
        roomId_pageIndex: {
          roomId:    req.user!.roomId,
          pageIndex,
        }
      },
      update:  { text },
      create:  { roomId: req.user!.roomId, pageIndex, text },
    })

    res.json(page)
  } catch (err) {
    console.error('[pages/patch]', err)
    res.status(500).json({ error: 'Failed to save page' })
  }
})

export default router