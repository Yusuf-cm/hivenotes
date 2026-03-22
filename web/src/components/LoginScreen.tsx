'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AuthUser } from '@/types'

interface Props {
  onLogin: (user: AuthUser) => void
}

export default function LoginScreen({ onLogin }: Props) {
  const { create, join, error } = useAuth()

  const [mode,     setMode]     = useState<'create' | 'join'>('create')
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [bookOpen, setBookOpen] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim() || !password.trim()) return
    setLoading(true)
    try {
      const user = mode === 'create'
        ? await create(nickname.trim(), password.trim())
        : await join(nickname.trim(), roomCode.trim().toUpperCase(), password.trim())
      onLogin(user)
    } catch {}
    setLoading(false)
  }

  return (
    <div
      className="tex-wood"
      style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Desk vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 56%,transparent 22%,rgba(0,0,0,0.62) 100%)',
        zIndex: 0,
      }}/>

      {/* Content row */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center',
        gap: 52,
        animation: 'fade-up .6s ease',
      }}>

        {/* ── Decorative book ──────────────────────────────── */}
        <div
          onClick={() => setBookOpen(o => !o)}
          style={{
            cursor: 'pointer',
            perspective: '1200px',
            animation: 'float 5.5s ease-in-out infinite',
            filter: 'drop-shadow(0 32px 52px rgba(0,0,0,0.82))',
            flexShrink: 0,
          }}
        >
          <div style={{
            transformStyle: 'preserve-3d',
            width: 190, height: 270,
            position: 'relative',
          }}>
            {/* Page stack */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '1px 4px 4px 1px',
              background: 'repeating-linear-gradient(0deg,#F5EDD8 0px,#DDD4BC 1px,#F5EDD8 2px)',
            }}/>
            {/* Right edge */}
            <div style={{
              position: 'absolute', top: 2, bottom: 2,
              right: -11, width: 11,
              background: 'repeating-linear-gradient(0deg,#F5EDD8 0px,#DDD4BC 1px,#F5EDD8 2px)',
              borderRadius: '0 3px 3px 0',
              boxShadow: '2px 0 5px rgba(0,0,0,0.3)',
            }}/>
            {/* Back cover */}
            <div className="tex-leather" style={{
              position: 'absolute', inset: 0,
              borderRadius: '1px 4px 4px 1px',
            }}/>
            {/* Front cover — hinged */}
            <div style={{
              position: 'absolute', inset: 0,
              transformStyle: 'preserve-3d',
              transformOrigin: 'left center',
              transition: 'transform 0.9s cubic-bezier(0.25,1,0.5,1)',
              transform: bookOpen ? 'rotateY(-168deg)' : 'rotateY(0deg)',
            }}>
              {/* Exterior */}
              <div className="tex-leather" style={{
                backfaceVisibility: 'hidden',
                position: 'absolute', inset: 0,
                borderRadius: '1px 4px 4px 1px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <div className="leather-gloss"/>
                <div style={{position:'absolute',inset:8,border:'1px solid rgba(201,168,76,0.2)',borderRadius:2}}/>
                <div style={{position:'absolute',inset:12,border:'2px solid rgba(201,168,76,0.38)',borderRadius:1}}/>
                {[
                  {top:14,left:14,borderTop:'2px solid',borderLeft:'2px solid'},
                  {top:14,right:14,borderTop:'2px solid',borderRight:'2px solid'},
                  {bottom:14,left:14,borderBottom:'2px solid',borderLeft:'2px solid'},
                  {bottom:14,right:14,borderBottom:'2px solid',borderRight:'2px solid'},
                ].map((s,i)=>(
                  <div key={i} style={{
                    position:'absolute',width:16,height:16,
                    borderColor:'rgba(201,168,76,0.55)',...s,
                  }}/>
                ))}
                <div style={{fontSize:38,marginBottom:10,filter:'drop-shadow(0 2px 5px rgba(0,0,0,0.65))'}}>🐝</div>
                <h2 className="gold-foil" style={{
                  fontFamily:'var(--font-imfell)',fontSize:15,
                  letterSpacing:'.2em',textAlign:'center',lineHeight:1.5,
                }}>HIVE<br/>NOTES</h2>
                <div className="gold-rule" style={{width:40,margin:'8px 0'}}/>
                <p style={{
                  fontSize:8,letterSpacing:'.28em',color:'rgba(201,168,76,0.4)',
                  textTransform:'uppercase',fontFamily:'var(--font-cormorant)',
                }}>Journal</p>
                <p style={{
                  position:'absolute',bottom:12,fontSize:7,
                  letterSpacing:'.24em',color:'rgba(201,168,76,0.28)',
                  textTransform:'uppercase',fontFamily:'var(--font-cormorant)',
                }}>click to open</p>
              </div>
              {/* Inside cover */}
              <div className="tex-page-aged" style={{
                backfaceVisibility:'hidden',
                position:'absolute',inset:0,
                transform:'rotateY(180deg)',
                borderRadius:'1px 4px 4px 1px',
              }}/>
            </div>
          </div>
        </div>

        {/* ── Login panel ──────────────────────────────────── */}
        <div
          className="glass"
          style={{
            width: 320,
            borderRadius: 20,
            padding: '32px 28px',
            flexShrink: 0,
          }}
        >
          <h2 style={{
            fontFamily: 'var(--font-imfell)',
            fontStyle: 'italic',
            fontSize: 28,
            color: 'var(--cream)',
            marginBottom: 4,
          }}>
            Welcome
          </h2>
          <p style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 12, letterSpacing: '.14em',
            color: 'rgba(245,237,216,0.4)',
            marginBottom: 20,
          }}>
            Your living manuscript awaits
          </p>

          <div className="gold-rule" style={{marginBottom: 20}}/>

          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 12, padding: 3,
            marginBottom: 22,
          }}>
            {(['create','join'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: 9,
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: 13, letterSpacing: '.1em',
                  background: mode === m ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: mode === m ? 'var(--cream)' : 'rgba(245,237,216,0.34)',
                  boxShadow: mode === m
                    ? '0 1px 4px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.1)'
                    : 'none',
                  transition: 'all .2s',
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none',
                }}
              >
                {m === 'create' ? '✦ New Journal' : '⎋ Open Journal'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* Name */}
            <div>
              <label style={{
                display: 'block', fontSize: 10,
                letterSpacing: '.22em', textTransform: 'uppercase',
                fontFamily: 'var(--font-cormorant)',
                color: 'rgba(245,237,216,0.36)', marginBottom: 6,
              }}>Your Name</label>
              <input
                type="text" value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="e.g. Yusuf" required
                style={{
                  width: '100%', padding: '10px 13px',
                  background: 'rgba(0,0,0,0.22)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--cream)', fontSize: 15,
                  fontFamily: 'var(--font-cormorant)',
                  outline: 'none', transition: 'border-color .2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor='rgba(201,168,76,0.5)'}
                onBlur={e  => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Room code — join only */}
            {mode === 'join' && (
              <div>
                <label style={{
                  display: 'block', fontSize: 10,
                  letterSpacing: '.22em', textTransform: 'uppercase',
                  fontFamily: 'var(--font-cormorant)',
                  color: 'rgba(245,237,216,0.36)', marginBottom: 6,
                }}>Journal Code</label>
                <input
                  type="text" value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3" required
                  style={{
                    width: '100%', padding: '10px 13px',
                    background: 'rgba(0,0,0,0.22)',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--cream)',
                    fontSize: 20, fontFamily: 'monospace',
                    letterSpacing: '.28em',
                    outline: 'none', transition: 'border-color .2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor='rgba(201,168,76,0.5)'}
                  onBlur={e  => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: 10,
                letterSpacing: '.22em', textTransform: 'uppercase',
                fontFamily: 'var(--font-cormorant)',
                color: 'rgba(245,237,216,0.36)', marginBottom: 6,
              }}>
                {mode === 'create' ? 'Set Password' : 'Password'}
              </label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••" required
                style={{
                  width: '100%', padding: '10px 13px',
                  background: 'rgba(0,0,0,0.22)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--cream)', fontSize: 15,
                  fontFamily: 'var(--font-cormorant)',
                  outline: 'none', transition: 'border-color .2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor='rgba(201,168,76,0.5)'}
                onBlur={e  => e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
              />
            </div>

            {error && (
              <p style={{
                fontSize: 12, color: 'var(--red)',
                fontFamily: 'var(--font-cormorant)',
              }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="liq liq-gold"
              style={{
                marginTop: 4,
                width: '100%', padding: '13px 0',
                borderRadius: 13,
                fontFamily: 'var(--font-cormorant)',
                fontSize: 16, letterSpacing: '.14em',
                color: 'var(--cream)',
              }}
            >
              {loading
                ? '…'
                : mode === 'create' ? '⎚  Bind New Journal' : '⎗  Open Journal'
              }
            </button>
          </form>

          <p style={{
            marginTop: 20, textAlign: 'center',
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic', fontSize: 11,
            letterSpacing: '.1em',
            color: 'rgba(245,237,216,0.18)',
          }}>
            Crafted in leather, glass &amp; ink
          </p>
        </div>
      </div>
    </div>
  )
}