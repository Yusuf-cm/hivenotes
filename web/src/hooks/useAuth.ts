'use client'

import { useState, useEffect } from 'react'
import { AuthUser } from '@/types'
import { authApi, roomApi } from '@/lib/api'

const STORAGE_KEY = 'hn_user'

export const useAuth = () => {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    setLoading(false)
  }, [])

  const finalise = async (userId: string, token: string, roomCode: string, nickname: string): Promise<AuthUser> => {
    // Fetch room to get real roomId
    const room = await roomApi.get(roomCode, token)

    const authUser: AuthUser = {
      userId,
      nickname,
      roomId:   room.id,
      roomCode: room.code,
      token,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
    return authUser
  }

  const create = async (nickname: string, password: string) => {
    setError(null)
    try {
      const res = await authApi.create(nickname, password)
      return await finalise(res.userId, res.token, res.roomCode, res.nickname)
    } catch (e: any) {
      setError(e.message)
      throw e
    }
  }

  const join = async (nickname: string, roomCode: string, password: string) => {
    setError(null)
    try {
      const res = await authApi.join(nickname, roomCode, password)
      return await finalise(res.userId, res.token, res.roomCode, res.nickname)
    } catch (e: any) {
      setError(e.message)
      throw e
    }
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return { user, loading, error, create, join, logout }
}