import { HIVE_ENTITLEMENT } from './hive'

const RC_API = 'https://api.revenuecat.com/v1'

export const rcSecret = () => process.env.REVENUECAT_SECRET_API_KEY || ''

export const hasRevenueCat = () => Boolean(rcSecret())

export const subscriberHasPro = async (appUserId: string): Promise<boolean> => {
  const key = rcSecret()
  if (!key) return false
  const res = await fetch(`${RC_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) return false
  const data = await res.json()
  const ent = data?.subscriber?.entitlements?.[HIVE_ENTITLEMENT]
  if (!ent) return false
  const exp = ent.expires_date
  if (!exp) return true
  return new Date(exp).getTime() > Date.now()
}
