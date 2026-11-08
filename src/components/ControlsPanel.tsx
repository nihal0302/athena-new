import { useState } from 'react'
import { CONTROLS, useVariants } from '../variants'
import { Icon } from './Icon'

const SEEN_KEY = 'athena-v2-controls-seen'

/** Floating prototype controls: a prominent pill that opens a compact toggle for each setting. */
export function ControlsPanel({ onReplay }: { onReplay?: () => void }) {
  const [open, setOpen] = useState(false)
  // the pill gently pulses until someone has opened it once in this browser session
  const [seen, setSeen] = useState(() => {
    try {
      return sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      return false
    }
  })
  const { variants, set, reset } = useVariants()
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

  return (
    <div className="pc">
      {open && (
        <div className="pc-panel" role="dialog" aria-label="Prototype controls">
          <div className="pc-h">
            <b>Prototype controls</b>
            <button onClick={() => setOpen(false)} aria-label="Close"><Icon n="x" size={14} /></button>
          </div>
          {CONTROLS.map((c) => (
            <div key={c.key} className="pc-g">
              <div className="pc-l">{c.label}</div>
              <div className="pc-seg" role="radiogroup" aria-label={c.label}>
                {c.options.map((o) => (
                  <button
                    key={o.id}
                    role="radio"
                    aria-checked={variants[c.key] === o.id}
                    className={variants[c.key] === o.id ? 'on' : ''}
                    onClick={() => set(c.key, o.id as never)}
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
      <button className={'pc-pill' + (!seen && !open ? ' attn' : '')} onClick={toggle} aria-expanded={open}>
        <Icon n="sliders" size={16} />
        <span>Prototype controls</span>
        <span className="pc-badge">{current}</span>
      </button>
    </div>
  )
}
