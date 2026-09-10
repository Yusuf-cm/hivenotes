import { apiBase } from './backend'

const extFor = (file: File) => {
  const fromName = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  if (fromName) return fromName
  if (file.type.includes('png')) return '.png'
  if (file.type.includes('jpeg') || file.type.includes('jpg')) return '.jpg'
  if (file.type.includes('webp')) return '.webp'
  if (file.type.includes('gif')) return '.gif'
  if (file.type.includes('mpeg') || file.type.includes('mp3')) return '.mp3'
  if (file.type.includes('mp4') || file.type.includes('m4a')) return '.m4a'
  if (file.type.includes('ogg')) return '.ogg'
  if (file.type.includes('wav')) return '.wav'
  return '.webm'
}

export const uploadMedia = async (file: File, token: string): Promise<string> => {
  const named = new File([file], `upload-${Date.now()}${extFor(file)}`, {
    type: file.type || (file.type.startsWith('audio') ? 'audio/webm' : 'image/png'),
  })
  const form = new FormData()
  form.append('file', named)

  const res = await fetch(`${apiBase()}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Upload failed')
  }
  return `${apiBase()}${data.url}`
}

const processOnce = async (token: string, body: { noteId?: string; mediaUrl?: string }) => {
  const res = await fetch(`${apiBase()}/ai/process`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Processing failed')
  return data
}

export const processMedia = async (
  token: string,
  body: { noteId?: string; mediaUrl?: string }
) => {
  let lastErr: Error | null = null
  for (let i = 0; i < 4; i++) {
    try {
      return await processOnce(token, body)
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error('Processing failed')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  throw lastErr || new Error('Processing failed')
}

export const aiChat = async (
  token: string,
  content: string,
  history: { role: string; content: string }[]
): Promise<{ result: string; citations: { id: string; label: string }[] }> => {
  const res = await fetch(`${apiBase()}/ai/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, history }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Chat failed')
  return {
    result: typeof data.result === 'string' ? data.result : '',
    citations: Array.isArray(data.citations) ? data.citations : [],
  }
}

export const aiHandwriting = async (
  token: string,
  image: string,
  pageIndex: number
): Promise<{ text: string; error?: string }> => {
  try {
    const res = await fetch(`${apiBase()}/ai/handwriting`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image, pageIndex }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { text: '', error: data.error || 'Could not read handwriting' }
    return { text: typeof data.text === 'string' ? data.text : '' }
  } catch {
    return { text: '', error: 'Could not reach the API' }
  }
}

export const aiCompile = async (token: string) => {
  const res = await fetch(`${apiBase()}/ai/compile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Compile failed')
  return data.revision
}

export const aiNote = async (token: string, type: string, content: string) => {
  const res = await fetch(`${apiBase()}/ai/note`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, content }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Note AI failed')
  return data.result
}
