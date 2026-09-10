'use client'

import { useState, useRef } from 'react'

const pickMime = () => {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return options.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || ''
}

const SEGMENT_MS = 10 * 60 * 1000

export const useRecorder = (onDone: (file: File) => void) => {
  const [recording, setRecording] = useState(false)
  const [seconds,   setSeconds]   = useState(0)
  const mediaRef   = useRef<MediaRecorder | null>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const rotateRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keepRef    = useRef(false)

  const fileFrom = (recorder: MediaRecorder, chunks: BlobPart[]) => {
    const rawType = (recorder.mimeType || 'audio/webm').split(';')[0]
    const ext = rawType.includes('mp4') ? '.m4a' : rawType.includes('ogg') ? '.ogg' : '.webm'
    const blob = new Blob(chunks, { type: rawType })
    return new File([blob], `voice-${Date.now()}${ext}`, { type: rawType })
  }

  const armRecorder = (stream: MediaStream, mimeType: string) => {
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
    const chunks: BlobPart[] = []

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      if (chunks.length > 0) onDone(fileFrom(recorder, chunks))
      if (keepRef.current && streamRef.current) {
        armRecorder(streamRef.current, mimeType)
      } else {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }

    recorder.start()
    mediaRef.current = recorder

    if (rotateRef.current) clearTimeout(rotateRef.current)
    rotateRef.current = setTimeout(() => {
      if (keepRef.current && mediaRef.current?.state === 'recording') {
        mediaRef.current.stop()
      }
    }, SEGMENT_MS)
  }

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      keepRef.current = true
      armRecorder(stream, pickMime())
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      alert('Microphone access denied.')
    }
  }

  const stop = () => {
    keepRef.current = false
    if (rotateRef.current) clearTimeout(rotateRef.current)
    mediaRef.current?.stop()
    mediaRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
    setSeconds(0)
  }

  return { recording, seconds, start, stop }
}
