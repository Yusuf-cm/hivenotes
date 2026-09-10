'use client'

import { useMemo, useState } from 'react'
import { AuthUser, ClassRevision, RevisionSource, StudioItem } from '@/types'
import { apiBase } from '@/lib/backend'

type Tab = 'guide' | 'glossary' | 'faq' | 'quiz' | 'gaps' | 'listen' | 'sources'

interface Props {
  user: AuthUser
  revision: ClassRevision | null
  onAI: () => void
  onBack: () => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'guide', label: 'Guide' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'faq', label: 'FAQ' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'gaps', label: 'Gaps' },
  { id: 'listen', label: 'Listen' },
  { id: 'sources', label: 'Sources' },
]

const asList = (v: unknown): StudioItem[] => Array.isArray(v) ? v : []
const asSources = (v: unknown): RevisionSource[] => Array.isArray(v) ? v as RevisionSource[] : []

const fileUrl = (url?: string | null) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${apiBase()}${url}`
}

const renderGuide = (text: string) => {
  const lines = (text || '').split('\n')
  return lines.map((line, i) => {
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    const cited = line.replace(/\[(S\d+)\]/g, ' · $1')
    if (heading) {
      const size = heading[1].length === 1 ? 28 : heading[1].length === 2 ? 22 : 18
      return (
        <h3 key={i} style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: size,
          fontStyle: 'italic',
          color: 'var(--ink)',
          margin: '18px 0 8px',
        }}>
          {heading[2]}
        </h3>
      )
    }
    if (!line.trim()) return <div key={i} style={{ height: 10 }} />
    return (
      <p key={i} style={{
        fontFamily: 'var(--font-cormorant)',
        fontSize: 17,
        lineHeight: 1.7,
        color: 'var(--ink)',
        margin: '0 0 8px',
      }}>
        {cited}
      </p>
    )
  })
}

export default function StudyDesk({ user, revision, onAI, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('guide')
  const [flipped, setFlipped] = useState<Record<number, boolean>>({})

  const glossary = asList(revision?.glossary)
  const faq = asList(revision?.faq)
  const quiz = asList(revision?.quiz)
  const gaps = asList(revision?.gaps)
  const sources = asSources(revision?.sources)
  const audio = fileUrl(revision?.audioUrl)
  const when = revision?.compiledAt
    ? new Date(revision.compiledAt).toLocaleString()
    : ''

  const empty = !revision?.body?.trim()

  const paper = useMemo(() => ({
    background: 'var(--paper)',
    color: 'var(--ink)',
    borderRadius: 4,
    boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
  }), [])

  return (
    <div className="study-desk" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 80,
      display: 'flex',
      flexDirection: 'column',
      padding: '72px 24px 24px',
      overflow: 'hidden',
    }}>
      <div style={{
        maxWidth: 820,
        width: '100%',
        margin: '0 auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: 11,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: 'rgba(245,237,216,0.4)',
            }}>
              Class revision
            </div>
            <h1 style={{
              fontFamily: 'var(--font-cormorant)',
              fontStyle: 'italic',
              fontSize: 32,
              color: 'var(--cream)',
            }}>
              {revision?.title || 'Study studio'}
            </h1>
            {when && (
              <div style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 13,
                color: 'rgba(245,237,216,0.38)',
              }}>
                Compiled by {revision?.compiledBy} · {when}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="liq" onClick={onBack} style={{
              padding: '8px 14px', borderRadius: 20,
              color: 'var(--cream)', fontFamily: 'var(--font-cormorant)',
            }}>
              Back to books
            </button>
            <button className="liq" onClick={onAI} style={{
              padding: '8px 14px', borderRadius: 20,
              color: 'var(--gold-lt)', fontFamily: 'var(--font-cormorant)',
            }}>
              Ask
            </button>
            <button className="liq" onClick={() => window.print()} style={{
              padding: '8px 14px', borderRadius: 20,
              color: 'var(--cream)', fontFamily: 'var(--font-cormorant)',
            }}>
              Print
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className="liq"
              onClick={() => setTab(t.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 16,
                fontFamily: 'var(--font-cormorant)',
                fontSize: 14,
                color: tab === t.id ? 'var(--gold-lt)' : 'rgba(245,237,216,0.55)',
                border: tab === t.id ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className="study-paper"
          style={{
            ...paper,
            flex: 1,
            overflow: 'auto',
            padding: '36px 40px 48px',
            minHeight: 0,
          }}
        >
          {empty && (
            <p style={{
              fontFamily: 'var(--font-cormorant)',
              fontStyle: 'italic',
              fontSize: 18,
              color: 'rgba(90,60,40,0.45)',
            }}>
              Compile from the AI panel after everyone has saved lecture recordings and notes.
            </p>
          )}

          {!empty && tab === 'guide' && renderGuide(revision!.body)}

          {!empty && tab === 'glossary' && (
            glossary.length === 0
              ? <p style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>No glossary yet.</p>
              : glossary.map((item, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, fontWeight: 600 }}>
                    {item.term}
                  </div>
                  <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 16, lineHeight: 1.6 }}>
                    {item.definition}
                  </div>
                  <Cite ids={item.sourceIds} sources={sources} />
                </div>
              ))
          )}

          {!empty && tab === 'faq' && (
            faq.length === 0
              ? <p style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>No FAQ yet.</p>
              : faq.map((item, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, fontWeight: 600 }}>
                    {item.q}
                  </div>
                  <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 16, lineHeight: 1.65, marginTop: 4 }}>
                    {item.a}
                  </div>
                  <Cite ids={item.sourceIds} sources={sources} />
                </div>
              ))
          )}

          {!empty && tab === 'quiz' && (
            quiz.length === 0
              ? <p style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>No quiz yet.</p>
              : quiz.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'rgba(90,60,40,0.05)',
                    border: '1px solid rgba(90,60,40,0.12)',
                    borderRadius: 10, padding: '14px 16px', marginBottom: 10,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 16 }}>
                    {flipped[i] ? item.a : item.q}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-cormorant)', fontSize: 12,
                    color: 'rgba(90,60,40,0.45)', marginTop: 6,
                  }}>
                    {flipped[i] ? 'Tap to hide' : 'Tap to reveal'}
                  </div>
                  {flipped[i] && <Cite ids={item.sourceIds} sources={sources} />}
                </button>
              ))
          )}

          {!empty && tab === 'gaps' && (
            gaps.length === 0
              ? <p style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>No singleton facts flagged.</p>
              : gaps.map((item, i) => (
                <div key={i} style={{ marginBottom: 12, fontFamily: 'var(--font-cormorant)', fontSize: 16 }}>
                  <strong>{item.who}</strong> — {item.text}
                </div>
              ))
          )}

          {!empty && tab === 'listen' && (
            <div>
              <p style={{
                fontFamily: 'var(--font-cormorant)',
                fontStyle: 'italic',
                fontSize: 16,
                marginBottom: 16,
              }}>
                A short briefing from the class revision.
              </p>
              {audio
                ? <audio controls src={audio} style={{ width: '100%' }} />
                : <p style={{ fontFamily: 'var(--font-cormorant)' }}>No audio overview yet. Compile again after the Groq key is set.</p>}
              {revision?.audioScript && (
                <pre style={{
                  marginTop: 20,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: 15,
                  lineHeight: 1.6,
                }}>
                  {revision.audioScript}
                </pre>
              )}
            </div>
          )}

          {!empty && tab === 'sources' && (
            sources.length === 0
              ? <p style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>No sources stored.</p>
              : sources.map(s => (
                <div key={s.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 15, fontWeight: 600 }}>
                    [{s.id}] {s.label}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-cormorant)',
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: 'rgba(28,15,12,0.72)',
                  }}>
                    {s.excerpt}
                  </div>
                </div>
              ))
          )}
        </div>
        <div style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: 12,
          color: 'rgba(245,237,216,0.28)',
          marginTop: 8,
        }}>
          {user.nickname} · grounded in this room’s journals
        </div>
      </div>
    </div>
  )
}

function Cite({ ids, sources }: { ids?: string[]; sources: RevisionSource[] }) {
  if (!ids?.length) return null
  const labels = ids.map(id => sources.find(s => s.id === id)?.label || id)
  return (
    <div style={{
      fontFamily: 'var(--font-cormorant)',
      fontSize: 12,
      color: 'rgba(90,60,40,0.5)',
      marginTop: 4,
    }}>
      {labels.join(' · ')}
    </div>
  )
}
