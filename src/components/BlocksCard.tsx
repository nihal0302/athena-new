import { useEffect, useMemo, useRef, useState } from 'react'
import type { Scenario } from '../data/scenario'
import { FREEZE, SPEED, type RunState } from '../hooks'
import { Icon } from './Icon'
import { AgentSteps } from './AgentSteps'

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
  'Reading question': '#769cd3', // Sky 700
  'Detecting intent': '#8174c4', // Ink 400
  'Planning enquiries': '#7ac9d4', // Turquoise
  'Routing to agents': '#c4644c', // Dusk
  'Checking totals': '#12b76a', // Success 500
  'Reconciling shares': '#FFD059', // Sun
  'Drafting summary': '#f07e48', // Terracotta
  'Adding sources': '#d6ac65', // Tan
}
const DOT_FALLBACK = ['#769cd3', '#c4644c', '#7ac9d4', '#FFD059', '#8174c4', '#f07e48']
const AGENT_DOTS = ['#c4644c', '#7ac9d4', '#FFD059', '#769cd3', '#8174c4', '#f07e48', '#12b76a']
const CURSOR_COLOR = '#2f245c'
const MAX_CHIPS = 3 // with many agents only the most recent few are named, so the grid stays calm
const cursorStart = (j: number) => ({ x: W - 12 - (j % 3) * 14, y: H - 10 - Math.floor(j / 3) * 12 })
const RUNS3 = [3, 3, 3, 2] // sums to COLS
const RUNS7 = [2, 2, 2, 2, 3] // smaller clicks so every one of seven agents gets a turn

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

type Group = { cells: number[]; cx: number; cy: number; agent: number; t: number }
type Model = {
  sc: Scenario
  nst: number
  rps: number // rows per step
  rows: number
  cells: number // cells per step
  gy: number
  fill: number[][] // absolute second at which each cell of each step is filled
  groups: Group[] // agents step: click groups, each owned by one agent
}

function buildModel(sc: Scenario): Model {
  const nst = sc.steps.length
  const rps = Math.max(1, Math.round(10 / nst))
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

  // Agents step: each click fills a run of 2-3 neighbouring blocks at once. Every agent owns some of the clicks
  // and works inside its own window (staggered start, own duration).
  let groups: Group[] = []
  const ag = sc.steps.findIndex((s) => s.style === 'agents')
  if (ag >= 0) {
    const na = Math.max(1, sc.agents.length)
    const runs = na > 3 ? RUNS7 : RUNS3
    const all: Group[] = []
    for (let rl = 0; rl < rps; rl++) {
      let c = 0
      for (const n of runs) {
        const cs = Array.from({ length: n }, (_, i) => rl * COLS + c + i)
        const a = xy(ag, cs[0])
        const b = xy(ag, cs[cs.length - 1])
        all.push({ cells: cs, cx: (a.x + b.x + SW) / 2, cy: a.y + SH / 2, agent: 0, t: 0 })
        c += n
      }
    }
    groups = perm(2, all.length).map((i) => all[i])
    groups.forEach((g, i) => (g.agent = i % na))
    for (let j = 0; j < na; j++) {
      const mine = groups.filter((g) => g.agent === j)
      const a = sc.agents[j]
      const t1 = sc.t0[ag] + (a?.start ?? 0)
      const span = (a?.dur ?? sc.steps[ag].dur) * 0.9
      mine.forEach((g, m) => {
        g.t = t1 + TRAVEL + ((m + 1) / (mine.length + 1)) * (span - TRAVEL)
        g.cells.forEach((k, n) => (fill[ag][k] = g.t + n * 0.07))
      })
    }
  }
  return { sc, nst, rps, rows, cells, gy, fill, groups }
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
  ctx.fillStyle = '#3a516f'
  ctx.fillText(text, x + 14, y + 0.5)
  ctx.restore()
}

const mixGrey = (g: number) =>
  `rgb(${Math.round(118 + (163 - 118) * g)},${Math.round(156 + (163 - 156) * g)},${Math.round(211 + (163 - 211) * g)})` // Sky 700 → Shale 400

function drawBlocks(ctx: CanvasRenderingContext2D, m: Model, tt: number, now: number, done: boolean, grey = 0) {
  const sc = m.sc
  ctx.clearRect(0, 0, W, H)

  // cells
  for (let si = 0; si < m.nst; si++) {
    for (let k = 0; k < m.cells; k++) {
      const { x, y } = cellXY(m, si, k)
      ctx.fillStyle = 'rgba(231,231,231,.9)'
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

  // agents step: one cursor per agent clicks its own blocks; the few most recent cursors carry a name chip
  const ag = sc.agentStep
  if (ag >= 0 && sc.agents.length) {
    const base = sc.t0[ag]
    if (tt >= base && tt <= base + sc.steps[ag].dur + 0.6) {
      const placed: Placed[] = []
      const centre = (g: Group) => ({ x: g.cx, y: g.cy })
      type Cur = { j: number; pos: { x: number; y: number }; a: number; last: number }
      const curs: Cur[] = []
      sc.agents.forEach((ag0, j) => {
        const t1 = base + ag0.start
        const a = Math.min(clamp((tt - t1) / 0.3), clamp(1 - (tt - (t1 + ag0.dur)) / 0.5))
        if (a <= 0) return
        const mine = m.groups.filter((g) => g.agent === j)
        let cur = -1
        mine.forEach((g, i) => {
          if (g.t - TRAVEL <= tt) cur = i
        })
        const start = cursorStart(j)
        let pos = start
        if (cur >= 0) {
          const target = centre(mine[cur])
          const prev = cur > 0 ? centre(mine[cur - 1]) : start
          const u = ease(clamp((tt - (mine[cur].t - TRAVEL)) / TRAVEL))
          pos = { x: prev.x + (target.x - prev.x) * u, y: prev.y + (target.y - prev.y) * u }
        }
        // click ripple over the group that was just filled
        for (const g of mine) {
          const dt = tt - g.t
          if (dt > 0 && dt < 0.45) {
            const cc = centre(g)
            ctx.save()
            ctx.globalAlpha = (1 - dt / 0.45) * 0.8 * a
            ctx.strokeStyle = CURSOR_COLOR
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
        ctx.fillStyle = CURSOR_COLOR
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.fill()
        ctx.restore()
        const lastClick = mine.reduce((acc, g) => (g.t <= tt ? g.t : acc), t1)
        curs.push({ j, pos, a, last: lastClick })
      })
      // name chips: only the most recently active cursors, so seven agents do not turn into seven labels
      curs
        .sort((x, y) => y.last - x.last)
        .slice(0, MAX_CHIPS)
        .forEach((c) => pill(ctx, sc.agents[c.j].short, c.pos.x + 26, c.pos.y + 14, AGENT_DOTS[c.j % AGENT_DOTS.length], c.a, false, placed))
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
  // the per-agent steps share the card; open by default, and open again for every new run
  const [open, setOpen] = useState(true)
  const fresh = run.t < 0.3
  useEffect(() => {
    if (fresh) setOpen(true)
  }, [fresh])
  // when thinking finishes the steps fold away by themselves (they can still be opened again)
  useEffect(() => {
    if (run.done) setOpen(false)
  }, [run.done])
  return (
    <div className={'bl-wrap' + (done ? ' done' : '')}>
      <div className="bl-ring" aria-hidden="true"><i /></div>
      <div className={'gbw' + (open ? ' open' : '')}>
      <div className={'gb bl' + (done ? ' done' : '')}>
        <div className="gb-left">
          <div className="gb-pane run" aria-hidden={done}>
            <div className="gb-click gb-step static" key={run.idx}>
              <span className="gb-stepname">{run.sc.steps[run.idx].live}</span>
              <span className="gb-dots"><i /><i /><i /></span>
            </div>
            <div className="gb-event" key={run.event}>{run.event}</div>
            <div className="gb-meta gm"><span className="gm-pct"><b>{run.pct}</b>%</span><span className="gm-time">{Math.round(run.t)}s elapsed</span></div>
          </div>
          <div className="gb-pane fin" aria-hidden={!done}>
            <div className="gb-click static">
              <span className="gb-done-title">Thinking completed</span>
            </div>
            <div className="gb-facts">{run.sc.chips.map((c) => <span key={c}>{c}</span>)}</div>
          </div>
        </div>
        <div className="gb-globe">
          <Blocks run={run} w={W} h={H} />
        </div>
      </div>
      <AgentSteps run={run} open={open} onToggle={() => setOpen(!open)} onTrace={onDetails} variant="globe" />
      </div>
    </div>
  )
}
