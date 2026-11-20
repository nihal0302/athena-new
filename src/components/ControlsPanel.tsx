import { useEffect, useRef, useState } from 'react'
import { CONTROLS, useVariants } from '../variants'
import { Icon } from './Icon'
import { PROTO_TOGGLE } from './Shell'

const SEEN_KEY = 'athena-v2-controls-seen'

/** Which part of the screen each setting changes. After a change, that part is outlined for three seconds so it is clear what moved. */
const TARGETS: Record<string, string> = {
  layout: '.chat .ctitle, .chat .recents, .chat .rrail',
  theme: '.chat',
  agentLock: '.chat .composer',
  spacing: '.chat .ans-anchor',
  answer: '.chat .ans-anchor',
  glass: '.rz-bento',
  pane: '.rz',
  thinking: '.chat .acol > :first-child',
  speed: '.chat .acol',
  agents: '.chat .acol > :first-child, .rz',
}
const HL_MS = 3000

/** Floating prototype controls: a prominent pill that opens a compact toggle for each setting. */
export function ControlsPanel({ onReplay }: { onReplay?: () => void }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(true) // visible by default; the profile picture in the top nav shows and hides it
  useEffect(() => {
    const flip = () => setShown((s) => { if (s) setOpen(false); return !s })
    window.addEventListener(PROTO_TOGGLE, flip)
    return () => window.removeEventListener(PROTO_TOGGLE, flip)
  }, [])
  // the pill gently pulses until someone has opened it once in this browser session
  const [seen, setSeen] = useState(() => {
    try {
      return sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      return false
    }
  })
  const { variants, set, reset } = useVariants()
  const timer = useRef<number>(0)
  /** outline whatever the change touched (and the chosen button) for three seconds */
  const flash = (key: string, button: HTMLElement) => {
    window.clearTimeout(timer.current)
    document.querySelectorAll('.hl-flash').forEach((e) => e.classList.remove('hl-flash'))
    button.classList.add('hl-flash')
    // give the screen a moment to re-render with the new setting before looking for what changed
    window.setTimeout(() => {
      document.querySelectorAll(TARGETS[key] ?? '').forEach((e) => {
        e.classList.remove('hl-flash')
        void (e as HTMLElement).offsetWidth
        e.classList.add('hl-flash')
      })
    }, 140)
    timer.current = window.setTimeout(() => document.querySelectorAll('.hl-flash').forEach((e) => e.classList.remove('hl-flash')), HL_MS + 140)
  }
  const current = CONTROLS[0].options.find((o) => o.id === variants[CONTROLS[0].key])?.label

  const toggle = () => {
    setOpen(!open)
    if (!seen) {
      setSeen(true)
      try {
        sessionStorage.setItem(SEEN_KEY, '1')
      } catch {
        /* ignore */
      }
    }
  }

  if (!shown) return null
  return (
    <div className="pc">
      {open && (
        <div className="pc-panel" role="dialog" aria-label="Prototype controls">
          <div className="pc-h">
            <b>Prototype controls</b>
            <button onClick={() => setOpen(false)} aria-label="Close"><Icon n="x" size={14} /></button>
          </div>
          <p className="pc-note">Switch any setting and the part of the screen it changes is highlighted for a few seconds, so you can see what moved.</p>
          {CONTROLS.filter((c) => !(c.key === 'glass' && variants.pane !== 'bento')).map((c) => (
            <div key={c.key} className="pc-g">
              <div className="pc-l">{c.label}</div>
              <div className="pc-seg" role="radiogroup" aria-label={c.label}>
                {c.options.filter((o) => !(c.key === 'agents' && o.id === 'mix' && variants.thinking !== 'graph')).map((o) => (
                  <button
                    key={o.id}
                    role="radio"
                    aria-checked={variants[c.key] === o.id}
                    className={variants[c.key] === o.id ? 'on' : ''}
                    onClick={(e) => {
                      if (variants[c.key] === o.id) return
                      set(c.key, o.id as never)
                      flash(c.key, e.currentTarget)
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="pc-f">
            <button className="pc-b" onClick={onReplay} disabled={!onReplay}><Icon n="redo" size={14} />Replay</button>
            <button className="pc-b ghost" onClick={reset}>Reset</button>
          </div>
        </div>
      )}
      <button className={'pc-pill' + (!seen && !open ? ' attn' : '')} onClick={toggle} aria-expanded={open} aria-label="Prototype controls" title="Prototype controls">
        <Icon n="sliders" size={16} />
        <span>Prototype controls</span>
        <span className="pc-badge">{current}</span>
      </button>
    </div>
  )
}
