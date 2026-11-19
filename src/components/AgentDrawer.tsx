import { useEffect } from 'react'
import { DEPT_SOURCES, ENTERPRISE, TYPE_CAN, TYPE_OF, TYPE_PROMPTS, type Access, type Agent } from '../data/agents'
import { AgentLogo } from './AgentLogos'
import { Icon, PinIcon, VerifiedIcon } from './Icon'

const ROUTE_LONG: Record<string, string> = {
  'Low-code': 'Built in Agent Studio',
  'Pro-code': 'Built in Optimus Prime',
  Hybrid: 'Low-code agent calling pro-code tools',
}

const STATE: Record<Access, string> = { available: 'Available to you', locked: 'No access', requested: 'Access requested', soon: 'Coming soon' }

/** a small, repeatable bit of fake history so the drawer has versions to show */
function versionsOf(a: Agent) {
  if (a.state === 'soon') return []
  return [
    { v: '1.3', d: '12 Nov 2026', n: 'Improved answer accuracy and source citations' },
    { v: '1.2', d: '28 Oct 2026', n: a.ar ? 'Added Arabic answers' : 'Expanded the sources it can use' },
    { v: '1.1', d: '6 Oct 2026', n: a.cert ? 'Certified for company-wide use' : 'First release' },
  ]
}

export function AgentDrawer({
  a, st, pinned, mine, onClose, onPin, onAct, onPrompt, onRate,
}: {
  a: Agent
  st: Access
  pinned: boolean
  mine?: number
  onClose: () => void
  onPin: () => void
  onAct: () => void
  onPrompt: (p: string) => void
  onRate: (n: number) => void
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const type = TYPE_OF[a.id]
  const prompts = [a.prompt, ...(TYPE_PROMPTS[type] ?? [])]
  const versions = versionsOf(a)
  const canAsk = st === 'available'

  return (
    <>
      <div className="rv-scrim" onClick={onClose} />
      <aside className="rv-dr" role="dialog" aria-label={a.name + ' details'}>
        <header className="rv-dh">
          <span className="rv-dlogo"><AgentLogo id={a.id} size={34} /></span>
          <div className="rv-dt">
            <h2>{a.name}{a.cert && <i title="Certified agent"><VerifiedIcon size={20} /></i>}</h2>
            <span>{type} agent · {a.dept === ENTERPRISE ? 'Everyone' : a.dept}</span>
          </div>
          {st === 'available' && (
            <button className={'rv-dbtn' + (pinned ? ' on' : '')} aria-label={pinned ? 'Unpin' : 'Pin'} onClick={onPin}><PinIcon size={18} /></button>
          )}
          <button className="rv-dbtn" aria-label="Close" onClick={onClose}><Icon n="x" size={18} /></button>
        </header>

        <div className="rv-db">
          <span className={'rv-dst s-' + st}>
            {st === 'locked' && <Icon n="lock" size={13} />}
            {st === 'available' && <i />}
            {st === 'requested' && <Icon n="clock" size={13} />}
            {st === 'soon' && <Icon n="hourglass" size={13} />}
            {STATE[st]}
          </span>

          <section>
            <h3>About</h3>
            <p>{a.desc}</p>
          </section>

          <section>
            <div className="rv-dg">
              <div><small>Owner</small><b>{a.owner}</b></div>
              <div><small>Type</small><b>{type}</b></div>
              <div><small>Build route<span className="rv-info" tabIndex={0} aria-label={ROUTE_LONG[a.route]}><Icon n="info" size={14} /><span className="vc-pop tip" role="tooltip">{ROUTE_LONG[a.route]}</span></span></small><b>{a.route}</b></div>
              <div><small>Language</small><b>{a.ar ? 'Arabic & English' : 'English'}</b></div>
              <div><small>Version</small><b>{versions[0] ? 'v' + versions[0].v : 'Not released'}</b></div>
              <div><small>Last updated</small><b>{versions[0]?.d ?? 'Not released yet'}</b></div>
            </div>
          </section>

          <section>
            <h3>What it can do</h3>
            <ul className="rv-dl">
              {(TYPE_CAN[type] ?? []).map((x) => <li key={x}><Icon n="check" size={15} />{x}</li>)}
            </ul>
          </section>

          <section>
            <h3>Try asking</h3>
            <div className="rv-dp">
              {prompts.slice(0, 3).map((p) => (
                <button key={p} disabled={!canAsk} title={canAsk ? 'Opens a new chat with this prompt' : 'Available once you have access'} onClick={() => onPrompt(p)}>
                  <span className="rv-dpt"><Icon n="msg" size={16} />{p}</span><Icon n="right" size={14} />
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Sources it uses</h3>
            <ul className="rv-ds">
              {(DEPT_SOURCES[a.dept] ?? []).map((x) => <li key={x}><Icon n="doc" size={15} />{x}</li>)}
            </ul>
          </section>

          <section>
            <h3>Versions</h3>
            {versions.length ? (
              <ul className="rv-dv">
                {versions.map((v) => <li key={v.v}><b>v{v.v}</b><span>{v.n}</span><time>{v.d}</time></li>)}
              </ul>
            ) : <p className="rv-dm">No versions yet. This agent has not launched.</p>}
          </section>

        </div>

        <footer className="rv-dfoot">
          {st !== 'soon' && (
            <div className={'vc-rate' + (mine ? ' rated' : '')} tabIndex={0}>
              <span className="vc-rv"><Icon n="star" size={20} />{a.rating?.toFixed(1)}</span>
              <div className="vc-pop" role="group" aria-label="Rate this agent">
                <small>{mine ? 'You rated this ' + mine + '/5' : 'Rate this agent'}</small>
                <div>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <button key={n} aria-label={n + (n === 1 ? ' star' : ' stars')} className={mine && n <= mine ? 'on' : ''} onClick={(e) => { onRate(n); e.currentTarget.blur(); (e.currentTarget.closest('.vc-rate') as HTMLElement | null)?.blur() }}><Icon n="star" size={18} /></button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <button className={'rp-act a-' + st} onClick={onAct} disabled={st === 'requested'}>
            {st === 'available' && <>Start chat<Icon n="right" size={14} /></>}
            {st === 'locked' && <><Icon n="lock" size={14} />No access · Request</>}
            {st === 'requested' && <><Icon n="check" size={14} />Access requested</>}
            {st === 'soon' && <><Icon n="bell" size={14} />Notify me</>}
          </button>
        </footer>
      </aside>
    </>
  )
}
