import { useEffect, useRef, useState } from 'react'
import type { Scenario } from './data/scenario'

/** Optional demo speed-up: open the app with ?speed=3 to play the simulated run 3x faster. */
export const SPEED = (() => {
  const v = Number(new URLSearchParams(window.location.search).get('speed'))
  return v > 0 && v <= 20 ? v : 1
})()

/** Optional review helper: ?freeze=8 holds the run at 8 seconds so a single moment can be inspected. */
export const FREEZE = (() => {
  const v = Number(new URLSearchParams(window.location.search).get('freeze'))
  return v > 0 ? v : 0
})()

/** Simulated agent run. Returns elapsed seconds (0..total). Restarts when `runKey` changes. */
export function useRun(runKey: number, active: boolean, total: number) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!active) return
    if (FREEZE > 0) {
      setT(Math.min(FREEZE, total))
      return
    }
    setT(0)
    let raf = 0
    let last = performance.now()
    let acc = 0
    let cur = 0
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000) * SPEED
      last = now
      cur = Math.min(total, cur + dt)
      acc += dt
      if (acc > 0.05 || cur >= total) {
        acc = 0
        setT(cur)
      }
      if (cur < total) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [runKey, active, total])
  return t
}

export type RunState = {
  sc: Scenario
  t: number
  done: boolean
  pct: number
  idx: number
  stepStatus: ('pend' | 'act' | 'done')[]
  agentProgress: number[]
  finishedAgents: number
  sources: number
  checks: number
  event: string
  stepsDone: number
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function deriveRun(t: number, sc: Scenario): RunState {
  const done = t >= sc.total
  let idx = 0
  while (idx < sc.steps.length - 1 && t >= sc.t0[idx + 1]) idx++
  const stepStatus = sc.steps.map((s, i) => (done || t >= sc.t0[i] + s.dur ? 'done' : t >= sc.t0[i] ? 'act' : 'pend')) as RunState['stepStatus']

  const agentProgress = sc.agents.map((a) => clamp01((t - sc.gs) / a.dur))
  let sources = 0
  let finishedAgents = 0
  sc.agents.forEach((a, k) => {
    if (agentProgress[k] >= 1) {
      sources += a.src.length
      finishedAgents++
    }
  })
  // scenarios without agents: their single source counts once the "find" step has finished
  if (!sc.agents.length && sc.sources > 0 && sc.steps[1] && (done || t >= sc.t0[1] + sc.steps[1].dur)) sources = sc.sources

  let checks = 0
  const vs = sc.validateStep
  if (vs >= 0) {
    const p = clamp01((t - sc.t0[vs]) / sc.steps[vs].dur)
    checks = done || t >= (sc.t0[vs + 1] ?? sc.total) ? sc.checks.length : Math.min(sc.checks.length, Math.floor(p * 5.5))
  }

  let event = sc.events[0].txt
  sc.events.forEach((e) => {
    if (t >= e.t) event = e.txt
  })

  return {
    sc,
    t,
    done,
    pct: Math.round((Math.min(t, sc.total) / sc.total) * 100),
    idx,
    stepStatus,
    agentProgress,
    finishedAgents,
    sources,
    checks,
    event: done ? 'Answer ready' : event,
    stepsDone: stepStatus.filter((s) => s === 'done').length,
  }
}

export const fmt = (t: number) => t.toFixed(1) + ' s'

export function useToast() {
  const [msg, setMsg] = useState('')
  const [on, setOn] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const show = (m: string) => {
    setMsg(m)
    setOn(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOn(false), 2000)
  }
  return { msg, on, show }
}
