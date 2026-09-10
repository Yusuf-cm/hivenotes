export const HIVE_ENTITLEMENT = process.env.REVENUECAT_ENTITLEMENT || 'hive_pro'

export const isTeacher = (room: { teacherUserId: string | null }, userId: string) =>
  !!room.teacherUserId && room.teacherUserId === userId

export const canCompileNow = (room: {
  teacherUserId: string | null
  plan: string
  compileCount: number
}, userId: string) => {
  if (!isTeacher(room, userId)) return false
  if (room.plan === 'pro') return true
  return room.compileCount < 1
}

export const hiveStatus = (room: {
  teacherUserId: string | null
  plan: string
  compileCount: number
}, userId: string) => {
  const teacher = isTeacher(room, userId)
  const pro = room.plan === 'pro'
  return {
    isTeacher: teacher,
    plan: pro ? 'pro' as const : 'free' as const,
    compileCount: room.compileCount,
    canCompile: canCompileNow(room, userId),
    needsPro: teacher && !pro && room.compileCount >= 1,
  }
}
