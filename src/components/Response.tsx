import { useEffect, useState, type ReactNode } from 'react'
import { SOURCES, quickAnswer } from '../data/scenario'
import { Icon } from './Icon'
import { ChartCard } from './Charts'

const CIRC = 2 * Math.PI * 30

function Ring({ p, color, label }: { p: number; color: string; label: string }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setOn(true), 150)
    return () => clearTimeout(id)
  }, [])
  return (
    <svg width="76" height="76" viewBox="0 0 76 76">
      <circle cx="38" cy="38" r="30" fill="none" stroke="#eeedf3" strokeWidth="8" />
      <circle cx="38" cy="38" r="30" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={on ? CIRC * (1 - p) : CIRC} transform="rotate(-90 38 38)" style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} />
      <text x="38" y="42" textAnchor="middle" style={{ fontSize: 14, fontWeight: 600, fill: '#252525' }}>{label}</text>
    </svg>
  )
}

const Up = () => (
  <svg viewBox="0 0 10 10" width="9" height="9"><path d="M5 1 9.3 8.5H.7z" fill="currentColor" /></svg>
)

function Sec({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <section className="sec in">
      <h3><span className="ht"><Icon n={icon} size={15} /></span>{title}</h3>
      {children}
    </section>
  )
}

export function Response({
  shown,
  onFullscreen,
  onToast,
  onReplay,
  bare = false,
  glass = false,
}: {
  shown: number
  onFullscreen: () => void
  onToast: (m: string) => void
  onReplay: () => void
  /** bare = no card chrome (used inside the glass card's white section) */
  bare?: boolean
  /** glass = same translucent glass background as the Variation 3 thinking card */
  glass?: boolean
}) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  const secs: ReactNode[] = [
    <Sec key="1" icon="msg" title="Executive summary">
      <p className="lead"><strong>Prioritise UAE nationals, Indian and UK buyers for the Q1 launches.</strong> Together they account for 56% of reservations across the last three launch cycles, and all three show supportive demand signals. Russia &amp; CIS buyers are the next-best opportunity, but depend on a policy factor that is still moving.</p>
      <div className="figs">
        <div className="fig"><div className="k">Priority segments</div><div className="v">3</div><span className="d"><Up />of 12 tracked</span></div>
        <div className="fig"><div className="k">Share of reservations</div><div className="v">56<small>%</small></div><span className="d"><Up />+4 pts vs Q1-25</span></div>
        <div className="fig"><div className="k">Average ticket</div><div className="v"><small>AED</small>2.9m</div><span className="d"><Up />+6% YoY</span></div>
        <div className="fig"><div className="k">Inquiry to reservation</div><div className="v">4.2<small>%</small></div><span className="d"><Up />+0.5 pts</span></div>
      </div>
    </Sec>,
    <Sec key="2" icon="chart" title="Buyer mix by nationality">
      <p><strong>Three segments carry more than half of demand.</strong> UAE nationals lead at 31%, followed by India at 14% and the United Kingdom at 11%. The long tail of nine other nationalities each contributes 10% or less.</p>
      <ChartCard onFullscreen={onFullscreen} />
    </Sec>,
    <Sec key="3" icon="target" title="Against the Q1 launch plan">
      <p>Reservation momentum is on track for the priority segments. Pipeline for the Q1 launch is already above the same point last cycle.</p>
      <div className="rings">
        <div className="ring"><Ring p={0.72} color="#2f245c" label="72%" /><div><div className="lb">Reservation target</div><div className="bg">AED 1.8bn <small>of 2.5bn</small></div><span className="calc">calculated</span></div></div>
        <div className="ring"><Ring p={0.84} color="#12b76a" label="84%" /><div><div className="lb">Priority-segment pipeline</div><div className="bg">1,260 <small>of 1,500 leads</small></div><span className="calc">calculated</span></div></div>
      </div>
    </Sec>,
    <Sec key="4" icon="globe" title="Market drivers behind the demand">
      <div className="drv">
        <div className="dr"><span className="ic"><Icon n="bank" /></span><div><b>Policy support</b><p>Long-stay residency options and freehold access continue to favour overseas investors.</p></div><span className="str hi">Strong</span></div>
        <div className="dr"><span className="ic"><Icon n="globe" /></span><div><b>Macro and geopolitical shifts</b><p>Capital relocation from the CIS and Europe is lifting premium-segment inquiries.</p></div><span className="str md">Moderate</span></div>
        <div className="dr"><span className="ic"><Icon n="cloud" /></span><div><b>Seasonal demand</b><p>Cooler months bring a predictable rise in site visits and off-plan launches.</p></div><span className="str md">Moderate</span></div>
      </div>
    </Sec>,
    <Sec key="5" icon="eye" title="What to treat with care">
      <div className="care">
        <div className="cr"><span className="ic"><Icon n="wallet" /></span><div><b>Policy-driven demand</b><p>Russia &amp; CIS demand depends on a rule change that is still under review. Treat it as a signal, not a commitment.</p></div></div>
        <div className="cr"><span className="ic"><Icon n="layers" /></span><div><b>Two reporting bases</b><p>Reservations and completed sales are counted on different dates. Quote one and name which.</p></div></div>
      </div>
    </Sec>,
    <Sec key="6" icon="search" title="Not covered by these sources">
      <ul className="b"><li>Off-plan resale activity</li><li>Agent and broker channel performance</li></ul>
      <button className="add" onClick={() => onToast('Broker Channel Report added to the next run')}><Icon n="plus2" size={14} />Add the Broker Channel Report</button>
    </Sec>,
    <Sec key="7" icon="msg" title="Suggested follow-ups">
      <div className="qs">
        {['Break this down by price band', 'Compare with last year’s launch mix', 'Draft a channel plan for UAE and India'].map((q) => (
          <button key={q} className="q" onClick={() => onToast('Running: ' + q.toLowerCase())}>{q}</button>
        ))}
      </div>
    </Sec>,
    <Sec key="8" icon="doc" title="Sources">
      <div className="schips">
        {SOURCES.map((s) => (
          <button key={s.name} className="sc" onClick={() => onToast('Opening ' + s.name)}><Icon n="doc" size={14} />{s.name} <small>{s.note}</small></button>
        ))}
      </div>
      <div className="illus">Prototype · illustrative data, not Aldar figures</div>
      <div className="acts">
        <button className="ibtn" onClick={() => onToast('Answer copied')} aria-label="Copy"><Icon n="copy" size={16} /></button>
        <button className="ibtn" aria-pressed={vote === 'up'} onClick={() => setVote(vote === 'up' ? null : 'up')} aria-label="Helpful"><Icon n="up" size={16} /></button>
        <button className="ibtn" aria-pressed={vote === 'down'} onClick={() => setVote(vote === 'down' ? null : 'down')} aria-label="Not helpful"><Icon n="down" size={16} /></button>
        <button className="ibtn" onClick={onReplay} aria-label="Run again"><Icon n="redo" size={16} /></button>
        <span className="lb">Was this answer helpful?</span>
      </div>
    </Sec>,
  ]
  return <div className={'rcard' + (bare ? ' bare' : '') + (glass ? ' glass' : '')}>{secs.slice(0, shown)}</div>
}

export const SECTION_COUNT = 8

/** Short answer used by the quick flows (a greeting or a one-line lookup): no charts, no sections. */
export function QuickResponse({
  question,
  onToast,
  onReplay,
}: {
  question: string
  onToast: (m: string) => void
  onReplay: () => void
}) {
  const a = quickAnswer(question)
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  return (
    <div className="rcard glass quick">
      <section className="sec in">
        <p className="lead">{a.text}</p>
        <div className="acts">
          <button className="ibtn" onClick={() => onToast('Answer copied')} aria-label="Copy"><Icon n="copy" size={16} /></button>
          <button className="ibtn" aria-pressed={vote === 'up'} onClick={() => setVote(vote === 'up' ? null : 'up')} aria-label="Helpful"><Icon n="up" size={16} /></button>
          <button className="ibtn" aria-pressed={vote === 'down'} onClick={() => setVote(vote === 'down' ? null : 'down')} aria-label="Not helpful"><Icon n="down" size={16} /></button>
          <button className="ibtn" onClick={onReplay} aria-label="Run again"><Icon n="redo" size={16} /></button>
        </div>
      </section>
    </div>
  )
}
