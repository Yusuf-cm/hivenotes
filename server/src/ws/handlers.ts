import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { Client, broadcast } from './server'
import { cache } from '../lib/cache'
import { transform, apply, Operation } from '../lib/ot'
import { canWriteNote, getOrCreateOwnedPage, getRoomPage, isPageOwner } from '../lib/ownedPage'
import { sanitizeInk } from '../lib/ink'
import { sanitizeDiagram } from '../lib/diagram'

const validColors = ['amber', 'sage', 'sky', 'blush', 'violet', 'peach']
const validMediaTypes = ['none', 'image', 'audio']

const isValidColor = (color: any): boolean => typeof color === 'string' && validColors.includes(color)
const isValidMediaType = (type: any): boolean => typeof type === 'string' && validMediaTypes.includes(type)
const isValidNumber = (val: any): boolean => typeof val === 'number' && isFinite(val)

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
        // Validate inputs
        if (data.content !== undefined && (typeof data.content !== 'string' || data.content.length > 5000)) {
          console.warn('[ws] Invalid content length')
          break
        }
        if (data.color && !isValidColor(data.color)) {
          console.warn('[ws] Invalid color')
          break
        }
        if (data.x !== undefined && !isValidNumber(data.x)) {
          console.warn('[ws] Invalid x coordinate')
          break
        }
        if (data.y !== undefined && !isValidNumber(data.y)) {
          console.warn('[ws] Invalid y coordinate')
          break
        }
        if (data.mediaType && !isValidMediaType(data.mediaType)) {
          console.warn('[ws] Invalid mediaType')
          break
        }

        const pageIndex = typeof data.pageIndex === 'number' && isFinite(data.pageIndex) ? data.pageIndex : 0
        const page = await getRoomPage(client.roomId, client.userId, pageIndex)
        if (!page || !isPageOwner(page, client.userId)) {
          console.warn('[ws] note:create rejected — not page owner')
          break
        }

        const note = await prisma.note.create({
          data: {
            roomId:      client.roomId,
            authorId:    client.userId,
            authorName:  client.nickname,
            pageIndex,
            pageOwnerId: client.userId,
            content:    typeof data.content === 'string' ? data.content.slice(0, 5000) : '',
            color:      isValidColor(data.color) ? data.color : 'amber',
            x:          isValidNumber(data.x) ? data.x : 80,
            y:          isValidNumber(data.y) ? data.y : 80,
            zIndex:     isValidNumber(data.zIndex) ? data.zIndex : 1,
            mediaType:  isValidMediaType(data.mediaType) ? data.mediaType : 'none',
            mediaUrl:   typeof data.mediaUrl === 'string' ? data.mediaUrl : null,
            checkboxes: Array.isArray(data.checkboxes) ? data.checkboxes : [],
          }
        })
        cache.invalidate(client.roomId)
        broadcast(client.roomCode, 'note:created', note)
      } catch (err) {
        console.error('[ws] note:create', err)
      }
      break
    }

    case 'note:update': {
      try {
        const { id, ...delta } = data
        if (!id || typeof id !== 'string') break

        // Validate fields
        if (delta.content !== undefined && (typeof delta.content !== 'string' || delta.content.length > 5000)) {
          console.warn('[ws] Invalid content')
          break
        }
        if (delta.color !== undefined && !isValidColor(delta.color)) {
          console.warn('[ws] Invalid color')
          break
        }
        if (delta.x !== undefined && !isValidNumber(delta.x)) break
        if (delta.y !== undefined && !isValidNumber(delta.y)) break
        if (delta.zIndex !== undefined && !isValidNumber(delta.zIndex)) break
        if (delta.mediaType !== undefined && !isValidMediaType(delta.mediaType)) break
        if (delta.mediaUrl !== undefined && delta.mediaUrl !== null && typeof delta.mediaUrl !== 'string') break
        if (delta.checkboxes !== undefined && !Array.isArray(delta.checkboxes)) break
        if (delta.pageIndex !== undefined && !isValidNumber(delta.pageIndex)) break

        const updateData: Record<string, any> = {}
        const allowed = ['content','color','x','y','zIndex','mediaType','mediaUrl','checkboxes','pageIndex']
        for (const key of allowed) {
          if (delta[key] !== undefined) updateData[key] = delta[key]
        }

        if (Object.keys(updateData).length === 0) break

        const existing = await prisma.note.findUnique({ where: { id: String(id) } })
        if (!existing || existing.roomId !== client.roomId) break

        const existingPage = await getRoomPage(
          client.roomId,
          existing.pageOwnerId || client.userId,
          existing.pageIndex
        )
        if (!canWriteNote(existing, existingPage, client.userId)) {
          console.warn('[ws] note:update rejected — not author or page owner')
          break
        }

        if (updateData.pageIndex !== undefined) {
          const targetPage = await getRoomPage(client.roomId, client.userId, updateData.pageIndex)
          if (!targetPage || !isPageOwner(targetPage, client.userId)) {
            console.warn('[ws] note:update rejected — cannot move to another page')
            break
          }
          updateData.pageOwnerId = client.userId
        }

        const note = await prisma.note.update({
          where: { id: String(id) },
          data:  updateData,
        })

        broadcast(client.roomCode, 'note:updated', note, client.userId)
      } catch (err) {
        console.error('[ws] note:update', err)
      }
      break
    }

    case 'note:delete': {
      try {
        const { id } = data
        if (!id || typeof id !== 'string') break

        const note = await prisma.note.findUnique({ where: { id: String(id) } })
        if (!note || note.roomId !== client.roomId) break

        const page = await getRoomPage(
          client.roomId,
          note.pageOwnerId || client.userId,
          note.pageIndex
        )
        if (!canWriteNote(note, page, client.userId)) {
          console.warn('[ws] note:delete rejected — not author or page owner')
          break
        }

        await prisma.note.delete({ where: { id: String(id) } })
        // Invalidate cache for this room
        cache.invalidate(client.roomId)
        broadcast(client.roomCode, 'note:deleted', { id }, client.userId)
      } catch (err) {
        console.error('[ws] note:delete', err)
      }
      break
    }

    // ── PAGE EVENTS ──────────────────────────────────────────

    case 'page:edit': {
      try {
        const { pageIndex, type, index, content, version } = data

        // Validate inputs
        if (!isValidNumber(pageIndex) || !isValidNumber(version) || !isValidNumber(index)) {
          console.warn('[ws] Invalid page:edit parameters')
          break
        }
        if (type !== 'insert' && type !== 'delete') {
          console.warn('[ws] Invalid operation type')
          break
        }
        if (typeof content !== 'string' || content.length > 5000) {
          console.warn('[ws] Invalid operation content')
          break
        }

        const page = await getRoomPage(client.roomId, client.userId, Number(pageIndex))
        if (!page) {
          console.warn('[ws] page:edit rejected — page not found')
          break
        }

        if (!isPageOwner(page, client.userId)) {
          console.warn('[ws] page:edit rejected — not page owner')
          break
        }

        // Get all operations since the client's version
        const concurrentOps = await prisma.pageOperation.findMany({
          where: {
            pageId: page.id,
            version: { gte: version },
          },
          orderBy: { version: 'asc' },
        })

        // Transform incoming operation against all concurrent operations
        let transformedOp: Operation = {
          type: type as 'insert' | 'delete',
          index,
          content,
          version,
          userId: client.userId,
        }

        for (const concurrentOp of concurrentOps) {
          transformedOp = transform(transformedOp, {
            type: concurrentOp.type as 'insert' | 'delete',
            index: concurrentOp.index,
            content: concurrentOp.content,
            version: concurrentOp.version,
            userId: concurrentOp.userId,
          })
        }

        // Apply transformed operation to text
        const newText = apply(page.text, transformedOp)

        // Store operation and update page
        const [operation, updated] = await Promise.all([
          prisma.pageOperation.create({
            data: {
              pageId: page.id,
              version: page.version + 1,
              type: transformedOp.type,
              index: transformedOp.index,
              content: transformedOp.content,
              userId: client.userId,
            }
          }),
          prisma.page.update({
            where: { id: page.id },
            data: {
              text: newText.slice(0, 10000),
              version: { increment: 1 },
            }
          })
        ])

        // Broadcast operation to all clients on this page
        broadcast(client.roomCode, 'page:edited', {
          pageIndex,
          operation: {
            type: transformedOp.type,
            index: transformedOp.index,
            content: transformedOp.content,
          },
          version: updated.version,
          userId: client.userId,
        })
      } catch (err) {
        console.error('[ws] page:edit', err)
      }
      break
    }

    // Deprecated: use page:edit instead
    case 'page:update': {
      try {
        const { pageIndex, text, ink, handText, diagram, diagramUrl } = data
        if (pageIndex === undefined) break

        if (!isValidNumber(pageIndex)) {
          console.warn('[ws] Invalid pageIndex')
          break
        }
        if (text !== undefined && (typeof text !== 'string' || text.length > 10000)) {
          console.warn('[ws] Invalid page text')
          break
        }
        if (handText !== undefined && (typeof handText !== 'string' || handText.length > 10000)) break
        if (text === undefined && ink === undefined && handText === undefined && diagram === undefined && diagramUrl === undefined) break

        const page = await getOrCreateOwnedPage(
          client.roomId,
          client.userId,
          client.nickname,
          Number(pageIndex)
        )
        if (!page) {
          console.warn('[ws] page:update rejected — page not found')
          break
        }

        if (!isPageOwner(page, client.userId)) {
          console.warn('[ws] page:update rejected — not page owner')
          break
        }

        const patch: {
          text?: string
          ink?: Prisma.InputJsonValue
          handText?: string
          diagram?: Prisma.InputJsonValue
          diagramUrl?: string | null
        } = {}
        if (typeof text === 'string') patch.text = text.slice(0, 10000)
        if (ink !== undefined) patch.ink = sanitizeInk(ink) as unknown as Prisma.InputJsonValue
        if (typeof handText === 'string') patch.handText = handText.slice(0, 10000)
        if (diagram !== undefined) patch.diagram = sanitizeDiagram(diagram) as unknown as Prisma.InputJsonValue
        if (diagramUrl === null) patch.diagramUrl = null
        if (typeof diagramUrl === 'string') patch.diagramUrl = diagramUrl.slice(0, 2000)

        const updated = await prisma.page.update({
          where: { id: page.id },
          data: patch,
        })

        broadcast(client.roomCode, 'page:updated', {
          pageIndex,
          text: updated.text,
          ink: updated.ink,
          handText: updated.handText,
          diagram: updated.diagram,
          diagramUrl: updated.diagramUrl,
          ownerUserId: client.userId,
        }, client.userId)
      } catch (err) {
        console.error('[ws] page:update', err)
      }
      break
    }

    // ── PRESENCE EVENTS ──────────────────────────────────────

    case 'page:view': {
      try {
        const { pageIndex } = data
        if (!isValidNumber(pageIndex)) break
        client.currentPage = pageIndex
      } catch (err) {
        console.error('[ws] page:view', err)
      }
      break
    }

    default:
      console.warn(`[ws] Unknown event: ${event}`)
  }
}