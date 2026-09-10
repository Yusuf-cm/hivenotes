'use client'

import { useState, useRef, useEffect } from 'react'
import { AuthUser, ClassRevision, Note, Page } from '@/types'
import { aiChat, aiCompile } from '@/lib/media'

interface Message {
  role:    'user' | 'assistant'
  content: string
  citations?: { id: string; label: string }[]
}

interface Props {
  user:   AuthUser
  notes:  Note[]
  pages:  Page[]
  journals?: { id: string; name: string }[]
  onCompiled?: (revision: ClassRevision) => void
  onClose: () => void
}

const QUICK_PROMPTS = [
  'Explain the main idea like I am 12',
  'Quiz me on section 1 of the study guide',
  'What did each student catch that others missed?',
]

export default function AIPanel({ user, notes, pages, journals = [], onCompiled, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    try {
      const data = await aiChat(
        user.token,
        trimmed,
        messages.map(m => ({ role: m.role, content: m.content })),
      )
      setMessages([...history, {
        role: 'assistant',
        content: data.result || 'Sorry, I couldn\'t respond.',
        citations: data.citations,
      }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Try again.'
      const reply = msg.includes('GROQ_API_KEY')
        ? 'Add GROQ_API_KEY to server/.env and restart the API. The server needs it to hear recordings and compile the class revision.'
        : msg
      setMessages([...history, { role: 'assistant', content: reply }])
    }

    setLoading(false)
  }

  const compile = async () => {
    if (loading) return
    const userMsg: Message = { role: 'user', content: 'Compile class revision' }
    const history = [...messages, userMsg]
    setMessages(history)
    setLoading(true)
    try {
      const revision = await aiCompile(user.token)
      setMessages([...history, {
        role: 'assistant',
        content: 'The class revision page is ready. Opening it now.',
      }])
      if (revision && onCompiled) onCompiled(revision)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Compile failed'
      const reply = msg.includes('GROQ_API_KEY')
        ? 'Add GROQ_API_KEY to server/.env and restart the API.'
        : msg
      setMessages([...history, { role: 'assistant', content: reply }])
    }
    setLoading(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const filledPages = pages.filter(p => p.text?.trim()).length
  const filledNotes = notes.filter(n => n.content?.trim() || n.mediaUrl).length

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
          width: 520, height: '78vh',
          maxHeight: 700,
          borderRadius: 22,
          display: 'flex', flexDirection: 'column',
          animation: 'fade-up .22s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
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
                Classroom AI
              </h2>
              <p style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 12, color: 'rgba(245,237,216,0.35)',
                letterSpacing: '.08em',
              }}>
                {journals.filter(j => j.id !== '__class__').length || 'all'} books · {filledPages} pages · {filledNotes} items
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                color: 'rgba(245,237,216,0.35)', fontSize: 24,
                lineHeight: 1, cursor: 'pointer',
                background: 'none', border: 'none',
              }}
            >×</button>
          </div>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 24px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {messages.length === 0 && (
            <div style={{
              flex: 1, display: 'flex',
              flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 20, paddingBottom: 20,
            }}>
              <p style={{
                fontFamily: 'var(--font-cormorant)',
                fontStyle: 'italic', fontSize: 18,
                color: 'rgba(245,237,216,0.4)',
                textAlign: 'center', lineHeight: 1.6,
                maxWidth: 320,
              }}>
                Merge every lecture into a cited study studio — guide, quiz, glossary, and a listen-through
              </p>
              <button
                className="liq liq-gold"
                onClick={compile}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: 16,
                  color: 'var(--gold-lt)',
                }}
              >
                Compile class revision
              </button>
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
                      fontSize: 14,
                      color: 'rgba(245,237,216,0.68)',
                    }}
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
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
                color: 'rgba(245,237,216,0.85)',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: 'rgba(245,237,216,0.4)',
                    lineHeight: 1.4,
                  }}>
                    {msg.citations.map(c => c.label).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{display:'flex', justifyContent:'flex-start'}}>
              <div style={{
                padding: '12px 18px',
                borderRadius: '16px 16px 16px 4px',
                background: 'rgba(255,255,255,0.07)',
                display: 'flex', gap: 6,
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'rgba(245,237,216,0.35)',
                    animation: `fade-in .6s ease ${i * 0.18}s infinite alternate`,
                  }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          {messages.length > 0 && (
            <button
              className="liq"
              onClick={compile}
              disabled={loading}
              style={{
                padding: '11px 12px',
                borderRadius: 12,
                fontFamily: 'var(--font-cormorant)',
                fontSize: 13,
                color: 'var(--gold-lt)',
                whiteSpace: 'nowrap',
              }}
            >
              Compile
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about every journal…"
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
              maxHeight: 100,
            }}
          />
          <button
            className="liq liq-gold"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              fontSize: 20, color: 'var(--gold-lt)',
            }}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
