import { useEffect, useRef } from 'react'
import { fmt, type RunState } from '../hooks'
import { Icon } from './Icon'

/* ------------------------------------------------------------------ */
/*  Dotted globe.                                                      */
/*  Repeating cycle: rotate -> stop -> a few dots light up -> dotted   */
/*  lines connect them -> hold -> reset -> rotate again.               */
/* ------------------------------------------------------------------ */
const N = 46 // sparse, like the reference
const PTS = Array.from({ length: N }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / N
  const r = Math.sqrt(1 - y * y)
  const phi = i * Math.PI * (3 - Math.sqrt(5))
  return { x: Math.cos(phi) * r, y, z: Math.sin(phi) * r }
})
const TILT = 0.38

// phase lengths (ms)
const T_ROTATE = 1000
const T_LIGHT = 700
const T_CONNECT = 900
const T_HOLD = 800
const T_FADE = 350
const CYCLE = T_ROTATE + T_LIGHT + T_CONNECT + T_HOLD + T_FADE
const SPIN = 0.95 // radians turned each cycle

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = (v: number) => Math.max(0, Math.min(1, v))

function project(i: number, rot: number, size: number) {
  const q = PTS[i]
  const R = size * 0.4
  const x1 = q.x * Math.cos(rot) + q.z * Math.sin(rot)
  const z1 = -q.x * Math.sin(rot) + q.z * Math.cos(rot)
  const y1 = q.y * Math.cos(TILT) - z1 * Math.sin(TILT)
  const z2 = q.y * Math.sin(TILT) + z1 * Math.cos(TILT)
  return { sx: size / 2 + x1 * R, sy: size / 2 + y1 * R, d: (z2 + 1) / 2 }
}

/** pick `count` front-facing dots (as seen at rotation `rot`), spread out, and order them into a chain */
function pickCluster(rot: number, count: number, seed: number, size: number) {
  let s = seed * 9301 + 49297
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const cand = PTS.map((_, i) => i).filter((i) => project(i, rot, size).d > 0.55)
  const chosen: number[] = []
  let guard = 0
  while (chosen.length < count && cand.length && guard++ < 200) {
    const i = cand[Math.floor(rnd() * cand.length)]
    const p = project(i, rot, size)
    const farEnough = chosen.every((j) => {
      const q = project(j, rot, size)
      return Math.hypot(p.sx - q.sx, p.sy - q.sy) > size * 0.17
    })
    if (farEnough && !chosen.includes(i)) chosen.push(i)
  }
  // chain: nearest-neighbour order starting from the left-most dot
  const left = [...chosen].sort((a, b) => project(a, rot, size).sx - project(b, rot, size).sx)
  const chain: number[] = left.length ? [left.shift() as number] : []
  while (left.length) {
    const last = project(chain[chain.length - 1], rot, size)
    left.sort((a, b) => {
      const pa = project(a, rot, size)
      const pb = project(b, rot, size)
      return Math.hypot(pa.sx - last.sx, pa.sy - last.sy) - Math.hypot(pb.sx - last.sx, pb.sy - last.sy)
    })
    chain.push(left.shift() as number)
  }
  return chain
}

/** One canvas for the whole life of the card. While running it plays the rotate/light/connect cycle;
 *  when `complete` flips it fades the highlights out and carries on as a slowly rotating grey globe.
 *  The canvas is rendered at `size` and shown at `display` px (CSS-transitioned), so shrinking is smooth. */
export function Globe({ run, size, display, complete, labels }: { run: RunState; size: number; display: number; complete: boolean; labels: string[][] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const labelsRef = useRef(labels)
  labelsRef.current = labels
  const idx = useRef(run.idx)
  idx.current = run.idx
  const completeRef = useRef(complete)
  completeRef.current = complete

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = size * dpr
    cv.height = size * dpr
    ctx.scale(dpr, dpr)

    let raf = 0
    let start = performance.now()
    let cycleNo = -1
    let baseRot = 0.4
    let cluster: number[] = []
    let labelAt: number[] = []
    let words: string[] = []
    let curRot = baseRot
    let lastLit = 0
    let lastLink = 0
    let lastFade = 1
    let doneAt = -1
    let rotAtDone = 0
    const SLOW = 0.000465 // radians per ms once finished: one full turn in ~13.5 s
    // dots in the finished globe are shown at 55% of their running size; the canvas is displayed at half size
    // too, so they are drawn at 1.1x here (1.1 * 0.5 = 0.55)
    const DONE_DOT = 1.1

    const drawFrame = (rot: number, lit: number, link: number, fade: number, dotScale: number) => {
      ctx.clearRect(0, 0, size, size)
      const proj = PTS.map((_, i) => project(i, rot, size))

      // dotted connections
      ctx.save()
      ctx.setLineDash([2.5, 3.5])
      ctx.lineWidth = 1
      for (let k = 1; k < cluster.length; k++) {
        const g = clamp(link - (k - 1))
        if (g <= 0) continue
        const a = proj[cluster[k - 1]]
        const b = proj[cluster[k]]
        ctx.strokeStyle = `rgba(214,138,16,${0.75 * fade})`
        ctx.beginPath()
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(a.sx + (b.sx - a.sx) * g, a.sy + (b.sy - a.sy) * g)
        ctx.stroke()
      }
      ctx.restore()

      // dots (back to front); grey unless part of the lit cluster
      const order = proj.map((_, i) => i).sort((i, j) => proj[i].d - proj[j].d)
      for (const i of order) {
        const q = proj[i]
        const k = cluster.indexOf(i)
        const amt = k >= 0 ? clamp(lit - k) * fade : 0
        const rad = (1.0 + q.d * 1.1 + amt * 1.5) * dotScale
        if (amt > 0) {
          ctx.fillStyle = `rgba(245,158,11,${0.35 + 0.65 * amt})`
          ctx.shadowColor = `rgba(245,158,11,${0.6 * amt})`
          ctx.shadowBlur = 7 * amt
        } else {
          ctx.fillStyle = `rgba(70,86,110,${0.18 + q.d * 0.34})`
        }
        ctx.beginPath()
        ctx.arc(q.sx, q.sy, rad, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // two small pills on lit dots
      ctx.font = '500 7.5px Poppins, system-ui, sans-serif'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
      labelAt.forEach((ci, n) => {
        const k = cluster.indexOf(ci)
        const amt = k >= 0 ? clamp(lit - k) * fade : 0
        if (amt <= 0.2) return
        const q = proj[ci]
        const label = words[n]
        const w = ctx.measureText(label).width + 10
        const x = Math.max(w / 2 + 1, Math.min(size - w / 2 - 1, q.sx))
        let y = n === 0 ? q.sy - 12 : q.sy + 12
        y = Math.max(8, Math.min(size - 8, y))
        const hit = () => placed.some((r) => x - w / 2 < r.x1 && x + w / 2 > r.x0 && y - 7 < r.y1 + 2 && y + 7 > r.y0 - 2)
        if (hit()) y = Math.max(8, Math.min(size - 8, y + (n === 0 ? 16 : -16)))
        placed.push({ x0: x - w / 2, x1: x + w / 2, y0: y - 6.5, y1: y + 6.5 })
        ctx.globalAlpha = clamp((amt - 0.2) / 0.8)
        ctx.fillStyle = 'rgba(255,255,255,.9)'
        ctx.strokeStyle = 'rgba(245,158,11,.6)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(x - w / 2, y - 6.5, w, 13, 6.5)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#46566e'
        ctx.fillText(label, x, y + 0.5)
        ctx.globalAlpha = 1
      })
    }

    const setup = (n: number, rotAfterSpin: number, count: number, stepIdx: number) => {
      cluster = pickCluster(rotAfterSpin, count, n + 3, size)
      labelAt = cluster.length > 1 ? [cluster[0], cluster[cluster.length - 1]] : cluster.slice(0, 1)
      const all = labelsRef.current
      const list = all[Math.min(stepIdx, all.length - 1)]?.length ? all[Math.min(stepIdx, all.length - 1)] : ['Working']
      words = [list[n % list.length], list[(n + 1) % list.length]]
      if (list.length < 2) labelAt = labelAt.slice(0, 1) // a single sub-step gets a single chip
    }

    const loop = (now: number) => {
      if (completeRef.current) {
        // finished: highlights fade out, rotation continues from where it was, but very slowly
        if (doneAt < 0) {
          doneAt = now
          rotAtDone = curRot
        }
        const dt = now - doneAt
        const fadeOut = clamp(1 - dt / 600) * lastFade
        if (fadeOut <= 0) {
          cluster = []
          labelAt = []
        }
        curRot = rotAtDone + dt * SLOW
        drawFrame(curRot, lastLit, lastLink, fadeOut, 1 + (DONE_DOT - 1) * ease(clamp(dt / 700)))
        raf = requestAnimationFrame(loop)
        return
      }
      if (doneAt >= 0) {
        // a new run started: go back to the cycle
        doneAt = -1
        start = now
        cycleNo = -1
      }
      const t = now - start
      const n = Math.floor(t / CYCLE)
      const c = t - n * CYCLE
      if (n !== cycleNo) {
        // previous cycle's lit dots and links are discarded here
        if (cycleNo >= 0) baseRot += SPIN
        cycleNo = n
        setup(n, baseRot + SPIN, 3 + Math.min(3, idx.current), idx.current)
      }
      let rot = baseRot
      let lit = 0
      let link = 0
      let fade = 1
      if (c < T_ROTATE) {
        rot = baseRot + SPIN * ease(c / T_ROTATE)
      } else {
        rot = baseRot + SPIN
        const c2 = c - T_ROTATE
        if (c2 < T_LIGHT) {
          lit = (c2 / T_LIGHT) * cluster.length
        } else {
          lit = cluster.length
          const c3 = c2 - T_LIGHT
          if (c3 < T_CONNECT) link = (c3 / T_CONNECT) * (cluster.length - 1)
          else {
            link = cluster.length - 1
            const c4 = c3 - T_CONNECT
            if (c4 > T_HOLD) fade = 1 - (c4 - T_HOLD) / T_FADE
          }
        }
      }
      curRot = rot
      lastLit = lit
      lastLink = link
      lastFade = clamp(fade)
      drawFrame(rot, lit, link, lastFade, 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return <canvas ref={ref} className="gb-canvas" style={{ width: display, height: display }} aria-hidden="true" />
}

/* ------------------------------------------------------------------ */
/*  Variation 3 card                                                   */
/*  One card for the whole run: when thinking finishes the text        */
/*  cross-fades, the card eases down in height and the globe shrinks.  */
/* ------------------------------------------------------------------ */
export function GlobeCard({ run, onDetails }: { run: RunState; onDetails: () => void }) {
  const done = run.done
  return (
    <div className={'gb' + (done ? ' done' : '')}>
      <div className="gb-left">
        <div className="gb-pane run" aria-hidden={done}>
          <button className="gb-click gb-step" key={run.idx} onClick={onDetails} aria-label="Open detailed view" tabIndex={done ? -1 : 0}>
            <span className="gb-stepname">{run.sc.steps[run.idx].live}</span>
            <span className="gb-dots"><i /><i /><i /></span>
            <Icon n="right" size={16} className="gb-chev" />
          </button>
          <div className="gb-event" key={run.event}>{run.event}</div>
          <div className="gb-meta"><span>{fmt(run.t)}</span><i /><span>{run.pct}% complete</span></div>
        </div>
        <div className="gb-pane fin" aria-hidden={!done}>
          <button className="gb-click" onClick={onDetails} aria-label="Open detailed view" tabIndex={done ? 0 : -1}>
            <span className="gb-done-title">Thinking completed</span>
            <Icon n="right" size={16} className="gb-chev" />
          </button>
          <div className="gb-facts">{run.sc.chips.map((c) => <span key={c}>{c}</span>)}</div>
        </div>
      </div>
      <div className="gb-globe">
        <Globe run={run} size={112} display={done ? 56 : 112} complete={done} labels={run.sc.steps.map((s) => s.sub)} />
      </div>
    </div>
  )
}
