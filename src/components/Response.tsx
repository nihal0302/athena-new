import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useVariants } from '../variants'
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

/** Streaming of the answer while the reasoning is still running (set by Response). */
type Flow = { stream: boolean; onStreamed: (i: number) => void; onGrow: () => void }
const FlowCtx = createContext<Flow>({ stream: false, onStreamed: () => {}, onGrow: () => {} })

/** wrap every word of the text in a hidden span (svg text is left alone) */
function wrapSafe(root: Element) {
  const walk = (n: Node) => {
    Array.from(n.childNodes).forEach((c) => {
      if (c.nodeType === 3) {
        const host = n as Element
        // inside a flex/grid parent every word would become its own item: keep the text together in one span
        if (host.nodeType === 1 && /flex|grid/.test(getComputedStyle(host).display) && (c.nodeValue ?? '').trim()) {
          const g = document.createElement('span')
          g.className = 'rv-g'
          host.replaceChild(g, c)
          g.appendChild(c)
          walk(g)
          return
        }
        const frag = document.createDocumentFragment()
        ;(c.nodeValue ?? '').split(/(s+)/).forEach((part) => {
          if (!part) return
          if (/^s+$/.test(part)) frag.appendChild(document.createTextNode(part))
          else {
            const s = document.createElement('span')
            s.className = 'rv-w'
            s.textContent = part
            frag.appendChild(s)
          }
        })
        n.replaceChild(frag, c)
      } else if (c.nodeType === 1) {
        const el = c as Element
        if (el.classList.contains('rv-w') || el.tagName.toLowerCase() === 'svg') return
        walk(el)
      }
    })
  }
  walk(root)
  return Array.from(root.querySelectorAll<HTMLElement>('.rv-w'))
}

/** Streams a section in word by word; charts and gauges fade in when the text reaches them. */
function useStreamIn(ref: React.RefObject<HTMLElement | null>, idx: number, flow: Flow) {
  const f = useRef(flow)
  f.current = flow
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !f.current.stream) return
    const words = wrapSafe(el)
    words.forEach((w) => w.classList.remove('on'))
    const visuals = Array.from(el.querySelectorAll<HTMLElement>('.fgr, .ring'))
    const at = visuals.map((v) => Math.max(0, words.findIndex((w) => v.contains(w))))
    visuals.forEach((v) => v.classList.add('sv-hide'))
    let i = 0
    const id = window.setInterval(() => {
      const w = words[i]
      if (w) w.classList.add('on')
      visuals.forEach((v, k) => {
        if (at[k] <= i) v.classList.remove('sv-hide')
      })
      i++
      if (i % 12 === 0) f.current.onGrow()
      if (i >= words.length) {
        window.clearInterval(id)
        visuals.forEach((v) => v.classList.remove('sv-hide'))
        f.current.onGrow()
        f.current.onStreamed(idx)
      }
    }, 34)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function Sec({ icon, title, children, util = false, idx = 0 }: { icon: string; title: string; children: ReactNode; util?: boolean; idx?: number }) {
  const flow = useContext(FlowCtx)
  const ref = useRef<HTMLElement>(null)
  useStreamIn(ref, idx, flow)
  return (
    <section ref={ref} className={"sec in" + (util ? " util" : "")}>
      <h3><span className="ht"><Icon n={icon} size={15} /></span><span className="h3t">{title}</span></h3>
      {children}
    </section>
  )
}

type Guide = { top: number; left: number; width: number; height: number; px: number; name: string; kind: 'tight' | 'el' | 'block' | 'sec' }

/** Spacing guides: measures the real gaps in the rendered answer and draws them as labelled bands (prototype setting). */
function SpacingGuides({ root }: { root: React.RefObject<HTMLDivElement | null> }) {
  const [g, setG] = useState<Guide[]>([])
  useEffect(() => {
    const measure = () => {
      const el = root.current
      if (!el) return
      const base = el.getBoundingClientRect()
      const sc = base.width / el.offsetWidth || 1
      const out: Guide[] = []
      const add = (top: number, h: number, px: number, name: string, left: number, width: number) => {
        if (px < 2) return
        const kind = name.startsWith('section') ? 'sec' : name === 'block' ? 'block' : px >= 10 ? 'el' : 'tight'
        out.push({ top: (top - base.top) / sc, left: (left - base.left) / sc, width: width / sc, height: h / sc, px: Math.round(px / sc), name, kind })
      }
      el.querySelectorAll<HTMLElement>(':scope > .sec').forEach((s) => {
        const cs = getComputedStyle(s)
        const sr = s.getBoundingClientRect()
        const pt = parseFloat(cs.paddingTop) * sc
        const pb = parseFloat(cs.paddingBottom) * sc
        add(sr.top, pt, pt, 'section start', sr.left, sr.width)
        add(sr.bottom - pb, pb, pb, 'section end', sr.left, sr.width)
        const kids = [...s.children] as HTMLElement[]
        kids.slice(1).forEach((k, i) => {
          const a = kids[i].getBoundingClientRect()
          const b = k.getBoundingClientRect()
          const gap = b.top - a.bottom
          const name = i === 0 && kids[0].tagName === 'H3' ? 'heading to content' : (getComputedStyle(k).marginTop === '24px' ? 'block' : 'element')
          add(a.bottom, gap, gap, name, a.left, a.width)
        })
      })
      setG(out)
    }
    measure()
    const id = setInterval(measure, 500)
    window.addEventListener('resize', measure)
    return () => { clearInterval(id); window.removeEventListener('resize', measure) }
  }, [root])
  return (
    <div className="sg" aria-hidden="true">
      {g.map((x, i) => (
        <div key={i} className={'sg-b sg-' + x.kind} style={{ top: x.top, left: x.left, width: x.width, height: x.height }}>
          <span className="sg-l">{x.px} · {x.name}</span>
        </div>
      ))}
    </div>
  )
}

export function Response({
  shown,
  onFullscreen,
  onToast,
  onReplay,
  bare = false,
  glass = false,
  sources = SOURCES,
  stream = false,
  pending = false,
  onStreamed = () => {},
  onGrow = () => {},
}: {
  sources?: typeof SOURCES
  /** stream the sections in word by word (while the reasoning is still running or just finished) */
  stream?: boolean
  /** more of the answer is still being worked out: show a loading block under the visible sections */
  pending?: boolean
  onStreamed?: (i: number) => void
  onGrow?: () => void
  shown: number
  onFullscreen: () => void
  onToast: (m: string) => void
  onReplay: () => void
  /** bare = no card chrome (used inside the glass card's white section) */
  bare?: boolean
  /** glass = same translucent glass background as the Variation 3 thinking card */
  glass?: boolean
}) {
  const { variants } = useVariants()
  const root = useRef<HTMLDivElement>(null)
  const secs: ReactNode[] = [
    <Sec idx={0} key="1" icon="msg" title="Executive summary">
      <p className="lead"><strong>Prioritise UAE nationals, Indian and UK buyers for the Q1 launches.</strong> Together they account for 56% of reservations across the last three launch cycles, and all three show supportive demand signals. Russia &amp; CIS buyers are the next-best opportunity, but depend on a policy factor that is still moving.</p>
      <ol className="nums">
        <li><span>1</span><p><strong>3</strong> priority segments, out of 12 tracked</p></li>
        <li><span>2</span><p><strong>56%</strong> of reservations, up 4 points on Q1-25</p></li>
        <li><span>3</span><p>Average ticket of <strong>AED 2.9m</strong>, up 6% year on year</p></li>
        <li><span>4</span><p>Inquiry to reservation at <strong>4.2%</strong>, up 0.5 points</p></li>
      </ol>
    </Sec>,
    <Sec idx={1} key="2" icon="chart" title="Buyer mix by nationality">
      <p><strong>Three segments carry more than half of demand.</strong> UAE nationals lead at 31%, followed by India at 14% and the United Kingdom at 11%. The long tail of nine other nationalities each contributes 10% or less.</p>
      <ChartCard onFullscreen={onFullscreen} />
    </Sec>,
    <Sec idx={2} key="3" icon="target" title="Against the Q1 launch plan">
      <p>Reservation momentum is on track for the priority segments. Pipeline for the Q1 launch is already above the same point last cycle.</p>
      <div className="rings">
        <div className="ring"><Ring p={0.72} color="#2f245c" label="72%" /><div><div className="lb">Reservation target</div><div className="bg">AED 1.8bn <small>of 2.5bn</small></div><span className="calc">calculated</span></div></div>
        <div className="ring"><Ring p={0.84} color="#12b76a" label="84%" /><div><div className="lb">Priority-segment pipeline</div><div className="bg">1,260 <small>of 1,500 leads</small></div><span className="calc">calculated</span></div></div>
      </div>
    </Sec>,
    <Sec idx={3} key="4" icon="globe" title="Market drivers behind the demand">
      <div className="drv">
        <div className="dr"><span className="ic"><Icon n="bank" /></span><div><b>Policy support</b><p>Long-stay residency options and freehold access continue to favour overseas investors.</p></div><span className="str hi">Strong</span></div>
        <div className="dr"><span className="ic"><Icon n="globe" /></span><div><b>Macro and geopolitical shifts</b><p>Capital relocation from the CIS and Europe is lifting premium-segment inquiries.</p></div><span className="str md">Moderate</span></div>
        <div className="dr"><span className="ic"><Icon n="cloud" /></span><div><b>Seasonal demand</b><p>Cooler months bring a predictable rise in site visits and off-plan launches.</p></div><span className="str md">Moderate</span></div>
      </div>
    </Sec>,
    <Sec idx={4} key="5" icon="eye" title="What to treat with care">
      <div className="care">
        <div className="cr"><span className="ic"><Icon n="wallet" /></span><div><b>Policy-driven demand</b><p>Russia &amp; CIS demand depends on a rule change that is still under review. Treat it as a signal, not a commitment.</p></div></div>
        <div className="cr"><span className="ic"><Icon n="layers" /></span><div><b>Two reporting bases</b><p>Reservations and completed sales are counted on different dates. Quote one and name which.</p></div></div>
      </div>
    </Sec>,
    <Sec idx={5} key="7" util icon="msg" title="Suggested follow-ups">
      <div className="qs">
        {['Break this down by price band', 'Compare with last year’s launch mix', 'Draft a channel plan for UAE and India'].map((q) => (
          <button key={q} className="q" onClick={() => onToast('Running: ' + q.toLowerCase())}>{q}</button>
        ))}
      </div>
    </Sec>,
    <Sec idx={6} key="8" util icon="doc" title="Sources">
      <div className="schips">
        {sources.map((s) => (
          <button key={s.name} className="sc" onClick={() => onToast('Opening ' + s.name)}><Icon n="doc" size={14} />{s.name} <small>{s.note}</small></button>
        ))}
      </div>
      <div className="illus">Prototype · illustrative data, not Aldar figures</div>
    </Sec>,
  ]
  const finished = !pending && shown >= secs.length
  return (
    <>
    <div ref={root} className={'rcard' + (bare ? ' bare' : '') + (glass ? ' glass' : '')}>
      <FlowCtx.Provider value={{ stream, onStreamed, onGrow }}>{secs.slice(0, shown)}</FlowCtx.Provider>
      {pending && (
        <div className="resp-pend" role="status">
          <span className="rp-l"><i />Still working on the rest of the answer</span>
          <span className="rp-b" /><span className="rp-b s" /><span className="rp-b xs" />
        </div>
      )}
      {variants.spacing === 'on' && <SpacingGuides root={root} />}
    </div>
    {finished && <Feedback onToast={onToast} onReplay={onReplay} />}
    </>
  )
}

/** Copy, thumbs up, thumbs down and run-again: sits under the answer card, outside it. */
function Feedback({ onToast, onReplay }: { onToast: (m: string) => void; onReplay: () => void }) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  return (
    <div className="acts outside">
      <button className="ibtn" onClick={() => onToast('Answer copied')} aria-label="Copy"><Icon n="copy" size={16} /></button>
      <button className="ibtn" aria-pressed={vote === 'up'} onClick={() => setVote(vote === 'up' ? null : 'up')} aria-label="Helpful"><Icon n="up" size={16} /></button>
      <button className="ibtn" aria-pressed={vote === 'down'} onClick={() => setVote(vote === 'down' ? null : 'down')} aria-label="Not helpful"><Icon n="down" size={16} /></button>
      <button className="ibtn" onClick={onReplay} aria-label="Run again"><Icon n="redo" size={16} /></button>
      <span className="lb">Was this answer helpful?</span>
    </div>
  )
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
  return (
    <>
      <div className="rcard glass quick">
        <section className="sec in">
          <p className="lead">{a.text}</p>
        </section>
      </div>
      <Feedback onToast={onToast} onReplay={onReplay} />
    </>
  )
}
