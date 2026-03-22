'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { socket } from '@/lib/socket'
import { AuthUser } from '@/types'

interface PresenceUser {
  userId:   string
  nickname: string
}

interface SocketContextValue {
  connected:  boolean
  presence:   PresenceUser[]
}

const SocketContext = createContext<SocketContextValue>({
  connected: false,
  presence:  [],
})

export const useSocketContext = () => useContext(SocketContext)

interface Props {
  user:     AuthUser
  children: ReactNode
}

export function SocketProvider({ user, children }: Props) {
  const [connected, setConnected]   = useState(false)
  const [presence,  setPresence]    = useState<PresenceUser[]>([])

  useEffect(() => {
  if (!user?.token) return

  // Small delay absorbs StrictMode's double-invoke
  const t = setTimeout(() => {
    socket.connect(user.token)
  }, 50)

  const offPresence = socket.on('room:presence', (data) => {
  setConnected(true)
  // Deduplicate by userId
  const unique = (data.users || []).filter(
    (u: PresenceUser, i: number, arr: PresenceUser[]) =>
      arr.findIndex(x => x.userId === u.userId) === i
  )
  setPresence(unique)
})

  const offJoined = socket.on('user:joined', (data) => {
  setPresence(prev => {
    if (prev.find(u => u.userId === data.userId)) return prev
    return [...prev, { userId: data.userId, nickname: data.nickname }]
  })
})

  const offLeft = socket.on('user:left', (data) => {
    setPresence(prev => prev.filter(u => u.userId !== data.userId))
  })

  return () => {
    clearTimeout(t)
    offPresence()
    offJoined()
    offLeft()
    socket.disconnect()
    setConnected(false)
    setPresence([])
  }
}, [user?.token])

  return (
    <SocketContext.Provider value={{ connected, presence }}>
      {children}
    </SocketContext.Provider>
  )
}