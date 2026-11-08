import { useState } from 'react'
import { SQL } from '../data/scenario'
import { fmt, type RunState } from '../hooks'
import { Icon, Sparkle } from './Icon'

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
  route: '3 agents selected',
  agents: '3 agents · 4 sources · 9 passages',
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
  const [sqlOpen, setSqlOpen] = useState(false)
  const toggle = (i: number) => setExpanded((e) => ({ ...e, [i]: !e[i] }))
  const nAgents = sc.agents.length

  const subtitle = (i: number) => {
    const s = sc.steps[i]
    const st = run.stepStatus[i]
    if (st === 'pend') return 'Waiting'
    if (st === 'act') {
      if (s.id === 'agents') return run.finishedAgents ? `${run.finishedAgents} of ${nAgents} agents finished` : 'Agents working in parallel'
      if (s.id === 'val') return `${run.checks} of ${sc.checks.length} checks passed`
      return s.live + '…'
    }
    if (s.id === 'read' && sc.id === 'lookup') return 'Question understood'
    return DONE_NOTE[s.id] ?? 'Done'
  }

  const body = (i: number) => {
    const s = sc.steps[i]
    const since = run.t - sc.t0[i]
    switch (s.id) {
      case 'intent':
        return (
          <>
            <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>
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
            <div className="as">Assigned Agent: <span className="ch"><Sparkle size={13} />Aldar X</span></div>
            <ul>
              <li><b>Delegate specialised insights:</b> three lines of enquiry, run in parallel.</li>
              <li>Buyer Profile Analysis Agent: who is buying.</li>
              <li>Market Transaction Data Agent: what is selling, and how fast.</li>
              <li>Policy &amp; Macro Signals Agent: what is driving demand.</li>
            </ul>
          </>
        )
      case 'agents':
        return sc.agents.map((a, k) => {
          const p = run.agentProgress[k]
          return (
            <div key={a.name}>
              <div className={'ag ' + (p >= 1 ? '' : p > 0 ? 'work' : 'wait')} style={{ ['--c' as string]: a.color }}>
                <span className="ic"><Icon n={a.icon} size={16} /></span>
                <div>
                  <div className="nm">{a.name}</div>
                  <div className="ds">{p >= 1 ? `${a.src.length} source${a.src.length > 1 ? 's' : ''} · ${a.pass} passages` : a.task}</div>
                  <div className="pb"><div style={{ width: p * 100 + '%' }} /></div>
                </div>
                <span className={'bdg ' + (p >= 1 ? 'd' : p > 0 ? 'w' : 'q')}>{p >= 1 ? 'Done' : p > 0 ? Math.round(p * 100) + '%' : 'Queued'}</span>
              </div>
              {a.sql && (
                <div className={'sqlb' + (sqlOpen ? ' open' : '')}>
                  <button onClick={() => setSqlOpen(!sqlOpen)}><Icon n="chev" size={13} /> {sqlOpen ? 'Hide query' : 'View query'}</button>
                  {sqlOpen && <pre>{sqlHighlight(SQL)}</pre>}
                </div>
              )}
            </div>
          )
        })
      case 'val':
        return (
          <ul className="chk">
            {sc.checks.map((c, k) => (
              <li key={c} className={k < run.checks ? 'ok' : ''}><span className="tk-c"><Icon n="check" size={9} /></span>{c}</li>
            ))}
          </ul>
        )
      case 'comp':
        return (
          <ul className="stream">
            {['Writing the executive summary', 'Building the buyer-mix chart and table', 'Adding drivers, caveats and open items', 'Attaching sources'].map((l, k) => (
              <li key={l} className={since > k + 0.2 || run.done ? 'on' : ''}>{l}</li>
            ))}
          </ul>
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
        return null
    }
  }

  return (
    <aside className={'rz' + (open ? '' : ' closed') + (wide ? ' wide' : '') + (run.done ? ' done' : '')} aria-label="Reasoning">
      <div className="rz-h">
        <h4>Reasoning</h4>
        <button onClick={onWide} aria-label="Expand"><Icon n="expand" size={18} /></button>
        <button onClick={onClose} aria-label="Close"><Icon n="x" size={18} /></button>
      </div>
      <div className="rz-st"><span className="dot" /><span>{run.done ? 'Completed · ' + fmt(sc.total) : 'Live · ' + sc.steps[run.idx].live.toLowerCase()}</span></div>
      <div className="rz-bar"><div style={{ width: run.pct + '%' }} /></div>
      <div className="rz-m">
        <div><b>{run.done ? sc.steps.length : Math.min(sc.steps.length, run.stepsDone + 1)}</b>steps</div>
        <div><b>{nAgents && run.t >= sc.steps[0].dur + 1.5 ? nAgents : 0}</b>agents</div>
        <div><b>{run.sources}</b>sources</div>
        <div><b>{run.checks}</b>checks</div>
      </div>
      <div className="rz-n"><Icon n="lock" size={13} /><span>Shows how agents worked and what was checked. Internal model reasoning isn’t displayed.</span></div>
      <div className="rz-b">
        <ol className="tl">
          {sc.steps.map((s, i) => {
            const st = run.stepStatus[i]
            const isOpen = !!expanded[i] && st !== 'pend'
            return (
              <li key={sc.id + s.id + i} className={'stp ' + st + (isOpen ? ' open' : '')}>
                <div className="hd" onClick={() => st !== 'pend' && toggle(i)}>
                  <span className="ck"><Icon n="check" size={11} /></span>
                  <div className="tt"><b>{s.title}</b><small>{subtitle(i)}</small></div>
                  <span className="dur">{st === 'done' ? s.dur.toFixed(1) + ' s' : ''}</span>
                  <span className="chv"><Icon n="chev" size={16} /></span>
                </div>
                {isOpen && <div className="bd">{body(i)}</div>}
              </li>
            )
          })}
        </ol>
      </div>
    </aside>
  )
}
