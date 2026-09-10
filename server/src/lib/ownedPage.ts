import { Page } from '@prisma/client'
import { prisma } from './prisma'

export const MAX_PAGES_PER_BOOK = 40

export const isPageOwner = (
  page: { ownerUserId: string | null },
  userId: string
): boolean => page.ownerUserId === userId

export const canWriteNote = (
  note: { authorId: string },
  page: { ownerUserId: string | null } | null,
  userId: string
): boolean => {
  if (note.authorId === userId) return true
  return !!page && isPageOwner(page, userId)
}

export const getRoomPage = async (
  roomId: string,
  ownerUserId: string,
  pageIndex: number
): Promise<Page | null> => {
  return prisma.page.findFirst({
    where: { roomId, ownerUserId, pageIndex },
  })
}

export const ensureOwnedPage = async (
  roomId: string,
  userId: string,
  nickname: string
): Promise<{ page: Page; created: boolean }> => {
  const owned = await prisma.page.findFirst({
    where: { roomId, ownerUserId: userId },
    orderBy: { pageIndex: 'asc' },
  })

  if (owned) {
    if (owned.ownerName !== nickname) {
      const page = await prisma.page.update({
        where: { id: owned.id },
        data: { ownerName: nickname },
      })
      return { page, created: false }
    }
    return { page: owned, created: false }
  }

  const page = await prisma.page.create({
    data: {
      roomId,
      pageIndex: 0,
      text: '',
      ownerUserId: userId,
      ownerName: nickname,
    },
  })

  return { page, created: true }
}

export const getOrCreateOwnedPage = async (
  roomId: string,
  userId: string,
  nickname: string,
  pageIndex: number
): Promise<Page | null> => {
  if (!Number.isFinite(pageIndex) || pageIndex < 0 || pageIndex >= MAX_PAGES_PER_BOOK) {
    return null
  }

  const existing = await getRoomPage(roomId, userId, pageIndex)
  if (existing) return existing

  const last = await prisma.page.findFirst({
    where: { roomId, ownerUserId: userId },
    orderBy: { pageIndex: 'desc' },
    select: { pageIndex: true },
  })

  const nextIndex = last ? last.pageIndex + 1 : 0
  if (pageIndex !== nextIndex) return null

  return prisma.page.create({
    data: {
      roomId,
      pageIndex,
      text: '',
      ownerUserId: userId,
      ownerName: nickname,
    },
  })
}
