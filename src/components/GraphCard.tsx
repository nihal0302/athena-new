import { useEffect, useMemo, useRef, useState } from 'react'
import type { Scenario } from '../data/scenario'
import { FREEZE, SPEED, fmt, type RunState } from '../hooks'
import { Icon } from './Icon'

/* ------------------------------------------------------------------ */
/*  Node graph.                                                        */
/*  Each thinking stage is a small rectangular node. A connector grows */
/*  out of the previous node(s); when it arrives, the next node is     */
/*  created. Parallel stages (the agents) branch out and merge back.   */
/*  Three columns are visible at a time; the view pans left for more.  */
/*  The nodes come from the running scenario: a quick "hi" is just two */
/*  nodes, a detailed answer is the full five-stage graph.             */
/* ------------------------------------------------------------------ */
const NW = 136 // node width
const NH = 42 // node height
const PITCH = 177 // column pitch (3 columns fit the card with a little slack)
const GROW = 0.7 // seconds for a connector to grow into the next node

type NodeDef = {
  id: string
  col: number
  y: number
  title: string
  subs: string[]
  edgeStart: number // when the connector into this node starts growing (-1: none)
  appearAt: number // when the node is created
  end: number // when this node is finished
}

const AG_ROWS = [0, 56, 112]
const AG_TITLES = ['Buyer profiles', 'Transactions', 'Policy signals']
const AG_SUBS = [
  ['Segmenting buyers', 'Reading profiles', 'Scoring segments'],
  ['Querying ledger', 'Joining funnel report', 'Aggregating by nationality'],
  ['Reading policy tracker', 'Checking macro signals'],
]

function buildGraph(sc: Scenario) {
  const parallel = sc.agents.length > 0
  const gh = parallel ? 154 : 64 // a single row of nodes needs far less height than three parallel agents
  const mid = (gh - NH) / 2
  const nodes: NodeDef[] = []
  const cols: string[][] = []
  sc.steps.forEach((s, si) => {
    const start = sc.t0[si]
    if (si === sc.agentStep) {
      const ids: string[] = []
      sc.agents.forEach((a, k) => {
        const id = 'a' + k
        ids.push(id)
        nodes.push({
          id,
          col: si,
          y: AG_ROWS[k],
          title: AG_TITLES[k] ?? a.name,
          subs: AG_SUBS[k] ?? [a.task],
          edgeStart: start + k * 0.1,
          appearAt: start + k * 0.1 + GROW,
          end: sc.gs + a.dur,
        })
      })
      cols.push(ids)
    } else {
      const id = 's' + si
      nodes.push({
        id,
        col: si,
        y: mid,
        title: s.node,
        subs: s.sub,
        edgeStart: si === 0 ? -1 : start,
        appearAt: si === 0 ? 0.15 : start + GROW,
        end: start + s.dur,
      })
      cols.push([id])
    }
  })
  const edges: [string, string][] = []
  for (let c = 0; c < cols.length - 1; c++) for (const a of cols[c]) for (const b of cols[c + 1]) edges.push([a, b])
  return { nodes, edges, gh, byId: Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<string, NodeDef> }
}

const clamp = (v: number) => Math.max(0, Math.min(1, v))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

type P = { x: number; y: number }
function curve(a: P, b: P, t: number) {
  const dx = (b.x - a.x) * 0.5
  const p0 = a
  const p1 = { x: a.x + dx, y: a.y }
  const p2 = { x: b.x - dx, y: b.y }
  const p3 = b
  const l = (u: P, v: P) => ({ x: u.x + (v.x - u.x) * t, y: u.y + (v.y - u.y) * t })
  const q0 = l(p0, p1)
  const q1 = l(p1, p2)
  const q2 = l(p2, p3)
  const r0 = l(q0, q1)
  const r1 = l(q1, q2)
  const s = l(r0, r1)
  return { d: `M${p0.x} ${p0.y}C${q0.x} ${q0.y},${r0.x} ${r0.y},${s.x} ${s.y}`, head: s }
}

/** smooth elapsed seconds, interpolated between the ~20Hz run updates */
function useSmoothT(run: RunState) {
  const ref = useRef({ t: run.t, at: performance.now(), done: run.done, total: run.sc.total })
  if (ref.current.t !== run.t || ref.current.done !== run.done || ref.current.total !== run.sc.total) {
    ref.current = { t: run.t, at: performance.now(), done: run.done, total: run.sc.total }
  }
  const [tt, setTt] = useState(run.t)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const s = ref.current
      const v = s.done ? s.total : Math.min(s.total, s.t + (FREEZE > 0 ? 0 : Math.min(0.12, (performance.now() - s.at) / 1000) * SPEED))
      setTt(v)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return tt
}

export function GraphCard({ run, onDetails }: { run: RunState; onDetails: () => void }) {
  const sc = run.sc
  const tt = useSmoothT(run)
  const done = run.done
  const { nodes, edges, gh, byId } = useMemo(() => buildGraph(sc), [sc])
  const latest = sc.t0.reduce((acc, t, i) => (t <= tt ? i : acc), 0)
  const pan = Math.max(0, latest - 2) // the view slides left once a 4th and 5th stage appear
  const pos = (n: NodeDef) => ({ x: n.col * PITCH, y: n.y })

  return (
    <div className={'gv' + (done ? ' done' : '')} style={{ height: done ? 84 : 78 + gh }}>
      <div className="gv-pane run" aria-hidden={done}>
        <div className="gv-top">
          <button className="gb-click" onClick={onDetails} aria-label="Open detailed view" tabIndex={done ? -1 : 0}>
            <span className="gv-title">Thinking</span>
            <Icon n="right" size={16} className="gb-chev" />
          </button>
          <span className="grow" />
          <span className="gv-meta"><span>{fmt(run.t)}</span><i /><span>{run.pct}%</span></span>
        </div>
        <div className={'gv-view' + (pan > 0 ? ' panned' : '')} style={{ height: gh }}>
          <div className="gv-stage" style={{ width: sc.steps.length * PITCH, height: gh, transform: `translateX(${-pan * PITCH}px)` }}>
            <svg className="gv-svg" width={sc.steps.length * PITCH} height={gh} aria-hidden="true">
              {edges.map(([fa, ta]) => {
                const a = byId[fa]
                const b = byId[ta]
                const ep = clamp((tt - b.edgeStart) / GROW)
                if (b.edgeStart < 0 || ep <= 0) return null
                const A = { x: pos(a).x + NW, y: pos(a).y + NH / 2 }
                const B = { x: pos(b).x, y: pos(b).y + NH / 2 }
                const grown = curve(A, B, ease(ep))
                const targetActive = tt >= b.appearAt && tt < b.end
                return (
                  <g key={fa + ta}>
                    <path d={grown.d} fill="none" stroke={targetActive || ep < 1 ? 'rgba(106,136,238,.55)' : 'rgba(70,86,110,.28)'} strokeWidth={1.4} strokeLinecap="round" />
                    {ep >= 1 && targetActive && (
                      <path d={grown.d} fill="none" stroke="#6a88ee" strokeWidth={1.4} strokeLinecap="round" strokeDasharray="2 7" className="gv-flow" />
                    )}
                    {ep < 1 && (
                      <>
                        <circle cx={grown.head.x} cy={grown.head.y} r={6} fill="rgba(106,136,238,.18)" />
                        <circle cx={grown.head.x} cy={grown.head.y} r={3} fill="#6a88ee" />
                      </>
                    )}
                  </g>
                )
              })}
            </svg>
            {nodes.map((n) => {
              const p = pos(n)
              const visible = tt >= n.appearAt
              const finished = tt >= n.end
              const active = visible && !finished
              const prog = clamp((tt - n.appearAt) / Math.max(0.1, n.end - n.appearAt))
              const sub = finished ? '' : n.subs[Math.min(n.subs.length - 1, Math.floor(prog * n.subs.length))]
              return (
                <div key={sc.id + n.id} className={'gv-node' + (visible ? ' in' : '') + (active ? ' act' : '') + (finished ? ' ok' : '')} style={{ left: p.x, top: p.y, width: NW, height: NH }}>
                  <span className="gv-st">{finished ? <Icon n="check" size={9} /> : null}</span>
                  <div className="gv-nt">
                    <b>{n.title}</b>
                    {sub && <small key={sub}>{sub}</small>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="gv-pane fin" aria-hidden={!done}>
        <button className="gb-click" onClick={onDetails} aria-label="Open detailed view" tabIndex={done ? 0 : -1}>
          <span className="gb-done-title">Thinking completed</span>
          <Icon n="right" size={16} className="gb-chev" />
        </button>
        <div className="gb-facts">{sc.chips.map((c) => <span key={c}>{c}</span>)}</div>
      </div>
    </div>
  )
}
