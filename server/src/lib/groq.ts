import '../config'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_TRANSCRIBE = 'https://api.groq.com/openai/v1/audio/transcriptions'

export const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-120b'
export const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b'
export const STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo'

export const groqKey = () => process.env.GROQ_API_KEY || ''

export const requireGroq = () => {
  const key = groqKey()
  if (!key) {
    const err = new Error('GROQ_API_KEY not set on the server')
    ;(err as any).status = 500
    throw err
  }
  return key
}

export const groqChat = async (
  system: string,
  messages: { role: string; content: unknown }[],
  maxTokens = 1400,
  model = CHAT_MODEL,
  extra: Record<string, unknown> = {}
): Promise<string> => {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${requireGroq()}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
      ...extra,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('[groq]', data)
    throw new Error(data.error?.message || `Groq error ${res.status}`)
  }
  return data.choices?.[0]?.message?.content || ''
}

export const groqTranscribe = async (buf: Buffer, filename: string, mime = 'audio/webm'): Promise<string> => {
  const MAX = 24 * 1024 * 1024
  const payload = buf.length > MAX ? buf.subarray(0, MAX) : buf
  return transcribeOnce(payload, filename, mime)
}

const transcribeOnce = async (buf: Buffer, filename: string, mime: string): Promise<string> => {
  const body = new FormData()
  body.append('file', new Blob([new Uint8Array(buf)], { type: mime }), filename)
  body.append('model', STT_MODEL)

  const res = await fetch(GROQ_TRANSCRIBE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireGroq()}` },
    body,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Transcription failed')
  return typeof data.text === 'string' ? data.text : ''
}

export const groqReadImage = async (buf: Buffer, mime = 'image/png'): Promise<string> => {
  const url = `data:${mime};base64,${buf.toString('base64')}`
  return groqChat(
    'Extract all useful classroom content from this image. Read handwriting, slides, board work, lists, formulas, diagrams, arrows, and tables. Reconstruct tables as markdown. Describe figures in words. Use short headings and bullets. No preamble.',
    [{
      role: 'user',
      content: [
        { type: 'text', text: 'Read this note photo for a class revision sheet.' },
        { type: 'image_url', image_url: { url } },
      ],
    }],
    1200,
    VISION_MODEL,
    { temperature: 0.2, reasoning_effort: 'none' }
  )
}

export const groqReadHandwriting = async (buf: Buffer, mime = 'image/png'): Promise<string> => {
  const url = `data:${mime};base64,${buf.toString('base64')}`
  const raw = await groqChat(
    `Transcribe handwriting into plain text, like converting Apple Notes ink to typed text.
Return ONLY the words, numbers, and formulas on the page.
Do not describe drawings, arrows, boxes, or layout.
Do not add headings, bullets, or commentary.
If there is no readable writing, return an empty string.`,
    [{
      role: 'user',
      content: [
        { type: 'text', text: 'Transcribe the handwriting only.' },
        { type: 'image_url', image_url: { url } },
      ],
    }],
    800,
    VISION_MODEL,
    { temperature: 0, reasoning_effort: 'none' }
  )
  return raw.replace(/^```[\w]*\n?|\n?```$/g, '').trim()
}

export const groqReadDiagram = async (buf: Buffer, mime = 'image/png'): Promise<string> => {
  const url = `data:${mime};base64,${buf.toString('base64')}`
  return groqChat(
    `This image is a student diagram only (not a full notebook page).
Describe the figure so it can go in a study guide: labels, arrows, boxes, tables, relationships.
Reconstruct tables as markdown. Keep it compact. No preamble.`,
    [{
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this diagram for class revision.' },
        { type: 'image_url', image_url: { url } },
      ],
    }],
    700,
    VISION_MODEL,
    { temperature: 0.2, reasoning_effort: 'none' }
  )
}

export const groqSpeech = async (text: string, voice = 'austin'): Promise<Buffer> => {
  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireGroq()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_TTS_MODEL || 'canopylabs/orpheus-v1-english',
      input: text.slice(0, 200),
      voice,
      response_format: 'wav',
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error?.message || `TTS error ${res.status}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export const concatWav = (parts: Buffer[]): Buffer => {
  if (parts.length === 0) return Buffer.alloc(0)
  if (parts.length === 1) return parts[0]
  const datas = parts.map(p => (p.length > 44 ? p.subarray(44) : p))
  const dataLen = datas.reduce((n, d) => n + d.length, 0)
  const header = Buffer.from(parts[0].subarray(0, 44))
  header.writeUInt32LE(36 + dataLen, 4)
  header.writeUInt32LE(dataLen, 40)
  return Buffer.concat([header, ...datas])
}

const splitForTts = (script: string, max = 180) => {
  const lines = script.split(/\n+/).map(l => l.trim()).filter(Boolean)
  const chunks: { text: string; voice: string }[] = []
  for (const line of lines) {
    const voice = /^sam:/i.test(line) ? 'troy' : 'austin'
    let rest = line.replace(/^(alex|sam):\s*/i, '')
    while (rest.length > max) {
      let cut = rest.lastIndexOf(' ', max)
      if (cut < 40) cut = max
      chunks.push({ text: rest.slice(0, cut).trim(), voice })
      rest = rest.slice(cut).trim()
    }
    if (rest) chunks.push({ text: rest, voice })
  }
  return chunks.slice(0, 10)
}

export const groqBriefingAudio = async (script: string): Promise<Buffer | null> => {
  const chunks = splitForTts(script)
  if (chunks.length === 0) return null
  const parts: Buffer[] = []
  for (const chunk of chunks) {
    parts.push(await groqSpeech(chunk.text, chunk.voice))
  }
  return concatWav(parts)
}
