'use client'

import { useState, useRef, useEffect } from 'react'
import { AuthUser, Note, Page } from '@/types'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface Props {
  user:   AuthUser
  notes:  Note[]
  pages:  Page[]
  onClose: () => void
}

const QUICK_PROMPTS = [
  'Summarize my journal entries',
  'What themes keep coming up?',
  'List all my action items',
  'Suggest a writing prompt for tomorrow',
  'What have I been focused on lately?',
]

export default function AIPanel({ user, notes, pages, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const buildContext = () => {
    const pageCtx = pages
      .filter(p => p.text?.trim())
      .sort((a, b) => a.pageIndex - b.pageIndex)
      .map(p => `Entry ${p.pageIndex + 1}:\n${p.text}`)
      .join('\n\n')

    const noteCtx = notes
      .filter(n => n.content?.trim())
      .map(n => `Note by ${n.authorName}: ${n.content}`)
      .join('\n')

    return [pageCtx, noteCtx].filter(Boolean).join('\n\n---\n\n')
  }

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    try {
      const context = buildContext()
      const system = context
        ? `You are a thoughtful journal companion for ${user.nickname}. 
Be warm, insightful, and concise. Use line breaks for readability.

Here is their journal content:
${context}`
        : `You are a thoughtful journal companion for ${user.nickname}. 
The journal is currently empty. Be encouraging and suggest they start writing.`

      const res  = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:    'chat',
          content: trimmed,
          history: messages.map(m => ({
            role:    m.role,
            content: m.content,
          })),
          system,
        }),
      })

      const data = await res.json()
      setMessages([...history, { role: 'assistant', content: data.result || 'Sorry, I couldn\'t respond.' }])
    } catch {
      setMessages([...history, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    }

    setLoading(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(10px)',
        animation: 'fade-in .2s ease',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: 500, height: '78vh',
          maxHeight: 680,
          borderRadius: 22,
          display: 'flex', flexDirection: 'column',
          animation: 'fade-up .22s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div style={{
          padding: '24px 28px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 26, fontStyle: 'italic', fontWeight: 600,
                color: 'var(--cream)', marginBottom: 2,
              }}>
                ✦ Journal Assistant
              </h2>
              <p style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 12, color: 'rgba(245,237,216,0.35)',
                letterSpacing: '.08em',
              }}>
                Reads your entire journal · {pages.filter(p=>p.text?.trim()).length} entries · {notes.filter(n=>n.content?.trim()).length} notes
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                color: 'rgba(245,237,216,0.35)', fontSize: 24,
                lineHeight: 1, cursor: 'pointer',
                background: 'none', border: 'none',
                transition: 'color .2s', flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color='rgba(245,237,216,0.8)'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(245,237,216,0.35)'}
            >×</button>
          </div>
        </div>

        {/* ── Messages ────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 24px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>

          {/* Empty state */}
          {messages.length === 0 && (
            <div style={{
              flex: 1, display: 'flex',
              flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 20, paddingBottom: 20,
            }}>
              <div style={{fontSize: 40}}>🐝</div>
              <p style={{
                fontFamily: 'var(--font-cormorant)',
                fontStyle: 'italic', fontSize: 18,
                color: 'rgba(245,237,216,0.4)',
                textAlign: 'center', lineHeight: 1.6,
                maxWidth: 280,
              }}>
                Ask me anything about your journal, or pick a prompt below
              </p>

              {/* Quick prompts */}
              <div style={{display:'flex', flexDirection:'column', gap:8, width:'100%'}}>
                {QUICK_PROMPTS.map(qp => (
                  <button
                    key={qp}
                    className="liq"
                    onClick={() => send(qp)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 16px',
                      borderRadius: 10,
                      fontFamily: 'var(--font-cormorant)',
                      fontSize: 14, letterSpacing: '.03em',
                      color: 'rgba(245,237,216,0.68)',
                    }}
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message history */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'fade-up .18s ease',
              }}
            >
              <div style={{
                maxWidth: '82%',
                padding: '11px 16px',
                borderRadius: msg.role === 'user'
                  ? '16px 16px 4px 16px'
                  : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'rgba(201,168,76,0.18)'
                  : 'rgba(255,255,255,0.07)',
                border: msg.role === 'user'
                  ? '1px solid rgba(201,168,76,0.25)'
                  : '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'var(--font-cormorant)',
                fontSize: 15, lineHeight: 1.72,
                color: msg.role === 'user'
                  ? 'rgba(245,237,216,0.88)'
                  : 'rgba(245,237,216,0.82)',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{display:'flex', justifyContent:'flex-start', animation:'fade-up .18s ease'}}>
              <div style={{
                padding: '12px 18px',
                borderRadius: '16px 16px 16px 4px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', gap: 6, alignItems: 'center',
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: 'rgba(245,237,216,0.35)',
                    animation: `fade-in .6s ease ${i * 0.18}s infinite alternate`,
                  }}/>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* ── Input ───────────────────────────────────────── */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about your journal… (Enter to send)"
            rows={1}
            style={{
              flex: 1,
              padding: '11px 14px',
              background: 'rgba(0,0,0,0.22)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--cream)',
              fontSize: 14,
              fontFamily: 'var(--font-cormorant)',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
              maxHeight: 100,
              overflow: 'auto',
              transition: 'border-color .2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor='rgba(201,168,76,0.45)'}
            onBlur={e  => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 100) + 'px'
            }}
          />
          <button
            className="liq liq-gold"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 42, height: 42,
              borderRadius: '50%',
              fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--gold-lt)',
            }}
          >
            {loading ? (
              <div style={{
                width: 14, height: 14,
                border: '2px solid rgba(240,215,140,0.2)',
                borderTopColor: 'var(--gold-lt)',
                borderRadius: '50%',
                animation: 'spin .7s linear infinite',
              }}/>
            ) : '›'}
          </button>
        </div>
      </div>
    </div>
  )
}