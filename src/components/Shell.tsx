import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { RECENTS } from '../data/scenario'
import { Icon, Sparkle } from './Icon'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon, Mic01Icon, File01Icon, Attachment01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'

const Hi = ({ i, size = 18 }: { i: typeof PlusSignIcon; size?: number }) => <HugeiconsIcon icon={i} size={size} strokeWidth={1.7} />

export function TopBar({ onNew }: { onNew: () => void }) {
  return (
    <div className="top">
      <div className="l">
        <div className="pill-w"><Icon n="left" size={12} />My Harbour</div>
        <div className="avatar">NS</div>
      </div>
      <div className="dock">
        <button className="nc" onClick={onNew}><Icon n="plus" size={16} />New Chat</button>
        <div className="ch"><Icon n="chip" size={16} /></div>
      </div>
      <div className="r">
        <div className="round"><Icon n="search" size={16} /></div>
        <div className="round"><Icon n="gear" size={16} /></div>
      </div>
    </div>
  )
}

export function RecentsMenu({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <aside className={'recents' + (open ? '' : ' collapsed')} aria-label="Recent chats">
      <div className="rc-h">
        {open && <span className="t">Recent Chats</span>}
        <span className="btns">
          {open && <button aria-label="Filter"><Icon n="sliders" size={18} /></button>}
          <button onClick={onToggle} aria-label={open ? 'Collapse recent chats' : 'Expand recent chats'}><Icon n="panel" size={18} /></button>
        </span>
      </div>
      {open && (
        <div className="rc-list">
          {RECENTS.map(([g, items]) => (
            <div key={g}>
              <div className="rc-g"><Icon n="chev" size={12} />{g}</div>
              {items.map((i, k) => <div key={g + k} className="rc-i">{i}</div>)}
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}

export function Composer({
  value,
  onChange,
  onSend,
  files,
  locked = false,
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  /** number of attached files, shown in the + menu (conversation screen) */
  files?: number
  /** conversation screen: the agent was chosen on the home screen and can no longer be changed */
  locked?: boolean
}) {
  const ready = !!value.trim()
  const ta = useRef<HTMLTextAreaElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState(false)
  // one line by default; grows only when the text wraps
  useLayoutEffect(() => {
    if (!ta.current) return
    ta.current.style.height = 'auto'
    ta.current.style.height = Math.min(168, ta.current.scrollHeight) + 'px'
  }, [value])
  useEffect(() => {
    if (!menu) return
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', off)
    return () => document.removeEventListener('mousedown', off)
  }, [menu])

  return (
    <div className="composer">
      <div className="cbox" ref={box}>
        {menu && (
          <div className="pm" role="menu">
            {locked ? (
              <div className="pm-row pm-lock" role="menuitem" aria-disabled="true" title="The agent is locked once the conversation has started"><span className="pm-i"><Sparkle size={20} /></span><span className="pm-t">Aldar X<small>Agent · locked for this chat</small></span><span className="pm-c pm-lk"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.6" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /><path d="M12 14.6v2.2" /></svg></span></div>
            ) : (
              <button role="menuitem" onClick={() => setMenu(false)}><span className="pm-i"><Sparkle size={20} /></span><span className="pm-t">Aldar X<small>Agent</small></span><span className="pm-c"><Hi i={ArrowDown01Icon} size={16} /></span></button>
            )}
            {!!files && <button role="menuitem" onClick={() => setMenu(false)}><span className="pm-i"><Hi i={File01Icon} /></span><span className="pm-t">Files<small>{files} attached</small></span></button>}
            <button role="menuitem" onClick={() => setMenu(false)}><span className="pm-i"><Hi i={Attachment01Icon} /></span><span className="pm-t">Attach a file</span></button>
          </div>
        )}
        <button className={'ib plus' + (menu ? ' on' : '')} onClick={() => setMenu(!menu)} aria-label="Add agent, files or attachments" aria-expanded={menu}><Hi i={PlusSignIcon} size={18} /></button>
        <textarea
          ref={ta}
          rows={1}
          value={value}
          placeholder="Ask anything. The right agent will answer."
          aria-label="Ask anything"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (ready) onSend()
            }
          }}
        />
        <button className="ib" aria-label="Dictate"><Hi i={Mic01Icon} size={18} /></button>
        <button className={'send' + (ready ? ' ready' : '')} onClick={() => ready && onSend()} aria-label="Send"><img src="/send-figma.svg" width={24} height={24} alt="" /></button>
      </div>
      <p className="disc">Responses are generated by AI — always validate before use.</p>
    </div>
  )
}
