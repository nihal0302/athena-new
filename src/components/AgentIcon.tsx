import { useId, type ReactNode } from 'react'
import { Icon } from './Icon'

/** Filled, two-tone agent glyphs: a soft tinted badge with a gradient-filled symbol (in the spirit of the first agent mock-ups),
 *  instead of plain outline icons. The badge size comes from the parent; the colour is the agent's own. */
const W = { fill: 'none', stroke: '#fff', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const GLYPH: Record<string, ReactNode> = {
  users: (
    <>
      <circle cx="9" cy="8" r="3.7" />
      <path d="M2.5 20c0-3.8 2.9-6.2 6.5-6.2s6.5 2.4 6.5 6.2v.5h-13z" />
      <circle cx="17.2" cy="9" r="2.8" opacity=".55" />
      <path d="M16.6 13.7c3 .1 5.2 2 5.2 5v.5h-4.2c0-2-.5-3.9-1-5.5z" opacity=".55" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="5.8" rx="8.2" ry="3.1" />
      <path d="M3.8 8.6c0 1.7 3.7 3.1 8.2 3.1s8.2-1.4 8.2-3.1v3.4c0 1.7-3.7 3.1-8.2 3.1s-8.2-1.4-8.2-3.1z" opacity=".8" />
      <path d="M3.8 14.2c0 1.7 3.7 3.1 8.2 3.1s8.2-1.4 8.2-3.1v3c0 1.7-3.7 3.1-8.2 3.1s-8.2-1.4-8.2-3.1z" opacity=".55" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9.6" />
      <path d="M2.4 12h19.2M12 2.4c3.2 3 3.2 16.2 0 19.2M12 2.4c-3.2 3-3.2 16.2 0 19.2" {...W} strokeWidth="1.4" opacity=".85" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 4.6A1.6 1.6 0 014.6 3h6.2a2 2 0 011.4.6l8.2 8.2a2 2 0 010 2.8l-5.8 5.8a2 2 0 01-2.8 0l-8.2-8.2a2 2 0 01-.6-1.4z" />
      <circle cx="8" cy="8" r="1.8" fill="#fff" />
    </>
  ),
  layers: (
    <>
      <path d="M12 2.6l9.5 5-9.5 5-9.5-5z" />
      <path d="M2.5 11.3l9.5 5 9.5-5v2l-9.5 5-9.5-5z" opacity=".7" />
      <path d="M2.5 16.3l9.5 5 9.5-5v2l-9.5 5-9.5-5z" opacity=".45" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9.6" />
      <circle cx="12" cy="12" r="5.8" {...W} strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.2" fill="#fff" />
    </>
  ),
  chart: (
    <>
      <rect x="3.4" y="12" width="4.3" height="8.6" rx="1.3" />
      <rect x="9.9" y="5.5" width="4.3" height="15.1" rx="1.3" opacity=".8" />
      <rect x="16.3" y="9" width="4.3" height="11.6" rx="1.3" opacity=".6" />
    </>
  ),
  bank: (
    <>
      <path d="M12 2.5l9.6 5v2.2H2.4V7.5z" />
      <rect x="4.4" y="11.4" width="3.2" height="6.4" rx=".9" opacity=".8" />
      <rect x="10.4" y="11.4" width="3.2" height="6.4" rx=".9" opacity=".8" />
      <rect x="16.4" y="11.4" width="3.2" height="6.4" rx=".9" opacity=".8" />
      <rect x="2.4" y="19.2" width="19.2" height="2.4" rx="1" />
    </>
  ),
  msg: (
    <>
      <path d="M4 3.8h16a2.2 2.2 0 012.2 2.2v9a2.2 2.2 0 01-2.2 2.2h-7.6l-5.2 3.8v-3.8H4A2.2 2.2 0 011.8 15V6A2.2 2.2 0 014 3.8z" />
      <circle cx="7.8" cy="10.5" r="1.3" fill="#fff" />
      <circle cx="12" cy="10.5" r="1.3" fill="#fff" />
      <circle cx="16.2" cy="10.5" r="1.3" fill="#fff" />
    </>
  ),
  eye: (
    <>
      <path d="M1.4 12C3.9 7 7.7 4.5 12 4.5S20.1 7 22.6 12c-2.5 5-6.3 7.5-10.6 7.5S3.9 17 1.4 12z" />
      <circle cx="12" cy="12" r="3.8" fill="#fff" />
      <circle cx="12" cy="12" r="1.8" />
    </>
  ),
  doc: (
    <>
      <path d="M6.5 2.5H14l5 5V20a1.6 1.6 0 01-1.6 1.6H6.5A1.6 1.6 0 014.9 20V4.1A1.6 1.6 0 016.5 2.5z" />
      <path d="M8.4 11.8h7.2M8.4 15.4h7.2M8.4 8.4h3" {...W} strokeWidth="1.5" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="3.2" />
      <circle cx="18" cy="6" r="3.2" />
      <path d="M6 14.8V11a4 4 0 014-4h4" {...W} strokeWidth="2" stroke="currentColor" opacity=".9" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20l1.2-4.6L16.6 4a2 2 0 012.8 0l1 1a2 2 0 010 2.8L9 19.2z" />
      <path d="M14.5 6.2l3.3 3.3" {...W} strokeWidth="1.4" opacity=".85" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.4l8.6 3v6.4c0 5-3.6 8.5-8.6 9.8-5-1.3-8.6-4.8-8.6-9.8V5.4z" />
      <path d="M8.2 12.2l2.6 2.6 5-5.4" {...W} strokeWidth="1.8" />
    </>
  ),
}

export function AgentIcon({ n, size = 12 }: { n: string; size?: number }) {
  const id = useId().replace(/:/g, '')
  const g = GLYPH[n]
  if (!g) return <Icon n={n} size={size} />
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--c) 72%, #fff)' }} />
          <stop offset="1" style={{ stopColor: 'var(--c)' }} />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>{g}</g>
    </svg>
  )
}
