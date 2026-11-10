import { useEffect, useState } from 'react'
import type { RunState } from '../hooks'
import { Icon } from './Icon'
import { AgentSteps } from './AgentSteps'
import { useSmoothT } from './GraphCard'

/* ------------------------------------------------------------------ */
/*  Timeline.                                                          */
/*  Collapsed: the main thinking step, the sub-step under it, the      */
/*  percentage and time, and one progress bar.                         */
/*  Progress is driven by finished work, not by the clock: while the   */
/*  agents work the bar holds still, and it moves forward each time an */
/*  agent finishes. Whenever agents are called, a small marker (agent  */
/*  icon, plus a count only while they are working) is pinned to the   */
/*  bar at the point it had reached.                                   */
/*  Expanded ("View agent level details"): one row per agent. Its bar  */
/*  starts when the agent was triggered and ends when it finished,     */
/*  on the same time axis, with what it is doing now.                  */
/*  Colours: Aldar tokens only (brand, steel blue, greys, success).    */
/* ------------------------------------------------------------------ */
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function TimelineCard({ run, onDetails }: { run: RunState; onDetails: () => void }) {
  const sc = run.sc
  const tt = useSmoothT(run)
  const done = run.done
  const [open, setOpen] = useState(true)
  const fresh = run.t < 0.3
  useEffect(() => {
    if (fresh) setOpen(true)
  }, [fresh])
  // when thinking finishes the steps fold away by themselves (they can still be opened again)
  useEffect(() => {
    if (run.done) setOpen(false)
  }, [run.done])

  const total = sc.total
  const nAg = sc.agents.length
  const startAt = (k: number) => sc.gs + sc.agents[k].start
  const endAt = (k: number) => startAt(k) + sc.agents[k].dur

  /** 0..1 progress. Before and after the agents step it follows the clock; during it, it only advances as agents finish. */
  const progressAt = (t: number) => {
    if (t >= total) return 1
    const ag = sc.agentStep
    if (ag < 0 || !nAg) return t / total
    const a0 = sc.t0[ag]
    const a1 = a0 + sc.steps[ag].dur
    if (t <= a0 || t >= a1) return t / total
    // each agent contributes its share, easing in over the 0.8s before it finishes
    const share = sc.agents.reduce((s, _, k) => s + easeOut(clamp((t - (endAt(k) - 0.8)) / 0.8)), 0) / nAg
    return (a0 + (a1 - a0) * share) / total
  }

  const p = progressAt(tt)
  const pct = Math.round(p * 100)

  const sub = done
    ? [nAg ? nAg + ' agents' : '', sc.sources ? sc.sources + ' sources' : 'no sources needed', sc.checks.length ? sc.checks.length + ' checks passed' : ''].filter(Boolean).join(' · ')
    : run.event
  const started = sc.agents.map((_, k) => k).filter((k) => tt >= startAt(k))

  return (
    <div className={'tl' + (done ? ' done' : '') + (open ? ' open' : '')}>
      <div className="tl-top">
        <div className="tl-l">
          <button className="gb-click tl-title" onClick={onDetails} aria-label="Open detailed view">
            <span className={done ? 'tl-t done' : 'tl-t'}>{done ? 'Reasoning completed' : 'Reasoning'}</span>
            <Icon n="right" size={16} className="gb-chev" />
          </button>
          <div className="tl-sub" key={sub}>{sub}</div>
        </div>
        <div className="tl-r">
          <div className="tl-pct"><b>{pct}</b><span>%</span></div>
          <div className="tl-time">{Math.round(Math.min(tt, total))}s elapsed</div>
        </div>
      </div>

      <div className="tl-track">
        <div className="tl-bar">
          <div className="tl-rest" />
          <div className="tl-fill" style={{ width: p * 100 + '%' }} />
        </div>
      </div>

      <AgentSteps run={run} open={open} onToggle={() => setOpen(!open)} onTrace={onDetails} bars />
    </div>
  )
}
