import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { signToken } from '../middleware/auth'
import { ensureOwnedPage } from '../lib/ownedPage'
import { broadcast } from '../ws/server'
import { hiveStatus } from '../lib/hive'

const router = Router()

const generateRoomCode = (): string => {
  return randomBytes(3).toString('hex').toUpperCase()
}

const issueSession = (
  userId: string,
  nickname: string,
  roomId: string,
  roomCode: string,
  pageIndex: number,
  room: { teacherUserId: string | null; plan: string; compileCount: number }
) => {
  const token = signToken({
    userId,
    nickname,
    roomId,
    roomCode,
  })

  return {
    token,
    roomCode,
    nickname,
    userId,
    pageIndex,
    ...hiveStatus(room, userId),
  }
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

    const userId = uuid()
    const passwordHash = await bcrypt.hash(password, 10)

    const room = await prisma.room.create({
      data: { code, passwordHash, teacherUserId: userId },
    })
    await prisma.activeUser.create({
      data: { id: userId, nickname: name, roomId: room.id, passwordHash },
    })

    const { page } = await ensureOwnedPage(room.id, userId, name)

    res.status(201).json(issueSession(userId, name, room.id, room.code, page.pageIndex, room))
  } catch (err) {
    console.error('[auth/create]', err)
    res.status(500).json({ error: 'Failed to create room' })
  }
})

// ── POST /auth/join ───────────────────────────────────────────
// Reuses the member row for this nickname so page ownership survives rejoin
router.post('/join', async (req: Request, res: Response): Promise<void> => {
  const { nickname, roomCode, password, classPassword } = req.body

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

    let user = await prisma.activeUser.findUnique({
      where: { roomId_nickname: { roomId: room.id, nickname: name } },
    })

    if (user) {
      if (user.passwordHash) {
        const bookMatch = await bcrypt.compare(password, user.passwordHash)
        if (!bookMatch) {
          res.status(401).json({ error: 'This name already has a book. Use that password, or pick a different name.' })
          return
        }
      } else {
        const roomMatch = await bcrypt.compare(classPassword || password, room.passwordHash)
        if (!roomMatch) {
          res.status(401).json({ error: 'Wrong class password' })
          return
        }
        await prisma.activeUser.update({
          where: { id: user.id },
          data: { passwordHash: await bcrypt.hash(password, 10) },
        })
      }
    } else {
      if (typeof classPassword !== 'string' || !classPassword.trim()) {
        res.status(400).json({ error: 'Class password is required the first time you use a name' })
        return
      }
      const passwordMatch = await bcrypt.compare(classPassword, room.passwordHash)
      if (!passwordMatch) {
        res.status(401).json({ error: 'Wrong class password' })
        return
      }
      if (classPassword === password) {
        res.status(400).json({ error: 'Pick a different password from the class password so nobody else can open your book' })
        return
      }
      user = await prisma.activeUser.create({
        data: {
          id: uuid(),
          nickname: name,
          roomId: room.id,
          passwordHash: await bcrypt.hash(password, 10),
        },
      })
    }

    const { page, created } = await ensureOwnedPage(room.id, user.id, name)

    if (created) {
      broadcast(room.code, 'page:created', page)
    }

    res.status(200).json(issueSession(user.id, name, room.id, room.code, page.pageIndex, room))
  } catch (err) {
    console.error('[auth/join]', err)
    res.status(500).json({ error: 'Failed to join room' })
  }
})

export default router
