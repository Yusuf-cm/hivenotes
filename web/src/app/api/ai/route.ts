import { NextRequest, NextResponse } from 'next/server'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL    = 'llama-3.3-70b-versatile'

const groq = async (system: string, messages: {role:string; content:string}[], maxTokens = 1000) => {
  const res = await fetch(GROQ_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: maxTokens,
      messages:   [
        { role: 'system', content: system },
        ...messages,
      ],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('[groq]', data)
    throw new Error(data.error?.message || `Groq error ${res.status}`)
  }

  return data.choices?.[0]?.message?.content || ''
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 })
  }

  const { type, content, history = [], system: customSystem } = await req.json()

  // ── Chat mode ──────────────────────────────────────────────
  if (type === 'chat') {
    try {
      const system = customSystem ||
        'You are a thoughtful journal companion. Be warm, insightful, and concise. Use line breaks for readability.'

      const messages = [
        ...history,
        { role: 'user', content },
      ]

      const text = await groq(system, messages, 1000)
      return NextResponse.json({ result: text })
    } catch (e: any) {
      console.error('[ai/chat]', e)
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // ── Note-level actions ─────────────────────────────────────
  const prompts: Record<string, { system: string; user: string }> = {
    expand: {
      system: 'You are a creative journal companion. Be warm, brief, insightful. 2-3 sentences only.',
      user:   `Expand this note:\n"${content}"`,
    },
    tasks: {
      system: 'Return ONLY a JSON array of short action item strings. No markdown, no explanation, no preamble.',
      user:   `Convert to action items:\n"${content}"`,
    },
    summarize: {
      system: 'Summarize in one concise sentence. Return only the sentence.',
      user:   content,
    },
  }

  const p = prompts[type]
  if (!p) return NextResponse.json({ error: 'Unknown type' }, { status: 400 })

  try {
    const text = await groq(p.system, [{ role: 'user', content: p.user }], 500)

    let result: any = text
    if (type === 'tasks') {
      try { result = JSON.parse(text.replace(/```json|```/g, '').trim()) }
      catch { result = [] }
    }

    return NextResponse.json({ result })
  } catch (e: any) {
    console.error('[ai/note]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}