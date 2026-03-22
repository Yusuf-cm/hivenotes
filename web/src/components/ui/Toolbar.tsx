'use client'

import { useState } from 'react'
import { AuthUser } from '@/types'
import { useSocketContext } from '@/context/SocketContext'
import { useRecorder } from '@/hooks/useRecorder'

interface Props {
  user:      AuthUser
  onAddNote: () => void
  onAudio:   (url: string) => void
  onShare:   () => void
  onAI:      () => void
  onLogout:  () => void
}

export default function Toolbar({
  user, onAddNote, onAudio, onShare, onAI, onLogout
}: Props) {
  const { connected, presence } = useSocketContext()
  const [showPresence, setShowPresence] = useState(false)

  const { recording, seconds, start, stop } = useRecorder(onAudio)

  return (
    <>
      {/* ── Main toolbar ───────────────────────────────────── */}
      <div
        className="glass-warm"
        style={{
          position: 'fixed',
          top: 20, left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: 50,
          padding: '7px 16px',
          display: 'flex', alignItems: 'center', gap: 6,
          zIndex: 500,
          animation: 'fade-up .5s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {/* User identity */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          paddingRight: 12,
          borderRight: '1px solid rgba(255,255,255,0.1)',
          marginRight: 4,
        }}>
          <div
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? 'var(--green)' : 'rgba(255,255,255,0.25)',
              boxShadow: connected ? '0 0 0 2px rgba(91,175,130,0.28)' : 'none',
              flexShrink: 0,
              transition: 'background .3s, box-shadow .3s',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic', fontSize: 14,
            color: 'rgba(245,237,216,0.72)',
            letterSpacing: '.04em',
          }}>
            {user.nickname}
          </span>
        </div>

        {/* Add note */}
        <button
          className="liq"
          onClick={onAddNote}
          style={{
            padding: '5px 13px', borderRadius: 22,
            fontFamily: 'var(--font-cormorant)',
            fontSize: 13, letterSpacing: '.08em',
            color: 'var(--cream)',
          }}
        >
          + Note
        </button>

        {/* Record audio */}
        <button
          className="liq"
          onClick={recording ? stop : start}
          style={{
            padding: '5px 13px', borderRadius: 22,
            fontFamily: 'var(--font-cormorant)',
            fontSize: 13, letterSpacing: '.08em',
            color: recording ? 'var(--red)' : 'var(--cream)',
            animation: recording ? 'rec-pulse 1.2s ease infinite' : 'none',
          }}
        >
          {recording ? `⏹ ${seconds}s` : '🎙 Record'}
        </button>

        {/* AI */}
        <button
          className="liq"
          onClick={onAI}
          style={{
            padding: '5px 13px', borderRadius: 22,
            fontFamily: 'var(--font-cormorant)',
            fontSize: 13, letterSpacing: '.08em',
            color: 'var(--gold-lt)',
          }}
        >
          ✦ AI
        </button>

        {/* Share */}
        <button
          className="liq"
          onClick={onShare}
          style={{
            padding: '5px 13px', borderRadius: 22,
            fontFamily: 'var(--font-cormorant)',
            fontSize: 13, letterSpacing: '.08em',
            color: 'var(--cream)',
          }}
        >
          ⇧ Share
        </button>

        {/* Presence avatars */}
        {presence.length > 1 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              paddingLeft: 10,
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              position: 'relative', cursor: 'pointer',
            }}
            onClick={() => setShowPresence(p => !p)}
          >
            {presence.slice(0, 4).map((p, i) => (
              <div key={p.userId} style={{
                width: 24, height: 24,
                borderRadius: '50%',
                background: `hsl(${parseInt(p.userId.slice(0,4),16) % 360},45%,55%)`,
                border: '2px solid rgba(0,0,0,0.3)',
                marginLeft: i > 0 ? -8 : 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', fontWeight: 600,
                fontFamily: 'var(--font-cormorant)',
                zIndex: presence.length - i,
                position: 'relative',
              }}>
                {p.nickname[0].toUpperCase()}
              </div>
            ))}
            {presence.length > 4 && (
              <span style={{
                fontSize: 11, color: 'rgba(245,237,216,0.5)',
                fontFamily: 'var(--font-cormorant)',
                marginLeft: 4,
              }}>
                +{presence.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            color: 'rgba(245,237,216,0.3)',
            fontSize: 22, lineHeight: 1,
            paddingLeft: 8,
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            marginLeft: 4,
            cursor: 'pointer',
            border: 'none', background: 'transparent',
            transition: 'color .2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color='rgba(245,237,216,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color='rgba(245,237,216,0.3)'}
        >
          ×
        </button>
      </div>

      {/* ── Presence dropdown ──────────────────────────────── */}
      {showPresence && presence.length > 1 && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            top: 68, left: '50%',
            transform: 'translateX(-50%)',
            borderRadius: 14,
            padding: '14px 18px',
            zIndex: 499,
            minWidth: 180,
            animation: 'fade-up .18s ease',
          }}
        >
          <p style={{
            fontSize: 10, letterSpacing: '.22em',
            textTransform: 'uppercase',
            color: 'rgba(245,237,216,0.35)',
            fontFamily: 'var(--font-cormorant)',
            marginBottom: 10,
          }}>
            In this room
          </p>
          {presence.map(p => (
            <div key={p.userId} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              marginBottom: 7,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `hsl(${parseInt(p.userId.slice(0,4),16) % 360},45%,55%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#fff', fontWeight: 600,
                fontFamily: 'var(--font-cormorant)',
                flexShrink: 0,
              }}>
                {p.nickname[0].toUpperCase()}
              </div>
              <span style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 15, color: 'rgba(245,237,216,0.75)',
                fontStyle: p.userId === user.userId ? 'italic' : 'normal',
              }}>
                {p.nickname}
                {p.userId === user.userId && ' (you)'}
              </span>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--green)',
                marginLeft: 'auto', flexShrink: 0,
              }}/>
            </div>
          ))}
        </div>
      )}

      {/* ── Room code badge ────────────────────────────────── */}
      <div
        className="glass-warm"
        style={{
          position: 'fixed',
          bottom: 20, right: 20,
          borderRadius: 10,
          padding: '5px 13px',
          zIndex: 500,
          fontFamily: 'monospace',
          fontSize: 12, letterSpacing: '.18em',
          color: 'rgba(240,215,140,0.45)',
          animation: 'fade-up .7s ease',
        }}
      >
        {user.roomCode}
      </div>
    </>
  )
}