import { useEffect, useMemo, useRef } from 'react'
import type { Scenario } from '../data/scenario'
import { FREEZE, SPEED, fmt, type RunState } from '../hooks'
import { Icon } from './Icon'

/* ------------------------------------------------------------------ */
/*  Building blocks.                                                   */
/*  A grid of small blocks. Each thinking step owns a band of rows     */
/*  (the first step is the bottom). Rows fill as the step runs, with a */
/*  different animation per step. Everything is a pure function of     */
/*  elapsed time. The number of rows per step depends on how many      */
/*  steps the scenario has, so the grid is always about the same size: */
/*  5 steps -> 2 rows each, 3 steps -> 3 rows each, 2 steps -> 5 each. */
/* ------------------------------------------------------------------ */
const COLS = 11
const PX = 15.2 // horizontal pitch
const PY = 7.4 // vertical pitch
const SW = 11.5 // block width
const SH = 5 // block height
const W = 168
const H = 90
const GX = (W - COLS * PX) / 2 + (PX - SW) / 2
const TRAVEL = 0.35 // seconds an agent cursor takes to reach its next block

// the small dot inside each chip has its own colour (blocks and cursors stay a single colour)
const LABEL_DOT: Record<string, string> = {
  'Reading question': '#5b8def',
  'Detecting intent': '#9a7bf2',
  'Planning enquiries': '#2bb8d6',
  'Routing to agents': '#f06fa0',
  'Checking totals': '#3cc79a',
  'Reconciling shares': '#f2b544',
  'Drafting summary': '#f28b54',
  'Adding sources': '#5d63e6',
}
const DOT_FALLBACK = ['#5b8def', '#e8618c', '#35b6a5', '#f2b544', '#9a7bf2', '#f28b54']
const AGENT_DOTS = ['#e8618c', '#35b6a5']
const AGENT_NAMES = ['Buyer profiles', 'Transactions']
const NCUR = AGENT_NAMES.length
const AGENT_COLORS = ['#2f245c', '#2f245c']
const CURSOR_START = [
  { x: W - 30, y: H - 30 },
  { x: W - 14, y: H - 16 },
]
const RUNS = [3, 3, 3, 2] // sums to COLS

const clamp = (v: number) => Math.max(0, Math.min(1, v))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const perm = (seed: number, n: number) => {
  let s = seed * 7919 + 13
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const inverse = (p: number[]) => {
  const inv = new Array<number>(p.length)
  p.forEach((v, i) => (inv[v] = i))
  return inv
}

type Group = { cells: number[]; cx: number; cy: number }
type Model = {
  sc: Scenario
  nst: number
  rps: number // rows per step
  rows: number
  cells: number // cells per step
  gy: number
  fill: number[][] // absolute second at which each cell of each step is filled
  groups: Group[] // agents step: click groups, in fill order
  agFill: number[]
}

function buildModel(sc: Scenario): Model {
  const nst = sc.steps.length
  const rps = Math.max(2, Math.round(10 / nst))
  const rows = rps * nst
  const cells = COLS * rps
  const gy = H - rows * PY - 4 // anchored to the bottom, leaving headroom for the chip above the top step
  const xy = (si: number, k: number) => {
    const c = k % COLS
    const r = si * rps + Math.floor(k / COLS)
    return { x: GX + c * PX, y: gy + (rows - 1 - r) * PY }
  }

  const fill = sc.steps.map((s, si) => {
    const base = sc.t0[si]
    const win = s.dur * 0.88
    const inv = inverse(perm(si + 1, cells))
    const out = new Array<number>(cells)
    for (let k = 0; k < cells; k++) {
      const c = k % COLS
      const rl = Math.floor(k / COLS) // local row, bottom-up
      if (s.style === 'rows') out[k] = base + (k / cells) * win // row by row, left to right
      else if (s.style === 'scatter') out[k] = base + (inv[k] / cells) * win // scattered: planning / searching
      else if (s.style === 'agents') out[k] = base + win // overwritten below, per click group
      else if (s.style === 'scan') out[k] = base + ((c + rl * 0.35) / (COLS + 1)) * win // scan sweeps across
      else out[k] = base + (((rps - 1 - rl) * COLS + c) / cells) * win // writing: top line first
    }
    return out
  })

  // Agents step: each click fills a run of 2-3 neighbouring blocks at once.
  let groups: Group[] = []
  let agFill: number[] = []
  const ag = sc.steps.findIndex((s) => s.style === 'agents')
  if (ag >= 0) {
    const all: Group[] = []
    for (let rl = 0; rl < rps; rl++) {
      let c = 0
      for (const n of RUNS) {
        const cs = Array.from({ length: n }, (_, i) => rl * COLS + c + i)
        const a = xy(ag, cs[0])
        const b = xy(ag, cs[cs.length - 1])
        all.push({ cells: cs, cx: (a.x + b.x + SW) / 2, cy: a.y + SH / 2 })
        c += n
      }
    }
    groups = perm(2, all.length).map((i) => all[i])
    const win = sc.steps[ag].dur * 0.88
    agFill = groups.map((_, i) => sc.t0[ag] + TRAVEL + (i / groups.length) * (win - TRAVEL))
    groups.forEach((g, i) => g.cells.forEach((k, n) => (fill[ag][k] = agFill[i] + n * 0.07)))
  }
  return { sc, nst, rps, rows, cells, gy, fill, groups, agFill }
}

const cellXY = (m: Model, si: number, k: number) => {
  const c = k % COLS
  const r = si * m.rps + Math.floor(k / COLS)
  return { x: GX + c * PX, y: m.gy + (m.rows - 1 - r) * PY }
}

type Placed = { x: number; y: number; w: number }
function pill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  accent: string,
  alpha: number,
  glass = true,
  placed?: Placed[],
) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = '500 8px Poppins, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const tw = ctx.measureText(text).width
  const w = tw + 20
  const x = Math.max(2, Math.min(W - w - 2, cx - w / 2))
  let y = Math.max(8, Math.min(H - 11, cy))
  if (placed) {
    // keep chips from sitting on top of each other: try the nearest free slot above/below the wanted spot
    const clampY = (v: number) => Math.max(8, Math.min(H - 11, v))
    const clash = (yy: number) => placed.some((r) => x < r.x + r.w + 2 && x + w > r.x - 2 && Math.abs(yy - r.y) < 15)
    for (const o of [0, 16, -16, 32, -32, 48, -48]) {
      const yy = clampY(y + o)
      if (!clash(yy)) {
        y = yy
        break
      }
    }
    placed.push({ x, y, w })
  }
  ctx.shadowColor = 'rgba(47,36,92,.22)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  ctx.fillStyle = glass ? 'rgba(255,255,255,.78)' : 'rgba(255,255,255,.92)'
  ctx.strokeStyle = 'rgba(255,255,255,.95)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y - 7.5, w, 15, 7.5)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(x + 8, y, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#46566e'
  ctx.fillText(text, x + 14, y + 0.5)
  ctx.restore()
}

const mixGrey = (g: number) =>
  `rgb(${Math.round(106 + (112 - 106) * g)},${Math.round(136 + (120 - 136) * g)},${Math.round(238 + (135 - 238) * g)})`

function drawBlocks(ctx: CanvasRenderingContext2D, m: Model, tt: number, now: number, done: boolean, grey = 0) {
  const sc = m.sc
  ctx.clearRect(0, 0, W, H)

  // cells
  for (let si = 0; si < m.nst; si++) {
    for (let k = 0; k < m.cells; k++) {
      const { x, y } = cellXY(m, si, k)
      ctx.fillStyle = 'rgba(70,86,110,.13)'
      ctx.beginPath()
      ctx.roundRect(x, y, SW, SH, 1.4)
      ctx.fill()
      const amt = clamp((tt - m.fill[si][k]) / 0.3)
      if (amt > 0) {
        const s = 1 + 0.55 * (1 - amt)
        const sw = SW * s
        const sh = SH * s
        const ox = (SW - sw) / 2
        const oy = (SH - sh) / 2
        ctx.globalAlpha = 0.4 + 0.6 * amt
        ctx.fillStyle = mixGrey(grey)
        ctx.beginPath()
        ctx.roundRect(x + ox, y + oy, sw, sh, 1.4)
        ctx.fill()
        ctx.globalAlpha = 1
        if (done) {
          // finished: a very soft light wave drifts diagonally across the filled blocks
          const c = k % COLS
          const r = si * m.rps + Math.floor(k / COLS)
          const wv = Math.max(0, Math.sin(c * 0.45 + (m.rows - r) * 0.35 - now * 0.0016))
          if (wv > 0) {
            ctx.fillStyle = `rgba(255,255,255,${0.35 * wv})`
            ctx.beginPath()
            ctx.roundRect(x, y, SW, SH, 1.4)
            ctx.fill()
          }
        }
      }
    }
  }

  // a glass scan bar sweeps across the rows of any "scan" step (validation)
  sc.steps.forEach((s, si) => {
    if (s.style !== 'scan') return
    const base = sc.t0[si]
    const win = s.dur * 0.88
    if (tt >= base && tt <= base + win + 0.3) {
      const x = GX + clamp((tt - base) / win) * (COLS * PX) - 3
      const yTop = m.gy + (m.rows - 1 - (si * m.rps + m.rps - 1)) * PY - 2
      const g = ctx.createLinearGradient(x - 4, 0, x + 6, 0)
      g.addColorStop(0, 'rgba(255,255,255,0)')
      g.addColorStop(0.5, 'rgba(255,255,255,.85)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - 4, yTop, 10, m.rps * PY + 3)
    }
  })

  // stage chips (glass) just above the first row of the active step; the agents step uses cursors instead
  sc.steps.forEach((s, si) => {
    if (s.style === 'agents' || !s.sub.length) return
    const base = sc.t0[si]
    const d = s.dur
    if (tt < base || tt > base + d) return
    const a = Math.min(clamp((tt - base) / 0.3), clamp((base + d - tt) / 0.3))
    const li = Math.min(s.sub.length - 1, Math.floor(clamp((tt - base) / d) * s.sub.length))
    const text = s.sub[li]
    const yTop = m.gy + (m.rows - 1 - (si * m.rps + m.rps - 1)) * PY
    pill(ctx, text, GX + 40 + si * 12, yTop - 10, LABEL_DOT[text] ?? DOT_FALLBACK[(si * 2 + li) % DOT_FALLBACK.length], a)
  })

  // agents step: two cursors with name chips click; each click fills 2-3 blocks at once
  const ag = sc.agentStep
  if (ag >= 0) {
    const base = sc.t0[ag]
    const d = sc.steps[ag].dur
    const win = d * 0.88
    if (tt >= base && tt <= base + d + 0.6) {
      const placed: Placed[] = []
      const centre = (g: Group) => ({ x: g.cx, y: g.cy })
      for (let j = 0; j < NCUR; j++) {
        // index of the latest group this cursor has started travelling to
        let cur = -1
        for (let i = j; i < m.groups.length; i += NCUR) {
          if (m.agFill[i] - TRAVEL <= tt) cur = i
          else break
        }
        const start = CURSOR_START[j]
        let pos = start
        if (cur >= 0) {
          const target = centre(m.groups[cur])
          const prev = cur - NCUR >= 0 ? centre(m.groups[cur - NCUR]) : start
          const u = ease(clamp((tt - (m.agFill[cur] - TRAVEL)) / TRAVEL))
          pos = { x: prev.x + (target.x - prev.x) * u, y: prev.y + (target.y - prev.y) * u }
        }
        const a = Math.min(clamp((tt - base) / 0.3), clamp(1 - (tt - (base + win)) / 0.5))
        if (a <= 0) continue
        // click ripple over the group that was just filled
        for (let i = j; i < m.groups.length; i += NCUR) {
          const dt = tt - m.agFill[i]
          if (dt > 0 && dt < 0.45) {
            const cc = centre(m.groups[i])
            ctx.save()
            ctx.globalAlpha = (1 - dt / 0.45) * 0.8 * a
            ctx.strokeStyle = AGENT_COLORS[j]
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.ellipse(cc.x, cc.y, 4 + (dt / 0.45) * 14, 3 + (dt / 0.45) * 7, 0, 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
          }
        }
        // arrow
        ctx.save()
        ctx.globalAlpha = a
        ctx.translate(pos.x, pos.y)
        ctx.scale(0.85, 0.85)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(0, 11)
        ctx.lineTo(3, 8.3)
        ctx.lineTo(5.2, 12.6)
        ctx.lineTo(7.2, 11.7)
        ctx.lineTo(5, 7.4)
        ctx.lineTo(8.6, 7)
        ctx.closePath()
        ctx.fillStyle = AGENT_COLORS[j]
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.fill()
        ctx.restore()
        pill(ctx, AGENT_NAMES[j], pos.x + 26, pos.y + 14, AGENT_DOTS[j], a, false, placed)
      }
    }
  }
}

function Blocks({ run, w, h }: { run: RunState; w: number; h: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const model = useMemo(() => buildModel(run.sc), [run.sc])
  const modelRef = useRef(model)
  modelRef.current = model
  const state = useRef({ t: run.t, at: performance.now(), done: run.done })
  if (state.current.t !== run.t || state.current.done !== run.done) {
    state.current = { t: run.t, at: performance.now(), done: run.done }
  }

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = W * dpr
    cv.height = H * dpr
    ctx.scale(dpr, dpr)
    let raf = 0
    let doneAt = -1
    const loop = (now: number) => {
      const s = state.current
      const m = modelRef.current
      // when thinking finishes the blocks fade from blue to grey over ~0.9s
      if (s.done) {
        if (doneAt < 0) doneAt = now
      } else doneAt = -1
      const grey = s.done ? clamp((now - doneAt) / 900) : 0
      // smooth between the ~20Hz run updates so cursors and fills glide
      const tt = s.done ? m.sc.total : Math.min(m.sc.total, s.t + (FREEZE > 0 ? 0 : Math.min(0.12, (performance.now() - s.at) / 1000) * SPEED))
      // once the blocks have faded out completely there is nothing left to draw
      if (!(s.done && now - doneAt > 1600)) drawBlocks(ctx, m, tt, now, s.done, grey)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className="gb-canvas" style={{ width: w, height: h, aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
}

/* ------------------------------------------------------------------ */
/*  Card (same text layout as the globe)                               */
/* ------------------------------------------------------------------ */
export function BlocksCard({ run, onDetails }: { run: RunState; onDetails: () => void }) {
  const done = run.done
  return (
    <div className={'bl-wrap' + (done ? ' done' : '')}>
      <div className="bl-ring" aria-hidden="true"><i /></div>
      <div className={'gb bl' + (done ? ' done' : '')}>
        <div className="gb-left">
          <div className="gb-pane run" aria-hidden={done}>
            <button className="gb-click gb-step" key={run.idx} onClick={onDetails} aria-label="Open detailed view" tabIndex={done ? -1 : 0}>
              <span className="gb-stepname">{run.sc.steps[run.idx].live}</span>
              <span className="gb-dots"><i /><i /><i /></span>
              <Icon n="right" size={16} className="gb-chev" />
            </button>
            <div className="gb-event" key={run.event}>{run.event}</div>
            <div className="gb-meta"><span>{fmt(run.t)}</span><i /><span>{run.pct}% complete</span></div>
          </div>
          <div className="gb-pane fin" aria-hidden={!done}>
            <button className="gb-click" onClick={onDetails} aria-label="Open detailed view" tabIndex={done ? 0 : -1}>
              <span className="gb-done-title">Thinking completed</span>
              <Icon n="right" size={16} className="gb-chev" />
            </button>
            <div className="gb-facts">{run.sc.chips.map((c) => <span key={c}>{c}</span>)}</div>
          </div>
        </div>
        <div className="gb-globe">
          <Blocks run={run} w={W} h={H} />
        </div>
      </div>
    </div>
  )
}
