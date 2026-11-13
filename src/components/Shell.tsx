import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { RECENTS } from '../data/scenario'
import { AldarLogo, Icon } from './Icon'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon, Mic01Icon, File01Icon, Attachment01Icon, ArrowDown01Icon, BubbleChatIcon, MoreHorizontalIcon, StarIcon, Edit01Icon, Download01Icon, Delete02Icon } from '@hugeicons/core-free-icons'

const Hi = ({ i, size = 18 }: { i: typeof PlusSignIcon; size?: number }) => <HugeiconsIcon icon={i} size={size} strokeWidth={1.7} />

export function TopBar({ onNew }: { onNew: () => void }) {
  return (
    <div className="top">
      <div className="l">
        <div className="pill-w"><Icon n="left" size={12} />My Harbour</div>
        <div className="avatar" role="img" aria-label="Profile" />
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

/** The Recent Chats panel. One element that morphs between its closed and open shapes (so it can animate); the closed
 *  shape carries a chat icon, the open one puts that same icon in front of "Recent Chats". `title` (compact layout) is the
 *  open chat's name: the closed pill shows it, and the open list highlights that chat. */
/** day/month shown on hover for each conversation in the list */
const CHAT_DATES: Record<string, string[]> = {
  Favourites: ['28/10', '02/11'],
  Today: ['13/11', '13/11', '13/11', '13/11', '13/11', '13/11'],
  'Last 7 Days': ['12/11', '11/11', '10/11', '09/11', '08/11', '07/11', '07/11'],
  Older: ['05/11', '03/11', '31/10', '29/10', '27/10', '24/10', '22/10', '20/10', '17/10', '15/10', '13/10', '10/10'],
}
const dateOf = (group: string, k: number) => {
  const key = Object.keys(CHAT_DATES).find((g) => group.startsWith(g)) ?? 'Today'
  const list = CHAT_DATES[key]
  return list[Math.min(k, list.length - 1)]
}

export function RecentsMenu({ open, onToggle, title, meta }: { open: boolean; onToggle: () => void; title?: string; meta?: ReactNode }) {
  // the chat name wraps to as many lines as it needs; measure it so the closed pill can be exactly that tall (and still animate)
  const t2 = useRef<HTMLSpanElement>(null)
  const [txH, setTxH] = useState(22)
  useLayoutEffect(() => {
    const el = t2.current
    if (!el) return
    const measure = () => setTxH(Math.max(22, Math.round(el.offsetHeight)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [title])
  // the "…" menu of a conversation: Add to Favourite, Rename, Download, Delete (Figma glass menu)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
    }
  }, [menu])
  useEffect(() => {
    if (!open) setMenu(null)
  }, [open])
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1 // the page is scaled, fixed positions are in scaled units
    setMenu({ x: r.right / z, y: (r.bottom + 6) / z })
  }
  return (
    <aside style={title ? ({ ['--tx-h' as string]: txH + 'px' } as React.CSSProperties) : undefined} className={'recents' + (open ? '' : ' collapsed') + (title ? ' withtitle' : '')} aria-label="Recent chats">
      <div className="rc-h" onClick={open ? undefined : onToggle} role={open ? undefined : 'button'} tabIndex={open ? undefined : 0} aria-label={open ? undefined : 'Expand recent chats'} onKeyDown={(e) => { if (!open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle() } }}>
        <span className="rc-ic"><Hi i={BubbleChatIcon} size={19} /></span>
        <span className="rc-tx">
          <span className="t1">Recent Chats</span>
          {title && <span className="t2" ref={t2} title={title}>{title}</span>}
        </span>
        <span className="rc-exp" aria-hidden="true"><Icon n="panel" size={16} /></span>
        <span className="btns">
          <button aria-label="Filter" tabIndex={open ? 0 : -1}><Icon n="sliders" size={18} /></button>
          <button onClick={onToggle} aria-label="Collapse recent chats" tabIndex={open ? 0 : -1}><Icon n="panel" size={18} /></button>
        </span>
      </div>
      {meta && <div className="rc-meta">{meta}</div>}
      <div className="rc-list" aria-hidden={!open}>
        {RECENTS.map(([g, base]) => {
          const items = title && g.startsWith('Today') ? [title, ...base] : base
          return (
            <div key={g}>
              <div className="rc-g"><Icon n="chev" size={12} />{g}</div>
              {items.map((i, k) => {
                const cur = !!title && i === title && k === 0 && g.startsWith('Today')
                return (
                  <div key={g + k} className={'rc-i' + (cur ? ' cur' : '')} aria-current={cur ? 'true' : undefined}>
                    {i}
                    <span className="ri-end">
                      <time>{dateOf(g, k)}</time>
                      <button className="ri-more" aria-label={'More options for ' + i} onMouseDown={(e) => e.stopPropagation()} onClick={openMenu}><Hi i={MoreHorizontalIcon} size={16} /></button>
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      {menu &&
        createPortal(
          <div className="rc-pop" role="menu" style={{ left: menu.x, top: menu.y }} onMouseDown={(e) => e.stopPropagation()}>
            <button role="menuitem" onClick={() => setMenu(null)}><Hi i={StarIcon} size={16} />Add to Favourite</button>
            <button role="menuitem" onClick={() => setMenu(null)}><Hi i={Edit01Icon} size={16} />Rename</button>
            <button role="menuitem" onClick={() => setMenu(null)}><Hi i={Download01Icon} size={16} />Download</button>
            <button role="menuitem" className="del" onClick={() => setMenu(null)}><Hi i={Delete02Icon} size={16} />Delete</button>
          </div>,
          document.body,
        )}
    </aside>
  )
}

/** small padlock used wherever the locked agent is shown */
export function LockGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.6" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /><path d="M12 14.6v2.2" /></svg>
  )
}

export function Composer({
  value,
  onChange,
  onSend,
  files,
  locked = false,
  lockMode = 'menu',
}: {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  /** number of attached files, shown in the + menu (conversation screen) */
  files?: number
  /** conversation screen: the agent was chosen on the home screen and can no longer be changed */
  locked?: boolean
  /** where the locked agent is shown: inside the + menu, as a floating chip above the box, or as a tag in the header */
  lockMode?: 'menu' | 'chip' | 'inline'
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
        {locked && lockMode === 'inline' && !!files && !menu && (
          <div className="lockchip filechip" tabIndex={0} aria-label={`${files} files attached in this conversation`}>
            <Hi i={File01Icon} size={15} />
            <b>{files} files</b>
            <small>attached in this chat</small>
          </div>
        )}
        {locked && lockMode === 'chip' && !menu && (
          <div className="lockchip" tabIndex={0} aria-label="Aldar X is locked for this conversation">
            <AldarLogo size={13} />
            <b>Aldar X</b>
            <span className="lk"><LockGlyph size={12} /></span>
            <small>locked for this chat</small>
          </div>
        )}
        {menu && (
          <div className="pm" role="menu">
            {locked && lockMode !== 'menu' ? null : locked ? (
              <div className="pm-row pm-lock" role="menuitem" aria-disabled="true" title="The agent is locked once the conversation has started"><span className="pm-i"><AldarLogo size={18} /></span><span className="pm-t">Aldar X<small>Agent is locked for this chat</small></span><span className="pm-c pm-lk"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.6" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /><path d="M12 14.6v2.2" /></svg></span></div>
            ) : (
              <button role="menuitem" onClick={() => setMenu(false)}><span className="pm-i"><AldarLogo size={18} /></span><span className="pm-t">Aldar X<small>Agent</small></span><span className="pm-c"><Hi i={ArrowDown01Icon} size={16} /></span></button>
            )}
            {!!files && <button role="menuitem" onClick={() => setMenu(false)}><span className="pm-i"><Hi i={File01Icon} /></span><span className="pm-t">Files<small>{files} attached</small></span></button>}
            <button role="menuitem" onClick={() => setMenu(false)}><span className="pm-i"><Hi i={Attachment01Icon} /></span><span className="pm-t">Attach a file</span></button>
          </div>
        )}
        <button className={'ib plus' + (menu ? ' on' : '')} data-tip={locked && lockMode === 'inline' ? 'Attach a file' : 'Add files and more'} onClick={() => setMenu(!menu)} aria-label={locked && lockMode === 'inline' ? 'Attach files' : 'Add agent, files or attachments'} aria-expanded={menu}><Hi i={locked && lockMode === 'inline' ? Attachment01Icon : PlusSignIcon} size={18} /></button>
        {locked && lockMode === 'inline' && (
          <span className="lockav" tabIndex={0} data-tip="Aldar X is locked for this chat" aria-label="Aldar X, locked for this conversation">
            <AldarLogo size={16} />
            <span className="lockov"><LockGlyph size={17} /></span>
          </span>
        )}
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
        <button className="ib" data-tip="Dictate" aria-label="Dictate"><Hi i={Mic01Icon} size={18} /></button>
        <button className={'send' + (ready ? ' ready' : '')} data-tip="Send" onClick={() => ready && onSend()} aria-label="Send"><span className="send-ic" aria-hidden="true" /></button>
      </div>
      <p className="disc">Responses are generated by AI — always validate before use.</p>
    </div>
  )
}
