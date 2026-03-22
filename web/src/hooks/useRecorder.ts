'use client'

import { useState, useRef } from 'react'

export const useRecorder = (onDone: (url: string) => void) => {
  const [recording, setRecording] = useState(false)
  const [seconds,   setSeconds]   = useState(0)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks:  BlobPart[] = []

      recorder.ondataavailable = e => chunks.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        onDone(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      alert('Microphone access denied.')
    }
  }

  const stop = () => {
    mediaRef.current?.stop()
    mediaRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
    setSeconds(0)
  }

  return { recording, seconds, start, stop }
}