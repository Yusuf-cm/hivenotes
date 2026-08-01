import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { cache } from '../lib/cache'

const router = Router()

const NOTES_PER_PAGE = 100

// ── GET /rooms/:code ──────────────────────────────────────────
// Returns room metadata + all its pages + first page of notes
// Used by the frontend on initial load after login
router.get('/:code', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = String(req.params.code).toUpperCase()
  const page = Math.max(0, parseInt(req.query.page as string) || 0)

  if (req.user!.roomCode !== code) {
    res.status(403).json({ error: 'Access denied' })
    return
  }

  try {
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        pages: { orderBy: { pageIndex: 'asc' } },
      }
    })

    if (!room) {
      res.status(404).json({ error: 'Room not found' })
      return
    }

    // Try to get cached note count
    const cacheKey = `room:${room.id}:noteCount`
    let totalNotes = cache.get<number>(cacheKey)

    // Fetch notes with pagination
    const [notes, count] = await Promise.all([
      prisma.note.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: 'asc' },
        skip: page * NOTES_PER_PAGE,
        take: NOTES_PER_PAGE,
      }),
      totalNotes === null ? prisma.note.count({ where: { roomId: room.id } }) : Promise.resolve(totalNotes),
    ])

    // Cache the count for 2 minutes
    if (totalNotes === null) {
      totalNotes = count
      cache.set(cacheKey, totalNotes, 2 * 60 * 1000)
    }

    res.json({
      id:           room.id,
      code:         room.code,
      pages:        room.pages,
      notes,
      totalNotes,
      notesPage:    page,
      notesPerPage: NOTES_PER_PAGE,
      createdAt:    room.createdAt,
    })
  } catch (err) {
    console.error('[rooms/get]', err)
    res.status(500).json({ error: 'Failed to fetch room' })
  }
})

// ── GET /rooms/:code/notes ────────────────────────────────────
// Fetch notes with pagination
router.get('/:code/notes', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = String(req.params.code).toUpperCase()
  const page = Math.max(0, parseInt(req.query.page as string) || 0)

  if (req.user!.roomCode !== code) {
    res.status(403).json({ error: 'Access denied' })
    return
  }

  try {
    const room = await prisma.room.findUnique({
      where: { code },
      select: { id: true }
    })

    if (!room) {
      res.status(404).json({ error: 'Room not found' })
      return
    }

    const [notes, totalNotes] = await Promise.all([
      prisma.note.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: 'asc' },
        skip: page * NOTES_PER_PAGE,
        take: NOTES_PER_PAGE,
      }),
      prisma.note.count({ where: { roomId: room.id } }),
    ])

    res.json({
      notes,
      totalNotes,
      page,
      pageSize: NOTES_PER_PAGE,
      hasMore: (page + 1) * NOTES_PER_PAGE < totalNotes,
    })
  } catch (err) {
    console.error('[rooms/notes]', err)
    res.status(500).json({ error: 'Failed to fetch notes' })
  }
})

export default router