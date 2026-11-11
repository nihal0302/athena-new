import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { pal } from './palette'
import { SOURCES, SOURCES_EXTRA, type AgentDef } from '../data/scenario'
import { fmt, type RunState } from '../hooks'
import { AgentIcon } from './AgentIcon'
import { Icon } from './Icon'
import { wrapWords } from './Thinking'
import { useFollow } from './useFollow'

/* ------------------------------------------------------------------ */
/*  Reasoning pane, variation 2: "Story".                              */
/*  Light, and written like a short report instead of cards or a log:  */
/*  a stage rail across the top (full labels, nothing truncated),      */
/*  then the run told stage by stage in plain sentences. Agents report */
/*  in as one-liners with numbered source citations, and the numbered  */
/*  sources close the page. Text streams in word by word.              */
/* ------------------------------------------------------------------ */
const clamp = (v: number) => Math.max(0, Math.min(1, v))

/** Text whose words arrive one by one when it first appears. */
function Streamed({ text, live }: { text: string; live: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !live) return
    const words = wrapWords(el)
    let i = 0
    const id = window.setInterval(() => {
      if (i < words.length && words[0].isConnected) words[i++].classList.add('on')
      else window.clearInterval(id)
    }, 46)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <span ref={ref}>{text}</span>
}

export function TracePanel({
  run,
  open,
  wide,
  onClose,
  onWide,
  ai = false,
  bento = false,
  dark = false,
}: {
  run: RunState
  open: boolean
  wide: boolean
  onClose: () => void
  onWide: () => void
  ai?: boolean // the livelier "Aurora" look: glow, orb, gradients, glass cards
  bento?: boolean // widget tiles: frosted glass tiles with solid white cards inside, no panel behind them
  dark?: boolean // Bento in black glass instead of white glass
}) {
  const sc = run.sc
  const live = !run.done
  const nSteps = sc.steps.length

  // the agents that take part, and where they are called
  const agStage = sc.agents.length ? sc.agentStep : sc.steps.findIndex((x) => x.id === 'agents' && x.agents && x.agents.length)
  const agList: AgentDef[] = sc.agents.length ? sc.agents : agStage >= 0 ? (sc.steps[agStage].agents as AgentDef[]) : []
  const agStart = (ag: AgentDef) => (sc.agents.length ? sc.gs : agStage >= 0 ? sc.t0[agStage] : 0) + ag.start

  // numbered sources, in the order the agents brought them back
  const order: { name: string; at: number }[] = []
  const addSrc = (a: AgentDef, at: number) => a.src.forEach((n) => order.some((o) => o.name === n) || order.push({ name: n, at }))
  if (sc.agents.length) sc.agents.forEach((a) => addSrc(a, sc.gs + a.start + a.dur))
  else
    sc.steps.forEach((st, i) => {
      if (st.agent) addSrc(st.agent, sc.t0[i] + st.dur)
      else if (st.id === 'agents' && st.agents) st.agents.forEach((a) => addSrc(a, sc.t0[i] + a.start + a.dur))
    })
  if (!order.length && sc.sources > 0) order.push({ name: 'Buyer Profile Database', at: (sc.t0[1] ?? 0) + (sc.steps[1]?.dur ?? 0) })
  order.sort((a, b) => a.at - b.at)
  const numOf = (n: string) => order.findIndex((o) => o.name === n) + 1
  const noteOf = (n: string) => [...SOURCES, ...SOURCES_EXTRA].find((x) => x.name === n)?.note
  const foundNow = order.filter((o) => run.done || run.t >= o.at)

  // top numbers
  const stepsNow = run.done ? nSteps : run.stepsDone
  const agentsTotal = sc.agentTotal ?? sc.agents.length
  const stats: [string, string][] = [
    [run.done ? String(nSteps) : `${stepsNow}/${nSteps}`, 'steps'],
    [String(agentsTotal && (run.done || run.t >= sc.steps[0].dur + 1.5) ? agentsTotal : 0), 'agents'],
    [String(run.sources), 'sources'],
    [String(run.checks), 'checks passed'],
  ]

  // a citation number takes the reader to that source in the list and flashes it for a moment
  const srcRefs = useRef<Record<string, HTMLElement | null>>({})
  const [flash, setFlash] = useState<string | null>(null)
  const jump = (name: string) => {
    srcRefs.current[name]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlash(name)
    window.setTimeout(() => setFlash((f) => (f === name ? null : f)), 1800)
  }

  const say = (text: string) => <p key={text}><Streamed text={text} live={live} /></p>
  const cite = (a: AgentDef) => (
    <span className="st-cites"><em>Sources</em>{a.src.map((n) => (
      <button key={n} type="button" className="st-c" title={'Go to ' + n} onClick={() => jump(n)}>{numOf(n)}</button>
    ))}</span>
  )

  // what each stage says, in plain sentences
  const story = (i: number): ReactNode => {
    const s = sc.steps[i]
    const st = run.stepStatus[i]
    const intent = 'Read your question as a buyer-targeting brief for the Q1 launches, with the market drivers behind it: nationality mix, ticket size, inquiry conversion, and policy and macro signals.'
    const called = (
      <div className="st-called">
        {agList.map((ag) => (
          <span key={ag.name} className="st-chip" style={{ ['--c' as string]: pal(ag.color) }}><AgentIcon n={ag.icon} size={13} />{ag.short}</span>
        ))}
      </div>
    )
    switch (s.id) {
      case 'intent':
        return say(intent)
      case 'plan':
        return (
          <>
            {say(intent)}
            {st === 'done' && agList.length > 0 && (<>{say(`Split the work into ${agList.length} lines of enquiry and called the agents below.`)}{called}</>)}
          </>
        )
      case 'route':
        return (
          <>
            {say(`Split the work into ${agList.length || 'several'} lines of enquiry${agList.length ? ' and chose the agents to call.' : '.'}`)}
            {st === 'done' && agList.length > 0 && called}
          </>
        )
      case 'agents':
        return (
          <div className="st-ags">
            {agList.map((ag) => {
              const t1 = agStart(ag)
              const p = clamp((run.t - t1) / ag.dur)
              if (!run.done && p <= 0) return null
              const fin = run.done || p >= 1
              const sub = ag.subs[Math.min(ag.subs.length - 1, Math.floor(p * ag.subs.length))]
              return (
                <div key={ag.name} className={'st-ag' + (fin ? ' fin' : '')} style={{ ['--c' as string]: pal(ag.color) }}>
                  <span className="st-chip"><AgentIcon n={ag.icon} size={13} />{ag.short}</span>
                  <div className="st-at">
                    {fin ? (
                      <>
                        <p key="f"><Streamed text={ag.finding ?? `Brought back ${ag.pass} passages from ${ag.src.join(', ')}.`} live={live} /></p>
                        {cite(ag)}
                      </>
                    ) : (
                      <p className="wk" key={sub}>{sub}<i /><i /><i /></p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      case 'val':
      case 'wrap':
        return (
          <>
            {say(`Cross-checked every figure against ${sc.checks.length} rules.`)}
            <ul className="st-checks">
              {sc.checks.slice(0, run.done ? sc.checks.length : run.checks).map((c) => (
                <li key={c}><span><Icon n="check" size={9} /></span><Streamed text={c} live={live} /></li>
              ))}
            </ul>
            {s.id === 'wrap' && (run.done || run.checks >= sc.checks.length) && say('Writing the answer with the chart, caveats and sources.')}
          </>
        )
      case 'comp':
        return say('Writing the answer with the chart, caveats and sources.')
      case 'merge':
        return say('Collected the reports from the agents, matched each finding to your question and flagged the gaps.')
      default:
        if (s.agent) return say(`${s.agent.short} is ${s.agent.task.charAt(0).toLowerCase() + s.agent.task.slice(1)}.`)
        return say(s.note ?? s.live + '.')
    }
  }

  // Bento is presented one stage at a time: a tile slides in, opens and streams, folds, and only then does the next one come
  const [tileOpen, setTileOpen] = useState<Record<string, boolean>>({}) // the reader's own open / fold choices
  const [folded, setFolded] = useState<string[]>([]) // stages that have finished their turn
  const [revealed, setRevealed] = useState(0) // how many stage tiles are on show
  const freshRun = run.t < 0.3
  useEffect(() => {
    if (freshRun) {
      setTileOpen({})
      setFolded([])
      setRevealed(0)
    }
  }, [freshRun])
  const startedIdx = sc.steps.map((_, i) => i).filter((i) => run.done || run.stepStatus[i] !== 'pend')
  const stageKey = (i: number) => sc.steps[i].id + i
  useEffect(() => {
    if (!bento || revealed >= startedIdx.length) return
    const ready = revealed === 0 || folded.includes(stageKey(startedIdx[revealed - 1]))
    if (!ready) return
    const id = window.setTimeout(() => setRevealed((n) => n + 1), revealed === 0 ? 1200 : 450)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bento, revealed, startedIdx.length, folded])
  const allShown = revealed >= sc.steps.length && folded.includes(stageKey(sc.steps.length - 1))
  // keep the newest part in view while the run is live
  const ref = useRef<HTMLElement>(null)
  const seen = sc.steps.filter((_, i) => run.stepStatus[i] !== 'pend').length
  const lastShown = seen - 1 // stages start in order, so the last started one is the end of the line
  useFollow(ref, live || (bento && !allShown), bento ? [revealed, allShown].join(',') : [seen, foundNow.length, run.checks, agList.filter((ag) => run.t >= agStart(ag)).length].join(','), run.t < 0.3)

  // ---- Bento: no panel, just frosted widget tiles; each tile holds a solid white card ----
  if (bento) {
    const feed = sc.events.filter((e) => run.done || run.t >= e.t).slice(-8)
    return (
      <aside ref={ref} className={'rz rz-bento' + (dark ? ' bn-dark' : '') + (open ? '' : ' closed') + (wide ? ' wide' : '') + (run.done ? ' done' : '')} aria-label="Reasoning">
        <div className="bn-t bn-head bn-fade">
          <span className="bn-mark"><Icon n="route" size={20} /></span>
          <div className="bn-ttl">
            <b>Reasoning</b>
            <small>{live ? 'Live · ' + fmt(run.t) : 'Completed in ' + fmt(sc.total)}</small>
          </div>
          <button aria-label="Expand" aria-disabled="true" tabIndex={-1} style={{ pointerEvents: "none" }}><Icon n="expand" size={17} /></button>
          <button onClick={onClose} aria-label="Close"><Icon n="x" size={17} /></button>
        </div>

        <div className="bn-grid bn-fade">
          {stats.map(([v, l]) => (
            <div key={l} className="bn-t bn-stat"><span>{l.replace(' passed', '')}</span><b>{v}</b></div>
          ))}
        </div>

        {revealed > 0 && (
        <div className="bn-t bn-stages">
          <div className="bn-lb bn-glb"><span className="bn-tag"><Icon n="layers" size={12} />Stages</span><span className="bn-cnt">{Math.min(revealed, sc.steps.length)} / {sc.steps.length}</span></div>
        {startedIdx.slice(0, revealed).map((i) => {
          const s = sc.steps[i]
          const st = run.done ? 'done' : run.stepStatus[i]
          const key = stageKey(i)
          return (
            <BentoTile
              key={key}
              className={st}
              done={st === 'done'}
              userOpen={tileOpen[key]}
              onToggle={(cur) => setTileOpen((o) => ({ ...o, [key]: !cur }))}
              onFolded={() => setFolded((f) => (f.includes(key) ? f : [...f, key]))}
              head={
                <div className="bn-h">
                  <span className="bn-ti"><AgentIcon n={s.icon} size={17} /></span>
                  <h6>{s.title}</h6>
                </div>
              }
            >
              {s.id === 'agents' && agList.length > 0
                ? say(st === 'done' ? `Collected what the ${agList.length} agents found and moved on to checking it.` : 'Waiting for the agents to report back.')
                : story(i)}
            </BentoTile>
          )
        })}
        </div>
        )}

        {allShown && (
          <div className="bn-t bn-slide">
            <div className="bn-lb"><span className="bn-tag"><Icon n="chart" size={12} />Activity</span></div>
            <div className="bn-card bn-acts">
              {feed.length === 0 && <div className="bn-empty">Activity appears here as the work happens.</div>}
              {feed.map((e) => (
                <div key={e.t + e.txt} className="bn-ev"><span>{e.t.toFixed(1)} s</span><p>{e.txt}</p></div>
              ))}
            </div>
          </div>
        )}

        {allShown && foundNow.length > 0 && (
          <div className="bn-t bn-slide bn-slide2">
            <div className="bn-lb"><span className="bn-tag"><Icon n="doc" size={12} />Sources</span></div>
            <div className="bn-card bn-srcs">
              <div className="sy-src">
                <ol>
                  {foundNow.map((o) => (
                    <li key={o.name} ref={(el) => { srcRefs.current[o.name] = el }} className={flash === o.name ? 'flash' : ''}>
                      <button type="button" className="sy-sbtn" title={'Open ' + o.name}>
                        <i>{numOf(o.name)}</i>
                        <span>{o.name}</span>
                        {noteOf(o.name) && <small>{noteOf(o.name)}</small>}
                        <Icon n="right" size={14} className="go" />
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}
      </aside>
    )
  }

  return (
    <aside ref={ref} className={'rz rz-story' + (ai ? ' rz-ai' : '') + (open ? '' : ' closed') + (wide ? ' wide' : '') + (run.done ? ' done' : '')} aria-label="Reasoning">
      {ai && (
        <>
          <div className="au-bg" aria-hidden="true"><i /><i /><i /></div>
        </>
      )}
      <div className="sy-top">
        {ai ? (
          <span className={'au-orb' + (live ? ' live' : '')}>
            <i />
            <Icon n="route" size={18} />
            <em className="sp s1">✦</em>
            <em className="sp s2">✦</em>
            <em className="sp s3">✦</em>
          </span>
        ) : (
          <span className="sy-mark"><Icon n="route" size={20} /></span>
        )}
        <div className="sy-ttl">
          <b className={ai && live ? 'au-live' : ''}>Reasoning</b>
          <small>{live ? 'Live · ' + fmt(run.t) + (ai ? '' : ' · ' + sc.steps[run.idx].live.toLowerCase()) : 'Completed in ' + fmt(sc.total)}</small>
        </div>
        <button aria-label="Expand" aria-disabled="true" tabIndex={-1} style={{ pointerEvents: "none" }}><Icon n="expand" size={17} /></button>
        <button onClick={onClose} aria-label="Close"><Icon n="x" size={17} /></button>
      </div>

      <div className="sy-stats">
        {stats.map(([v, l]) => (
          <div key={l}><b>{v}</b><span>{l}</span></div>
        ))}
      </div>

      <div className="sy-body">
        {sc.steps.map((s, i) => {
          const st = run.stepStatus[i]
          if (st === 'pend') return null
          return (
            <section key={s.id + i} className={'sy-sec ' + st + (i === lastShown ? ' last' : '')}>
              <div className="sy-dot">{st === 'done' ? <Icon n="check" size={11} /> : <i />}</div>
              <div className="sy-c">
                <h6>{s.title}</h6>
                {story(i)}
              </div>
            </section>
          )
        })}

        {foundNow.length > 0 && (
          <section className="sy-src">
            <h6>Sources</h6>
            <ol>
              {foundNow.map((o) => (
                <li key={o.name} ref={(el) => { srcRefs.current[o.name] = el }} className={flash === o.name ? 'flash' : ''}>
                  <button type="button" className="sy-sbtn" title={"Open " + o.name}>
                    <i>{numOf(o.name)}</i>
                    <span>{o.name}</span>
                    {noteOf(o.name) && <small>{noteOf(o.name)}</small>}
                    <Icon n="right" size={14} className="go" />
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </aside>
  )
}

/** A Bento tile. It slides in from the right; once it has settled the body opens downwards and the text streams; when the
 *  stage is done it holds for a moment, then folds, and reports back so the next tile can come. Clicking its label or
 *  heading opens or folds it again. */
function BentoTile({
  className,
  done,
  userOpen,
  onToggle,
  onFolded,
  head,
  children,
}: {
  className: string
  done: boolean
  userOpen: boolean | undefined
  onToggle: (currentlyOpen: boolean) => void
  onFolded: () => void
  head: ReactNode
  children: ReactNode
}) {
  const [entered, setEntered] = useState(false) // the slide-in is over
  const [settled, setSettled] = useState(false) // the stage has finished and had time to be read
  const folded = useRef(onFolded)
  folded.current = onFolded
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 950)
    return () => window.clearTimeout(id)
  }, [])
  useEffect(() => {
    if (!done || !entered) return
    const id = window.setTimeout(() => setSettled(true), 1800)
    return () => window.clearTimeout(id)
  }, [done, entered])
  useEffect(() => {
    if (!settled) return
    const id = window.setTimeout(() => folded.current(), 1100) // the fold takes about a second
    return () => window.clearTimeout(id)
  }, [settled])
  const open = entered && (userOpen ?? !settled)
  return (
    <div className={'bn-stage bn-sub ' + className}>
      <div className="bn-card bn-click" onClick={(e) => { if ((e.target as HTMLElement).closest('.bn-bd')) return; onToggle(open) }}>
        <div className="bn-hrow">
          {head}
          <span className="bn-r">
            <span className={'bn-st ' + (done ? 'done' : 'act')}>{done ? <Icon n="check" size={10} /> : <i />}</span>
            <Icon n="chev" size={14} className={'bn-chv' + (open ? ' on' : '')} />
          </span>
        </div>
        <div className={'bn-bd' + (open ? ' open' : '')}>
          <div className="bn-bd-in">{entered && <div className="bn-pad">{children}</div>}</div>
        </div>
      </div>
    </div>
  )
}
