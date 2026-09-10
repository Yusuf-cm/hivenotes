'use client'

import dynamic from 'next/dynamic'
import { useCallback, useRef } from 'react'
import type { DiagramScene } from '@/lib/diagramScene'
import '@excalidraw/excalidraw/index.css'

export type { DiagramScene }

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false, loading: () => (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-cormorant)',
      color: 'rgba(90,60,40,0.45)',
    }}>
      Opening diagram tools…
    </div>
  ) }
)

interface Props {
  scene: DiagramScene
  editing: boolean
  onScene: (scene: DiagramScene) => void
  onPng?: (blob: Blob) => void
}

export default function DiagramPad({ scene, editing, onScene, onPng }: Props) {
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pngTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onChange = useCallback((elements: readonly unknown[], _appState: unknown, files: Record<string, unknown> | null) => {
    if (!editing) return
    if (sceneTimer.current) clearTimeout(sceneTimer.current)
    sceneTimer.current = setTimeout(() => {
      onScene({ elements: [...elements], files: files || {} })
    }, 500)

    if (!onPng) return
    if (pngTimer.current) clearTimeout(pngTimer.current)
    pngTimer.current = setTimeout(async () => {
      if (elements.length === 0) return
      const { exportToBlob } = await import('@excalidraw/excalidraw')
      const blob = await exportToBlob({
        elements: elements as any,
        files: (files || {}) as any,
        mimeType: 'image/png',
        quality: 0.72,
        maxWidthOrHeight: 720,
        exportPadding: 12,
      })
      onPng(blob)
    }, 2200)
  }, [editing, onPng, onScene])

  return (
    <div
      className="diagram-pad"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: editing ? 18 : 14,
        pointerEvents: editing ? 'auto' : 'none',
        background: editing ? 'rgba(245,237,216,0.92)' : 'transparent',
      }}
    >
      <Excalidraw
        initialData={{
          elements: (scene.elements || []) as any,
          files: (scene.files || {}) as any,
          appState: {
            viewBackgroundColor: editing ? '#f5edd8' : 'transparent',
          },
        }}
        viewModeEnabled={!editing}
        zenModeEnabled={!editing}
        gridModeEnabled={false}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
        onChange={onChange as any}
      />
    </div>
  )
}
