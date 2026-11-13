import { useEffect, useState } from 'react'

/** A tiny 3 x 3 pixel loader (9 cells, one colour, soft glow). The lit cells jump quickly from one block pattern to the next,
 *  like the loader in the reference pin: L shapes, bars and corners that fill and empty in a fast loop.
 *  Always drawn in currentColor: brand ink. */
const FRAMES = [
  '110 100 111', // top-left block over a base
  '110 101 111',
  '100 100 111', // L shape
  '000 100 111',
  '000 000 111', // bottom bar
  '001 011 111', // right stair
  '011 011 111',
  '011 001 011',
  '111 101 000',
  '110 110 000',
  '100 110 110',
  '101 111 010',
].map((s) => s.replace(/ /g, ''))

export function PixelLoader({ size = 16, done = false }: { size?: number; done?: boolean }) {
  const [f, setF] = useState(0)
  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => setF((x) => (x + 1) % FRAMES.length), 110)
    return () => window.clearInterval(id)
  }, [done])
  // finished: hold one full block and let a slow glare rise through it
  const cells = done ? '111111111' : FRAMES[f]
  return (
    <span className={'pxl' + (done ? ' done' : '')} style={{ width: size, height: size }} role="status" aria-label={done ? 'Thinking completed' : 'Thinking'}>
      {Array.from(cells).map((c, i) => (
        <i key={i} className={c === '1' ? 'on' : ''} />
      ))}
    </span>
  )
}
