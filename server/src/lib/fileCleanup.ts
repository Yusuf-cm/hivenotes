import fs from 'fs'
import path from 'path'
import { config } from '../config'

const MAX_FILE_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // Run daily

export const startFileCleanup = (): void => {
  // Run cleanup immediately on startup
  cleanupOldFiles()

  // Then run it daily
  setInterval(() => {
    cleanupOldFiles()
  }, CLEANUP_INTERVAL_MS)
}

export const cleanupOldFiles = (): void => {
  try {
    if (!fs.existsSync(config.uploadsDir)) {
      return
    }

    const files = fs.readdirSync(config.uploadsDir)
    const now = Date.now()
    let deletedCount = 0

    for (const file of files) {
      const filepath = path.join(config.uploadsDir, file)
      const stats = fs.statSync(filepath)
      const age = now - stats.mtimeMs

      if (age > MAX_FILE_AGE_MS) {
        try {
          fs.unlinkSync(filepath)
          deletedCount++
        } catch (err) {
          console.error(`[cleanup] Failed to delete ${file}:`, err)
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`[cleanup] Deleted ${deletedCount} old files`)
    }
  } catch (err) {
    console.error('[cleanup] Error during file cleanup:', err)
  }
}
