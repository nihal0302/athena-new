import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { pal } from './palette'
import { techStages, techStatus, type TechStage } from '../data/trace'
import { KpiIcon, ReasoningIcon, SpokeLoader } from './AgentIcon'
import { AldarLogo } from './Icon'
import { SOURCES, SOURCES_EXTRA, type AgentDef } from '../data/scenario'
import { fmt, type RunState } from '../hooks'
import { AgentIcon } from './AgentIcon'
import { Icon } from './Icon'
import { wrapWords } from './Thinking'
import { useAutoScroll, useFollow } from './useFollow'

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
function Streamed({ text, live, children }: { text: string; live: boolean; children?: ReactNode }) {
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
  return <span ref={ref}>{children ?? text}</span>
}

/** Flow shows one thing at a time, so the stage texts that talk about parallel work are worded in sequence. */
function flowWords(ts: TechStage): TechStage {
  if (ts.id === 'scope')
    return {
      ...ts,
      note: '3 launch cycles · 3 branches',
      lines: ts.lines.map((l) =>
        l.startsWith('No branch depends') ? 'The branches run one after another, in order, so each result can be checked before the next one starts.'
        : l.startsWith('Estimated critical path') ? 'Estimated time for the three branches together is about 21 s.'
        : l
      ),
    }
  if (ts.id === 'execute')
    return {
      ...ts,
      title: 'Run the agents',
      live: 'Running the agents one by one',
      lines: ts.lines.map((l) => (l.startsWith('Dispatched') ? 'Runs the three agents one after another; each completes its own retrieval loop and reports back before the next one starts.' : l)),
    }
  return ts
}

/** Flow keeps two or three lines per stage (the ones that say the most), so the quiet visual at the end of the stage gets the eye. */
const FLOW_KEEP: Record<string, number[]> = {
  understand: [1, 2],
  scope: [0, 1],
  authorise: [0, 2],
  execute: [],
  merge: [0],
  validate: [0],
  ground: [0],
  compose: [0],
}
function flowTs(ts: TechStage): TechStage {
  const w = flowWords(ts)
  const keep = FLOW_KEEP[w.id]
  return keep ? { ...w, lines: keep.map((i) => w.lines[i]).filter(Boolean) } : w
}

/** One line at a time: the new line rolls up from below while the old one rolls out the top, then it holds still until the next arrives. */
function Ticker({ text }: { text: string }) {
  const [pair, setPair] = useState<{ cur: string; prev: string | null }>({ cur: text, prev: null })
  useEffect(() => {
    setPair((p) => (p.cur === text ? p : { cur: text, prev: p.cur }))
  }, [text])
  return (
    <span className="fl-tick">
      {pair.prev && <span key={'o' + pair.prev} className="out">{pair.prev}</span>}
      <span key={'i' + pair.cur} className="in">{pair.cur}</span>
    </span>
  )
}

/** A clean loader: a faint track with a short arc that turns round it, and a small dot in the middle that breathes. */
function Spinner({ r = 9, dot = true }: { r?: number; dot?: boolean }) {
  return (
    <svg className="fl-spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="fl-trk" cx="12" cy="12" r={r} />
      <circle className="fl-arc" cx="12" cy="12" r={r} pathLength={100} />
      {dot && <circle className="fl-dot" cx="12" cy="12" r="2.6" />}
    </svg>
  )
}

/** The node on the timeline. While the stage runs it shows the loader; when the stage is done the loader gives way to a
 *  green check that lands with a small pop. */
function FlowNode({ done }: { done: boolean }) {
  return (
    <span className={'fl-n' + (done ? ' done' : '')}>
      {done ? <Icon n="check" size={12} /> : <Spinner />}
    </span>
  )
}

export function TracePanel({
  run,
  open,
  wide,
  onClose,
  onWide,
  ai = false,
  flow = false,
  bento = false,
  dark = false,
}: {
  run: RunState
  open: boolean
  wide: boolean
  onClose: () => void
  onWide: () => void
  ai?: boolean // the livelier "Aurora" look: glow, orb, gradients, glass cards
  flow?: boolean // "Flow": Aurora plus an agents strip, ringed check nodes joined by a line that draws down, and highlighted key terms
  bento?: boolean // widget tiles: frosted glass tiles with solid white cards inside, no panel behind them
  dark?: boolean // Bento in black glass instead of white glass
}) {
  const sc = run.sc
  const live = !run.done
  const tech = techStages(sc)
  const nSteps = tech ? tech.length : sc.steps.length

  // the agents that take part, and where they are called
  const agStage = sc.agents.length ? sc.agentStep : sc.steps.findIndex((x) => x.id === 'agents' && x.agents && x.agents.length)
  const agList: AgentDef[] = sc.agents.length ? sc.agents : agStage >= 0 ? (sc.steps[agStage].agents as AgentDef[]) : []
  const agStart = (ag: AgentDef) => (sc.agents.length ? sc.gs : agStage >= 0 ? sc.t0[agStage] : 0) + ag.start
  const aur = ai || flow
  const txt = (t: string) => <Streamed text={t} live={live} />

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
  const stepsNow = tech ? tech.filter((ts) => techStatus(ts, run.t, run.done) === 'done').length : run.done ? nSteps : run.stepsDone
  const agentsTotal = sc.agentTotal ?? sc.agents.length
  const stats: [string, string][] = [
    [run.done ? String(nSteps) : `${stepsNow}/${nSteps}`, tech ? 'stages' : 'steps'],
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

  const say = (text: string) => <p key={text}>{txt(text)}</p>
  /** Flow: the sources a step used, as small chips at the end of that step */
  const srcChips = (names: string[]) => (
    <div className="fl-srcs">
      {names.map((n) => (
        <span key={n} className="fl-src" title={noteOf(n) ?? n}>
          <Icon n="doc" size={12} />
          {n}
        </span>
      ))}
    </div>
  )
  const cite = (a: AgentDef) => flow ? srcChips(a.src) : (
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
                        <p key="f">{txt(ag.finding ?? `Brought back ${ag.pass} passages from ${ag.src.join(', ')}.`)}</p>
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
                <li key={c}><span><Icon n="check" size={9} /></span>{txt(c)}</li>
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

  /** technical stage detail: key/value facts, plus the live agents or the validation checks for the stages that have them */
  const techDetail = (ts: TechStage) => {
    const agI = sc.steps.findIndex((x) => x.id === 'agents')
    return (
      <>
        {flow && ts.kind === 'agents' ? null : flow ? (
          <div className="as">{ts.kind === 'agents' ? 'Agents used:' : 'Agent used:'}
            <div className="as-list">
              {ts.kind === 'agents' && agList.length > 0
                ? agList.map((ag) => <span key={ag.name} className="ch" style={{ ['--c' as string]: pal(ag.color) }}><AgentIcon n={ag.icon} size={14} />{ag.name.replace(/ Agent$/, '')}</span>)
                : <span className="ch"><AldarLogo size={13} />Aldar X</span>}
            </div>
          </div>
        ) : (
          <div className="st-called">
            {ts.kind === 'agents' && agList.length > 0
              ? agList.map((ag) => <span key={ag.name} className="st-chip" style={{ ['--c' as string]: pal(ag.color) }}><AgentIcon n={ag.icon} size={13} />{ag.short}</span>)
              : <span className="st-chip" style={{ ['--c' as string]: '#F66B00' }}><AldarLogo size={12} />Aldar X</span>}
          </div>
        )}
        <ul className="tech">
          {ts.lines.map((l) => (
            <li key={l}>{txt(l)}</li>
          ))}
          {flow && techStatus(ts, run.t, run.done) === 'done' && flowConclusion(ts).map((c, i) => <li key={'concl' + i} className="fl-cl">{c}</li>)}
        </ul>
        {ts.kind === 'agents' && agI >= 0 && (flow ? flowRuns() : story(agI))}
        {flow && (ts.id === 'merge' || ts.id === 'ground') && foundNow.length > 0 && srcChips(order.map((o) => o.name))}
        {ts.kind === 'checks' && (
          <ul className="st-checks">
            {sc.checks.slice(0, run.done ? sc.checks.length : run.checks).map((c) => (
              <li key={c}><span><Icon n="check" size={9} /></span>{txt(c)}</li>
            ))}
          </ul>
        )}
      </>
    )
  }

  // Bento is presented one stage at a time: a tile slides in, opens and streams, folds, and only then does the next one come
  const [tileOpen, setTileOpen] = useState<Record<string, boolean>>({}) // the reader's own open / fold choices
  const [folded, setFolded] = useState<string[]>([]) // stages that have finished their turn
  const [revealed, setRevealed] = useState(0) // how many stage tiles are on show
  const [flowOpen, setFlowOpen] = useState<Record<string, boolean>>({}) // Flow: stages the reader opened or folded themselves
  const [agOpen, setAgOpen] = useState<Record<string, boolean>>({}) // Flow: agent sections the reader opened
  const freshRun = run.t < 0.3
  useEffect(() => {
    if (freshRun) {
      setFlowOpen({})
      setAgOpen({})
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
  const techSeen = tech ? tech.filter((ts) => techStatus(ts, run.t, run.done) !== 'pend').length : 0
  const lastShown = tech ? techSeen - 1 : seen - 1 // stages start in order, so the last started one is the end of the line
  useAutoScroll(ref, flow && live, run.t < 0.3) // Flow follows the growing content frame by frame, so it never lands short
  useFollow(ref, !flow && (live || (bento && !allShown)), bento ? [revealed, allShown].join(',') : [seen, foundNow.length, run.checks, agList.filter((ag) => run.t >= agStart(ag)).length].join(','), run.t < 0.3)

  // ---- Bento: no panel, just frosted widget tiles; each tile holds a solid white card ----
  if (bento) {
    const feed = sc.events.filter((e) => run.done || run.t >= e.t).slice(-8)
    return (
      <aside ref={ref} className={'rz rz-bento' + (dark ? ' bn-dark' : '') + (open ? '' : ' closed') + (wide ? ' wide' : '') + (run.done ? ' done' : '')} aria-label="Reasoning trace">
        <div className="bn-t bn-head bn-fade">
          <span className="bn-mark"><ReasoningIcon size={22} /></span>
          <div className="bn-ttl">
            <b>Reasoning trace</b>
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

  // ---- Flow: four live numbers with icons and one overall progress line, then the agents at work ----
  const flowStats = () => (
    <div className="fl-stats">
      {([
        ['steps', stats[0][0], stats[0][1]],
        ['agents', stats[1][0], 'agents'],
        ['sources', execStage ? String(new Set(agList.filter((ag, k) => run.done || agProg(ag, k) >= 1).flatMap((ag) => ag.src)).size) : stats[2][0], 'sources'],
        ['checks', stats[3][0], 'checks passed'],
      ] as ['steps' | 'agents' | 'sources' | 'checks', string, string][]).map(([k, v, l]) => (
        <div key={k} className="fl-stat">
          <span className="fl-si"><KpiIcon k={k} size={17} /></span>
          <span className="fl-sv">
            <b>{v}</b>
            <span className="fl-sl">{l}</span>
          </span>
        </div>
      ))}
      <div className="fl-bar2">
        <span className="fl-plbl">Progress</span>
        <div className="fl-bar"><i style={{ width: (run.done ? 100 : run.pct) + '%' }} /></div>
        <span className="fl-pct">{run.done ? 100 : run.pct}%</span>
      </div>
    </div>
  )
  // Flow runs one thing at a time: the agents take turns inside the "run the agents" stage instead of overlapping
  const execStage = tech?.find((x) => x.kind === 'agents')
  const agProg = (ag: AgentDef, k: number) => {
    if (!execStage) return clamp((run.t - agStart(ag)) / ag.dur)
    const len = (execStage.end - execStage.start) / Math.max(1, agList.length)
    return clamp((run.t - (execStage.start + k * len)) / len)
  }
  /** Flow, "Run the agents": one small section per agent, appearing as that agent starts. By default a section shows only the
   *  agent, a small visual and a loader (a different one for each agent); opening it lists the steps and actions it took. */
  const AG_TOOL: Record<string, string> = {
    'Buyer profiles': 'vector_search · buyer_profiles',
    Transactions: 'sql_runner · gold.sales_transactions (read-only)',
    'Policy signals': 'vector_search · policy_tracker',
  }
  const loader = (k: number) =>
    k % 3 === 0 ? (
      <span className="fl-ld dots"><i /><i /><i /></span>
    ) : k % 3 === 1 ? (
      <span className="fl-ld bars"><i /><i /><i /><i /></span>
    ) : (
      <span className="fl-ld sweep"><i /></span>
    )
  const flowRuns = () => (
    <div className="fl-agsec">
      {agList.map((ag, k) => {
        const p = agProg(ag, k)
        if (!run.done && p <= 0) return null
        const fin = run.done || p >= 1
        const isOpen = agOpen[ag.name] ?? false
        const now = fin ? ag.subs.length : Math.min(ag.subs.length - 1, Math.floor(p * ag.subs.length))
        return (
          <div
            key={ag.name}
            className={'fl-agent' + (fin ? ' fin' : ' work') + (isOpen ? ' open' : '')}
            style={{ ['--c' as string]: pal(ag.color) } as CSSProperties}
            onClick={() => setAgOpen((m) => ({ ...m, [ag.name]: !isOpen }))}
          >
            <div className="fl-agh">
              <span className="fl-agi">
                <AgentIcon n={ag.icon} size={16} />
                {fin && <em className="fl-ok"><Icon n="check" size={8} /></em>}
              </span>
              <span className="fl-agn">
                <b>{ag.name.replace(/ Agent$/, '')}</b>
                <small>{fin ? `${ag.pass} passages · ${ag.src.length} ${ag.src.length === 1 ? 'source' : 'sources'}` : <Ticker text={ag.subs[now] + '…'} />}</small>
              </span>
              <Icon n="chev" size={14} className="fl-chv" />
            </div>
            <div className="fl-agd">
              <div>
                <ol className="fl-steps">
                  {ag.subs.map((s, i) => {
                    const st = i < now ? 'done' : i === now ? 'now' : 'pend'
                    return (
                      <li key={s} className={st}>
                        <span className="fl-sd">{st === 'now' ? <Spinner r={9} dot={false} /> : null}</span>
                        {s}
                      </li>
                    )
                  })}
                </ol>
                <span className="fl-mono">{AG_TOOL[ag.short] ?? ag.task}</span>
                {fin && <span className="fl-find">{ag.finding}</span>}
                {fin && srcChips(ag.src)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
  /** Flow: what a stage concluded, as the last bullet of the stage (seen when it is opened): a short sentence and a small,
   *  quiet visual that suits what was found. The visuals differ from stage to stage. */
  const chips = (names: string[]) => <span className="fl-chips">{names.map((n) => <span key={n} className="fl-chip">{n}</span>)}</span>
  const meter = (label: string, value: string, pct: number) => (
    <span className="fl-meter">
      <span className="fl-mh"><em>{label}</em><b>{value}</b></span>
      <span className="fl-mbar"><i style={{ width: pct + '%' }} /></span>
    </span>
  )
  const seg = (n: number, on: number, label: string) => (
    <span className="fl-seg">
      <span className="fl-segs">{Array.from({ length: n }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}</span>
      <em>{label}</em>
    </span>
  )
  const cells = (items: [string, string][]) => (
    <span className="fl-cells">{items.map(([v, l]) => <span key={l}><b>{v}</b><em>{l}</em></span>)}</span>
  )
  const flowConclusion = (ts: TechStage): ReactNode[] => {
    switch (ts.id) {
      case 'understand':
        return [
          <>Found 4 entities{chips(['Q1', 'nationality', 'reservations', 'market_drivers'])}</>,
          <>Treated as a buyer-targeting brief on the detailed path{meter('confidence', '0.94', 94)}</>,
        ]
      case 'scope':
        return [
          <>
            Scoped to three launch cycles and four data domains
            <span className="fl-tl3">{['Q1-25', 'Q3-25', 'Q1-26'].map((c) => <span key={c}><i />{c}</span>)}</span>
            <span className="fl-mono">buyer_profiles · sales_transactions · policy_tracker · launch_calendar</span>
          </>,
          <>
            Planned three retrieval branches that merge, then validate and compose
            <span className="fl-dag">
              <span className="fl-br"><b>Profiles</b><b>Transactions</b><b>Policy</b></span>
              <span className="fl-tail"><i>↳</i><b>Merge</b><i>→</i><b>Validate</b><i>→</i><b>Compose</b></span>
            </span>
          </>,
        ]
      case 'authorise':
        return [
          <>
            Authorised three agents, all read-only
            <span className="fl-stack">
              {agList.map((ag) => (
                <span key={ag.name} className="fl-av" title={ag.short} style={{ ['--c' as string]: pal(ag.color) } as CSSProperties}><AgentIcon n={ag.icon} size={14} /></span>
              ))}
              <em>{agList.map((ag) => ag.short).join(' · ')}</em>
            </span>
          </>,
          <>
            Bound three tools with a 24,000-token budget
            <span className="fl-rows">
              <span><b>sql_runner</b>reads the ledger</span>
              <span><b>vector_search</b>finds profile and policy passages</span>
              <span><b>doc_reader</b>opens source pages</span>
            </span>
          </>,
        ]
      case 'merge':
        return [<>Merged the agents' reports; two gaps remain{cells([['9', 'passages'], ['4', 'sources'], ['0', 'conflicts'], ['2', 'gaps']])}<span className="fl-mono">Gaps: off-plan resale, agent-channel data</span></>]
      case 'validate':
        return [<>Checked every figure against the raw rows{seg(sc.checks.length, sc.checks.length, sc.checks.length + ' of ' + sc.checks.length + ' checks passed')}</>]
      case 'ground':
        return [<>Tied every claim to a source{seg(14, 14, '14 of 14 claims grounded in 4 sources')}</>]
      case 'compose':
        return [
          <>
            Outlined the answer in 7 sections
            <ol className="fl-ol">
              {['Summary', 'Buyer mix', 'Launch plan', 'Drivers', 'Caveats', 'Follow-ups', 'Sources'].map((s) => <li key={s}>{s}</li>)}
            </ol>
          </>,
          <>Streamed about 620 tokens{seg(7, 2, '2 of 7 sections went out before the reasoning finished')}</>,
        ]
      default:
        return []
    }
  }
  /** Flow: a stage that has just finished stays open for a few seconds, so its conclusion visual is seen before it folds */
  const [hold, setHold] = useState<Record<string, boolean>>({})
  const doneIds = flow && live ? (tech ? tech.filter((ts) => techStatus(ts, run.t, run.done) === 'done').map((ts) => ts.id) : sc.steps.map((s, i) => (run.stepStatus[i] === 'done' ? s.id + i : ''))).filter(Boolean).join(',') : ''
  // one at a time: a stage opens by itself only once the one before it has shown its visual and folded
  const openDef = (id: string, st: string) => !!hold[id] || (st === 'act' && !Object.entries(hold).some(([k, v]) => v && k !== id))
  const seenDone = useRef<string[]>([])
  useEffect(() => {
    if (!flow) return
    const ids = doneIds ? doneIds.split(',') : []
    if (!live || run.t < 0.3) { seenDone.current = ids; return }
    ids.filter((id) => !seenDone.current.includes(id)).forEach((id) => {
      setHold((h) => ({ ...h, [id]: true }))
      window.setTimeout(() => setHold((h) => ({ ...h, [id]: false })), 1000)
    })
    seenDone.current = ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneIds])
  /** Flow: a click anywhere on a folded card opens it; an opened card folds only when its top part (title and summary line) is clicked */
  const flowToggle = (e: { target: EventTarget }, id: string, st: string) => {
    const isOpen = flowOpen[id] ?? openDef(id, st)
    if (isOpen && !(e.target as HTMLElement).closest('.fl-h, .sy-sub')) return
    setFlowOpen((m) => ({ ...m, [id]: !isOpen }))
  }
  /** how far a stage has got (0 to 1); in Flow the line under its node draws down by this much */
  const lineP = (start: number, end: number, st: string) => (st === 'done' ? 1 : clamp((run.t - start) / Math.max(0.1, end - start)))

  return (
    <aside ref={ref} className={'rz rz-story' + (aur ? ' rz-ai' : '') + (flow ? ' rz-flow' : '') + (open ? '' : ' closed') + (wide ? ' wide' : '') + (run.done ? ' done' : '')} aria-label="Reasoning trace">
      {aur && (
        <>
          <div className="au-bg" aria-hidden="true"><i /><i /><i /></div>
        </>
      )}
      <div className="sy-top">
        {aur ? (
          <span className={'au-orb' + (live ? ' live' : '')}>
            <i />
            <ReasoningIcon size={20} white={flow} />
            <em className="sp s1">✦</em>
            <em className="sp s2">✦</em>
            <em className="sp s3">✦</em>
          </span>
        ) : (
          <span className="sy-mark"><ReasoningIcon size={22} /></span>
        )}
        <div className="sy-ttl">
          <b className={aur && live ? 'au-live' : ''}>Reasoning trace</b>
          <small>{live ? (aur ? 'Live · ' + fmt(run.t) : fmt(run.t) + ' · ' + (tech && techSeen > 0 ? tech[techSeen - 1].live : sc.steps[run.idx].live).toLowerCase()) : 'Completed in ' + fmt(sc.total)}</small>
        </div>
        <button aria-label="Expand" aria-disabled="true" tabIndex={-1} style={{ pointerEvents: "none" }}><Icon n="expand" size={17} /></button>
        <button onClick={onClose} aria-label="Close"><Icon n="x" size={17} /></button>
      </div>

      {flow ? (
        <>
          {flowStats()}
        </>
      ) : aur ? (
        <div className="sy-stats">
          {stats.map(([v, l]) => (
            <div key={l}><b>{v}</b><span>{l}</span></div>
          ))}
        </div>
      ) : (
        <div className="sy-kpis">
          {([
            ['Steps', 'steps', run.done ? String(nSteps) : stepsNow + '/' + nSteps],
            ['Agents', 'agents', stats[1][0]],
            ['Sources', 'sources', stats[2][0]],
            ['Checks', 'checks', stats[3][0]],
          ] as [string, 'steps' | 'agents' | 'sources' | 'checks', string][]).map(([l, ic, v]) => (
            <div key={l} className="sy-kpi">
              <div className="k-top"><span className="k-l">{l}</span><i><KpiIcon k={ic} size={20} /></i></div>
              <b className="k-n">{v}</b>
            </div>
          ))}
        </div>
      )}

      <div className="sy-body">
        {tech && tech.map((ts0, i) => {
          const ts = flow ? flowTs(ts0) : ts0
          const st = techStatus(ts, run.t, run.done)
          if (st === 'pend') return null
          return (
            <section key={ts.id} className={'sy-sec ' + st + (i === lastShown ? ' last' : '') + (flow && (flowOpen[ts.id] ?? openDef(ts.id, st)) ? ' open' : '')} style={flow ? ({ ['--lp' as string]: lineP(ts.start, ts.end, st) } as CSSProperties) : undefined}>
              <div className={'sy-dot' + (st === 'act' ? ' ld' : '')}>{flow ? <FlowNode done={st === 'done'} /> : st === 'done' ? <Icon n="check" size={11} /> : <SpokeLoader size={22} />}</div>
              <div className="sy-c" onClick={flow ? (e) => flowToggle(e, ts.id, st) : undefined}>
                {flow ? (
                  <h6 className="fl-h">{ts.title}<Icon n="chev" size={14} className="fl-chv" /></h6>
                ) : (
                  <h6>{ts.title}</h6>
                )}
                <small className="sy-sub">{st === 'done' ? ts.note : ts.live + '…'}</small>
                {flow ? <div className="fl-det"><div>{techDetail(ts)}</div></div> : techDetail(ts)}
              </div>
            </section>
          )
        })}
        {!tech && sc.steps.map((s, i) => {
          const st = run.stepStatus[i]
          if (st === 'pend') return null
          return (
            <section key={s.id + i} className={'sy-sec ' + st + (i === lastShown ? ' last' : '') + (flow && (flowOpen[s.id + i] ?? openDef(s.id + i, st)) ? ' open' : '')} style={flow ? ({ ['--lp' as string]: lineP(sc.t0[i], sc.t0[i] + s.dur, st) } as CSSProperties) : undefined}>
              <div className="sy-dot">{flow ? <FlowNode done={st === 'done'} /> : st === 'done' ? <Icon n="check" size={11} /> : <i />}</div>
              <div className="sy-c" onClick={flow ? (e) => flowToggle(e, s.id + i, st) : undefined}>
                {flow ? (
                  <h6 className="fl-h">{s.title}<Icon n="chev" size={14} className="fl-chv" /></h6>
                ) : (
                  <h6>{s.title}</h6>
                )}
                {flow ? <div className="fl-det"><div>{story(i)}</div></div> : story(i)}
              </div>
            </section>
          )
        })}

        {flow && <i className="fl-glare" aria-hidden="true"><b /></i>}
        {!flow && foundNow.length > 0 && (
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
