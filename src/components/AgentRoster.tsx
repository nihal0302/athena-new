import { useEffect, useState } from 'react'
import type { RunState } from '../hooks'
import { Icon } from './Icon'

/** Live list of every agent: who it is, what it is doing right now, and how far along it is.
 *  Open by default while the agents work (people can fold it away); it folds itself when the run is done. */
export function AgentRoster({ run }: { run: RunState }) {
  const sc = run.sc
  const [open, setOpen] = useState(true)
  const fresh = run.t < 0.3
  // every new run starts open again
  useEffect(() => {
    if (fresh) setOpen(true)
  }, [fresh])

  const n = sc.agents.length
  if (!n) return null
  const on = run.t >= sc.gs && !run.done
  const working = run.agentProgress.filter((p) => p > 0 && p < 1).length
  const queued = run.agentProgress.filter((p) => p <= 0).length
  const head =
    run.finishedAgents >= n
      ? `All ${n} agents finished`
      : `${n} agents working · ${working} active${queued ? `, ${queued} queued` : ''}${run.finishedAgents ? `, ${run.finishedAgents} done` : ''}`

  return (
    <div className={'ros' + (on ? ' on' : '') + (open ? ' open' : '')} aria-hidden={!on}>
      <div className="ros-in">
        <div className="ros-box">
          <button className="ros-h" onClick={() => setOpen(!open)} aria-expanded={open} tabIndex={on ? 0 : -1}>
            <span className="ros-t">{head}</span>
            <Icon n="chev" size={14} className="ros-c" />
          </button>
          {open && (
            <ul className="ros-l">
              {sc.agents.map((a, k) => {
                const p = run.agentProgress[k]
                const dep = a.after != null ? sc.agents[a.after] : null
                const state = p >= 1 ? 'd' : p > 0 ? 'w' : 'q'
                const text =
                  p >= 1
                    ? `Done · ${a.src.length} source${a.src.length > 1 ? 's' : ''}, ${a.pass} passages`
                    : p > 0
                      ? a.subs[Math.min(a.subs.length - 1, Math.floor(p * a.subs.length))]
                      : dep
                        ? `Waiting for ${dep.short}`
                        : 'Queued'
                return (
                  <li key={a.name} className={'ros-r ' + state} style={{ ['--c' as string]: a.color }}>
                    <span className="ros-ic"><Icon n={state === 'd' ? 'check' : a.icon} size={12} /></span>
                    <span className="ros-n">{a.name}</span>
                    <span className="ros-x" key={text}>{text}</span>
                    <span className="ros-pb"><i style={{ width: p * 100 + '%' }} /></span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
