import fs from 'fs'
import path from 'path'
import { config } from '../config'
import { groqReadImage, groqTranscribe } from './groq'

const filenameFromUrl = (url: string | null) => {
  if (!url) return null
  const clean = url.split('?')[0]
  const name = clean.split('/').pop()
  return name && !name.includes('..') ? name : null
}

const mimeFromName = (name: string) => {
  const ext = path.extname(name).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.m4a' || ext === '.mp4') return 'audio/mp4'
  if (ext === '.ogg') return 'audio/ogg'
  if (ext === '.wav') return 'audio/wav'
  return 'audio/webm'
}

export const readUpload = (mediaUrl: string | null) => {
  const name = filenameFromUrl(mediaUrl)
  if (!name) return null
  const filepath = path.join(config.uploadsDir, name)
  if (!fs.existsSync(filepath)) return null
  return {
    name,
    filepath,
    buf: fs.readFileSync(filepath),
    mime: mimeFromName(name),
  }
}

const PLACEHOLDERS = new Set([
  '',
  'listening…',
  'listening...',
  'voice note',
  'transcribing…',
  'transcribing...',
])

export const isPlaceholderContent = (text: string | null | undefined) =>
  PLACEHOLDERS.has((text || '').trim().toLowerCase())

export const extractFromNote = async (
  mediaType: string,
  mediaUrl: string | null
): Promise<string> => {
  const file = readUpload(mediaUrl)
  if (!file) throw new Error('Media file not found on server')

  if (mediaType === 'audio') {
    const text = await groqTranscribe(file.buf, file.name, file.mime)
    return text.trim() || 'Voice note'
  }

  if (mediaType === 'image') {
    const text = await groqReadImage(file.buf, file.mime)
    return text.trim()
  }

  return ''
}
