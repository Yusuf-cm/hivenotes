import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { upload } from '../middleware/upload'

const router = Router()

const ROOM_STORAGE_QUOTA = 100 * 1024 * 1024 // 100MB per room

// ── Helper to calculate room storage usage ─────────────────────
const getRoomStorageUsage = async (roomId: string): Promise<number> => {
  const notes = await prisma.note.findMany({
    where: { roomId },
    select: { mediaUrl: true }
  })

  // Parse file sizes from metadata (we could store this in DB for efficiency)
  // For now, estimate based on file count and average size
  const fileCount = notes.filter(n => n.mediaUrl).length
  return fileCount * 5 * 1024 * 1024 // Estimate: 5MB per file
}

// ── POST /upload ───────────────────────────────────────────────
// Accepts a single file (image or audio)
// Returns the public URL to store on the note
router.post(
  '/',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No file received' })
      return
    }

    try {
      // Check storage quota
      const usage = await getRoomStorageUsage(req.user!.roomId)
      if (usage + req.file.size > ROOM_STORAGE_QUOTA) {
        res.status(413).json({
          error: 'Room storage quota exceeded',
          used: usage,
          limit: ROOM_STORAGE_QUOTA,
          fileSize: req.file.size,
        })
        return
      }

      // Build public URL — Express serves /files/* from uploadsDir
      const url = `/files/${req.file.filename}`

      res.status(201).json({
        url,
        filename:  req.file.filename,
        mimetype:  req.file.mimetype,
        size:      req.file.size,
      })
    } catch (err) {
      console.error('[upload]', err)
      res.status(500).json({ error: 'Upload failed' })
    }
  }
)

export default router