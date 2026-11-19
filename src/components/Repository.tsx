import { useMemo, useState } from 'react'
import { AGENTS, DEPTS, DEPT_ICON, ENTERPRISE, TRY_TASKS, type Access, type Agent } from '../data/agents'
import { AldarLogo, Icon, PinIcon } from './Icon'
import { TopBar } from './Shell'
import { AgentLogo } from './AgentLogos'

type View = { kind: 'home' } | { kind: 'list'; title: string; dept?: string; col?: 'yours' | 'enterprise' | 'rec' | 'new' | 'soon' }
type St = Record<string, Access>

const STATE_LABEL: Record<Access, string> = { available: 'Available', locked: 'No access', requested: 'Requested', soon: 'Coming soon' }

function Logo({ a, size = 44 }: { a: Agent; size?: number }) {
  return (
    <span className={'rp-logo' + (a.state === 'locked' ? ' lk' : '')} style={{ width: size, height: size }}>
      <AgentLogo id={a.id} size={Math.round(size * 0.58)} />
      {a.state === 'locked' && <i className="rp-lockdot"><Icon n="lock" size={10} /></i>}
    </span>
  )
}

function Card({ a, st, pins, onPin, onAct }: { a: Agent; st: Access; pins: Set<string>; onPin: (id: string) => void; onAct: (a: Agent) => void }) {
  const pinned = pins.has(a.id)
  return (
    <article className={'rp-card s-' + st}>
      <div className="rp-ch">
        <Logo a={{ ...a, state: st }} />
        <div className="rp-nm">
          <h3 title={a.name}>{a.name}</h3>
          <span>{a.dept === ENTERPRISE ? 'Everyone' : a.dept} · {a.owner}</span>
        </div>
        {st === 'available' && (
          <button className={'rp-pin' + (pinned ? ' on' : '')} aria-label={pinned ? 'Unpin' : 'Pin'} onClick={() => onPin(a.id)}><PinIcon size={18} /></button>
        )}
      </div>
      <div className="rp-bd">
        {a.cert && <span className="rp-b cert"><Icon n="badge" size={12} />Certified</span>}
        <span className="rp-b">{a.route}</span>
        {a.ar && <span className="rp-b">العربية</span>}
      </div>
      <p className="rp-ds">{a.desc}</p>
      <div className="rp-ft">
        <span className="rp-meta">
          {st === 'soon' ? <><Icon n="hourglass" size={14} />Coming soon</> : <><Icon n="star" size={14} />{a.rating?.toFixed(1)} · {a.usage?.replace(/ (chats|runs) a month/, '/mo')}</>}
        </span>
        <button className={'rp-act a-' + st} onClick={() => onAct(a)} disabled={st === 'requested'}>
          {st === 'available' && <>Start chat<Icon n="right" size={14} /></>}
          {st === 'locked' && <><Icon n="lock" size={14} />Request access</>}
          {st === 'requested' && <><Icon n="check" size={14} />Requested</>}
          {st === 'soon' && <><Icon n="bell" size={14} />Notify me</>}
        </button>
      </div>
    </article>
  )
}

function Mini({ a, onAct }: { a: Agent; onAct: (a: Agent) => void }) {
  return (
    <button className="rp-mini" onClick={() => onAct(a)}>
      <Logo a={a} size={36} />
      <span className="rp-mn"><b>{a.name}</b><small>{a.dept === ENTERPRISE ? 'Everyone' : a.dept}</small></span>
      <Icon n="right" size={14} />
    </button>
  )
}

export function Repository({ onNew, onRepo, onAsk, onStart, onToast }: { onNew: () => void; onRepo: () => void; onAsk: (q: string) => void; onStart: (a: Agent) => void; onToast: (m: string) => void }) {
  const [view, setView] = useState<View>({ kind: 'home' })
  const [q, setQ] = useState('')
  const [st, setSt] = useState<St>(() => Object.fromEntries(AGENTS.map((a) => [a.id, a.state])))
  const [pins, setPins] = useState<Set<string>>(() => new Set(AGENTS.filter((a) => a.pinned).map((a) => a.id)))
  const [fAccess, setFAccess] = useState<'all' | 'available' | 'locked' | 'soon'>('all')
  const [fLang, setFLang] = useState<'all' | 'ar'>('all')
  const [fCert, setFCert] = useState(false)

  const stateOf = (a: Agent) => st[a.id] ?? a.state
  const onPin = (id: string) => setPins((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const act = (a: Agent) => {
    const s = stateOf(a)
    if (s === 'available') onStart(a)
    else if (s === 'locked') { setSt((m) => ({ ...m, [a.id]: 'requested' })); onToast(`Access requested for ${a.name}. Your approver has been notified.`) }
    else if (s === 'soon') onToast(`We'll notify you when ${a.name} launches.`)
  }

  const yours = useMemo(() => AGENTS.filter((a) => (pins.has(a.id) || a.recent) && stateOf(a) === 'available'), [pins, st])
  const enterprise = AGENTS.filter((a) => a.dept === ENTERPRISE && a.state !== 'soon')
  const rec = AGENTS.filter((a) => a.rec && !a.recent)
  const soon = AGENTS.filter((a) => a.state === 'soon')

  const query = q.trim().toLowerCase()
  const searching = query.length > 0
  const matchQ = (a: Agent) => query.split(/\s+/).every((t) => (a.name + ' ' + a.desc + ' ' + a.tasks + ' ' + a.dept + ' ' + a.owner).toLowerCase().includes(t))

  let list: Agent[] = []
  let title = ''
  if (searching) { list = AGENTS.filter(matchQ); title = `Results for “${q.trim()}”` }
  else if (view.kind === 'list') {
    title = view.title
    list = view.dept ? AGENTS.filter((a) => a.dept === view.dept)
      : view.col === 'yours' ? yours
      : view.col === 'enterprise' ? AGENTS.filter((a) => a.dept === ENTERPRISE)
      : view.col === 'rec' ? AGENTS.filter((a) => a.rec)
      : view.col === 'new' ? AGENTS.filter((a) => a.isNew)
      : AGENTS.filter((a) => a.state === 'soon')
  }
  const filtered = list.filter((a) => {
    const s = stateOf(a)
    if (fAccess === 'available' && s !== 'available') return false
    if (fAccess === 'locked' && s !== 'locked' && s !== 'requested') return false
    if (fAccess === 'soon' && s !== 'soon') return false
    if (fLang === 'ar' && !a.ar) return false
    if (fCert && !a.cert) return false
    return true
  })
  const showList = searching || view.kind === 'list'
  const goHome = () => { setQ(''); setView({ kind: 'home' }) }
  const open = (v: View) => { setQ(''); setFAccess('all'); setFLang('all'); setFCert(false); setView(v) }
  const cardProps = { st: undefined as unknown as Access, pins, onPin, onAct: act }

  const Sec = ({ title, sub, onAll, children }: { title: string; sub?: string; onAll?: () => void; children: React.ReactNode }) => (
    <section className="rp-sec">
      <header><h2>{title}{sub && <small>{sub}</small>}</h2>{onAll && <button className="rp-all" onClick={onAll}>View all<Icon n="right" size={14} /></button>}</header>
      {children}
    </section>
  )

  return (
    <section className="view home repo">
      <TopBar onNew={onNew} onRepo={onRepo} repo />
      <div className="rp-scroll">
        <div className="rp-col">
          <div className="rp-hero">
            <h1>Agent repository</h1>
            <p>Find the right agent for the job. Every agent is visible, and you can request access to the ones you don't have yet.</p>
            <label className="rp-search">
              <Icon n="search" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by task, agent or department, e.g. “raise a purchase request”" />
              {q && <button aria-label="Clear" onClick={() => setQ('')}><Icon n="x" size={16} /></button>}
            </label>
            {!showList && (
              <div className="rp-try"><span>Try</span>{TRY_TASKS.map((t) => <button key={t} onClick={() => setQ(t)}>{t}</button>)}</div>
            )}
          </div>

          {!showList && (
            <>
              <Sec title="Your agents" sub="Pinned and recently used" onAll={() => open({ kind: 'list', title: 'Your agents', col: 'yours' })}>
                <div className="rp-minis">{yours.slice(0, 6).map((a) => <Mini key={a.id} a={a} onAct={act} />)}</div>
              </Sec>
              <Sec title="Enterprise-wide" sub="Available to everyone at Aldar" onAll={() => open({ kind: 'list', title: 'Enterprise-wide agents', dept: ENTERPRISE })}>
                <div className="rp-grid">{enterprise.slice(0, 3).map((a) => <Card key={a.id} a={a} {...cardProps} st={stateOf(a)} />)}</div>
              </Sec>
              <Sec title="Recommended for your role" sub="Based on what colleagues in similar roles use" onAll={() => open({ kind: 'list', title: 'Recommended for your role', col: 'rec' })}>
                <div className="rp-grid">{rec.slice(0, 3).map((a) => <Card key={a.id} a={a} {...cardProps} st={stateOf(a)} />)}</div>
              </Sec>
              <Sec title="By department" sub={`${DEPTS.length} departments`}>
                <div className="rp-depts">
                  {DEPTS.map((d) => {
                    const all = AGENTS.filter((a) => a.dept === d)
                    const mine = all.filter((a) => stateOf(a) === 'available').length
                    return (
                      <button key={d} className="rp-dept" onClick={() => open({ kind: 'list', title: d, dept: d })}>
                        <span className="rp-di"><Icon n={DEPT_ICON[d]} size={20} /></span>
                        <b>{d}</b>
                        <small>{all.length} agents · {mine} available to you</small>
                      </button>
                    )
                  })}
                </div>
              </Sec>
              <Sec title="Coming soon" sub="Get notified when they launch" onAll={() => open({ kind: 'list', title: 'Coming soon', col: 'soon' })}>
                <div className="rp-grid">{soon.slice(0, 3).map((a) => <Card key={a.id} a={a} {...cardProps} st={stateOf(a)} />)}</div>
              </Sec>
            </>
          )}

          {showList && (
            <section className="rp-sec">
              <header className="rp-lh">
                {!searching && <button className="rp-back" onClick={goHome}><Icon n="left" size={14} />Agent repository</button>}
                <h2>{title}<small>{filtered.length} {filtered.length === 1 ? 'agent' : 'agents'}</small></h2>
              </header>
              <div className="rp-filters">
                <div className="rp-seg">
                  {([['all', 'All'], ['available', 'Available to me'], ['locked', 'Request access'], ['soon', 'Coming soon']] as const).map(([k, l]) => (
                    <button key={k} className={fAccess === k ? 'on' : ''} onClick={() => setFAccess(k)}>{l}</button>
                  ))}
                </div>
                <button className={'rp-tg' + (fLang === 'ar' ? ' on' : '')} onClick={() => setFLang(fLang === 'ar' ? 'all' : 'ar')}>Arabic</button>
                <button className={'rp-tg' + (fCert ? ' on' : '')} onClick={() => setFCert(!fCert)}><Icon n="badge" size={14} />Certified</button>
              </div>
              {filtered.length ? (
                <div className="rp-grid">{filtered.map((a) => <Card key={a.id} a={a} {...cardProps} st={stateOf(a)} />)}</div>
              ) : (
                <div className="rp-empty">
                  <Icon n="search" size={28} />
                  <h3>No agent matches that yet</h3>
                  <p>Ask Athena and it will route your question to the right agent.</p>
                  {searching && <button className="rp-act a-available" onClick={() => onAsk(q.trim())}>Ask Athena instead<Icon n="right" size={14} /></button>}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </section>
  )
}
