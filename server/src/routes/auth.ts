import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { signToken } from '../middleware/auth'

const router = Router()

const generateRoomCode = (): string => {
  return randomBytes(3).toString('hex').toUpperCase()
}

// ── POST /auth/create ─────────────────────────────────────────
// Creates a new room + issues JWT for the creator
router.post('/create', async (req: Request, res: Response): Promise<void> => {
  const { nickname, password } = req.body

  if (!nickname?.trim() || !password?.trim()) {
    res.status(400).json({ error: 'nickname and password are required' })
    return
  }

  if (nickname.trim().length > 50) {
    res.status(400).json({ error: 'nickname must be 50 characters or less' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'password must be at least 6 characters' })
    return
  }

  try {
    // Generate unique 6-char room code
    let code: string
    let exists = true
    do {
      code = generateRoomCode()
      exists = !!(await prisma.room.findUnique({ where: { code } }))
    } while (exists)

    const passwordHash = await bcrypt.hash(password, 10)

    // Create room + first page + active user in one transaction
    const room = await prisma.room.create({
      data: {
        code,
        passwordHash,
        pages: {
          create: { pageIndex: 0, text: '' }
        }
      }
    })

    const userId = uuid()
    await prisma.activeUser.create({
      data: { id: userId, nickname: nickname.trim(), roomId: room.id }
    })

    const token = signToken({
      userId,
      nickname: nickname.trim(),
      roomId:   room.id,
      roomCode: room.code,
    })

    res.status(201).json({ token, roomCode: room.code, nickname: nickname.trim(), userId })
  } catch (err) {
    console.error('[auth/create]', err)
    res.status(500).json({ error: 'Failed to create room' })
  }
})

// ── POST /auth/join ───────────────────────────────────────────
// Joins existing room with code + password, issues JWT
router.post('/join', async (req: Request, res: Response): Promise<void> => {
  const { nickname, roomCode, password } = req.body

  if (!nickname?.trim() || !roomCode?.trim() || !password?.trim()) {
    res.status(400).json({ error: 'nickname, roomCode and password are required' })
    return
  }

  if (nickname.trim().length > 50) {
    res.status(400).json({ error: 'nickname must be 50 characters or less' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'password must be at least 6 characters' })
    return
  }

  try {
    const room = await prisma.room.findUnique({
      where: { code: roomCode.trim().toUpperCase() }
    })

    if (!room) {
      res.status(404).json({ error: 'Room not found' })
      return
    }

    const passwordMatch = await bcrypt.compare(password, room.passwordHash)
    if (!passwordMatch) {
      res.status(401).json({ error: 'Wrong password' })
      return
    }

    const userId = uuid()
    await prisma.activeUser.create({
      data: { id: userId, nickname: nickname.trim(), roomId: room.id }
    })

    const token = signToken({
      userId,
      nickname: nickname.trim(),
      roomId:   room.id,
      roomCode: room.code,
    })

    res.status(200).json({ token, roomCode: room.code, nickname: nickname.trim(), userId })
  } catch (err) {
    console.error('[auth/join]', err)
    res.status(500).json({ error: 'Failed to join room' })
  }
})

export default router