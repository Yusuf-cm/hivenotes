import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface JwtPayload {
  userId:    string
  nickname:  string
  roomId:    string
  roomCode:  string
}

// Extend Express Request so downstream routes get req.user typed
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}