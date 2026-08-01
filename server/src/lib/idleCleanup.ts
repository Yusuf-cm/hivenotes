import { prisma } from './prisma'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // Run every 5 minutes

export const startIdleCleanup = (): void => {
  setInterval(() => {
    cleanupIdleUsers()
  }, CLEANUP_INTERVAL_MS)
}

export const cleanupIdleUsers = async (): Promise<void> => {
  try {
    const cutoffTime = new Date(Date.now() - IDLE_TIMEOUT_MS)

    const deleted = await prisma.activeUser.deleteMany({
      where: {
        createdAt: { lt: cutoffTime },
      }
    })

    if (deleted.count > 0) {
      console.log(`[cleanup] Removed ${deleted.count} idle users`)
    }
  } catch (err) {
    console.error('[cleanup] Error during idle user cleanup:', err)
  }
}
