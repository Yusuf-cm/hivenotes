import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { randomBytes } from 'crypto'
import { config } from '../config'

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadsDir)
  },
  filename: (_req, file, cb) => {
    // Use crypto random for secure filename
    const ext = path.extname(file.originalname).toLowerCase()
    const random = randomBytes(8).toString('hex')
    const name = `${random}${ext}`
    cb(null, name)
  },
})

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
])

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.mp4', '.mp3', '.ogg', '.wav'])

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check MIME type
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new Error(`File type not allowed: ${file.mimetype}`))
    return
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase()
  if (!allowedExtensions.has(ext)) {
    cb(new Error(`File extension not allowed: ${ext}`))
    return
  }

  // Prevent path traversal
  const basename = path.basename(file.originalname)
  if (basename !== file.originalname) {
    cb(new Error('Invalid filename'))
    return
  }

  cb(null, true)
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
    files: 1, // One file per request
  },
})