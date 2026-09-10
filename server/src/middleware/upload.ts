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
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/x-m4a',
  'audio/aac',
  'video/webm',
])

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.mp4', '.mp3', '.ogg', '.wav', '.m4a', '.aac'])

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const mime = (file.mimetype || '').split(';')[0].trim()
  const ext = path.extname(file.originalname).toLowerCase()
  const mimeOk = !mime || allowedMimeTypes.has(mime)
  const extOk = allowedExtensions.has(ext)

  if (!mimeOk && !extOk) {
    cb(new Error(`File type not allowed: ${file.mimetype || ext || 'unknown'}`))
    return
  }

  if (!extOk) {
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