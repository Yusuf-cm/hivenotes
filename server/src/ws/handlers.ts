import { prisma } from '../lib/prisma'
import { Client, broadcast } from './server'

// ── Event handler registry ────────────────────────────────────
// Each event from the client is handled here,
// persisted to DB, then broadcast to the rest of the room

export const handleMessage = async (
  client: Client,
  event:  string,
  data:   any
): Promise<void> => {

  switch (event) {

    // ── NOTE EVENTS ──────────────────────────────────────────

    case 'note:create': {
      try {
        const note = await prisma.note.create({
          data: {
            roomId:     client.roomId,
            authorId:   client.userId,
            authorName: client.nickname,
            pageIndex:  data.pageIndex  ?? 0,
            content:    data.content    ?? '',
            color:      data.color      ?? 'amber',
            x:          data.x          ?? 80,
            y:          data.y          ?? 80,
            zIndex:     data.zIndex     ?? 1,
            mediaType:  data.mediaType  ?? 'none',
            mediaUrl:   data.mediaUrl   ?? null,
            checkboxes: data.checkboxes ?? [],
          }
        })
        // Broadcast to everyone including sender (so sender gets DB id)
        broadcast(client.roomCode, 'note:created', note)
      } catch (err) {
        console.error('[ws] note:create', err)
      }
      break
    }

    case 'note:update': {
      try {
        const { id, ...delta } = data
        if (!id) break

        const allowed = ['content','color','x','y','zIndex','mediaType','mediaUrl','checkboxes','pageIndex']
        const updateData: Record<string, any> = {}
        for (const key of allowed) {
          if (delta[key] !== undefined) updateData[key] = delta[key]
        }

        const note = await prisma.note.update({
          where: { id: String(id) },
          data:  updateData,
        })

        // Broadcast to others only — sender already updated optimistically
        broadcast(client.roomCode, 'note:updated', note, client.userId)
      } catch (err) {
        console.error('[ws] note:update', err)
      }
      break
    }

    case 'note:delete': {
      try {
        const { id } = data
        if (!id) break

        await prisma.note.delete({ where: { id: String(id) } })
        broadcast(client.roomCode, 'note:deleted', { id }, client.userId)
      } catch (err) {
        console.error('[ws] note:delete', err)
      }
      break
    }

    // ── PAGE EVENTS ──────────────────────────────────────────

    case 'page:update': {
      try {
        const { pageIndex, text } = data
        if (pageIndex === undefined || text === undefined) break

        await prisma.page.upsert({
          where: {
            roomId_pageIndex: {
              roomId: client.roomId,
              pageIndex: Number(pageIndex),
            }
          },
          update: { text },
          create: { roomId: client.roomId, pageIndex: Number(pageIndex), text },
        })

        // Broadcast to others — sender is already typing it
        broadcast(client.roomCode, 'page:updated', { pageIndex, text }, client.userId)
      } catch (err) {
        console.error('[ws] page:update', err)
      }
      break
    }

    default:
      console.warn(`[ws] Unknown event: ${event}`)
  }
}