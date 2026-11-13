import { useEffect, useMemo, useRef, useState } from 'react'
import type { AgentDef, Scenario } from '../data/scenario'
import { FREEZE, SPEED, fmt, type RunState } from '../hooks'
import { Icon } from './Icon'

/* ------------------------------------------------------------------ */
/*  Node graph.                                                        */
/*  Each thinking stage is a node. A connector grows out of the        */
/*  previous node(s); when it arrives, the next node is created.       */
/*  Agents run side by side (parallel) and, when one waits for another */
/*  (`after`), in a further column (series).                           */
/*                                                                     */
/*  The canvas is a fixed size. While the run plays it follows the     */
/*  newest activity; hold and drag to look around (earlier stages,     */
/*  later stages, agents above or below). "Follow live" snaps back.    */
/* ------------------------------------------------------------------ */
const NW = 136 // stage node width
const NH = 42 // stage node height
const GAP = 41 // horizontal gap between columns (room for the connectors)
const GROW = 0.7 // seconds for a connector to grow into the next node
const NW_AG = 204 // agent node: name + what it is doing now (two lines)
const NH_AG = 50
const PITCH_AG = 70
const VIEW_H = 232 // fixed canvas height when many agents run

type NodeDef = {
  id: string
  col: number
  x: number
  y: number
  w: number
  h: number
  title: string
  num?: number // stage number
  subs: string[]
  edgeStart: number // when the connector into this node starts growing (-1: none)
  appearAt: number // when the node is created
  end: number // when this node is finished
  agent: boolean
  lane?: boolean // an agent being called one after another: drawn on a lane below the main chain
  color?: string
}

const AG_ROWS = [0, 56, 112] // classic three-agent layout

function buildGraph(sc: Scenario) {
  // which stage calls agents, and which agents: parallel agent rows (complex) or the agents named on a stage
  let agents = sc.agents
  let ag0 = sc.agentStep
  if (!agents.length) {
    const i = sc.steps.findIndex((st) => st.id === 'agents' && st.agents && st.agents.length)
    if (i >= 0) {
      ag0 = i
      agents = sc.steps[i].agents as AgentDef[]
    }
  }
  const na = agents.length
  const classic = na > 0 && na <= 3
  const gs = ag0 >= 0 ? sc.t0[ag0] : 0

  // ---- agent depth (series) and columns ----------------------------------------
  const depth: number[] = []
  agents.forEach((a, k) => depth.push(a.after != null && a.after < k ? depth[a.after] + 1 : 0))
  const nDepth = na ? Math.max(...depth) + 1 : 0
  const aw = classic ? NW : NW_AG
  const ah = classic ? NH : NH_AG

  // every stage is a node; the stage that calls agents is followed by the columns holding its agent boxes
  const colW: number[] = []
  const stepCol: number[] = []
  const agCol: number[] = []
  sc.steps.forEach((_, si) => {
    stepCol[si] = colW.length
    colW.push(NW)
    if (si === ag0 && na) {
      for (let d = 0; d < nDepth; d++) {
        agCol[d] = colW.length
        colW.push(aw)
      }
    }
  })
  const colX: number[] = []
  let acc = 0
  colW.forEach((w) => {
    colX.push(acc)
    acc += w + GAP
  })
  const width = acc - GAP

  // ---- agent nodes (first, so the stage nodes can be centred on their height) -------
  const agentNodes: NodeDef[] = []
  const rootOrder = agents.map((_, k) => k).filter((k) => depth[k] === 0)
  const rowOf: Record<number, number> = {}
  rootOrder.forEach((k, i) => (rowOf[k] = i))
  const yById: Record<string, number> = {}
  const lastY: number[] = []
  agents.forEach((a, k) => {
    const id = 'a' + k
    let y = classic ? AG_ROWS[k] : (rowOf[k] ?? 0) * PITCH_AG + 4
    if (depth[k] > 0) {
      // a dependent agent sits level with the agent it waits for, pushed down if that row is taken
      y = yById['a' + (a.after as number)] ?? 4
      const prev = lastY[depth[k]]
      if (prev != null && y < prev + PITCH_AG) y = prev + PITCH_AG
      lastY[depth[k]] = y
    }
    yById[id] = y
    const dep = a.after != null ? agents[a.after] : null
    // the connector from the stage starts once the stage node exists
    const edgeStart = dep ? gs + dep.start + dep.dur : gs + GROW + (classic ? k * 0.1 : a.start)
    agentNodes.push({
      id,
      col: agCol[depth[k]],
      x: colX[agCol[depth[k]]],
      y,
      w: aw,
      h: ah,
      title: a.short,
      subs: a.subs,
      edgeStart,
      appearAt: edgeStart + GROW,
      end: gs + a.start + a.dur,
      agent: true,
    })
  })
  const contentH = na ? Math.max(...agentNodes.map((n) => n.y + n.h)) + 6 : 64
  // the visible canvas is fixed when many agents run; the content may be taller (drag to see the rest)
  const hasLane = sc.steps.some((st) => !!st.agent)
  const gh = classic ? 154 : na ? VIEW_H : hasLane ? 156 : 64
  const stageH = Math.max(gh, contentH)
  const mid = hasLane ? 22 : (stageH - NH) / 2
  const LANE = 74 // how far below the main chain an agent call sits

  const nodes: NodeDef[] = []
  sc.steps.forEach((s, si) => {
    const start = sc.t0[si]
    nodes.push({
      id: 's' + si,
      col: stepCol[si],
      x: colX[stepCol[si]],
      y: s.agent ? mid + LANE : mid,
      w: NW,
      h: NH,
      lane: !!s.agent,
      color: s.agent?.color,
      title: s.node,
      num: si + 1,
      subs: s.sub,
      edgeStart: si === 0 ? -1 : start,
      appearAt: si === 0 ? 0.15 : start + GROW,
      end: start + s.dur,
      agent: false,
    })
    if (si === ag0 && na) nodes.push(...agentNodes)
  })

  // ---- connectors ------------------------------------------------------------------
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<string, NodeDef>
  const edges: [string, string][] = []
  const dependants = new Set<string>()
  agents.forEach((a, k) => {
    if (a.after != null) {
      edges.push(['a' + a.after, 'a' + k])
      dependants.add('a' + a.after)
    }
  })
  if (na) agents.forEach((_, k) => depth[k] === 0 && edges.push(['s' + ag0, 'a' + k]))
  sc.steps.forEach((_, si) => {
    if (si === 0) return
    if (si - 1 === ag0 && na) {
      agents.forEach((_, k) => !dependants.has('a' + k) && edges.push(['a' + k, 's' + si]))
    } else {
      edges.push(['s' + (si - 1), 's' + si])
    }
  })
  return { nodes, edges, gh, stageH, width, byId }
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))
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
export function useSmoothT(run: RunState) {
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

/** One turn of a ring while the task runs: starts empty, closes just as the task finishes (then the node shows a tick). */
function Ring({ p }: { p: number }) {
  const R = 5.5
  const C = 2 * Math.PI * R
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r={R} fill="none" stroke="#d3d6e6" strokeWidth="1.6" />
      <circle cx="7.5" cy="7.5" r={R} fill="none" stroke="#6a88ee" strokeWidth="1.8" strokeLinecap="round" strokeDasharray={`${Math.max(0.01, p) * C} ${C}`} transform="rotate(-90 7.5 7.5)" />
    </svg>
  )
}

export function GraphCard({ run, onDetails }: { run: RunState; onDetails: () => void }) {
  const sc = run.sc
  const tt = useSmoothT(run)
  const done = run.done
  const { nodes, edges, gh, stageH, width, byId } = useMemo(() => buildGraph(sc), [sc])

  // the canvas is fixed in size; the user can hold and drag to look around
  const [vw, setVw] = useState(500)
  const viewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = viewRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setVw(el.clientWidth || 500))
    ro.observe(el)
    setVw(el.clientWidth || 500)
    return () => ro.disconnect()
  }, [])
  const [user, setUser] = useState<P | null>(null) // null = follow the live run
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const fresh = run.t < 0.3
  const [open, setOpen] = useState(true)
  useEffect(() => {
    if (fresh) {
      setUser(null)
      setOpen(true)
    }
  }, [fresh])
  // when thinking finishes the steps fold away by themselves (they can still be opened again)
  useEffect(() => {
    if (run.done) setOpen(false)
  }, [run.done])

  const maxX = Math.max(0, width - vw)
  const maxY = Math.max(0, stageH - gh)
  // follow the live work: keep the nodes that are running right now in view
  const shownNodes = nodes.filter((n) => tt >= n.appearAt)
  const running = shownNodes.filter((n) => tt < n.end)
  const focus = running.length ? running : shownNodes
  const newest = focus.reduce((m, n) => Math.max(m, n.x + n.w), 0)
  const focusY = focus.length ? focus.reduce((s, n) => s + n.y + n.h / 2, 0) / focus.length : stageH / 2
  const auto: P = { x: clamp(newest - vw, 0, maxX), y: clamp(focusY - gh / 2, 0, maxY) }
  const pan = user ?? auto
  const canDrag = maxX > 0 || maxY > 0

  const down = (e: React.PointerEvent) => {
    if (!canDrag) return
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    setUser({ x: clamp(d.px - (e.clientX - d.x), 0, maxX), y: clamp(d.py - (e.clientY - d.y), 0, maxY) })
  }
  const up = () => {
    drag.current = null
    setDragging(false)
  }

  const nAg = sc.agents.length
  const agentsOn = nAg > 0 && tt >= sc.gs && !done

  return (
    <div className={'gv' + (done ? ' done' : '') + (open ? ' open' : '')}>
      <div className="gv-head">
        <div className="gv-pane run" aria-hidden={done}>
          <div className="gv-top">
            <button className="gb-click" onClick={onDetails} aria-label="Open detailed view" tabIndex={done ? -1 : 0}>
              <span className="gv-title">Thinking</span>
              <Icon n="right" size={16} className="gb-chev" />
            </button>
            <span className="grow" />
            <span className="gv-meta">
              {agentsOn && <><span>{run.finishedAgents}/{nAg} agents</span><i /></>}
              <span>{fmt(run.t)}</span><i /><span>{run.pct}%</span>
            </span>
          </div>
          <div className="gv-sub" key={run.event}>{run.event}</div>
        </div>
        <div className="gv-pane fin" aria-hidden={!done}>
          <button className="gb-click" onClick={onDetails} aria-label="Open detailed view" tabIndex={done ? 0 : -1}>
            <span className="gb-done-title">Thinking completed</span>
            <Icon n="right" size={16} className="gb-chev" />
          </button>
          <div className="gb-facts">{sc.chips.map((c) => <span key={c}>{c}</span>)}</div>
        </div>
      </div>

      <div className="tl-acts">
        <button className="tl-act" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span>{open ? 'Hide steps' : 'Show steps'}</span>
          <Icon n="chev" size={14} className="tl-chev" />
        </button>
        <button className="tl-act" onClick={onDetails} aria-label="Open the full reasoning in the side pane">
          <span>Reasoning trace</span>
          <Icon n="right" size={14} />
        </button>
      </div>

      <div className={'tl-ex' + (open ? ' open' : '')}>
        <div className="tl-ex-in">
          <div className="gv-cv">
            <div
              ref={viewRef}
              className={'gv-view' + (pan.x > 0 ? ' panned' : '') + (canDrag ? ' can' : '') + (dragging ? ' grab' : '')}
              style={{ height: gh }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
            >
              <div className={'gv-stage' + (dragging ? ' nodrift' : '')} style={{ width, height: stageH, transform: `translate(${-pan.x}px, ${-pan.y}px)` }}>
                <svg className="gv-svg" width={width} height={stageH} aria-hidden="true">
                  {edges.map(([fa, ta]) => {
                    const a = byId[fa]
                    const b = byId[ta]
                    const ep = clamp((tt - b.edgeStart) / GROW)
                    if (b.edgeStart < 0 || ep <= 0) return null
                    const A = { x: a.x + a.w, y: a.y + a.h / 2 }
                    const B = { x: b.x, y: b.y + b.h / 2 }
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
                  const visible = tt >= n.appearAt
                  const fin = tt >= n.end
                  const active = visible && !fin
                  const prog = clamp((tt - n.appearAt) / Math.max(0.1, n.end - n.appearAt))
                  const sub = fin ? '' : n.subs[Math.min(n.subs.length - 1, Math.floor(prog * n.subs.length))]
                  const small = n.agent && nAg > 3
                  return (
                    <div
                      key={sc.id + n.id}
                      className={'gv-node' + (n.lane ? ' lane' : '') + (small ? ' sm wide' : '') + (visible ? ' in' : '') + (active ? ' act' : '') + (fin ? ' ok' : '')}
                      style={{ left: n.x, top: n.y, width: n.w, height: n.h, ['--c' as string]: n.color }}
                    >
                      <span className="gv-st">{fin ? <Icon n="check" size={9} /> : active ? <Ring p={prog} /> : null}</span>
                      <div className="gv-nt">
                        <b>{n.title}</b>
                        {sub && <small key={sub}>{sub}</small>}
                      </div>
                                          </div>
                  )
                })}
              </div>
                </div>
            {canDrag && (
              <div className="gv-hint">
                {user ? (
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setUser(null)}><Icon n="redo" size={11} />Follow live</button>
                ) : (
                  <span>Hold and drag to look around</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
