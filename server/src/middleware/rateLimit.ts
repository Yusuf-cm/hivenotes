import { Request, Response, NextFunction } from 'express'

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number }
}

const store: RateLimitStore = {}

const cleanupExpiredEntries = (): void => {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}

export const rateLimit = (
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    cleanupExpiredEntries()

    const key = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()

    if (!store[key]) {
      store[key] = { count: 1, resetTime: now + windowMs }
      next()
      return
    }

    if (now > store[key].resetTime) {
      store[key] = { count: 1, resetTime: now + windowMs }
      next()
      return
    }

    store[key].count++

    if (store[key].count > maxRequests) {
      res.status(429).json({ error: 'Too many requests, please try again later' })
      return
    }

    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count))
    res.setHeader('X-RateLimit-Reset', store[key].resetTime)

    next()
  }
}
