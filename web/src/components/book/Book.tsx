'use client'

import { useState, useCallback } from 'react'
import { Note, Page, AuthUser } from '@/types'
import PageContent from './PageContent'

interface NoteActions {
  update:     (id: string, delta: Partial<Note>) => void
  delete:     (id: string) => void
  bringFront: (id: string) => void
}

interface Props {
  user:        AuthUser
  notes:       Note[]
  pages:       Page[]
  getText:     (idx: number) => string
  updateText:  (idx: number, text: string) => void
  ensurePage:  (idx: number) => void
  noteActions: NoteActions
  onAddNote:   (pageIndex: number, x: number, y: number) => void
}

const PAGE_W = 380
const PAGE_H = 560

export default function Book({
  user, notes,
  getText, updateText, ensurePage,
  noteActions, onAddNote,
}: Props) {
  const [pi,     setPi]     = useState(0)
  const [flip,   setFlip]   = useState<'next'|'prev'|null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const notesOn = useCallback((idx: number) =>
    notes.filter(n => n.pageIndex === idx)
  , [notes])

  const goNext = useCallback(() => {
    if (flip) return
    ensurePage(pi + 1)
    setFlip('next')
    setTimeout(() => { setPi(p => p + 1); setFlip(null) }, 750)
  }, [flip, pi, ensurePage])

  const goPrev = useCallback(() => {
    if (flip || pi === 0) return
    setFlip('prev')
    setTimeout(() => { setPi(p => p - 1); setFlip(null) }, 750)
  }, [flip, pi])

  const pageObj = (idx: number) => ({
    id: '', roomId: user.roomId,
    pageIndex: idx,
    text: getText(idx),
    updatedAt: '',
  })

  const totalW = isOpen ? PAGE_W * 2 + 10 : PAGE_W

  return (
    <div style={{
      perspective: '2400px',
      perspectiveOrigin: '50% 42%',
      position: 'relative',
      width: totalW,
      height: PAGE_H,
      transition: 'width .5s ease',
      marginTop: 56,
    }}>

      {/* ── Page navigation ─────────────────────────────────── */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: -52, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 200, whiteSpace: 'nowrap',
        }}>
          <button
            className="liq"
            onClick={goPrev}
            disabled={pi === 0 || !!flip}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              fontSize: 22,
              color: pi === 0 ? 'rgba(245,237,216,0.22)' : 'var(--cream)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >‹</button>

          <div className="glass-warm" style={{
            padding: '5px 20px', borderRadius: 20,
            fontFamily: 'var(--font-cormorant)',
            fontSize: 14, letterSpacing: '.18em',
            color: 'rgba(245,237,216,0.65)',
          }}>
            {pi > 0 ? `${pi} · ` : ''}{pi + 1}
          </div>

          <button
            className="liq"
            onClick={goNext}
            disabled={!!flip}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              fontSize: 22, color: 'var(--cream)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >›</button>
        </div>
      )}

      {/* ── 3D Book container ────────────────────────────────── */}
      <div
        style={{
          transformStyle: 'preserve-3d',
          width: totalW,
          height: PAGE_H,
          transition: 'transform .9s cubic-bezier(0.25,1,0.5,1), width .5s ease',
          transform: isOpen
            ? 'rotateX(6deg) translateY(8px)'
            : 'rotateX(22deg) rotateY(-18deg) rotateZ(-4deg) translateY(-10px)',
          position: 'relative',
          filter: isOpen
            ? 'drop-shadow(0 32px 48px rgba(0,0,0,0.75)) drop-shadow(0 8px 16px rgba(0,0,0,0.5))'
            : 'drop-shadow(0 44px 60px rgba(0,0,0,0.88)) drop-shadow(0 12px 20px rgba(0,0,0,0.6))',
        }}
      >

        {/* Back cover */}
        <div className="tex-leather" style={{
          position: 'absolute', inset: 0,
          borderRadius: 4,
          zIndex: 0,
          transform: 'translateZ(-5px)',
          boxShadow: '0 0 0 2px rgba(0,0,0,0.5)',
        }}/>

        {/* Right page-edge thickness */}
        <div style={{
          position: 'absolute', top: 3, bottom: 3,
          right: -12, width: 12,
          background: 'repeating-linear-gradient(0deg,#F5EDD8 0px,#DDD4BC 1px,#F5EDD8 2px)',
          borderRadius: '0 3px 3px 0',
          boxShadow: '3px 0 8px rgba(0,0,0,0.32), inset -1px 0 2px rgba(0,0,0,0.1)',
        }}/>

        {/* Top page-edge thickness */}
        <div style={{
          position: 'absolute', top: -8, left: 2, right: 12,
          height: 8,
          background: 'repeating-linear-gradient(90deg,#F5EDD8 0px,#DDD4BC 1px,#F5EDD8 2px)',
          borderRadius: '2px 2px 0 0',
          boxShadow: '0 -3px 6px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.4)',
        }}/>

        {/* ── Left page / Ex Libris ───────────────────────────── */}
        {isOpen && (
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0, width: PAGE_W,
            borderRadius: '3px 0 0 3px',
            overflow: 'hidden',
            zIndex: 1,
          }}>
            {pi > 0 ? (
              <PageContent
                page={pageObj(pi - 1)}
                notes={notesOn(pi - 1)}
                onTextChange={() => {}}
                onAddNote={() => {}}
                noteActions={noteActions}
                interactive={false}
                side="left"
                user={user}
              />
            ) : (
              /* Ex Libris inside cover */
              <div className="tex-page-aged" style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Left page lighting */}
                <div className="page-light-left"/>
                <div className="spine-gutter-left"/>

                <div style={{
                  border: '2px solid rgba(90,60,30,0.18)',
                  borderRadius: 3, width: 260,
                  padding: '32px 28px', textAlign: 'center',
                  position: 'relative', zIndex: 20,
                }}>
                  {/* Corner ornaments */}
                  {(['tl','tr','bl','br'] as const).map(c => (
                    <div key={c} style={{
                      position: 'absolute', width: 16, height: 16,
                      ...(c.includes('t') ? {top:10} : {bottom:10}),
                      ...(c.includes('l') ? {left:10} : {right:10}),
                      borderTop:    c.includes('t') ? '2px solid rgba(90,60,30,0.3)' : undefined,
                      borderBottom: c.includes('b') ? '2px solid rgba(90,60,30,0.3)' : undefined,
                      borderLeft:   c.includes('l') ? '2px solid rgba(90,60,30,0.3)' : undefined,
                      borderRight:  c.includes('r') ? '2px solid rgba(90,60,30,0.3)' : undefined,
                    }}/>
                  ))}
                  <div style={{fontSize:32, marginBottom:12}}>🐝</div>
                  <div style={{
                    fontFamily:'var(--font-cormorant)', fontStyle:'italic',
                    fontSize:22, color:'var(--ink)',
                    borderBottom:'1px solid rgba(90,60,30,0.2)',
                    paddingBottom:10, marginBottom:12,
                  }}>Ex Libris</div>
                  <div style={{
                    fontFamily:'var(--font-gochi)', fontSize:24,
                    color:'var(--ink-md)', marginBottom:18,
                  }}>{user.nickname}</div>
                  <div style={{
                    borderTop:'1px dashed rgba(90,60,30,0.22)',
                    paddingTop:12,
                  }}>
                    <div style={{
                      fontSize:9, letterSpacing:'.22em',
                      textTransform:'uppercase', color:'rgba(90,60,40,0.42)',
                      fontFamily:'var(--font-cormorant)',
                    }}>Room</div>
                    <div style={{
                      fontFamily:'monospace', fontSize:18,
                      letterSpacing:'.22em', color:'var(--ink)', marginTop:4,
                    }}>{user.roomCode}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3D Spine ────────────────────────────────────────── */}
        <div style={{
          position: 'absolute',
          left: isOpen ? PAGE_W : 0,
          top: 0, bottom: 0,
          width: isOpen ? 10 : 4,
          zIndex: 50,
          background: isOpen
            ? 'linear-gradient(90deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0.18) 45%,rgba(0,0,0,0.06) 100%)'
            : 'linear-gradient(90deg,rgba(0,0,0,0.55),rgba(0,0,0,0.1))',
          boxShadow: isOpen
            ? 'inset -2px 0 5px rgba(0,0,0,0.22), inset 2px 0 3px rgba(255,255,255,0.04)'
            : 'none',
        }}/>

        {/* ── Right page (current entry) ──────────────────────── */}
        <div style={{
          position: 'absolute',
          left: isOpen ? PAGE_W + 10 : 3,
          right: 0, top: 0, bottom: 0,
          borderRadius: isOpen ? '0 3px 3px 0' : '1px 3px 3px 1px',
          overflow: 'hidden',
          zIndex: 1,
        }}>
          <PageContent
            page={pageObj(pi)}
            notes={notesOn(pi)}
            onTextChange={t => updateText(pi, t)}
            onAddNote={(x, y) => onAddNote(pi, x, y)}
            noteActions={noteActions}
            interactive={isOpen && !flip}
            side="right"
            user={user}
          />
        </div>

        {/* ── Page flip animation ─────────────────────────────── */}
        {flip && isOpen && (
          <div style={{
            position: 'absolute',
            left: PAGE_W + 10,
            right: 0, top: 0, bottom: 0,
            transformOrigin: 'left center',
            zIndex: 60,
            transformStyle: 'preserve-3d',
            animation: flip === 'next'
              ? 'flip-next 0.72s cubic-bezier(0.4,0,0.2,1) forwards'
              : 'flip-prev 0.72s cubic-bezier(0.4,0,0.2,1) forwards',
          }}>
            {/* Front face */}
            <div style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              position: 'absolute', inset: 0,
              borderRadius: '0 3px 3px 0',
              overflow: 'hidden',
            }}>
              <PageContent
                page={pageObj(flip === 'next' ? pi : pi - 1)}
                notes={notesOn(flip === 'next' ? pi : pi - 1)}
                onTextChange={() => {}}
                onAddNote={() => {}}
                noteActions={noteActions}
                interactive={false}
                side="right"
                user={user}
              />
            </div>
            {/* Back face — blank paper while airborne */}
            <div style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              position: 'absolute', inset: 0,
              transform: 'rotateY(180deg)',
              borderRadius: '0 3px 3px 0',
            }} className="tex-page-aged">
              {/* Back face lighting */}
              <div style={{
                position:'absolute', inset:0,
                background:'linear-gradient(90deg,rgba(0,0,0,0.08) 0%,transparent 30%,rgba(255,255,255,0.04) 100%)',
                pointerEvents:'none',
              }}/>
            </div>
          </div>
        )}

        {/* ── Front cover (hinged at left spine) ──────────────── */}
        <div
          style={{
            position: 'absolute', inset: 0,
            transformStyle: 'preserve-3d',
            transformOrigin: 'left center',
            transition: 'transform 1s cubic-bezier(0.25,1,0.5,1)',
            transform: isOpen
              ? 'translateZ(5px) rotateY(-180deg)'
              : 'translateZ(5px) rotateY(0deg)',
            zIndex: isOpen ? 30 : 60,
            cursor: isOpen ? 'default' : 'pointer',
          }}
          onClick={() => !isOpen && setIsOpen(true)}
        >
          {/* Exterior face */}
          <div
            className="tex-leather"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              position: 'absolute', inset: 0,
              borderRadius: '2px 4px 4px 2px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              userSelect: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Leather gloss streak */}
            <div className="leather-gloss"/>

            {/* Leather edge darkening */}
            <div style={{
              position:'absolute', inset:0,
              background:'radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,0.28) 100%)',
              pointerEvents:'none',
            }}/>

            {/* Gold double border */}
            <div style={{position:'absolute',inset:12,border:'1px solid rgba(201,168,76,0.22)',borderRadius:2}}/>
            <div style={{position:'absolute',inset:16,border:'2px solid rgba(201,168,76,0.44)',borderRadius:1}}/>

            {/* Corner ornaments */}
            {[
              {top:18,left:18,   borderTop:'3px solid',borderLeft:'3px solid',   borderRadius:'4px 0 0 0'},
              {top:18,right:18,  borderTop:'3px solid',borderRight:'3px solid',  borderRadius:'0 4px 0 0'},
              {bottom:18,left:18, borderBottom:'3px solid',borderLeft:'3px solid',  borderRadius:'0 0 0 4px'},
              {bottom:18,right:18,borderBottom:'3px solid',borderRight:'3px solid', borderRadius:'0 0 4px 0'},
            ].map((s,i) => (
              <div key={i} style={{
                position:'absolute', width:22, height:22,
                borderColor:'rgba(201,168,76,0.65)', ...s,
              }}/>
            ))}

            <div style={{
              fontSize:52, marginBottom:14,
              filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.7))',
              position:'relative', zIndex:2,
            }}>
              🐝
            </div>
            <h1 className="gold-foil" style={{
              fontFamily:'var(--font-imfell)', fontSize:22,
              letterSpacing:'.22em', lineHeight:1.4,
              textAlign:'center', position:'relative', zIndex:2,
            }}>
              HIVE<br/>NOTES
            </h1>
            <div className="gold-rule" style={{width:56, margin:'10px 0', position:'relative', zIndex:2}}/>
            <p style={{
              fontFamily:'var(--font-cormorant)', fontSize:9,
              letterSpacing:'.32em', color:'rgba(201,168,76,0.42)',
              textTransform:'uppercase', position:'relative', zIndex:2,
            }}>Collaborative Journal</p>
            <p style={{
              position:'absolute', bottom:18, zIndex:2,
              fontFamily:'var(--font-cormorant)', fontSize:8,
              letterSpacing:'.3em', color:'rgba(201,168,76,0.3)',
              textTransform:'uppercase',
            }}>Click to unseal</p>
          </div>

          {/* Interior face (back of cover) */}
          <div
            className="tex-page-aged"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              position: 'absolute', inset: 0,
              transform: 'rotateY(180deg)',
              borderRadius: '2px 4px 4px 2px',
            }}
          />
        </div>

      </div>

      {/* Ground shadow */}
      <div className="book-ground-shadow"/>

    </div>
  )
}