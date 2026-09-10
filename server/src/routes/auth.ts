import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { signToken } from '../middleware/auth'
import { ensureOwnedPage } from '../lib/ownedPage'
import { broadcast } from '../ws/server'

const router = Router()

const generateRoomCode = (): string => {
  return randomBytes(3).toString('hex').toUpperCase()
}

const issueSession = (
  userId: string,
  nickname: string,
  roomId: string,
  roomCode: string,
  pageIndex: number
) => {
  const token = signToken({
    userId,
    nickname,
    roomId,
    roomCode,
  })

  return { token, roomCode, nickname, userId, pageIndex }
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
    const name = nickname.trim()

    let code: string
    let exists = true
    do {
      code = generateRoomCode()
      exists = !!(await prisma.room.findUnique({ where: { code } }))
    } while (exists)

    const passwordHash = await bcrypt.hash(password, 10)

    const room = await prisma.room.create({
      data: { code, passwordHash },
    })

    const userId = uuid()
    await prisma.activeUser.create({
      data: { id: userId, nickname: name, roomId: room.id },
    })

    const { page } = await ensureOwnedPage(room.id, userId, name)

    res.status(201).json(issueSession(userId, name, room.id, room.code, page.pageIndex))
  } catch (err) {
    console.error('[auth/create]', err)
    res.status(500).json({ error: 'Failed to create room' })
  }
})

// ── POST /auth/join ───────────────────────────────────────────
// Reuses the member row for this nickname so page ownership survives rejoin
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
    const name = nickname.trim()
    const room = await prisma.room.findUnique({
      where: { code: roomCode.trim().toUpperCase() },
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

    let user = await prisma.activeUser.findUnique({
      where: { roomId_nickname: { roomId: room.id, nickname: name } },
    })

    if (!user) {
      user = await prisma.activeUser.create({
        data: { id: uuid(), nickname: name, roomId: room.id },
      })
    }

    const { page, created } = await ensureOwnedPage(room.id, user.id, name)

    if (created) {
      broadcast(room.code, 'page:created', page)
    }

    res.status(200).json(issueSession(user.id, name, room.id, room.code, page.pageIndex))
  } catch (err) {
    console.error('[auth/join]', err)
    res.status(500).json({ error: 'Failed to join room' })
  }
})

export default router
