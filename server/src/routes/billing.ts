import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { hiveStatus, isTeacher } from '../lib/hive'
import { hasRevenueCat, subscriberHasPro } from '../lib/billing'

const router = Router()

router.get('/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.user!.roomId } })
    if (!room) {
      res.status(404).json({ error: 'Room not found' })
      return
    }
    res.json({
      ...hiveStatus(room, req.user!.userId),
      billingConfigured: hasRevenueCat(),
      publicApiKey: process.env.REVENUECAT_WEB_API_KEY || '',
    })
  } catch (err) {
    console.error('[billing/status]', err)
    res.status(500).json({ error: 'Failed to load billing' })
  }
})

router.post('/sync', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.user!.roomId } })
    if (!room) {
      res.status(404).json({ error: 'Room not found' })
      return
    }
    if (!isTeacher(room, req.user!.userId)) {
      res.status(403).json({ error: 'Only the teacher can unlock Hive Pro for this class' })
      return
    }

    const customerId = room.rcCustomerId || req.user!.userId
    const pro = await subscriberHasPro(customerId)
    const updated = await prisma.room.update({
      where: { id: room.id },
      data: {
        plan: pro ? 'pro' : 'free',
        rcCustomerId: customerId,
      },
    })
    res.json(hiveStatus(updated, req.user!.userId))
  } catch (err) {
    console.error('[billing/sync]', err)
    res.status(500).json({ error: 'Failed to sync Hive Pro' })
  }
})

router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  const header = String(req.headers.authorization || '')
  if (secret && header !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const appUserId = String(req.body?.event?.app_user_id || req.body?.app_user_id || '')
  const type = String(req.body?.event?.type || '')
  if (!appUserId) {
    res.json({ ok: true })
    return
  }

  try {
    const room = await prisma.room.findFirst({
      where: { OR: [{ rcCustomerId: appUserId }, { teacherUserId: appUserId }] },
    })
    if (!room) {
      res.json({ ok: true })
      return
    }

    const expired = /EXPIRATION|CANCELLATION|BILLING_ISSUE/i.test(type)
    const purchased = /INITIAL_PURCHASE|RENEWAL|UNCANCELLATION|PRODUCT_CHANGE|NON_RENEWING_PURCHASE/i.test(type)
    if (purchased) {
      await prisma.room.update({ where: { id: room.id }, data: { plan: 'pro', rcCustomerId: appUserId } })
    } else if (expired) {
      const still = await subscriberHasPro(appUserId)
      await prisma.room.update({ where: { id: room.id }, data: { plan: still ? 'pro' : 'free' } })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('[billing/webhook]', err)
    res.status(500).json({ error: 'Webhook failed' })
  }
})

export default router
