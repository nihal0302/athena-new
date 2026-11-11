import type { CSSProperties } from 'react'

const P: Record<string, string> = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chev: 'M6 9l6 6 6-6',
  right: 'M9 6l6 6-6 6',
  left: 'M19 12H5M11 6l-6 6 6 6',
  search: 'M20 20l-3.5-3.5M18 11a7 7 0 11-14 0 7 7 0 0114 0z',
  gear: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  chip: 'M8 6h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2zM10 10h4v4h-4zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3',
  plus: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 8v8M8 12h8',
  plus2: 'M12 5v14M5 12h14',
  panel: 'M6 4h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3zM9 4v16',
  sliders: 'M4 8h9M17 8h3M4 16h3M11 16h9M17 8a2 2 0 11-4 0 2 2 0 014 0zM11 16a2 2 0 11-4 0 2 2 0 014 0z',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  x: 'M6 6l12 12M18 6L6 18',
  dl: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  cal: 'M7 5h10a3 3 0 013 3v9a3 3 0 01-3 3H7a3 3 0 01-3-3V8a3 3 0 013-3zM4 10h16M9 3v4M15 3v4',
  clip: 'M20 11l-8.5 8.5a5 5 0 01-7-7L13 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L14 7',
  mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3',
  send: 'M3 11l18-8-7 18-3-7zM11 14l10-11',
  users: 'M13 8a4 4 0 11-8 0 4 4 0 018 0zM2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6',
  db: 'M20 6c0 1.7-3.6 3-8 3S4 7.7 4 6s3.6-3 8-3 8 1.3 8 3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  route: 'M8.5 5H15a3 3 0 010 6H9a3 3 0 000 6h6.5M8.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM20.5 19a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  pen: 'M4 20l1-4L17 4l3 3L8 19zM14 7l3 3',
  chart: 'M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-8',
  globe: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  bank: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  cloud: 'M7 18a4.5 4.5 0 01-.5-9A6 6 0 0118 10a4 4 0 011 8z',
  wallet: 'M6 6h12a3 3 0 013 3v8a3 3 0 01-3 3H6a3 3 0 01-3-3V9a3 3 0 013-3zM3 10h18M16 15h2',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  target: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM17 12a5 5 0 11-10 0 5 5 0 0110 0zM13 12a1 1 0 11-2 0 1 1 0 012 0z',
  doc: 'M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h7',
  copy: 'M20 10v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2h8a2 2 0 012 2zM16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2',
  up: 'M7 11v9H4v-9zM7 11l4-8c2 0 3 1.5 2.5 3.5L13 9h6a2 2 0 012 2.3l-1.2 7A2 2 0 0117.8 20H7',
  down: 'M17 13V4h3v9zM17 13l-4 8c-2 0-3-1.5-2.5-3.5L11 15H5a2 2 0 01-2-2.3l1.2-7A2 2 0 016.2 4H17',
  redo: 'M20 5v5h-5M20 10a8 8 0 10.5 5',
  lock: 'M7 11h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2zM8 11V7a4 4 0 018 0v4',
  msg: 'M4 5h16v11H9l-5 4z',
  warn: 'M12 3l10 18H2zM12 10v5M12 18v.1',
}

export function Icon({ n, size = 18, style, className }: { n: string; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg
      className={'i' + (className ? ' ' + className : '')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      aria-hidden="true"
    >
      <path d={P[n] || ''} />
    </svg>
  )
}

/** Gold twin-sparkle used inside the assistant avatar circle (vector redraw of the supplied icon) */
export function GoldSparkle({ size = 24 }: { size?: number }) {
  const star = (cx: number, cy: number, rh: number, rv: number, k: number) =>
    `M${cx} ${cy - rv}Q${cx + k} ${cy - k} ${cx + rh} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + rv}Q${cx - k} ${cy + k} ${cx - rh} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - rv}Z`
  return (
    <svg width={size} height={size * (27 / 26)} viewBox="0 0 26 27" aria-hidden="true">
      <path className="gs-a" d={star(10, 15.6, 10, 10.5, 1.7)} fill="#FFCF5A" />
      <path className="gs-b" d={star(20.4, 9.4, 5.5, 5.5, 1.1)} fill="#FFCF5A" />
    </svg>
  )
}

/** Aldar X sparkle mark (blue star + sun accent) */
export function Sparkle({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="spg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a8cff" />
          <stop offset="1" stopColor="#5b5bf0" />
        </linearGradient>
      </defs>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="url(#spg)" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" fill="#FFD059" />
    </svg>
  )
}

/** Aldar X agent logo (orange mark). Height = size, width follows the 44:40 artwork. */
export function AldarLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={(size * 44) / 40} height={size} viewBox="0 0 44 40" fill="none" aria-hidden="true">
      <path fill="#F66B00" d="M27.6259 0C29.0854 0 30.429 0.795019 31.1317 2.07422L43.2606 24.1602C44.5164 26.4467 44.1509 29.2825 42.3563 31.1758L35.1757 38.752C34.4204 39.5486 33.3711 39.9999 32.2733 40H31.0048C28.4795 40 26.1011 38.8111 24.5858 36.791C23.251 35.0112 22.7144 32.7565 23.1054 30.5664L24.2919 23.9219C24.7134 21.5624 26.5533 19.711 28.9101 19.2744L38.4931 17.5L37.9931 16.5L28.9843 14.7676C26.5739 14.3041 24.6891 12.4191 24.2255 10.0088L22.4931 1H21.4931L19.7606 10.0088C19.2971 12.4192 17.4113 14.304 15.0009 14.7676L5.99306 16.5L5.49306 17.5L15.0751 19.2744C17.4319 19.7109 19.2718 21.5624 19.6933 23.9219L20.8798 30.5664C21.2708 32.7566 20.7342 35.0112 19.3993 36.791C17.8841 38.811 15.5064 39.9999 12.9813 40H11.7118C10.6145 40 9.56474 39.5489 8.80947 38.7529L1.64736 31.2051C-0.147365 29.3135 -0.514727 26.4792 0.738182 24.1924L12.8544 2.07812C13.5564 0.796774 14.9011 2.44132e-05 16.3622 0H27.6259Z" />
    </svg>
  )
}
