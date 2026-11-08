import { useMemo, useState } from 'react'
import { BUYERS } from '../data/scenario'
import { Icon } from './Icon'

type Row = [string, number]

export function BarChart({
  rows,
  orient = 'h',
  labels = true,
  colors = ['#2f245c'],
  w = 560,
  rh = 30,
  h = 360,
}: {
  rows: Row[]
  orient?: 'h' | 'v'
  labels?: boolean
  colors?: string[]
  w?: number
  rh?: number
  h?: number
}) {
  const max = Math.max(...rows.map((r) => r[1]))
  const n = rows.length
  if (orient === 'h') {
    const L = 118
    const H = n * rh + 8
    return (
      <svg className="chart-svg" viewBox={`0 0 ${w} ${H}`}>
        {rows.map((r, i) => {
          const y = i * rh + 4
          const bw = ((w - L - 60) * r[1]) / max
          return (
            <g key={r[0]}>
              <text x={L - 10} y={y + rh / 2 + 4} textAnchor="end">{r[0]}</text>
              <rect x={L} y={y + 4} width={bw} height={rh - 10} rx={6} fill={colors[i % colors.length]} className="bar" style={{ animationDelay: i * 0.05 + 's' }} />
              {labels && <text x={L + bw + 8} y={y + rh / 2 + 4} className="vl">{r[1]}%</text>}
            </g>
          )
        })}
      </svg>
    )
  }
  const B = 70
  const top = 26
  const bw = (w - 40) / n
  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`}>
      {rows.map((r, i) => {
        const bh = ((h - B - top) * r[1]) / max
        const x = 30 + i * bw + bw * 0.18
        const wd = bw * 0.64
        const y = h - B - bh
        return (
          <g key={r[0]}>
            <rect x={x} y={y} width={wd} height={bh} rx={6} fill={colors[i % colors.length]} className="barv" style={{ animationDelay: i * 0.05 + 's' }} />
            <text x={x + wd / 2} y={h - B + 16} textAnchor="start" transform={`rotate(28 ${x + wd / 2} ${h - B + 16})`}>{r[0]}</text>
            {labels && <text x={x + wd / 2} y={y - 6} textAnchor="middle" className="vl">{r[1]}%</text>}
          </g>
        )
      })}
    </svg>
  )
}

function DataTable({ rows }: { rows: Row[] }) {
  return (
    <table>
      <thead><tr><th>Nationality</th><th className="num">Share of reservations</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="num">{r[1]}%</td></tr>)}</tbody>
    </table>
  )
}

const INLINE_COLORS = ['#2f245c', '#2f245c', '#2f245c', '#49658b', '#49658b', '#49658b']

export function ChartCard({ onFullscreen }: { onFullscreen: () => void }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const rows = BUYERS.slice(0, 6) as Row[]
  return (
    <figure className="fgr">
      <div className="cap">
        <div>
          <div className="ct">Share of reservations by buyer nationality</div>
          <div className="cs">% of reservations, last three launch cycles</div>
        </div>
        <div className="tools">
          <div className="seg">
            <button aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Chart</button>
            <button aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
          </div>
          <button className="fsb" onClick={onFullscreen} aria-label="Open full screen" title="Full screen"><Icon n="expand" size={14} /></button>
        </div>
      </div>
      {view === 'chart' ? <div className="plot"><BarChart rows={rows} colors={INLINE_COLORS} /></div> : <DataTable rows={rows} />}
      <div className="src">Source: Buyer Profile Database; Transaction Ledger 2023–26</div>
    </figure>
  )
}

export function FullscreenChart({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [orient, setOrient] = useState<'h' | 'v'>('h')
  const [asc, setAsc] = useState(false)
  const [labels, setLabels] = useState(true)
  const [n, setN] = useState(12)
  const rows = useMemo(() => (BUYERS.slice() as Row[]).sort((a, b) => (asc ? a[1] - b[1] : b[1] - a[1])).slice(0, n), [asc, n])
  const top = useMemo(() => (BUYERS.slice() as Row[]).sort((a, b) => b[1] - a[1]).slice(0, 5), [])
  return (
    <div className="fs on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fsbox" role="dialog" aria-modal="true" aria-label="Chart, full screen">
        <div className="fsh">
          <h5>Share of reservations by buyer nationality<small>% of reservations, last three launch cycles</small></h5>
          <div className="seg">
            <button aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Chart</button>
            <button aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
          </div>
          <button className="fsb" onClick={onClose} aria-label="Close"><Icon n="x" size={14} /></button>
        </div>
        <div className="fsc">
          <label>Orientation <select value={orient} onChange={(e) => setOrient(e.target.value as 'h' | 'v')}><option value="h">Horizontal</option><option value="v">Vertical</option></select></label>
          <label>Sort <select value={asc ? 'a' : 'd'} onChange={(e) => setAsc(e.target.value === 'a')}><option value="d">Highest first</option><option value="a">Lowest first</option></select></label>
          <label><input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Show labels</label>
          <label>Bars shown <input type="range" min={3} max={12} value={n} onChange={(e) => setN(+e.target.value)} /> <b>{n}</b></label>
        </div>
        <div className="fsm">
          <div className="plot">
            {view === 'table' ? <DataTable rows={rows} /> : <BarChart rows={rows} orient={orient} labels={labels} w={640} h={380} rh={orient === 'h' ? Math.max(24, Math.min(34, 380 / n)) : 30} />}
          </div>
          <div className="side">
            <h6>Top contributors</h6>
            <p>Share of buyers, %</p>
            <table><tbody>{top.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="num"><b>{r[1]}%</b></td></tr>)}</tbody></table>
          </div>
        </div>
      </div>
    </div>
  )
}
