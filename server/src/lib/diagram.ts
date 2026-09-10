export type ExcalidrawScene = {
  elements: unknown[]
  files?: Record<string, unknown>
}

export const emptyDiagram = (): ExcalidrawScene => ({ elements: [] })

export const sanitizeDiagram = (raw: unknown): ExcalidrawScene => {
  if (!raw || typeof raw !== 'object') return emptyDiagram()
  const scene = raw as Record<string, unknown>
  const elements = Array.isArray(scene.elements) ? scene.elements.slice(0, 500) : []
  const files = scene.files && typeof scene.files === 'object'
    ? scene.files as Record<string, unknown>
    : {}
  return { elements, files }
}

export const diagramHasMarks = (raw: unknown): boolean => {
  const scene = sanitizeDiagram(raw)
  return scene.elements.length > 0
}

export const pageStudyText = (page: { text?: string | null; handText?: string | null }) => {
  const typed = (page.text || '').trim()
  const hand = (page.handText || '').trim()
  if (!hand) return typed
  if (!typed) return hand
  if (typed.includes(hand)) return typed
  return `${typed}\n\n${hand}`
}
