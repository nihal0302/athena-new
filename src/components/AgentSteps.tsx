import { useEffect, useState } from 'react'
import type { RunState } from '../hooks'
import { Icon } from './Icon'
import { AgentIcon } from './AgentIcon'
import { useSmoothT } from './GraphCard'

const clamp = (v: number) => Math.max(0, Math.min(1, v))

/** index of the sub-step running now (the one before it is the one that just finished) */
const subPair = (subs: string[], q: number) => {
  // sub-steps use the first 88% of the time so the last one can be ticked before the whole step collapses
  const i = Math.min(subs.length - 1, Math.floor((clamp(q) / 0.88) * subs.length))
  return { text: subs[i], subs, i, fin: q >= 0.88 }
}

/** The two latest sub-steps of a running stage or agent, played as a short sequence:
 *  1. a sub-step rises in from below with a grey dash and stays while it runs;
 *  2. when it finishes the dash turns into a green tick;
 *  3. the next sub-step rises in underneath; once that one finishes too, the older row glides up and out and the new one
 *     takes the second row, while the one after it rises in from below.
 *  The component steps through the real progress one sub-step at a time so each change can be seen. */
function SubFlow({ subs, i, fin = false }: { subs: string[]; i: number; fin?: boolean }) {
  const RH = 20
  const [shown, setShown] = useState(i) // the sub-step currently on screen as "running"
  const [ticked, setTicked] = useState(false) // has the running one been ticked yet
  useEffect(() => {
    if (i < shown) {
      setShown(i)
      setTicked(false)
      return
    }
    if (i === shown) {
      if (fin) setTicked(true) // the last sub-step is done: tick it before the step collapses
      return
    }
    const lag = i - shown > 1 ? 500 : 250 // catching up: leave a beat so each row is seen
    const t1 = window.setTimeout(() => setTicked(true), lag)
    const t2 = window.setTimeout(() => {
      setShown((s) => s + 1)
      setTicked(false)
    }, lag + 650)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [i, shown, fin])
  const hasPrev = shown >= 1
  return (
    <div className="sf" style={{ height: (hasPrev ? 2 : 1) * RH, ['--rh' as string]: RH + 'px' }}>
      {[shown - 2, shown - 1, shown].filter((k) => k >= 0).map((k) => {
        const pos = hasPrev ? k - (shown - 1) : 0
        const done = k < shown || (k === shown && ticked)
        return (
          <div key={k} className={'sf-row' + (done ? ' done' : '') + (pos < 0 ? ' gone' : '')} style={{ ['--y' as string]: pos * RH + 'px' }}>
            <span className="sf-ic"><i className="sf-d" /><span className="sf-c"><Icon n="check" size={9} /></span></span>
            <span className="sf-t">{subs[k]}</span>
          </div>
        )
      })}
    </div>
  )
}

/** "Show steps" / "Agent trace" text actions, plus the per-agent rows (name, what it is doing now, and a slim bar that starts
 *  when the agent was triggered and ends when it finished, on the run's own time axis). Shared by the thinking cards. */
export function AgentSteps({ run, open, onToggle, onTrace, variant = 'rows', bars = false }: { run: RunState; open: boolean; onToggle: () => void; onTrace: () => void; variant?: 'rows' | 'blocks' | 'globe'; bars?: boolean }) {
  const sc = run.sc
  const tt = useSmoothT(run)
  const nAg = sc.agents.length
  const stages = nAg === 0 && sc.id === 'standard' && sc.steps.length > 1
  if (!nAg && !stages) return null
  const total = sc.total
  const startAt = (k: number) => sc.gs + sc.agents[k].start
  const endAt = (k: number) => startAt(k) + sc.agents[k].dur
  const started = sc.agents.map((_, k) => k).filter((k) => tt >= startAt(k))

  return (
    <>
      <div className="tl-acts">
        <button className="tl-act" onClick={onToggle} aria-expanded={open}>
          <span>{open ? 'Hide steps' : 'Show steps'}</span>
          <Icon n="chev" size={14} className="tl-chev" />
        </button>
        <button className="tl-act" onClick={onTrace} aria-label="Open the full reasoning in the side pane">
          <span>View reasoning</span>
          <Icon n="right" size={14} />
        </button>
      </div>
      {stages ? (
        <StageList run={run} open={open} tt={tt} variant={variant} bars={bars} />
      ) : variant === 'globe' ? (
        <Journey
          open={open}
          items={sc.agents.map((a, k) => {
            const s0 = startAt(k)
            const e0 = endAt(k)
            const q = clamp((tt - s0) / a.dur)
            const state: 'd' | 'w' | 'p' = tt >= e0 ? 'd' : tt >= s0 ? 'w' : 'p'
            const dep = a.after != null ? sc.agents[a.after] : null
            const sp = state === 'w' ? subPair(a.subs, q) : null
            const text = state === 'd' ? 'Finished' : sp ? sp.text : dep ? 'Waiting for ' + dep.short : 'In queue'
            return { key: a.name, icon: a.icon, color: a.color, title: a.name, text, subs: sp?.subs, si: sp?.i, fin: sp?.fin, state, time: '' }
          })}
        />
      ) : variant === 'blocks' ? (
        <div className={'tl-ex' + (open ? ' open' : '')}>
          <div className="tl-ex-in">
            <div className="bs">
              <div className="bs-sum">
                <span><b>{sc.agents.filter((_, k) => tt >= startAt(k) && tt < endAt(k)).length}</b> working</span>
                <span><b>{sc.agents.filter((_, k) => tt < startAt(k)).length}</b> queued</span>
                <span><b>{sc.agents.filter((_, k) => tt >= endAt(k)).length}</b> done</span>
              </div>
              <ul className="bs-list">
                {sc.agents.map((a, k) => {
                  const s0 = startAt(k)
                  const e = endAt(k)
                  const q = clamp((tt - s0) / a.dur)
                  const state = tt >= e ? 'd' : tt >= s0 ? 'w' : 'q'
                  const dep = a.after != null ? sc.agents[a.after] : null
                  const sp = state === 'w' ? subPair(a.subs, q) : null
                  const task = state === 'd' ? 'Finished' : sp ? sp.text : dep ? 'Waiting for ' + dep.short : 'In queue'
                  const lit = Math.round(q * 12)
                  return (
                    <li key={a.name} className={'bs-row bs-' + state} style={{ ['--c' as string]: a.color }}>
                      <span className="bs-ic"><AgentIcon n={a.icon} size={16} /></span>
                      <span className="bs-tx">
                        <b>{a.name}</b>
                        {sp ? <SubFlow subs={sp.subs} i={sp.i} fin={sp.fin} /> : <small key={task}>{task}</small>}
                      </span>
                      <span className="bs-st">
                        {state === 'w' && (
                          <span className="bs-meter" aria-label={Math.round(q * 100) + '%'}>
                            {Array.from({ length: 12 }, (_, i) => (
                              <i key={i} className={i < lit ? 'on' : ''} />
                            ))}
                          </span>
                        )}
                        {state === 'd' && <span className="bs-done">Done</span>}
                        {state === 'q' && <span className="bs-wait">Queued</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      ) : (
      <div className={'tl-ex' + (open ? ' open' : '')}>
        <div className="tl-ex-in">
          <ul className="tl-rows">
            {started.map((k) => {
              const a = sc.agents[k]
              const s = startAt(k)
              const e = endAt(k)
              const q = clamp((tt - s) / a.dur)
              const fin = tt >= e
              const sp = fin ? null : subPair(a.subs, q)
              const text = fin ? 'Done' : sp!.text
              return (
                <li key={a.name} className={'tl-row' + (fin ? ' fin' : '')} style={{ ['--c' as string]: a.color }}>
                  <div className="tl-rh">
                    <span className="tl-ai"><AgentIcon n={a.icon} size={15} /></span>
                    <span className="tl-an">{a.name}</span>
                    {!sp && <span className="tl-at" key={text}>{text}</span>}
                  </div>
                  {sp && <div className="tl-sf"><SubFlow subs={sp.subs} i={sp.i} fin={sp.fin} /></div>}
                  <div className="tl-rt">
                    <div className="tl-seg" style={{ left: (s / total) * 100 + '%', width: ((Math.min(tt, e) - s) / total) * 100 + '%' }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      )}
    </>
  )
}

/** Serial steps: each step with its name, what it is doing (or its result) and how long it took. */
function StageList({ run, open, tt, variant, bars }: { run: RunState; open: boolean; tt: number; variant: 'rows' | 'blocks' | 'globe'; bars: boolean }) {
  const sc = run.sc
  const info = sc.steps.map((st, i) => {
    const start = sc.t0[i]
    const end = start + st.dur
    const state: 'd' | 'w' | 'p' = tt >= end ? 'd' : tt >= start ? 'w' : 'p'
    const q = clamp((tt - start) / st.dur)
    const color = st.agent ? st.agent.color : '#2f245c'
    const sp = state === 'w' && st.sub.length ? subPair(st.sub, q) : null
    const text = state === 'd' ? st.note ?? '' : state === 'w' ? sp?.text ?? st.live : 'Waiting'
    const time = state === 'd' ? st.dur.toFixed(1) + ' s' : state === 'w' ? (tt - start).toFixed(1) + ' s' : ''
    return { st, state, q, color, text, sp, time, left: (start / sc.total) * 100, width: ((Math.min(tt, end) - start) / sc.total) * 100, sub: !!st.agent, first: false, last: false }
  })
  // steps that are an agent being called are shown as a branch off the stage before them
  info.forEach((r, i) => {
    r.first = r.sub && !info[i - 1]?.sub
    r.last = r.sub && !info[i + 1]?.sub
  })
  const subCls = (r: { sub: boolean; first: boolean; last: boolean }) => (r.sub ? ' sub' + (r.first ? ' first' : '') + (r.last ? ' last' : '') : '')
  const finished = info.filter((r) => r.state === 'd').length
  if (variant === 'globe') {
    return (
      <Journey
        open={open}
        items={info.map((r) => ({ key: r.st.id, icon: r.st.icon, color: r.color, title: r.st.agent ? r.st.agent.name : r.st.short, text: r.text, subs: r.sp?.subs, si: r.sp?.i, fin: r.sp?.fin, state: r.state, time: r.time, sub: r.sub, first: r.first, last: r.last }))}
      />
    )
  }
  if (variant === 'blocks') {
    return (
      <div className={'tl-ex' + (open ? ' open' : '')}>
        <div className="tl-ex-in">
          <div className="bs">
            <ul className="bs-list">
              {info.map((r) => (
                <li key={r.st.id} className={'bs-row bs-' + (r.state === 'p' ? 'q' : r.state) + subCls(r).replace(' sub', ' bs-sub')} style={{ ['--c' as string]: r.color }}>
                  <span className="bs-ic"><AgentIcon n={r.st.icon} size={16} /></span>
                  <span className="bs-tx">
                    <b>{r.st.agent ? r.st.agent.name : r.st.short}</b>
                    {r.sp ? <SubFlow subs={r.sp.subs} i={r.sp.i} fin={r.sp.fin} /> : <small key={r.text}>{r.text}</small>}
                  </span>
                  <span className="bs-st">
                    {r.state === 'w' && (
                      <span className="bs-meter" aria-label={Math.round(r.q * 100) + '%'}>
                        {Array.from({ length: 12 }, (_, i) => (
                          <i key={i} className={i < Math.round(r.q * 12) ? 'on' : ''} />
                        ))}
                      </span>
                    )}
                    {r.state === 'd' && <span className="bs-time">{r.time}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={'tl-ex' + (open ? ' open' : '')}>
      <div className="tl-ex-in">
        <ul className="tl-rows">
          {info.map((r) => (
            <li key={r.st.id} className={'tl-row st' + (r.state === 'd' ? ' fin' : r.state === 'p' ? ' pend' : '') + subCls(r)} style={{ ['--c' as string]: r.color }}>
              <div className="tl-rh">
                <span className="tl-ai"><AgentIcon n={r.st.icon} size={15} /></span>
                <span className="tl-an">{r.st.agent ? r.st.agent.name : r.st.short}</span>
                {!r.sp && <span className="tl-at" key={r.text}>{r.text}</span>}
                <span className="tl-tm">{r.time}</span>
              </div>
              {r.sp && <div className="tl-sf"><SubFlow subs={r.sp.subs} i={r.sp.i} fin={r.sp.fin} /></div>}
              {bars && (
                <div className="tl-rt">
                  <div className="tl-seg" style={{ left: r.left + '%', width: Math.max(0, r.width) + '%' }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

type JItem = { key: string; icon: string; color: string; title: string; text: string; subs?: string[]; si?: number; fin?: boolean; state: 'd' | 'w' | 'p'; time: string; sub?: boolean; first?: boolean; last?: boolean }

/** A path of steps: a dotted thread runs down the left, each step is a node on it. The thread fills in as steps finish,
 *  the running step glows, and finished steps carry a tick and the time they took. */
function Journey({ open, items }: { open: boolean; items: JItem[] }) {
  return (
    <div className={'tl-ex' + (open ? ' open' : '')}>
      <div className="tl-ex-in">
        <ol className={'gj' + (items.every((r) => r.state === 'd') ? ' alldone' : '')}>
          {items.map((r, i) => (
            <li key={r.key} className={'gj-row gj-' + r.state + (i === items.length - 1 ? ' last' : '') + (r.sub ? ' gj-sub' + (r.first ? ' first' : '') + (r.last ? ' subend' : '') : '')} style={{ ['--c' as string]: r.color }}>
              <span className="gj-node">
                <span className="gj-ic"><AgentIcon n={r.icon} size={16} /></span>
                {r.state === 'd' && <span className="gj-ok"><Icon n="check" size={8} /></span>}
              </span>
              <span className="gj-tx">
                <b>{r.title}</b>
                {r.subs ? <SubFlow subs={r.subs} i={r.si!} fin={r.fin} /> : <small key={r.text}>{r.text}</small>}
              </span>
              {r.state === 'w' && <span className="gj-pill live"><i />{r.time || 'Working'}</span>}
              {r.state === 'd' && <span className="gj-pill">{r.time || 'Done'}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
