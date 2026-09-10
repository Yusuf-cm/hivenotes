import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { upload } from '../middleware/upload'
import { config } from '../config'

const router = Router()

const ROOM_STORAGE_QUOTA = 100 * 1024 * 1024 // 100MB per room

const filenameFromUrl = (url: string | null) => {
  if (!url) return null
  const clean = url.split('?')[0]
  const name = clean.split('/').pop()
  return name && !name.includes('..') ? name : null
}

const getRoomStorageUsage = async (roomId: string): Promise<number> => {
  const notes = await prisma.note.findMany({
    where: { roomId, mediaUrl: { not: null } },
    select: { mediaUrl: true },
  })

  let total = 0
  for (const note of notes) {
    const name = filenameFromUrl(note.mediaUrl)
    if (!name) continue
    try {
      total += fs.statSync(path.join(config.uploadsDir, name)).size
    } catch {}
  }
  return total
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