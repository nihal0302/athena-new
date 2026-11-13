import { useEffect, useRef } from 'react'

/** A patch of small square cells, very faint, thicker toward the right. Every moment a few of them light up (sometimes a small group
 *  together) and then dim away; a little later different ones light up. Never everything at once. Brand ink, with a soft glow.
 *  When thinking is done the blinking stops and a few cells stay softly lit, very faint. */
const W = 290
const H = 90
const PITCH = 10
const CELL = 7
const COLS = Math.floor(W / PITCH)
const ROWS = Math.floor(H / PITCH)

type Flash = { c: number; r: number; t0: number; dur: number }

export function PixelField({ done }: { done: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(done)
  doneRef.current = done
  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = W * dpr
    cv.height = H * dpr
    ctx.scale(dpr, dpr)
    // which cells exist: patchy, denser toward the right and a little toward the bottom, like the reference
    const cells: { c: number; r: number }[] = []
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        const p = 0.12 + 0.78 * Math.pow(c / (COLS - 1), 1.4) * (0.7 + 0.3 * (r / (ROWS - 1)))
        if (Math.random() < p) cells.push({ c, r })
      }
    const right = cells.filter((x) => x.c > COLS * 0.3)
    // when thinking is done the blinking stops and these few cells stay softly lit
    const rest = [...right].sort(() => Math.random() - 0.5).slice(0, 9)
    let restA = 0
    let flashes: Flash[] = []
    let raf = 0
    let next = 0
    const loop = (now: number) => {
      restA += ((doneRef.current ? 1 : 0) - restA) * 0.04
      if (now >= next && !doneRef.current) {
        // a few cells light together, sometimes a small neighbouring group
        const group = Math.random() < 0.35 ? 2 + Math.floor(Math.random() * 3) : 1
        const o = right[Math.floor(Math.random() * right.length)]
        for (let g = 0; g < group; g++) {
          const cell = g === 0 ? o : cells.find((x) => x.c === o.c + Math.floor(Math.random() * 3) - 1 && x.r === o.r + Math.floor(Math.random() * 3) - 1) ?? o
          flashes.push({ c: cell.c, r: cell.r, t0: now + g * 40, dur: 900 + Math.random() * 900 })
        }
        next = now + 140 + Math.random() * 260
      }
      flashes = flashes.filter((f) => now - f.t0 < f.dur)
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(47,36,92,.07)'
      for (const x of cells) ctx.fillRect(x.c * PITCH, x.r * PITCH, CELL, CELL)
      if (restA > 0.01) {
        ctx.fillStyle = `rgba(47,36,92,${0.2 * restA})`
        for (const x of rest) ctx.fillRect(x.c * PITCH, x.r * PITCH, CELL, CELL)
      }
      for (const f of flashes) {
        const age = (now - f.t0) / f.dur
        if (age < 0) continue
        const a = age < 0.12 ? age / 0.12 : Math.pow(1 - (age - 0.12) / 0.88, 1.6) // quick on, slow dim
        ctx.save()
        ctx.shadowColor = `rgba(47,36,92,${0.6 * a})`
        ctx.shadowBlur = 8
        ctx.fillStyle = `rgba(47,36,92,${0.1 + 0.9 * a})`
        ctx.fillRect(f.c * PITCH, f.r * PITCH, CELL, CELL)
        ctx.restore()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="wv pf" aria-hidden="true">
      <canvas ref={ref} style={{ width: W, height: H }} />
    </div>
  )
}
