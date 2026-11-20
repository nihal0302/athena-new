import type { Agent } from './agents'

/** Words that say nothing about the task. */
const STOP = new Set(
  ('i me my we our you your the a an to of for and or with on in at about can could would should please need needs want wants help helps find get give show tell how do does is are be some any that this it from into like also just ' +
    'many much have has had what when where who which there their them then than will am was were been being it its if so not no yes up out all more most very really work working new one two').split(' '),
)

/** A few everyday ways of saying the same thing, so "payslip" still finds the salary agent. */
const SAME: Record<string, string[]> = {
  payslip: ['salary', 'letter'],
  holiday: ['leave', 'vacation'],
  vacation: ['leave', 'holiday'],
  leave: ['holiday', 'vacation'],
  hire: ['recruit', 'interview', 'candidate'],
  hiring: ['recruit', 'interview', 'candidate'],
  joiner: ['onboard', 'induction'],
  contract: ['legal', 'agreement', 'clause'],
  invoice: ['payment'],
  price: ['pricing'],
  customer: ['client'],
  laptop: ['it'],
}

/** one stem for "contract", "contracts" and "contracting", and for "plan" and "planning" */
const stem = (w: string) => {
  let s = w
  if (s.length > 4) s = s.replace(/(ing|ed|es|s)$/, '')
  if (s.length > 5) s = s.replace(/er$/, '')
  return s.replace(/([^aeiou])\1$/, '$1')
}

const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

const words = (s: string) => tokens(s).filter((w) => !STOP.has(w)).map(stem)

export type FindResult = {
  agent: Agent
  score: number
  /** which of the things the person asked for this agent can do */
  covers: string[]
  /** the words that matched (kept for callers that want to show them) */
  because: string[]
}

export type Found = {
  asks: string[]
  results: FindResult[]
  /** asks that none of the suggested agents covers */
  uncovered: string[]
  /** true when nothing matched, so the two agents shown are simply the most useful starting points */
  fallback: boolean
}

/** Splits "reset my laptop and book leave" into the separate things being asked. */
const splitAsks = (text: string) =>
  text
    .split(/\band\b|,|;|&|\+|\balso\b/i)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0)

type Doc = { name: Set<string>; tasks: Set<string>; rest: Set<string>; seq: string }

const docOf = (a: Agent): Doc => ({
  name: new Set(tokens(a.name).map(stem)),
  tasks: new Set(tokens(a.tasks).map(stem)),
  rest: new Set(tokens(a.desc + ' ' + a.dept).map(stem)),
  seq: ' ' + tokens(a.name + ' ' + a.tasks + ' ' + a.desc).map(stem).join(' ') + ' ',
})

/** how strongly an agent matches one (stemmed) word: name 3, task words 2, description 1 */
const hit = (d: Doc, w: string) => (d.name.has(w) ? 3 : 0) + (d.tasks.has(w) ? 2 : 0) + (d.rest.has(w) ? 1 : 0)

/**
 * Matches what someone wants to do against every agent. Words that few agents use count for more ("maintenance" says more than
 * "request"), two words next to each other that also sit together in an agent count extra ("payment plan"), and an agent has
 * to cover most of the words it can make sense of, so one stray word ("meeting" in "book a meeting room") is not enough.
 */
export function findAgents(text: string, agents: Agent[]): Found {
  const asks = splitAsks(text)
  const parts = asks.length ? asks : [text.trim()]
  const docs = agents.map(docOf)
  const N = agents.length

  const altsOf = (w: string) => [w, ...(SAME[w] ?? []).map(stem)]
  // how many agents know each word, and so how much it is worth
  const df = new Map<string, number>()
  for (const p of parts) {
    for (const w of words(p)) {
      if (df.has(w)) continue
      df.set(w, docs.filter((d) => altsOf(w).some((x) => hit(d, x) > 0)).length)
    }
  }
  const weight = (w: string) => 1 + Math.log(N / Math.max(1, df.get(w) ?? 1))
  // words nobody knows ("remote", "room") count a little against every agent, so one stray known word is not enough
  const allWords = parts.flatMap(words)
  const nKnown = allWords.filter((w) => (df.get(w) ?? 0) > 0).length
  const nUnknown = allWords.length - nKnown
  const need = (nKnown + 0.75 * nUnknown) * 0.5

  const raw = agents.map((a, i) => {
    const d = docs[i]
    let score = 0
    let matched = 0
    const covers: string[] = []
    const because = new Set<string>()
    for (const p of parts) {
      const ws = words(p)
      let hitInPart = false
      ws.forEach((w, k) => {
        if ((df.get(w) ?? 0) === 0) return // nobody knows this word: it says nothing about which agent fits
        const alts = altsOf(w)
        const s = Math.max(...alts.map((x, j) => hit(d, x) * (j === 0 ? 1 : 0.7)))
        if (s > 0) {
          matched += 1
          score += s * weight(w)
          because.add(w)
          hitInPart = true
        }
        const next = ws[k + 1]
        if (next && d.seq.includes(' ' + w + ' ' + next + ' ')) score += 3 // the two words appear together
      })
      if (hitInPart) covers.push(p)
    }
    return { agent: a, score, covers, because: [...because], matched }
  })

  const results: FindResult[] = nKnown === 0
    ? []
    : raw
        .filter((r) => r.score > 0 && r.matched >= need)
        .sort((x, y) => y.covers.length - x.covers.length || y.score - x.score)
        .filter((r, _i, all) => r.score >= all[0].score * 0.4)
        .slice(0, 3)
        .map(({ agent, score, covers, because }) => ({ agent, score, covers, because }))
  const covered = new Set(results.flatMap((r) => r.covers))
  const strict = results.length
  const out = results.slice(0, 2)
  // this is a static design: there are always two agents to look at. A second (or first) suggestion is filled in from the agents
  // that sit nearest the best match: its own department, the shared agents everyone can use, and ones the person can open.
  const usage = (a: Agent) => parseFloat((a.usage ?? '0').replace(/[^0-9.]/g, '')) * (/k /.test(a.usage ?? '') ? 1000 : 1)
  const anchor = out[0]?.agent
  const pool = agents.filter((a) => !out.some((r) => r.agent.id === a.id))
  const lean = (a: Agent) =>
    (anchor && a.dept === anchor.dept ? 3 : 0) + (a.dept === 'Enterprise-wide' ? 2 : 0) + (a.state === 'available' ? 2 : a.state === 'soon' ? -1 : 0) + Math.min(1, usage(a) / 2000)
  pool.sort((x, y) => lean(y) - lean(x))
  while (out.length < 2 && pool.length) out.push({ agent: pool.shift()!, score: 0, covers: [], because: [] })
  return { asks: parts, results: out, uncovered: parts.filter((p) => !covered.has(p)), fallback: strict === 0 }
}

/** "I need help with my payslips" -> "your payslips". Turns the request into something that reads back naturally. */
const LEAD = /^(hi|hello|hey)[,!. ]*|^(i|we)\s+(really\s+)?(need|want|would like|am looking|'m looking)( to)?( some)?\s*(help|assistance|support)?\s*(with|on|for|in)?\s*|^(can|could|would) you( please)?( help( me)?)?( with| to)?\s*|^please\s+|^help me( with| to)?\s*/i

export function topicOf(text: string): { phrase: string; withHelp: boolean } {
  let s = text.trim().replace(/[?.!]+$/, '')
  const hadWith = /\b(help|assist\w*|support)\b.*\b(with|on|for)\b/i.test(s) || /^(i|we)\s+(need|want)\s+(a|an|the|my|our|some)\b/i.test(s)
  s = s.replace(LEAD, '')
  s = s.replace(/\bmy\b/gi, 'your').replace(/\bour\b/gi, 'your').replace(/\bmyself\b/gi, 'yourself').replace(/\bme\b/gi, 'you').replace(/\bI\b/g, 'you')
  s = s.charAt(0).toLowerCase() + s.slice(1)
  return { phrase: s, withHelp: hadWith || !/^(review|check|find|book|reset|draft|write|create|summari[sz]e|compare|match|schedule|raise|submit|request|update|track|plan|prepare|answer|send|get|show|build|run|apply|approve|log)\b/i.test(s) }
}
