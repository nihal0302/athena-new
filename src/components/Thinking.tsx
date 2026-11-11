import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { pal } from './palette'
import { createPortal } from 'react-dom'
import { SOURCES, SOURCES_EXTRA, SQL, type AgentDef } from '../data/scenario'
import { fmt, type RunState } from '../hooks'
import { Icon, Sparkle } from './Icon'
import { AgentIcon, ReasoningIcon } from './AgentIcon'
import { useFollow } from './useFollow'

/* ------------------------------------------------------------------ */
/*  Detail view: right pane. It follows the steps of whichever          */
/*  scenario is running (a quick "hi" has two steps, a brief has five). */
/* ------------------------------------------------------------------ */
function sqlHighlight(s: string) {
  const kw = /\b(SELECT|COUNT|ROUND|AVG|FROM|WHERE|IN|GROUP BY|ORDER BY|DESC|AS)\b/g
  const parts: (string | { k: string })[] = []
  let last = 0
  s.replace(kw, (m, _g, off: number) => {
    parts.push(s.slice(last, off))
    parts.push({ k: m })
    last = off + m.length
    return m
  })
  parts.push(s.slice(last))
  return parts.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : <span key={i} className="kw">{p.k}</span>))
}

// one-line summary shown under a finished step, by step id
const DONE_NOTE: Record<string, string> = {
  intent: 'Buyer brief · Q1 launches',
  val: '5 of 5 checks passed',
  comp: 'Brief ready',
  read: 'Message understood',
  find: '1 source · 2 passages',
  reply: 'Reply ready',
}

export function ReasoningPanel({
  run,
  open,
  wide,
  onClose,
  onWide,
}: {
  run: RunState
  open: boolean
  wide: boolean
  onClose: () => void
  onWide: () => void
}) {
  const sc = run.sc
  const [expanded, setExpanded] = useState<Record<number, boolean>>({}) // all collapsed by default
  const [sqlFor, setSqlFor] = useState<string | null>(null) // which agent's query is open in the modal
  const [copied, setCopied] = useState(false)
  const toggle = (i: number, currentlyOpen: boolean) => setExpanded((e) => ({ ...e, [i]: !currentlyOpen }))
  const fresh = run.t < 0.3
  useEffect(() => {
    if (fresh) setExpanded({})
  }, [fresh])
  const nAgents = sc.agentTotal ?? sc.agents.length
  const clampP = (v: number) => Math.max(0, Math.min(1, v))

  const subtitle = (i: number) => {
    const s = sc.steps[i]
    const st = run.stepStatus[i]
    if (st === 'pend') return 'Waiting'
    if (st === 'act') {
      if (s.id === 'agents' && sc.agents.length) return run.finishedAgents ? `${run.finishedAgents} of ${nAgents} agents finished` : 'Agents working in parallel'
      if (s.id === 'val' || s.id === 'wrap') return `${run.checks} of ${sc.checks.length} checks passed`
      return s.live + '…'
    }
    if (s.note) return s.note
    if (s.id === 'read' && sc.id === 'lookup') return 'Question understood'
    if (s.id === 'route') return nAgents + ' agents selected'
    if (s.id === 'agents') return nAgents + ' agents · ' + sc.agents.reduce((a, g) => a + g.src.length, 0) + ' sources · ' + sc.agents.reduce((a, g) => a + g.pass, 0) + ' passages'
    return DONE_NOTE[s.id] ?? 'Done'
  }

  /** the called agents, live inside the stage that routes the work: name, time (beside the name), task streaming in, progress */
  const agentsLive = () => (
    <div className="agl-list">
      {agList.map((ag, k) => {
        const t1 = (sc.agents.length ? sc.gs : sc.t0[agStage]) + ag.start
        const p = Math.max(0, Math.min(1, (run.t - t1) / ag.dur))
        const st = run.done || p >= 1 ? 'done' : p > 0 ? 'act' : 'pend'
        const el = st === 'done' ? ag.dur : Math.max(0, run.t - t1)
        const words = ag.task.split(' ')
        const n = st === 'pend' ? 0 : Math.ceil(words.length * Math.min(1, el / 1.6))
        const cur = Math.min(ag.subs.length - 1, Math.floor(p * ag.subs.length))
        const shown = st === 'pend' ? 0 : st === 'done' ? ag.subs.length : cur + 1
        const inSub = p * ag.subs.length - cur // 0..1 through the running sub-step
        const R = 15
        const C = 2 * Math.PI * R
        return (
          <div key={ag.name} className={'agl ' + st} style={{ ['--c' as string]: pal(ag.color) }}>
            <div className="agl-h">
              <span className="agl-ic">
                <svg className="agl-ring" viewBox="0 0 34 34" aria-hidden="true">
                  <circle cx="17" cy="17" r={R} className="trk" />
                  <circle cx="17" cy="17" r={R} className="val" strokeDasharray={C} strokeDashoffset={C * (1 - (st === 'done' ? 1 : p))} />
                </svg>
                <AgentIcon n={ag.icon} size={15} />
              </span>
              <b>{ag.name}</b>
            </div>
            {shown > 0 && (
              <ul className="agl-steps">
                {ag.subs.slice(0, shown).map((s, j) => {
                  const live = st === 'act' && j === cur
                  const w = s.split(' ')
                  const txt = live ? w.slice(0, Math.max(1, Math.ceil(w.length * Math.min(1, inSub * 2.4)))).join(' ') : s
                  return (
                    <li key={j} className={live ? 'cur' : 'done'}>
                      <span className="agl-mk">{live ? <i className="agl-sp" /> : <Icon n="check" size={10} />}</span>
                      <span className="agl-st">{txt}</span>
                    </li>
                  )
                })}
              </ul>
            )}
            {st !== 'pend' && ag.sql && <button className="sq-link" onClick={() => setSqlFor(ag.name)}><Icon n="doc" size={13} />View query</button>}
          </div>
        )
      })}
    </div>
  )

  /** "Time taken" sits right under "Assigned Agent", in the same style, and ticks up while the stage runs */
  const timeRow = (i: number) => {
    const st = run.stepStatus[i]
    if (st === 'pend') return null
    const secs = st === 'done' || run.done ? sc.steps[i].dur : Math.max(0, run.t - sc.t0[i])
    return <div className="as">Time taken: <span className="ch tm">{secs.toFixed(1)} s</span></div>
  }

  const body = (i: number) => {
    const s = sc.steps[i]
    const since = run.t - sc.t0[i]
    switch (s.id) {
      case 'intent':
        return (
          <>
            <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>
            {timeRow(i)}
            <ul>
              <li><b>Interpretation:</b> a buyer-targeting brief for the Q1 launches, with market drivers.</li>
              <li><b>Scope:</b> nationality mix, ticket size, inquiry conversion, policy and macro signals.</li>
              <li><b>Language:</b> English.</li>
            </ul>
          </>
        )
      case 'route':
        return (
          <>
            {agList.length > 0 ? <div className="as">Assigned Agents:<div className="as-list">{agList.map((ag) => <span key={ag.name} className="ch" style={{ ['--c' as string]: pal(ag.color) }}><AgentIcon n={ag.icon} size={14} />{ag.name.replace(/ Agent$/, '')}</span>)}</div></div> : <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>}
            {timeRow(i)}
            <ul>
              <li><b>Delegate specialised insights:</b> {nAgents >= 14 ? 'fourteen' : nAgents === 5 ? 'five' : 'three'} lines of enquiry, {nAgents === 5 ? 'called one after another' : 'run in parallel'}.</li>
            </ul>
            {agList.length > 0 && agentsLive()}
          </>
        )
      case 'agents': {
        const list = sc.agents.length ? sc.agents : s.agents ?? []
        const doneAgents = list.filter((ag, k) => (sc.agents.length ? run.agentProgress[k] >= 1 : since >= ag.start + ag.dur))
        return (
          <>
            <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>
            {timeRow(i)}
            <ul>
              {doneAgents.length === 0 && <li>Waiting for the agents to report back.</li>}
              {doneAgents.map((ag) => (
                <li key={ag.name}><b>{ag.short}:</b> {ag.finding ?? `brought back ${ag.pass} passages from ${ag.src.join(', ')}.`}</li>
              ))}
            </ul>
          </>
        )
      }
      case 'val':
        return (
          <>
          <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>
            {timeRow(i)}
          <ul className="chk">
            {sc.checks.slice(0, run.done || run.stepStatus[i] === 'done' ? sc.checks.length : run.checks + 1).map((c, k) => {
              const ok = k < run.checks || run.done || run.stepStatus[i] === 'done'
              return <li key={c} className={ok ? 'ok' : 'cur'}><span className="tk-c">{ok ? <Icon n="check" size={11} /> : <i className="agl-sp" />}</span><span className="tk-t">{c}</span></li>
            })}
          </ul>
          </>
        )
      case 'comp':
        return (
          <>
          <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>
            {timeRow(i)}
          <ul className="stream">
            {['Writing the executive summary', 'Building the buyer-mix chart and table', 'Adding drivers, caveats and open items', 'Attaching sources'].map((l, k) => (
              <li key={l} className={since > k + 0.2 || run.done ? 'on' : ''}>{l}</li>
            ))}
          </ul>
          </>
        )
      case 'plan':
        return (
          <>
            {agList.length > 0 ? <div className="as">Assigned Agents:<div className="as-list">{agList.map((ag) => <span key={ag.name} className="ch" style={{ ['--c' as string]: pal(ag.color) }}><AgentIcon n={ag.icon} size={14} />{ag.name.replace(/ Agent$/, '')}</span>)}</div></div> : <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>}
            {timeRow(i)}
            <ul>
              <li><b>Interpretation:</b> a buyer-targeting brief for the Q1 launches, with market drivers.</li>
              <li><b>Scope:</b> nationality mix, ticket size, inquiry conversion, policy and macro signals.</li>
              <li><b>Delegated to:</b> {(s.agents ?? []).map((a) => a.short).join(', ')}.</li>
            </ul>
            {agList.length > 0 && agentsLive()}
          </>
        )
      case 'merge':
        return (
          <>
            <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>
            {timeRow(i)}
            <ul>
              <li>Collected the reports from the five agents.</li>
              <li>Matched each finding to the question that was asked.</li>
              <li>Flagged gaps: off-plan resale and agent-channel data.</li>
            </ul>
          </>
        )
      case 'wrap':
        return (
          <>
            <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>
            {timeRow(i)}
            <ul className="chk">
              {sc.checks.slice(0, run.done || run.stepStatus[i] === 'done' ? sc.checks.length : run.checks + 1).map((c, k) => {
                const ok = k < run.checks || run.done || run.stepStatus[i] === 'done'
                return <li key={c} className={ok ? 'ok' : 'cur'}><span className="tk-c">{ok ? <Icon n="check" size={11} /> : <i className="agl-sp" />}</span><span className="tk-t">{c}</span></li>
              })}
            </ul>
            <ul className="stream">
              {['Writing the executive summary', 'Building the buyer-mix chart and table', 'Adding drivers, caveats and open items', 'Attaching sources'].map((l, k) => (
                <li key={l} className={since > 4.4 + k * 0.9 || run.done ? 'on' : ''}>{l}</li>
              ))}
            </ul>
          </>
        )
      case 'read':
        return (
          <ul>
            <li><b>Interpretation:</b> {sc.id === 'greeting' ? 'a greeting. No data or agents needed.' : 'a short factual question.'}</li>
            <li><b>Language:</b> English.</li>
          </ul>
        )
      case 'find':
        return (
          <ul>
            <li><b>Source:</b> Buyer Profile Database.</li>
            <li>One source, two passages. No agents or cross-checks needed for a quick answer.</li>
          </ul>
        )
      case 'reply':
        return (
          <ul className="stream">
            {(sc.id === 'greeting' ? ['Writing a short, friendly reply', 'Suggesting what to ask next'] : ['Writing a short, direct answer', 'Attaching the source']).map((l, k) => (
              <li key={l} className={since > k * 0.4 + 0.1 || run.done ? 'on' : ''}>{l}</li>
            ))}
          </ul>
        )
      default:
        if (s.agent) {
          const a = s.agent
          return (
            <>
              <div className="as">Assigned Agent: <span className="ch" style={{ ['--c' as string]: pal(a.color) }}><AgentIcon n={a.icon} size={14} />{a.name.replace(/ Agent$/, "")}</span></div>
              {timeRow(i)}
              <ul>
                <li><b>Task:</b> {a.task}.</li>
                <li><b>Sources:</b> {a.src.join(', ')} · {a.pass} passages.</li>
              </ul>
              {a.sql && (
                            <button className="sq-link" onClick={() => setSqlFor(a.name)}><Icon n="doc" size={13} />View query</button>
                          )}
            </>
          )
        }
        return null
    }
  }

  // the agents get a card each, between "planned and routed" and the stage that gathers what they found
  const agStage = sc.agents.length ? sc.agentStep : sc.steps.findIndex((x) => x.id === 'agents' && x.agents && x.agents.length)
  const agList: AgentDef[] = sc.agents.length ? sc.agents : agStage >= 0 ? (sc.steps[agStage].agents as AgentDef[]) : []

  // ---- the three sections: stages, activity, sources found ----
  const [tab, setTab] = useState<'stages' | 'activity' | 'sources'>('stages')
  const nSteps = sc.steps.length
  const standard = sc.id === 'standard'
  const stepsNow = run.done ? nSteps : run.stepsDone
  const chips = standard && !run.done
    ? [
        `${stepsNow} of ${nSteps} steps`,
        `${nAgents && run.t >= sc.steps[0].dur + 1.5 ? nAgents : 0} agents`,
        `${run.sources} sources`,
        `${run.checks} checks passed`,
      ]
    : sc.chips

  // what the run has said so far, newest first, each line tagged with the stage it belongs to
  const stageAt = (tm: number) => {
    let k = 0
    sc.t0.forEach((s0, i) => {
      if (tm >= s0) k = i
    })
    return k
  }
  const feed = sc.events.filter((e) => run.done || run.t >= e.t).map((e) => ({ ...e, stage: stageAt(e.t) }))
  if (run.done) feed.push({ t: sc.total, txt: 'Answer ready', stage: nSteps - 1 })

  // sources found, with the agent that brought each one back and when
  const noteOf = (n: string) => [...SOURCES, ...SOURCES_EXTRA].find((x) => x.name === n)?.note ?? 'p. 2'
  type Found = { name: string; by: string; color: string; note: string; at: number }
  const found: Found[] = []
  const addFrom = (a: { name: string; short: string; color: string; src: string[] }, at: number) =>
    a.src.forEach((n) => found.push({ name: n, by: a.short, color: pal(a.color), note: noteOf(n), at }))
  if (sc.agents.length) sc.agents.forEach((a) => addFrom(a, sc.gs + a.start + a.dur))
  else
    sc.steps.forEach((st, i) => {
      if (st.agent) addFrom(st.agent, sc.t0[i] + st.dur)
      else if (st.id === 'agents' && st.agents) st.agents.forEach((a) => addFrom(a, sc.t0[i] + a.start + a.dur))
    })
  if (!found.length && sc.sources > 0) found.push({ name: 'Buyer Profile Database', by: 'Aldar X', color: '#2f245c', note: 'p. 2', at: (sc.t0[1] ?? 0) + (sc.steps[1]?.dur ?? 0) })
  found.sort((x, y) => x.at - y.at)
  const foundNow = found.filter((f) => run.done || run.t >= f.at)

  useEffect(() => {
    if (!sqlFor) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSqlFor(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sqlFor])
  const rzRef = useRef<HTMLElement>(null)
  useFollow(rzRef, (tab === 'activity' || tab === 'stages') && !run.done, [feed.length, tab, run.stepStatus.join(','), agList.filter((ag) => run.t >= (sc.agents.length ? sc.gs : sc.t0[Math.max(0, agStage)]) + ag.start).length].join(','), run.t < 0.3)

  return (
    <aside ref={rzRef} className={'rz' + (open ? '' : ' closed') + (wide ? ' wide' : '') + (run.done ? ' done' : '')} aria-label="Reasoning">
      <div className="rz-h">
        <span className="rz-ic"><ReasoningIcon size={24} /></span>
        <div className="rz-ttl">
          <h4>Reasoning</h4>
          <div className="rz-st"><span className="dot" /><span>{run.done ? 'Completed' : 'Live · ' + sc.steps[run.idx].live.toLowerCase()}</span></div>
        </div>
        <button aria-label="Expand" aria-disabled="true" tabIndex={-1} style={{ pointerEvents: "none" }}><Icon n="expand" size={18} /></button>
        <button onClick={onClose} aria-label="Close"><Icon n="x" size={18} /></button>
      </div>

      <div className="rz-time">
        <div className="rz-t1"><small>Overall time</small><b>{run.done ? fmt(sc.total) : fmt(run.t)}</b></div>
        <div className="rz-t2"><span>{run.pct}%</span></div>
      </div>
      <div className="rz-bar"><div style={{ width: run.pct + '%' }} /></div>
      <div className="rz-chips">{chips.map((c) => <span key={c}>{c}</span>)}</div>

      <div className="rz-tabs" role="tablist">
        {([
          ['stages', 'Stages'],
          ['activity', 'Activity'],
          ['sources', 'Sources'],
        ] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="rz-b">
        {tab === 'stages' && (
          <ol className="rz-tl">
            {sc.steps.flatMap((s, i) => {
              const out: ReactNode[] = []
              const st = run.stepStatus[i]
              if (st === 'pend') return out // later stages do not exist yet: the process streams in as it happens
              const host = (s.id === 'route' || s.id === 'plan') && agList.length > 0 && i === agStage - 1
              const agentsEnd = host ? Math.max(...agList.map((ag) => (sc.agents.length ? sc.gs : sc.t0[agStage]) + ag.start + ag.dur)) : 0
              const isOpen = expanded[i] ?? (st === 'act' || (host && !run.done && run.t < agentsEnd))
              const p = Math.max(0, Math.min(1, (run.t - sc.t0[i]) / s.dur))
              out.push(
                <li key={sc.id + s.id + i} className={'stp rz-in ' + st + (isOpen ? ' open' : '')}>
                  <div className="hd" onClick={() => toggle(i, isOpen)}>
                    <span className="ck"><Icon n="check" size={11} /></span>
                    <div className="tt"><b>{s.title}</b><small>{subtitle(i)}</small></div>
                    <span className="chv"><Icon n="chev" size={16} /></span>
                  </div>
                  {isOpen && (
                    <div className="bd">
                      <Reveal p={st === 'done' ? 1 : p * 1.3}>{body(i)}</Reveal>
                    </div>
                  )}
                </li>,
              )
              return out
            })}
          </ol>
        )}

        {tab === 'activity' && (
          <ol className="rz-feed">
            {feed.length === 0 && <li className="rz-empty">Activity appears here as the work happens.</li>}
            {feed.map((e) => (
              <li key={e.t + e.txt} className={'rz-ev s' + (e.stage % 5)}>
                <span className="tm">{e.t.toFixed(1)} s</span>
                <span className="pt" />
                <span className="tx">{e.txt}</span>
              </li>
            ))}
          </ol>
        )}

        {tab === 'sources' && (
          <ul className="rz-src">
            {foundNow.length === 0 && <li className="rz-empty">{sc.id === 'greeting' ? 'No sources were needed for this message.' : 'Sources appear here as the agents report back.'}</li>}
            {foundNow.map((f) => (
              <li key={f.name + f.by}><Icon n="doc" size={13} />{f.name}</li>
            ))}
          </ul>
        )}
      </div>

      {sqlFor &&
        createPortal(
          <div className="sqm-back" onClick={() => setSqlFor(null)} role="presentation">
            <div className="sqm" role="dialog" aria-modal="true" aria-label="SQL query" onClick={(e) => e.stopPropagation()}>
              <div className="sqm-h">
                <div>
                  <h5>SQL query</h5>
                  <p>{sqlFor.replace(/ Agent$/, '')}</p>
                </div>
                <button
                  className="sqm-copy"
                  onClick={() => {
                    navigator.clipboard?.writeText(SQL).catch(() => {})
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1500)
                  }}
                >
                  <Icon n={copied ? 'check' : 'copy'} size={14} />{copied ? 'Copied' : 'Copy'}
                </button>
                <button className="sqm-x" onClick={() => setSqlFor(null)} aria-label="Close"><Icon n="x" size={18} /></button>
              </div>
              <pre className="sqm-code">{sqlHighlight(SQL)}</pre>
            </div>
          </div>,
          document.body,
        )}
    </aside>
  )
}

/** Splits the text inside an element into word spans (keeping any inline markup such as the bold labels) and returns them in order. */
export function wrapWords(root: Element): HTMLElement[] {
  const out: HTMLElement[] = []
  const walk = (n: Node) => {
    Array.from(n.childNodes).forEach((c) => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment()
        ;(c.nodeValue ?? '').split(/(\s+)/).forEach((part) => {
          if (!part) return
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part))
          else {
            const s = document.createElement('span')
            s.className = 'rv-w'
            s.textContent = part
            out.push(s)
            frag.appendChild(s)
          }
        })
        n.replaceChild(frag, c)
      } else if (c.nodeType === 1 && !(c as Element).classList.contains('rv-w')) walk(c)
    })
  }
  walk(root)
  return out
}

/** Streams a stage's body: the passages appear one after another (p from 0 to 1), and inside each passage the words
 *  come in one by one, so every line fills from left to right and then the next line starts, like a live answer. */
function Reveal({ p, children }: { p: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const items = Array.from(el.querySelectorAll('li'))
    const shown = p >= 1 ? items.length : Math.max(1, Math.ceil(p * items.length))
    items.forEach((li, k) => {
      const show = k < shown
      li.classList.toggle('rv-hide', !show)
      if (show && !li.dataset.seen) {
        li.dataset.seen = '1'
        if (p < 1) {
          const words = wrapWords(li)
          let i = 0
          const id = window.setInterval(() => {
            // stop when finished, or when the stage has been folded away (its words are no longer on the page)
            if (i < words.length && words[0].isConnected) words[i++].classList.add('on')
            else window.clearInterval(id)
          }, 34)
        }
      }
    })
  })
  return <div ref={ref}>{children}</div>
}
