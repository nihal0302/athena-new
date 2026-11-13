import { useEffect, useRef, useState } from 'react'

/** Flowing S-curves, like the reference: every line leaves the left edge at its own height and sweeps to the right, ending in a bright
 *  blob. The blobs all sit in one narrow zone near the right, so the lines travel together. Each line slowly swaps depth with the others:
 *  near it is thick, bright and has a big blob; far it is thin, faint and small, so they seem to pass in front of and behind each other.
 *  After a few seconds everything fades out slowly, a glass label with the current part of the process shows in the middle, and the
 *  lines fade back in. Repeats until thinking is done. The edges are soft so nothing ends abruptly. */
const W = 250
const H = 90
const FLOW = 7000
const FADE = 900
const HOLD = 2300
const CYCLE = FLOW + HOLD + FADE * 2
const LABELS = ['Reading the request', 'Calling the agents', 'Matching sources', 'Checking the figures', 'Writing the answer']

const LINES = [
  { c: '47,36,92', y0: 0.3, y1: 0.3, a0: 0.2, a1: 0.26, ph: 0.0, wz: 0.55, hx: 0.7 },
  { c: '122,201,212', y0: 0.55, y1: 0.5, a0: 0.22, a1: 0.2, ph: 1.3, wz: 0.45, hx: 0.76 },
  { c: '138,107,255', y0: 0.72, y1: 0.42, a0: 0.18, a1: 0.28, ph: 2.6, wz: 0.6, hx: 0.66 },
  { c: '214,172,101', y0: 0.42, y1: 0.68, a0: 0.24, a1: 0.18, ph: 3.9, wz: 0.5, hx: 0.73 },
  { c: '196,100,76', y0: 0.85, y1: 0.58, a0: 0.16, a1: 0.22, ph: 5.1, wz: 0.4, hx: 0.69 },
]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const bez = (p: number[], t: number): [number, number] => {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]]
}

export function Waves({ done, idx }: { done: boolean; idx: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [label, setLabel] = useState<string | null>(null)
  const idxRef = useRef(idx)
  idxRef.current = idx
  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = W * dpr
    cv.height = H * dpr
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    let raf = 0
    const start = performance.now()
    let showing = false
    let round = -1
    const loop = (now: number) => {
      const el = now - start
      const cyc = el % CYCLE
      // visibility: 1 while flowing, fades to 0 over FADE, stays 0 for the label, fades back in
      const vis = cyc < FLOW ? 1 : cyc < FLOW + FADE ? 1 - (cyc - FLOW) / FADE : cyc < FLOW + FADE + HOLD ? 0 : (cyc - FLOW - FADE - HOLD) / FADE
      const show = cyc >= FLOW + FADE * 0.6 && cyc < FLOW + FADE + HOLD + FADE * 0.2
      if (show !== showing) {
        showing = show
        setLabel(show ? LABELS[idxRef.current % LABELS.length] : null)
      }
      const r = Math.floor(el / CYCLE)
      if (r !== round) round = r
      const t = el / 1000
      ctx.clearRect(0, 0, W, H)
      if (vis > 0.01) {
        const order = LINES.map((L) => ({ L, z: Math.sin(t * L.wz + L.ph) })).sort((a, b) => a.z - b.z) // far first, near last
        for (const { L, z } of order) {
          const k = (z + 1) / 2 // 0 far .. 1 near
          const hx = W * (L.hx + 0.035 * Math.sin(t * 0.7 + L.ph))
          const y0 = H * (L.y0 + L.a0 * Math.sin(t * 0.6 + L.ph))
          const yh = H * (L.y1 + L.a1 * Math.sin(t * 0.5 + L.ph * 1.7))
          const p = [-10, y0, hx * 0.38, y0, hx * 0.62, yh, hx, yh]
          const alpha = lerp(0.28, 0.95, k) * vis
          const head = bez(p, 1)
          const g = ctx.createLinearGradient(-10, 0, hx, 0)
          g.addColorStop(0, `rgba(${L.c},0)`)
          g.addColorStop(0.55, `rgba(${L.c},${alpha * 0.7})`)
          g.addColorStop(1, `rgba(${L.c},${alpha})`)
          ctx.strokeStyle = g
          ctx.lineWidth = lerp(1, 2.8, k)
          ctx.beginPath()
          for (let i = 0; i <= 40; i++) {
            const q = bez(p, i / 40)
            i === 0 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1])
          }
          ctx.stroke()
          ctx.save()
          ctx.globalAlpha = vis * lerp(0.5, 1, k)
          ctx.shadowColor = `rgba(${L.c},.9)`
          ctx.shadowBlur = lerp(4, 10, k)
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.arc(head[0], head[1], lerp(1.6, 4, k), 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className={'wv' + (done ? ' off' : '')} aria-hidden="true">
      <canvas ref={ref} style={{ width: W, height: H }} />
      <span className={'wv-label' + (label ? ' on' : '')}>{label ?? ''}</span>
    </div>
  )
}
