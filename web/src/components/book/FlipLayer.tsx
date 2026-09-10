'use client'

import { ReactNode } from 'react'

interface Props {
  direction: 'next' | 'prev'
  frontContent: ReactNode
  onDone: () => void
}

export default function FlipLayer({ direction, frontContent, onDone }: Props) {
  return (
    <div
      className="p3d absolute inset-y-0"
      style={{
        left: 0,
        right: 0,
        transformOrigin: 'left center',
        zIndex: 70,
        animation: direction === 'next'
          ? 'flip-next 0.72s cubic-bezier(0.4,0,0.2,1) forwards'
          : 'flip-prev 0.72s cubic-bezier(0.4,0,0.2,1) forwards',
      }}
      onAnimationEnd={onDone}
    >
      {/* Front face — the page content that lifts/lands */}
      <div className="bfh absolute inset-0 overflow-hidden"
        style={{borderRadius: '2px 4px 4px 2px'}}>
        {frontContent}
      </div>

      {/* Back face — blank paper texture while mid-air */}
      <div
        className="bfh absolute inset-0 tex-page-aged"
        style={{
          transform: 'rotateY(180deg)',
          borderRadius: '2px 4px 4px 2px',
        }}
      >
        {/* Depth shadow on back face */}
        <div className="absolute inset-0 pointer-events-none"
          style={{background:'radial-gradient(ellipse at 50% 50%,transparent 60%,rgba(0,0,0,0.08) 100%)'}}/>
      </div>
    </div>
  )
}