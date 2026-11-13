import { useEffect, useRef } from 'react'

/** Flowing S-curves in sky blues: every line leaves the left edge at its own height and sweeps to the right, ending in a bright square
 *  (the same square as the loader beside the title). The heads sit in one narrow zone near the right. Lines swap depth slowly: near is thick,
 *  bright and big, far is thin, faint and small. They run until thinking is done. */
const W = 290
const H = 90

const LINES = [
  { c: '73,101,139', y0: 0.3, y1: 0.3, a0: 0.4, a1: 0.44, ph: 0.0, wz: 0.9, hx: 0.7 },
  { c: '118,156,211', y0: 0.55, y1: 0.5, a0: 0.42, a1: 0.38, ph: 1.3, wz: 0.75, hx: 0.76 },
  { c: '94,130,182', y0: 0.72, y1: 0.42, a0: 0.36, a1: 0.46, ph: 2.6, wz: 1.0, hx: 0.66 },
  { c: '160,183,222', y0: 0.42, y1: 0.68, a0: 0.42, a1: 0.36, ph: 3.9, wz: 0.85, hx: 0.73 },
  { c: '198,210,234', y0: 0.85, y1: 0.58, a0: 0.34, a1: 0.3, ph: 5.1, wz: 0.7, hx: 0.69 },
]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (x: number) => Math.max(0, Math.min(1, x))
const bez = (p: number[], t: number): [number, number] => {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]]
}

export function Waves({ done }: { done: boolean; idx?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
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
    let last = start
    let tt = 0 // the waves' own clock: it runs slower while the label is on
    const dim = 1
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      tt += dt
      const t = tt * 1.9
      ctx.clearRect(0, 0, W, H)
      const order = LINES.map((L) => ({ L, z: Math.sin(t * L.wz * 0.6 + L.ph) })).sort((a, b) => a.z - b.z)
      for (const { L, z } of order) {
        const k = (z + 1) / 2 // 0 far .. 1 near
        const hx = W * (L.hx + 0.035 * Math.sin(t * 0.7 + L.ph))
        const y0 = H * (L.y0 + L.a0 * Math.sin(t * 0.9 + L.ph))
        const yh = H * (L.y1 + L.a1 * Math.sin(t * 0.75 + L.ph * 1.7))
        // the two ends simply move up and down; the curve between them stays one smooth S
        const p = [-10, y0, hx * 0.3, y0, hx * 0.7, yh, hx, yh]
        const alpha = lerp(0.28, 0.95, k) * dim
        const head = bez(p, 1)
        const g = ctx.createLinearGradient(-10, 0, hx, 0)
        g.addColorStop(0, `rgba(${L.c},0)`)
        g.addColorStop(0.55, `rgba(${L.c},${alpha * 0.7})`)
        g.addColorStop(1, `rgba(${L.c},${alpha})`)
        ctx.strokeStyle = g
        ctx.lineWidth = lerp(1, 2.8, k)
        ctx.beginPath()
        for (let i = 0; i <= 44; i++) {
          const q = bez(p, i / 44)
          i === 0 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1])
        }
        ctx.stroke()
        // squarish head, the same shape as the loader beside the title
        const s = lerp(3, 6.5, k)
        ctx.save()
        ctx.globalAlpha = dim * lerp(0.5, 1, k)
        ctx.shadowColor = `rgba(${L.c},.9)`
        ctx.shadowBlur = lerp(4, 10, k)
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.roundRect(head[0] - s / 2, head[1] - s / 2, s, s, 1)
        ctx.fill()
        ctx.restore()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className={'wv' + (done ? ' off' : '')} aria-hidden="true">
      <canvas ref={ref} style={{ width: W, height: H }} />
    </div>
  )
}
