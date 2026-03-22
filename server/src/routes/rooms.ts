import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

// ── GET /rooms/:code ──────────────────────────────────────────
// Returns room metadata + all its pages + all its notes
// Used by the frontend on initial load after login
router.get('/:code', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = String(req.params.code).toUpperCase()

  if (req.user!.roomCode !== code) {
    res.status(403).json({ error: 'Access denied' })
    return
  }

  try {
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        pages: { orderBy: { pageIndex: 'asc' } },
        notes: { orderBy: { createdAt: 'asc' } },
      }
    })

    if (!room) {
      res.status(404).json({ error: 'Room not found' })
      return
    }

    res.json({
      id:        room.id,
      code:      room.code,
      pages:     room.pages,
      notes:     room.notes,
      createdAt: room.createdAt,
    })
  } catch (err) {
    console.error('[rooms/get]', err)
    res.status(500).json({ error: 'Failed to fetch room' })
  }
})

export default router