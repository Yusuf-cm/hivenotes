import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { upload } from '../middleware/upload'

const router = Router()

// ── POST /upload ───────────────────────────────────────────────
// Accepts a single file (image or audio)
// Returns the public URL to store on the note
router.post(
  '/',
  requireAuth,
  upload.single('file'),
  (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: 'No file received' })
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
  }
)

export default router