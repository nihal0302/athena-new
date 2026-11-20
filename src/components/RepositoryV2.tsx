import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AGENTS, DEPTS, DEPT_ICON, DEPT_OWNER, TYPES, TYPE_ICON, TYPE_OF, ENTERPRISE, MY_DEPT, deptShort, type Access, type Agent } from '../data/agents'
import { findAgents, topicOf, type Found } from '../data/finder'
import { AgentDrawer } from './AgentDrawer'
import { AldarLogo, Icon, PinIcon, VerifiedIcon } from './Icon'
import { TopBar } from './Shell'
import { AgentLogo } from './AgentLogos'

type ColId = 'enterprise' | 'mine' | 'cxo' | 'pinned' | 'new' | 'recent' | 'rec'
type Sel = { kind: 'all' } | { kind: 'col'; id: ColId } | { kind: 'dept'; d: string } | { kind: 'type'; t: string }
type Sort = 'popular' | 'rating' | 'name'

type Col = { id: ColId; label: string; icon: string }
/** The agents that belong to the person: what they pinned, what they used lately, and their own department's. */
const PERSONAL: Col[] = [
  { id: 'pinned', label: 'Pinned', icon: 'pin' },
  { id: 'recent', label: 'Recently used', icon: 'clock' },
  { id: 'mine', label: 'My department', icon: 'users' },
]
const GROUPS: Col[] = [
  { id: 'enterprise', label: 'Shared across Aldar', icon: 'globe' },
  { id: 'cxo', label: 'CXO & executives', icon: 'badge' },
]
const COLS: Col[] = [...GROUPS, ...PERSONAL]

const usageNum = (a: Agent) => parseFloat((a.usage ?? '0').replace(/[^0-9.]/g, '')) * (/k /.test(a.usage ?? '') ? 1000 : 1)

const ROUTE_TIP: Record<string, string> = {
  'Low-code': 'Low-code: built in Agent Studio',
  'Pro-code': 'Pro-code: built in Optimus Prime',
  Hybrid: 'Hybrid: a low-code agent calling pro-code tools',
}

function VCard({ a, st, pinned, mine, onOpen, onPin, onRate, onAct }: { a: Agent; st: Access; pinned: boolean; mine?: number; onOpen: () => void; onPin: () => void; onRate: (n: number) => void; onAct: () => void }) {
  return (
    <article className={'vc s-' + st} onClick={(e) => { if (!(e.target as HTMLElement).closest('button,.vc-rate,.vc-route')) onOpen() }}>
      <div className="vc-top">
        <span className="vc-ic"><AgentLogo id={a.id} size={26} />{a.cert && <i className="vc-vf" title="Certified agent"><VerifiedIcon size={18} /></i>}</span>
        <div className="vc-nm">
          <h3 title={a.name}><span role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}>{a.name}</span></h3>
          <span className="vc-own">{a.dept === ENTERPRISE ? 'Everyone' : a.dept}</span>
        </div>
        {st === 'soon' && <span className="vc-cs" title="Coming soon"><Icon n="hourglass" size={16} /></span>}
        {st === 'locked' && <span className="vc-lk" title="You don't have access to this agent"><Icon n="lock" size={16} /></span>}
        {st === 'available' && (
          <button className={'vc-pin' + (pinned ? ' on' : '')} aria-label={pinned ? 'Unpin' : 'Pin'} onClick={onPin}><PinIcon size={18} /></button>
        )}
      </div>
      <p className="vc-ds">{a.desc}</p>
      <div className="vc-ft">
        <div className="vc-stats">
          {st === 'soon' ? null : (
            <>
              <div className={'vc-rate' + (mine ? ' rated' : '')} tabIndex={0}>
                <span className="vc-rv"><Icon n="star" size={17} />{a.rating?.toFixed(1)}</span>
                <div className="vc-pop" role="group" aria-label="Rate this agent">
                  <small>{mine ? 'You rated this ' + mine + '/5' : 'Rate this agent'}</small>
                  <div>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <button key={n} aria-label={n + (n === 1 ? ' star' : ' stars')} className={mine && n <= mine ? 'on' : ''} onClick={(e) => { onRate(n); e.currentTarget.blur(); (e.currentTarget.closest('.vc-rate') as HTMLElement | null)?.blur() }}><Icon n="star" size={18} /></button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          <span className="vc-route" tabIndex={0}>{a.route}<span className="vc-pop tip" role="tooltip">{ROUTE_TIP[a.route]}</span></span>
        </div>
        <button className={'rp-act vc-cta a-' + st + (st === 'requested' ? ' keep' : '')} onClick={onAct} disabled={st === 'requested'} title={st === 'locked' ? "You don't have access to this agent. Get access by sending a request to your approver." : undefined}>
          {st === 'available' && <>Start chat</>}
          {st === 'locked' && <>Get access</>}
          {st === 'requested' && <><Icon n="check" size={14} />Requested</>}
          {st === 'soon' && <><Icon n="bell" size={14} />Notify me</>}
        </button>
      </div>
    </article>
  )
}

const SORTS: { id: Sort; label: string }[] = [
  { id: 'popular', label: 'Most used' },
  { id: 'rating', label: 'Top rated' },
  { id: 'name', label: 'Name A–Z' },
]

function SortMenu({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', off)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc) }
  }, [open])
  return (
    <div className="rv-sort" ref={ref}>
      <span>Sort by</span>
      <button className={'rv-sb' + (open ? ' open' : '')} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        {SORTS.find((s) => s.id === value)!.label}<Icon n="chev" size={14} />
      </button>
      {open && (
        <div className="rv-menu" role="listbox">
          {SORTS.map((s) => (
            <button key={s.id} role="option" aria-selected={s.id === value} className={s.id === value ? 'on' : ''} onClick={() => { onChange(s.id); setOpen(false) }}>
              {s.label}{s.id === value && <Icon n="check" size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type Lang = 'any' | 'ar' | 'en'
const LANGS: { id: Lang; label: string }[] = [
  { id: 'any', label: 'Any language' },
  { id: 'ar', label: 'Arabic & English' },
  { id: 'en', label: 'English only' },
]

function FilterMenu({ lang, onLang, type, onType }: { lang: Lang; onLang: (l: Lang) => void; type: string; onType: (t: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', off)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc) }
  }, [open])
  const [typeOpen, setTypeOpen] = useState(false)
  const count = (lang !== 'any' ? 1 : 0) + (type !== 'any' ? 1 : 0)
  const active = count > 0
  return (
    <div className="rv-fl" ref={ref}>
      <button className={'rv-sb rv-fb' + (open ? ' open' : '') + (active ? ' act' : '')} aria-label="Filters" title="Filters" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon n="sliders" size={18} />{active && <em>{count}</em>}
      </button>
      {open && (
        <div className="rv-menu rv-fp" role="dialog" aria-label="Filters">
          <div className="rv-fh">Language</div>
          <div className="rv-radios" role="radiogroup" aria-label="Language">
            {LANGS.map((l) => (
              <button key={l.id} role="radio" aria-checked={l.id === lang} className={l.id === lang ? 'on' : ''} onClick={() => onLang(l.id)}><i />{l.label}</button>
            ))}
          </div>
          <div className="rv-fh rv-fh2">Agent type</div>
          <div className="rv-dd">
            <button className={'rv-ddb' + (typeOpen ? ' open' : '')} aria-haspopup="listbox" aria-expanded={typeOpen} onClick={() => setTypeOpen(!typeOpen)}>
              {type === 'any' ? 'Any type' : type}<Icon n="chev" size={14} />
            </button>
            {typeOpen && (
              <div className="rv-ddl" role="listbox">
                {['any', ...TYPES].map((x) => (
                  <button key={x} role="option" aria-selected={x === type} className={x === type ? 'on' : ''} onClick={() => { onType(x); setTypeOpen(false) }}>
                    {x === 'any' ? 'Any type' : x}{x === type && <Icon n="check" size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** The department prompt box: same look and feel as the new-chat input box */
function AskBox({ value, onChange, onSend, placeholder }: { value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string }) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const ready = !!value.trim()
  useLayoutEffect(() => {
    if (!ta.current) return
    if (!value) { ta.current.style.height = '36px'; return } // one line until the text wraps
    ta.current.style.height = 'auto'
    ta.current.style.height = Math.min(168, Math.max(36, ta.current.scrollHeight)) + 'px'
  }, [value])
  return (
    <div className="composer rv-composer">
      <div className="cbox">
        <textarea
          ref={ta}
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (ready) onSend() } }}
        />
        <button className={'send' + (ready ? ' ready' : '')} data-tip="Send" onClick={() => ready && onSend()} aria-label="Send"><span className="send-ic" aria-hidden="true" /></button>
      </div>
    </div>
  )
}

const FIND_STEPS = ['Understanding what you need', 'Searching the agent repository', 'Matching the best agents for your task']

/** Shown under the finder box while it works: one line that flips, the old text going up and the next one rising from below. */
function FinderThinking({ step }: { step: number }) {
  return (
    <div className="fnd-fr fnd-think" role="status" aria-live="polite">
      <span className="fnd-dots" aria-hidden="true"><i /><i /><i /></span>
      <div className="fnd-flip">
        {FIND_STEPS.map((s, i) => (
          <span key={s} className={i < step ? 'out' : i === step ? 'in' : 'next'}>{s}</span>
        ))}
      </div>
    </div>
  )
}

/** The answer to "I need help with…": a short written reply, then the agents that can do the task, right on the repository page. */
function FinderResults({ text, found, stateOf, onAct, onOpen, onClear, onSuggest, canSuggest }: { text: string; found: Found; stateOf: (a: Agent) => Access; onAct: (a: Agent) => void; onOpen: (a: Agent) => void; onClear: () => void; onSuggest: () => void; canSuggest: boolean }) {
  const multi = found.asks.length > 1
  const n = found.results.length
  const { phrase, withHelp } = topicOf(text)
  const best = found.results[0]
  const list = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? '' : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1])
  const title = found.fallback ? 'No exact match, but these are a good place to start' : n + ' agents can help ' + (withHelp ? 'with ' : 'you ') + phrase
  let body = ''
  if (found.fallback) {
    body = 'Nothing in the repository does exactly this yet. ' + list(found.results.map((r) => r.agent.name)) + ' are the most useful agents to try first. You can also suggest a new agent to the team.'
  } else {
    const bs = stateOf(best.agent)
    const coveredAsks = new Set(found.results.flatMap((r) => r.covers)).size
    body = best.agent.name + ' from ' + (best.agent.dept === ENTERPRISE ? 'the shared agents' : best.agent.dept) + ' is the closest fit' + (multi && best.covers.length === found.asks.length ? ' and can handle everything you asked.' : '.')
    if (n > 1) body += ' ' + found.results[1].agent.name + ' is also worth a look.'
    if (multi && best.covers.length < found.asks.length) body += ' Between them they cover ' + coveredAsks + ' of your ' + found.asks.length + ' tasks.'
    if (bs === 'locked') body += ' You don’t have access to ' + best.agent.name + ' yet, but you can request it below.'
    else if (bs === 'soon') body += ' ' + best.agent.name + ' isn’t live yet, so you can ask to be notified.'
    else if (bs === 'requested') body += ' Your access request for ' + best.agent.name + ' has been sent.'
    else body += ' Start a chat and your request will be ready to send.'
  }
  return (
    <div className="fnd-fr" aria-live="polite">
      <header className="fnd-frh">
        <div>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
        <button className="fnd-frc" onClick={onClear}><Icon n="x" size={14} />Clear</button>
      </header>
      {n > 0 ? (
        <div className="fnd-frl">
          {found.results.map((r, k) => {
            const s = stateOf(r.agent)
            const all = r.covers.length === found.asks.length
            return (
              <article key={r.agent.id} className={'fnd-fc s-' + s} role="button" tabIndex={0} onClick={() => onOpen(r.agent)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(r.agent) }}>
                <span className="fnd-fic"><AgentLogo id={r.agent.id} size={28} /></span>
                <div className="fnd-fb">
                  <div className="fnd-ft">
                    <b>{r.agent.name}</b>
                    <span className="fnd-fd">{r.agent.dept === ENTERPRISE ? 'Shared across Aldar' : r.agent.dept}</span>
                    {k === 0 && !found.fallback && <span className="fnd-fbest">Best match</span>}
                  </div>
                  <p>{r.agent.desc}</p>
                  {multi && (
                    <div className="fnd-fw">
                      <span className={'fnd-fcov' + (all ? ' all' : '')}>
                        <Icon n={all ? 'check' : 'info'} size={12} />
                        {all ? 'Can do all ' + found.asks.length + ' of your tasks' : 'Can do ' + r.covers.length + ' of your ' + found.asks.length + ' tasks'}
                      </span>
                    </div>
                  )}
                  {s === 'locked' && <div className="fnd-fnote"><Icon n="lock" size={13} />You don’t have access to this agent yet, but it can do this.</div>}
                  {s === 'requested' && <div className="fnd-fnote"><Icon n="check" size={13} />Access requested. Your approver has been notified.</div>}
                  {s === 'soon' && <div className="fnd-fnote"><Icon n="hourglass" size={13} />This agent isn’t live yet.</div>}
                </div>
                <div className="fnd-fa">
                  <button className={'rp-act a-' + s} disabled={s === 'requested'} onClick={(e) => { e.stopPropagation(); onAct(r.agent) }}>
                    {s === 'available' && <>Start chat<Icon n="right" size={14} /></>}
                    {s === 'locked' && <><Icon n="lock" size={14} />Request access</>}
                    {s === 'requested' && <><Icon n="check" size={14} />Requested</>}
                    {s === 'soon' && <><Icon n="bell" size={14} />Notify me</>}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        canSuggest ? <div className="fnd-fnone"><button className="rv-sug" onClick={onSuggest}><Icon n="plus2" size={14} />Suggest a new agent</button></div> : null
      )}
      {found.fallback && canSuggest && <div className="fnd-fnone"><button className="rv-sug" onClick={onSuggest}><Icon n="plus2" size={14} />Suggest a new agent</button></div>}
      {!found.fallback && found.uncovered.length > 0 && (
        <div className="fnd-func"><Icon n="info" size={14} />No agent covers {list(found.uncovered)} yet. <button onClick={onSuggest}>Suggest one</button></div>
      )}
    </div>
  )
}

export function RepositoryV2({ onNew, onRepo, onAsk, onStart, onToast }: { onNew: () => void; onRepo: () => void; onAsk: (q: string) => void; onStart: (a: Agent, prompt?: string) => void; onToast: (m: string) => void }) {
  const [paneOpen, setPaneOpen] = useState(true)
  const [lang, setLang] = useState<Lang>('any')
  const [fType, setFType] = useState<string>('any')
  const NAV_DEPTS = ['Human Resources', 'Procurement', 'Finance', 'Legal', 'Education', 'Facilities', 'Data & AI', 'Marketing', 'Risk & Compliance'] // the departments the menu lists
  const [sel, setSel] = useState<Sel>({ kind: 'all' })
  const [q, setQ] = useState('')
  const [st, setSt] = useState<Record<string, Access>>(() => Object.fromEntries(AGENTS.map((a) => [a.id, a.state])))
  const [pins, setPins] = useState<Set<string>>(() => new Set(AGENTS.filter((a) => a.pinned).map((a) => a.id)))
  const [fAccess, setFAccess] = useState<'all' | 'available' | 'locked' | 'soon'>('all')
  const [sort, setSort] = useState<Sort>('popular')
  const [rated, setRated] = useState<Record<string, number>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [ask, setAsk] = useState('')
  const [searchOpen, setSearchOpen] = useState(false) // the search beside the tabs is a round button until it is opened
  const searchRef = useRef<HTMLInputElement>(null)
  const [found, setFound] = useState<{ text: string; res: Found } | null>(null) // what the finder box answered
  const [busy, setBusy] = useState<{ text: string; step: number } | null>(null) // the finder is working on a request
  const busyTimer = useRef(0)
  const stopBusy = () => { window.clearInterval(busyTimer.current); setBusy(null) }
  useEffect(() => () => window.clearInterval(busyTimer.current), [])
  const runFinder = (raw: string) => {
    const text = raw.trim()
    if (!text || busy) return
    setFound(null)
    setBusy({ text, step: 0 })
    let step = 0
    window.clearInterval(busyTimer.current)
    busyTimer.current = window.setInterval(() => {
      step += 1
      if (step >= FIND_STEPS.length) {
        window.clearInterval(busyTimer.current)
        setBusy(null)
        setFound({ text, res: findAgents(text, AGENTS) })
      } else setBusy({ text, step })
    }, 950)
  }

  const stateOf = (a: Agent) => st[a.id] ?? a.state
  const onPin = (id: string) => setPins((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const act = (a: Agent, prompt?: string) => {
    const s = stateOf(a)
    if (s === 'available') onStart(a, prompt)
    else if (s === 'locked') { setSt((m) => ({ ...m, [a.id]: 'requested' })); onToast(`Access requested for ${a.name}. Your approver has been notified.`) }
    else if (s === 'soon') onToast(`We'll notify you when ${a.name} launches.`)
  }

  const inCol = (a: Agent, id: string) =>
    id === 'enterprise' ? a.dept === ENTERPRISE
    : id === 'mine' ? a.dept === MY_DEPT
    : id === 'cxo' ? !!a.cxo
    : id === 'pinned' ? pins.has(a.id)
    : id === 'new' ? !!a.isNew
    : id === 'recent' ? !!a.recent
    : !!a.rec
  const inSel = (a: Agent) => sel.kind === 'all' ? true : sel.kind === 'dept' ? a.dept === sel.d : sel.kind === 'type' ? TYPE_OF[a.id] === sel.t : inCol(a, sel.id)
  const colCount = (id: string) => AGENTS.filter((a) => inCol(a, id)).length

  const query = q.trim().toLowerCase()
  const matchQ = (a: Agent) => query.split(/\s+/).every((t) => (a.name + ' ' + a.desc + ' ' + a.tasks + ' ' + a.dept + ' ' + a.owner).toLowerCase().includes(t))
  const base = useMemo(() => AGENTS.filter((a) => (query ? matchQ(a) : inSel(a))), [sel, query, pins])
  const langOk = (a: Agent) => lang === 'any' || (lang === 'ar' ? a.ar : !a.ar)
  const typeOk = (a: Agent) => fType === 'any' || TYPE_OF[a.id] === fType
  const pool = base.filter((a) => langOk(a) && typeOk(a))
  const accessOk = (a: Agent, k: typeof fAccess) => {
    const s = stateOf(a)
    return k === 'all' ? true : k === 'available' ? s === 'available' : k === 'locked' ? s === 'locked' || s === 'requested' : s === 'soon'
  }
  const tabCount = (k: typeof fAccess) => pool.filter((a) => accessOk(a, k)).length
  const list = pool.filter((a) => accessOk(a, fAccess)).sort((x, y) =>
    sort === 'name' ? x.name.localeCompare(y.name) : sort === 'rating' ? (y.rating ?? 0) - (x.rating ?? 0) : usageNum(y) - usageNum(x))

  const title = query ? `Results for “${q.trim()}”` : sel.kind === 'all' ? 'All agents' : sel.kind === 'dept' ? sel.d : sel.kind === 'type' ? sel.t + ' agents' : COLS.find((c) => c.id === sel.id)!.label
  const pick = (s: Sel) => { setSel(s); setQ(''); setAsk(''); setFound(null); stopBusy(); setSearchOpen(false) }
  const hub = !query && sel.kind === 'dept' ? sel.d : null
  const hubAgents = hub ? AGENTS.filter((a) => a.dept === hub) : []
  const hubSoon = hubAgents.filter((a) => stateOf(a) === 'soon').length
  const openAgent = openId ? AGENTS.find((a) => a.id === openId) ?? null : null
  const isOn = (s: Sel) => !query && JSON.stringify(s) === JSON.stringify(sel)

  return (
    <section className={'view home repo rv' + (paneOpen ? '' : ' pane-closed')}>
      <TopBar onNew={onNew} onRepo={onRepo} repo />

      <aside className={'rv-pane' + (paneOpen ? '' : ' collapsed')} aria-label="Agent repository menu">
        <div className="rv-ph" onClick={paneOpen ? undefined : () => setPaneOpen(true)} role={paneOpen ? undefined : 'button'} tabIndex={paneOpen ? undefined : 0} aria-label={paneOpen ? undefined : 'Expand agent repository menu'} onKeyDown={(e) => { if (!paneOpen && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPaneOpen(true) } }}>
          <span className="rv-pic"><span className="ic-a"><Icon n="chip" size={19} /></span><span className="ic-b"><Icon n="panel" size={18} /></span></span>
          <span className="rv-ptx">Agent repository</span>
          <button className="rv-pcol" aria-label="Collapse agent repository menu" tabIndex={paneOpen ? 0 : -1} onClick={() => setPaneOpen(false)}><Icon n="panel" size={18} /></button>
        </div>
        <div className="rv-pl">
          <button className={'rv-i' + (isOn({ kind: 'all' }) ? ' on' : '')} onClick={() => pick({ kind: 'all' })}>
            <Icon n="grid" size={16} /><span>All agents</span>
          </button>
          <button className={'rv-i' + (isOn({ kind: 'col', id: 'enterprise' }) ? ' on' : '')} onClick={() => pick({ kind: 'col', id: 'enterprise' })}>
            <Icon n="globe" size={16} /><span>Shared across Aldar</span>
          </button>

          <div className="rv-gt">Personal</div>
          {PERSONAL.map((c) => (
            <button key={c.id} className={'rv-i' + (isOn({ kind: 'col', id: c.id }) ? ' on' : '')} onClick={() => pick({ kind: 'col', id: c.id })}>
              <Icon n={c.icon} size={16} /><span>{c.label}</span>
            </button>
          ))}

          <div className="rv-gt">Departments</div>
          {NAV_DEPTS.map((d) => (
            <button key={d} className={'rv-i' + (isOn({ kind: 'dept', d }) ? ' on' : '')} onClick={() => pick({ kind: 'dept', d })}>
              <Icon n={DEPT_ICON[d]} size={16} /><span>{d}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="rv-scroll">
        <div className="rv-main">
          {hub ? (
            <>
              <header className="rv-h rv-hubh">
                <h1>{hub}</h1>
                <p className="rv-hm">Owner: {DEPT_OWNER[hub]}</p>
              </header>
            </>
          ) : (
          <header className="rv-h">
            <h1>{title}<small>{list.length} {list.length === 1 ? 'agent' : 'agents'}</small></h1>
          </header>
          )}

          <section className={'rv-ask rv-ask--solid rv-ask--tight' + (busy ? ' thinking' : '')}>
            <div className="rv-askrow">
              <AskBox
                value={ask}
                onChange={setAsk}
                onSend={() => runFinder(ask)}
                placeholder={hub ? 'Ask any ' + deptShort(hub) + ' task and the relevant agent will appear' : 'Describe what you need, for example “I need help with my payslip”'}
              />
              {hub && <button className="rv-sug" onClick={() => onToast('Thanks, your suggestion has been sent to the ' + hub + ' team.')}><Icon n="plus2" size={14} />Suggest a new agent</button>}
            </div>
            {busy && <FinderThinking step={busy.step} />}
            {found && !busy && (
              <FinderResults
                text={found.text}
                found={found.res}
                stateOf={stateOf}
                onAct={(a) => act(a, found.text)}
                onOpen={(a) => setOpenId(a.id)}
                onClear={() => { setFound(null); setAsk(''); stopBusy() }}
                onSuggest={() => onToast('Thanks, your suggestion has been sent to the team.')}
                canSuggest={!hub}
              />
            )}
          </section>

          <div className="rv-tabs">
            <div className="rv-tl" role="tablist">
              {([['all', 'All'], ['available', 'Available to me'], ['locked', 'Request access'], ['soon', 'Coming soon']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={fAccess === k} className={fAccess === k ? 'on' : ''} onClick={() => setFAccess(k)}>{l}<em>{tabCount(k)}</em></button>
              ))}
            </div>
            <div className="rv-tools">
              <label className={'rp-search rv-search' + (searchOpen || q ? ' open' : '')} onClick={() => { if (!searchOpen) { setSearchOpen(true); window.setTimeout(() => searchRef.current?.focus(), 60) } }} role={searchOpen || q ? undefined : 'button'} aria-label={searchOpen || q ? undefined : 'Search agents by name'}>
                <Icon n="search" size={18} />
                <input ref={searchRef} value={q} tabIndex={searchOpen || q ? 0 : -1} onChange={(e) => setQ(e.target.value)} onBlur={() => { if (!q) setSearchOpen(false) }} onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); setSearchOpen(false); e.currentTarget.blur() } }} placeholder="Search agent name" />
                {q && <button aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(''); searchRef.current?.focus() }}><Icon n="x" size={14} /></button>}
              </label>
              <FilterMenu lang={lang} onLang={setLang} type={fType} onType={setFType} />
            </div>
          </div>

          {list.length ? (
            <div className="rv-grid">
              {list.map((a) => <VCard key={a.id} a={a} st={stateOf(a)} pinned={pins.has(a.id)} mine={rated[a.id]} onOpen={() => setOpenId(a.id)} onPin={() => onPin(a.id)} onRate={(n) => { setRated((r) => ({ ...r, [a.id]: n })); onToast(`Thanks, you rated ${a.name} ${n}/5.`) }} onAct={() => act(a)} />)}
            </div>
          ) : (
            <div className="rp-empty">
              <Icon n="search" size={28} />
              <h3>No agent matches that yet</h3>
              <p>Ask Athena and it will route your question to the right agent.</p>
              {query && <button className="rp-act a-available" onClick={() => onAsk(q.trim())}>Ask Athena instead<Icon n="right" size={14} /></button>}
            </div>
          )}
        </div>
      </div>

      {openAgent && (
        <AgentDrawer
          a={openAgent}
          st={stateOf(openAgent)}
          pinned={pins.has(openAgent.id)}
          mine={rated[openAgent.id]}
          onClose={() => setOpenId(null)}
          onPin={() => onPin(openAgent.id)}
          onAct={() => { act(openAgent, found?.text); if (stateOf(openAgent) === 'available') setOpenId(null) }}
          onPrompt={(p) => onAsk(p)}
          onRate={(n) => { setRated((x) => ({ ...x, [openAgent.id]: n })); onToast(`Thanks, you rated ${openAgent.name} ${n}/5.`) }}
        />
      )}
    </section>
  )
}
