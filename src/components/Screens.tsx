import { useEffect, useMemo, useRef, useState } from 'react'
import { QUICK_STARTERS, STARTERS, buildScenario, sourcesFor, type AgentCount } from '../data/scenario'
import { deriveRun, useRun } from '../hooks'
import { useVariants } from '../variants'
import { AGENTS_PARAM } from '../hooks'
import { FullscreenChart } from './Charts'
import { BlocksCard } from './BlocksCard'
import { GraphCard } from './GraphCard'
import { GlobeCard } from './GlobeCard'
import { TimelineCard } from './TimelineCard'
import { GoldSparkle, Icon, Sparkle } from './Icon'
import { QuickResponse, Response } from './Response'
import { Composer, RecentsMenu, TopBar } from './Shell'
import { ReasoningPanel } from './Thinking'
import { TracePanel } from './TracePanel'

export function HomeScreen({
  menuOpen,
  onMenu,
  onNew,
  onAsk,
}: {
  menuOpen: boolean
  onMenu: () => void
  onNew: () => void
  onAsk: (q: string) => void
}) {
  const [text, setText] = useState('')
  const { variants } = useVariants()
  // starter chips follow the response-time setting: short questions for quick, the full brief for detailed
  const starters = variants.speed === 'quick' ? QUICK_STARTERS : STARTERS
  return (
    <section className="view home">
      <TopBar onNew={onNew} />
      <RecentsMenu open={menuOpen} onToggle={onMenu} />
      <div className="hero">
        <h1>Welcome to Aldar AI</h1>
        <p>A centralized system control for multiple AI agents</p>
        <div className="chips">
          {starters.map((s) => (
            <button key={s.label} className="chip" onClick={() => setText(s.prompt)}>{s.label}</button>
          ))}
        </div>
      </div>
      <Composer value={text} onChange={setText} onSend={() => onAsk(text.trim())} />
    </section>
  )
}

export function ChatScreen({
  question,
  runId,
  menuOpen,
  onMenu,
  onNew,
  onAsk,
  onToast,
}: {
  question: string
  runId: number
  menuOpen: boolean
  onMenu: () => void
  onNew: () => void
  onAsk: (q: string) => void
  onToast: (m: string) => void
}) {
  const [text, setText] = useState('')
  const { variants } = useVariants()
  const [panelOpen, setPanelOpen] = useState(false) // right pane collapsed by default
  const [wide, setWide] = useState(false)
  const [fs, setFs] = useState(false)
  const [shown, setShown] = useState(0)
  const [streamed, setStreamed] = useState(0) // sections of the live answer that have finished streaming
  const [tick, setTick] = useState(0) // nudges the follow-scroll while text streams
  const scrollRef = useRef<HTMLDivElement>(null)

  // what the thinking looks like depends on the response-time setting (and, for quick, on what was asked)
  const wantMix = AGENTS_PARAM === 'mix' || (!AGENTS_PARAM && variants.agents === 'mix')
  const nAgents = ((wantMix && variants.thinking !== 'graph') ? 5 : AGENTS_PARAM || (variants.agents === 'mix' ? 'mix' : Number(variants.agents))) as AgentCount
  const sc = useMemo(() => buildScenario(variants.speed, question, nAgents), [variants.speed, question, nAgents])
  const runKey = runId * 100 + (sc.id === 'standard' ? 0 : sc.id === 'greeting' ? 1 : 2) + { 3: 0, 5: 10, 10: 20, mix: 30 }[nAgents]
  const t = useRun(runKey, true, sc.total)
  const run = deriveRun(t, sc)

  // Detailed answers stream while the reasoning is still running: the first sections go out once the figures are being
  // validated, the rest as soon as the reasoning has finished. Short replies still appear when the run completes.
  const live = sc.id === 'standard'
  const PARTIAL = 2
  const partialAt = sc.validateStep >= 0 ? sc.t0[sc.validateStep] + sc.steps[sc.validateStep].dur * 0.45 : Infinity
  const allowed = !live ? 0 : run.done ? sc.sectionCount : run.t >= partialAt ? PARTIAL : 0
  const visible = live ? Math.min(allowed, streamed + 1) : 0
  useEffect(() => setStreamed(0), [runKey])
  const pending = live && visible > 0 && !(run.done && streamed >= sc.sectionCount)
  // scroll 1: when the agents stage starts, bring the running steps into view, once
  const agIdx = sc.steps.findIndex((x) => x.id === 'agents')
  const agentsOn = agIdx >= 0 && run.stepStatus[agIdx] === 'act'
  const agJumped = useRef(-1)
  useEffect(() => {
    if (!agentsOn || agJumped.current === runKey) return
    agJumped.current = runKey
    window.setTimeout(() => {
      const root = document.querySelector('.acol')
      const el = root?.querySelector('.gj-row.gj-w, .bs-row.bs-w, .tl-row:not(.fin):not(.pend)') ?? root?.querySelector('.tl-acts') ?? root
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 500)
  }, [agentsOn, runKey])

  // scroll 2: the moment the first part of the answer exists, take the reader to the START of it, once. After that it is up to them.
  const anchorRef = useRef<HTMLDivElement>(null)
  const jumped = useRef(-1)
  useEffect(() => {
    if (visible > 0 && jumped.current !== runKey) {
      jumped.current = runKey
      window.setTimeout(() => anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 900)
    }
  }, [visible, runKey])

  useEffect(() => {
    if (live) return
    if (!run.done) {
      setShown(0)
      return
    }
    let n = 0
    const id = setInterval(() => {
      n++
      setShown(n)
      if (n >= sc.sectionCount) clearInterval(id)
    }, sc.id === 'standard' ? 450 : 150)
    return () => clearInterval(id)
  }, [run.done, runKey, sc.sectionCount, sc.id, live])

  // reset the pane state for a fresh question
  useEffect(() => {
    setPanelOpen(false)
    setWide(false)
  }, [runKey])

  const open = () => setPanelOpen(true)
  const cls = 'chat view' + (menuOpen ? ' menu-open' : '') + (panelOpen ? ' panel-open' : '') + (wide ? ' panel-wide' : '')
  return (
    <section className={cls}>
      <TopBar onNew={onNew} />
      <div className="ctitle">
        <h2>{sc.chatTitle}</h2>
        <span className="tag"><Sparkle size={14} />Aldar X</span>
        <span className="tag"><Icon n="cal" size={14} />06-11-26 07:46:24 PM</span>
        <button className="tag dl" onClick={() => onToast('Brief exported as PDF')}><Icon n="dl" size={14} />Download</button>
      </div>
      <div className="hr" />
      <RecentsMenu open={menuOpen} onToggle={onMenu} />

      <div className="stage">
        <div className="scroll" ref={scrollRef}>
          <div className="thread">
            <div className="ubub">
              <span>{question}</span>
              <div className="thumbs">
                {[0, 1, 2].map((k) => (
                  <div className="thumb" key={k}><i className="s" /><i /><i /><i /><i /><i /><i /></div>
                ))}
              </div>
            </div>

            <div className="arow">
              <div className={'spark' + (run.done ? '' : ' busy')}><GoldSparkle size={22} /></div>
              <div className="acol">
                {variants.thinking === 'timeline' ? <TimelineCard run={run} onDetails={open} /> : variants.thinking === 'graph' ? <GraphCard run={run} onDetails={open} /> : variants.thinking === 'blocks' ? <BlocksCard run={run} onDetails={open} /> : <GlobeCard run={run} onDetails={open} />}
                <div className="ans-anchor" ref={anchorRef}>
                  {(live ? visible > 0 : run.done && shown > 0) &&
                    (sc.id === 'standard' ? (
                      <Response glass sources={sourcesFor(nAgents)} shown={live ? visible : shown} stream={live} pending={pending} onStreamed={(i) => setStreamed((n) => Math.max(n, i + 1))} onGrow={() => setTick((n) => n + 1)} onFullscreen={() => setFs(true)} onToast={onToast} onReplay={() => onAsk(question)} />
                    ) : (
                      <QuickResponse question={question} onToast={onToast} onReplay={() => onAsk(question)} />
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Composer files={3} locked value={text} onChange={setText} onSend={() => { onAsk(text.trim()); setText('') }} />
      </div>

      {variants.pane === 'trace' || variants.pane === 'ai' || variants.pane === 'bento' ? (
        <TracePanel run={run} open={panelOpen} wide={wide} onClose={() => setPanelOpen(false)} onWide={() => setWide(!wide)} ai={variants.pane === 'ai'} bento={variants.pane === 'bento'} dark={variants.glass === 'black'} />
      ) : (
        <ReasoningPanel run={run} open={panelOpen} wide={wide} onClose={() => setPanelOpen(false)} onWide={() => setWide(!wide)} />
      )}
      {fs && <FullscreenChart onClose={() => setFs(false)} />}
    </section>
  )
}
