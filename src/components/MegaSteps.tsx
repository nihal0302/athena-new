import { useState } from 'react'
import { Icon } from './Icon'
import { AgentIcon } from './AgentIcon'

const clamp = (v: number) => Math.max(0, Math.min(1, v))

export type MItem = { key: string; icon: string; color: string; title: string; live: string; note: string; subs: string[]; q: number; state: 'd' | 'w' | 'p'; time: string }

/** A mega-menu for the stages: the stages are listed in a left column (about 30% of the width) and the stage that is running is
 *  shown as active; the remaining 70% shows what is happening inside it: how far it is, what is done, what is running and what is
 *  still waiting. Click a stage to look at it; click the running one to follow the run again. */
export function Mega({ open, items }: { open: boolean; items: MItem[] }) {
  const [pin, setPin] = useState<string | null>(null)
  const running = items.find((r) => r.state === 'w')
  const lastDone = [...items].reverse().find((r) => r.state === 'd')
  const auto = running ?? lastDone ?? items[0]
  const sel = items.find((r) => r.key === pin) ?? auto
  const n = sel.subs.length
  const subIdx = sel.state === 'd' ? n : sel.state === 'w' ? Math.min(n - 1, Math.floor((clamp(sel.q) / 0.88) * n)) : -1
  const pct = sel.state === 'd' ? 100 : sel.state === 'w' ? Math.round(sel.q * 100) : 0
  return (
    <div className={'tl-ex' + (open ? ' open' : '')}>
      <div className="tl-ex-in">
        <div className="mg">
          <ul className="mg-nav">
            {items.map((r) => (
              <li key={r.key}>
                <button className={'mg-it mg-' + r.state + (r.key === sel.key ? ' on' : '')} style={{ ['--c' as string]: r.color }} disabled={r.state === 'p'} onClick={() => setPin(r.key === auto.key ? null : r.key)}>
                  <span className="mg-ic"><AgentIcon n={r.icon} size={14} /></span>
                  <span className="mg-nm">{r.title}</span>
                  {r.state === 'd' && <span className="mg-ok"><Icon n="check" size={8} /></span>}
                  {r.state === 'w' && <i className="mg-live" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="mg-body" key={sel.key}>
            <div className="mg-hd">
              <span className="mg-t">{sel.title}</span>
              <span className={'mg-pill mg-' + sel.state}>{sel.state === 'd' ? 'Done · ' + sel.time : sel.state === 'w' ? 'Running · ' + sel.time : 'Waiting'}</span>
            </div>
            <div className="mg-bar" aria-label={pct + '%'}>
              {Array.from({ length: 20 }, (_, i) => (
                <i key={i} className={i < Math.round(pct / 5) ? 'on' : ''} />
              ))}
              <b>{pct}%</b>
            </div>
            <ul className="mg-subs">
              {n ? (
                sel.subs.slice(0, sel.state === 'd' ? n : subIdx + 1).map((t, i) => {
                  const st = sel.state === 'd' || i < subIdx ? 'd' : 'w'
                  return (
                    <li key={i} className={'mg-sub mg-s' + st}>
                      <span className="mg-sdot">{st === 'd' ? <Icon n="check" size={9} /> : <i />}</span>
                      <span>{t}</span>
                    </li>
                  )
                })
              ) : sel.state !== 'p' ? (
                <li className={'mg-sub mg-s' + sel.state}>
                  <span className="mg-sdot">{sel.state === 'd' ? <Icon n="check" size={9} /> : <i />}</span>
                  <span>{sel.state === 'd' ? sel.note : sel.live}</span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
