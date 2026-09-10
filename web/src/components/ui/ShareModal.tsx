'use client'

import { useState } from 'react'
import { AuthUser } from '@/types'

interface Props {
  user:          AuthUser
  onClose:       () => void
  presenceCount: number
}

export default function ShareModal({ user, onClose, presenceCount }: Props) {
  const [copied,    setCopied]    = useState(false)
  const [tab,       setTab]       = useState<'invite' | 'export'>('invite')
  const [exported,  setExported]  = useState('')
  const [importing, setImporting] = useState('')
  const [impErr,    setImpErr]    = useState('')
  const [impOk,     setImpOk]     = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(user.roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyInviteLink = () => {
    const url = `${window.location.origin}?join=${user.roomCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const doExport = () => {
    try {
      const notes   = localStorage.getItem(`hn2_notes_${user.roomCode}`) || '[]'
      const pages   = localStorage.getItem(`hn2_pages_${user.roomCode}`) || '[]'
      const payload = {
        roomCode: user.roomCode,
        notes:    JSON.parse(notes),
        pages:    JSON.parse(pages),
      }
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      setExported(encoded)
      navigator.clipboard.writeText(encoded)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  const doImport = () => {
    setImpErr('')
    setImpOk(false)
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(importing.trim()))))
      if (!decoded.notes || !decoded.pages) throw new Error('Invalid')
      localStorage.setItem(`hn2_notes_${user.roomCode}`, JSON.stringify(decoded.notes))
      localStorage.setItem(`hn2_pages_${user.roomCode}`, JSON.stringify(decoded.pages))
      setImpOk(true)
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      setImpErr('Invalid export string. Paste the full copied text.')
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
          width: 420, borderRadius: 22,
          padding: '32px 30px',
          animation: 'fade-up .22s ease',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 18, right: 20,
            color: 'rgba(245,237,216,0.35)', fontSize: 24,
            lineHeight: 1, cursor: 'pointer',
            background: 'none', border: 'none',
            transition: 'color .2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color='rgba(245,237,216,0.8)'}
          onMouseLeave={e => e.currentTarget.style.color='rgba(245,237,216,0.35)'}
        >×</button>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: 28, fontStyle: 'italic', fontWeight: 600,
          color: 'var(--cream)', marginBottom: 4,
        }}>
          Share Journal
        </h2>
        <p style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: 13, color: 'rgba(245,237,216,0.38)',
          letterSpacing: '.08em', marginBottom: 20,
        }}>
          Invite collaborators or export your notebook
        </p>

        <div className="gold-rule" style={{marginBottom: 20}}/>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 12, padding: 3, marginBottom: 22,
        }}>
          {(['invite','export'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0',
              borderRadius: 9, cursor: 'pointer',
              fontFamily: 'var(--font-cormorant)',
              fontSize: 13, letterSpacing: '.1em',
              background: tab === t ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: tab === t ? 'var(--cream)' : 'rgba(245,237,216,0.34)',
              border: 'none', outline: 'none',
              boxShadow: tab === t
                ? '0 1px 4px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.1)'
                : 'none',
              transition: 'all .2s',
            }}>
              {t === 'invite' ? '👥 Invite' : '📦 Export'}
            </button>
          ))}
        </div>

        {/* ── Invite tab ──────────────────────────────────── */}
        {tab === 'invite' && (
          <div style={{display:'flex', flexDirection:'column', gap:16}}>

            <div>
              <label style={{
                display: 'block', fontSize: 10,
                letterSpacing: '.22em', textTransform: 'uppercase',
                fontFamily: 'var(--font-cormorant)',
                color: 'rgba(245,237,216,0.36)', marginBottom: 8,
              }}>
                Room Code
              </label>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{
                  flex: 1, padding: '12px 16px',
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: 10,
                  border: '1px solid rgba(201,168,76,0.2)',
                  fontFamily: 'monospace',
                  fontSize: 26, letterSpacing: '.32em',
                  color: 'var(--gold-lt)',
                  textAlign: 'center',
                }}>
                  {user.roomCode}
                </div>
                <button
                  className="liq liq-gold"
                  onClick={copyCode}
                  style={{
                    padding: '12px 16px', borderRadius: 10,
                    fontFamily: 'var(--font-cormorant)',
                    fontSize: 14,
                    color: copied ? 'var(--green)' : 'var(--cream)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? '✓ Copied' : '⎘ Copy'}
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 10, padding: '14px 16px',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <p style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 14, color: 'rgba(245,237,216,0.55)',
                lineHeight: 1.7,
              }}>
                Share this code with anyone. They open HiveNotes, choose{' '}
                <span style={{color:'var(--gold-lt)', fontStyle:'italic'}}>
                  Open Journal
                </span>
                , enter the code and the room password.
              </p>
            </div>

            <button
              className="liq"
              onClick={copyInviteLink}
              style={{
                width: '100%', padding: '11px 0',
                borderRadius: 12,
                fontFamily: 'var(--font-cormorant)',
                fontSize: 15, letterSpacing: '.1em',
                color: 'var(--cream)',
              }}
            >
              🔗 Copy Invite Link
            </button>
          </div>
        )}

        {/* ── Export tab ──────────────────────────────────── */}
        {tab === 'export' && (
          <div style={{display:'flex', flexDirection:'column', gap:16}}>

            <div>
              <label style={{
                display: 'block', fontSize: 10,
                letterSpacing: '.22em', textTransform: 'uppercase',
                fontFamily: 'var(--font-cormorant)',
                color: 'rgba(245,237,216,0.36)', marginBottom: 8,
              }}>
                Export notebook
              </label>
              <p style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 13, color: 'rgba(245,237,216,0.4)',
                marginBottom: 10, lineHeight: 1.6,
              }}>
                Generates an encoded snapshot of all your notes and pages.
                Send it to someone to import into their journal.
              </p>
              <button
                className="liq liq-gold"
                onClick={doExport}
                style={{
                  width: '100%', padding: '11px 0',
                  borderRadius: 12,
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: 15, letterSpacing: '.1em',
                  color: copied ? 'var(--green)' : 'var(--cream)',
                }}
              >
                {copied ? '✓ Copied to clipboard' : '⎘ Export & Copy'}
              </button>
              {exported && (
                <textarea
                  readOnly
                  value={exported}
                  style={{
                    marginTop: 10,
                    width: '100%', height: 72,
                    padding: '8px 10px', resize: 'none',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(245,237,216,0.45)',
                    fontSize: 11, fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              )}
            </div>

            <div className="gold-rule"/>

            <div>
              <label style={{
                display: 'block', fontSize: 10,
                letterSpacing: '.22em', textTransform: 'uppercase',
                fontFamily: 'var(--font-cormorant)',
                color: 'rgba(245,237,216,0.36)', marginBottom: 8,
              }}>
                Import notebook
              </label>
              <textarea
                value={importing}
                onChange={e => setImporting(e.target.value)}
                placeholder="Paste exported string here…"
                style={{
                  width: '100%', height: 72,
                  padding: '10px 12px', resize: 'none',
                  background: 'rgba(0,0,0,0.22)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--cream)',
                  fontSize: 12, fontFamily: 'monospace',
                  outline: 'none', marginBottom: 8,
                  transition: 'border-color .2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor='rgba(201,168,76,0.4)'}
                onBlur={e  => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
              />
              {impErr && (
                <p style={{
                  fontSize: 12, color: 'var(--red)',
                  fontFamily: 'var(--font-cormorant)',
                  marginBottom: 8,
                }}>
                  {impErr}
                </p>
              )}
              {impOk && (
                <p style={{
                  fontSize: 12, color: 'var(--green)',
                  fontFamily: 'var(--font-cormorant)',
                  marginBottom: 8,
                }}>
                  ✓ Imported — reloading…
                </p>
              )}
              <button
                className="liq"
                onClick={doImport}
                disabled={!importing.trim()}
                style={{
                  width: '100%', padding: '11px 0',
                  borderRadius: 12,
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: 15, letterSpacing: '.1em',
                  color: 'var(--cream)',
                }}
              >
                ⇧ Import Notebook
              </button>
            </div>

          </div>
        )}

        <div className="gold-rule" style={{marginTop: 24, marginBottom: 14}}/>

        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-cormorant)',
          fontStyle: 'italic', fontSize: 11,
          color: 'rgba(245,237,216,0.2)',
          letterSpacing: '.1em',
        }}>
          Real-time sync active · {presenceCount} online
        </p>

      </div>
    </div>
  )
}