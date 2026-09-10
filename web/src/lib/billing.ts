import { apiBase } from './backend'
import { AuthUser } from '@/types'

export const HIVE_ENTITLEMENT = 'hive_pro'
export const HIVE_PRICE = '$4.99 / class / month'

export type HiveStatus = {
  isTeacher: boolean
  plan: 'free' | 'pro'
  compileCount: number
  canCompile: boolean
  needsPro: boolean
  billingConfigured?: boolean
  publicApiKey?: string
}

const hiveFields = (data: Partial<HiveStatus>): HiveStatus => ({
  isTeacher: Boolean(data.isTeacher),
  plan: data.plan === 'pro' ? 'pro' : 'free',
  compileCount: data.compileCount || 0,
  canCompile: Boolean(data.canCompile),
  needsPro: Boolean(data.needsPro),
  billingConfigured: data.billingConfigured,
  publicApiKey: data.publicApiKey,
})

export const mergeHiveUser = (user: AuthUser, data: Partial<HiveStatus>): AuthUser => {
  const hive = hiveFields(data)
  const next: AuthUser = {
    ...user,
    isTeacher: hive.isTeacher,
    plan: hive.plan,
    compileCount: hive.compileCount,
    canCompile: hive.canCompile,
    needsPro: hive.needsPro,
  }
  try {
    localStorage.setItem('hn_user', JSON.stringify(next))
  } catch {}
  return next
}

export const fetchHiveStatus = async (token: string): Promise<HiveStatus> => {
  const res = await fetch(`${apiBase()}/billing/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not load Hive Pro status')
  return hiveFields(data)
}

export const syncHivePro = async (token: string): Promise<HiveStatus> => {
  const res = await fetch(`${apiBase()}/billing/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not sync Hive Pro')
  return hiveFields(data)
}

const rcWebKey = (fromServer?: string) =>
  process.env.NEXT_PUBLIC_RC_API_KEY || fromServer || ''

export const purchaseHivePro = async (appUserId: string, publicApiKey?: string) => {
  const apiKey = rcWebKey(publicApiKey)
  if (!apiKey) {
    throw new Error('RevenueCat Web Billing is not configured. Add NEXT_PUBLIC_RC_API_KEY.')
  }

  const { Purchases } = await import('@revenuecat/purchases-js')
  let purchases
  try {
    purchases = Purchases.getSharedInstance()
  } catch {
    purchases = Purchases.configure({ apiKey, appUserId })
  }

  const offerings = await purchases.getOfferings()
  const pkg = offerings.current?.availablePackages?.[0]
    || Object.values(offerings.all || {}).flatMap(o => o.availablePackages)[0]

  if (!pkg) {
    throw new Error('No Hive Pro offering in RevenueCat. Create entitlement hive_pro and a $4.99 monthly product.')
  }

  const result = await purchases.purchase({ rcPackage: pkg })
  const entitled = Boolean(result.customerInfo?.entitlements?.active?.[HIVE_ENTITLEMENT])
  return { entitled, customerInfo: result.customerInfo }
}
