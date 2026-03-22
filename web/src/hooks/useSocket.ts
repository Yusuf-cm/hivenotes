'use client'

import { useEffect, useRef } from 'react'
import { socket } from '@/lib/socket'
import { AuthUser } from '@/types'

export const useSocket = (user: AuthUser | null) => {
  const connected = useRef(false)

  useEffect(() => {
    if (!user?.token) return
    if (connected.current) return

    socket.connect(user.token)
    connected.current = true

    return () => {
      socket.disconnect()
      connected.current = false
    }
  }, [user?.token])

  return socket
}