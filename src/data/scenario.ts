// Illustrative scenario data for the Athena v2 prototype.
// None of these figures are real Aldar data.

export const QUESTION =
  'Which buyer nationalities should we prioritise for the Q1 launches, and which market drivers support it?'

export const CHAT_TITLE = 'Buyer targeting brief for Q1 launches'

export type StepDef = {
  id: string
  title: string // detailed title (right pane)
  short: string // business-view label
  live: string
  dur: number
  icon: string
}

export const STEPS: StepDef[] = [
  { id: 'intent', title: 'Understood the intent', short: 'Understand', live: 'Understanding your intent', dur: 2.6, icon: 'eye' },
  { id: 'route', title: 'Planned and routed the work', short: 'Plan', live: 'Planning and routing', dur: 3, icon: 'route' },
  { id: 'agents', title: 'Agents gathered evidence', short: 'Agents', live: 'Agents gathering evidence', dur: 9, icon: 'users' },
  { id: 'val', title: 'Validated the figures', short: 'Validate', live: 'Validating the figures', dur: 4, icon: 'shield' },
  { id: 'comp', title: 'Composed the summary', short: 'Summary', live: 'Composing the summary', dur: 4.4, icon: 'pen' },
]

export const T0: number[] = []
export let TOTAL = 0
STEPS.forEach((s) => {
  T0.push(TOTAL)
  TOTAL += s.dur
})
export const GS = T0[2] // agents start

export type AgentDef = {
  name: string
  short: string // compact label for the thinking visuals
  subs: string[] // what it is doing, one phrase after another
  start: number // seconds after the agents step begins
  after?: number // index of an agent that must finish first (shown in series)
  finding?: string // what it brought back (its interpretation)

  icon: string
  color: string
  dur: number
  src: string[]
  pass: number
  task: string
  sql?: boolean
}

export const AGENTS: AgentDef[] = [
  { name: 'Buyer Profile Analysis Agent', short: 'Buyer profiles', finding: 'UAE nationals, Indian and UK buyers account for 56% of reservations across the last three launch cycles.', subs: ['Segmenting buyers', 'Reading profiles', 'Scoring segments'], start: 0, icon: 'users', color: '#2f245c', dur: 6.5, src: ['Buyer Profile Database'], pass: 3, task: 'Segmenting buyers by nationality, ticket size and channel' },
  { name: 'Market Transaction Data Agent', short: 'Transactions', finding: 'Average ticket is AED 2.9m, up 6% year on year, and inquiry-to-reservation conversion is strongest for the Q1 launches.', subs: ['Querying ledger', 'Joining funnel report', 'Aggregating by nationality'], start: 0, icon: 'db', color: '#49658b', dur: 9, src: ['Transaction Ledger 2023–26', 'Inquiry Funnel Report'], pass: 4, task: 'Querying transactions and inquiry-to-reservation conversion', sql: true },
  { name: 'Policy & Macro Signals Agent', short: 'Policy signals', finding: 'Visa reforms and easier GCC travel support UAE, Indian and UK demand; Russia & CIS depends on a policy factor still moving.', subs: ['Reading policy tracker', 'Checking macro signals'], start: 0, icon: 'globe', color: '#2bb8d6', dur: 5, src: ['Policy & Macro Tracker'], pass: 2, task: 'Reading policy and macro drivers for the target markets' },
]

/** Seven specialists working at once (the default). The first three are the original agents; starts are staggered. */
export const AGENTS_7: AgentDef[] = [
  { ...AGENTS[0], start: 0 },
  { ...AGENTS[1], start: 0.3, dur: 9.5 },
  { ...AGENTS[2], start: 0.6 },
  { name: 'Pricing & Payment Plans Agent', short: 'Pricing', finding: 'Payment-plan uptake is highest among UK and Indian buyers, who favour longer post-handover plans.', subs: ['Reading price lists', 'Comparing payment plans'], start: 6.6, after: 0, icon: 'wallet', color: '#8b5cf6', dur: 3.6, src: ['Price List & Payment Plans'], pass: 3, task: 'Comparing launch pricing and payment-plan uptake by nationality' },
  { name: 'Inventory & Launch Calendar Agent', short: 'Launch inventory', finding: 'Two phases open in Q1, with the larger share of units in the mid-price band.', subs: ['Checking unit availability', 'Reading launch calendar'], start: 1.6, icon: 'layers', color: '#12b76a', dur: 6, src: ['Launch Calendar'], pass: 2, task: 'Checking which units and phases open in Q1' },
  { name: 'Competitor Projects Agent', short: 'Competitors', finding: 'Competing launches in the same price band are absorbing demand at a slower pace.', subs: ['Scanning competitor launches', 'Comparing take-up'], start: 2.2, icon: 'target', color: '#f2994a', dur: 8, src: ['Competitor Launch Tracker'], pass: 3, task: 'Tracking competing launches in the same price band' },
  { name: 'Marketing Funnel Agent', short: 'Campaign funnel', finding: 'Enquiries from the target markets come mainly through broker and digital channels.', subs: ['Reading campaign reports', 'Tracing enquiry sources'], start: 2.8, icon: 'chart', color: '#e8618c', dur: 6.8, src: ['Campaign Performance Report'], pass: 2, task: 'Tracing enquiries by channel and market' },
]
const extra = (name: string, short: string, sub: string, icon: string, color: string, src: string): AgentDef => ({
  name, short, subs: [sub, 'Summarising findings'], start: 0, dur: 0, icon, color, src: [src], pass: 2, task: sub,
})
const BASE_14: AgentDef[] = [
  ...AGENTS_7.map((x) => ({ ...x, after: undefined })),
  extra('Regional Demand Agent', 'Regional demand', 'Comparing demand by emirate', 'globe', '#2bb8d6', 'Regional Demand Index'),
  extra('Mortgage & Financing Agent', 'Mortgage', 'Reading mortgage approvals', 'bank', '#49658b', 'Mortgage Approvals Feed'),
  extra('Customer Feedback Agent', 'Feedback', 'Reading buyer feedback', 'msg', '#e8618c', 'Customer Feedback Log'),
  extra('Resale Market Agent', 'Resale', 'Checking resale prices', 'chart', '#f2994a', 'Resale Price Tracker'),
  extra('Brand Sentiment Agent', 'Sentiment', 'Scanning brand sentiment', 'eye', '#8b5cf6', 'Brand Sentiment Report'),
  extra('Contracts Pipeline Agent', 'Contracts', 'Reading signed contracts', 'doc', '#12b76a', 'Contracts Pipeline'),
  extra('Regulatory Watch Agent', 'Regulation', 'Checking regulatory updates', 'shield', '#2f245c', 'Regulatory Bulletin'),
]
// [start, duration] when all fourteen run side by side (staggered)
const PAR_14: [number, number][] = [[0, 6.5], [0.3, 9.5], [0.6, 5], [1.2, 7], [1.6, 6], [2.2, 8], [2.8, 6.8], [0.9, 6.2], [1.4, 7.4], [2, 5.4], [2.4, 6.8], [3, 5.8], [3.4, 6.4], [4, 5.6]]
export const AGENTS_14: AgentDef[] = BASE_14.map((x, i) => ({ ...x, start: PAR_14[i][0], dur: PAR_14[i][1] }))
// [start, duration, waits for]: a mixed scenario with parallel branches and chains of agents in series.
// Pricing -> Mortgage is a chain of three with Buyer Profile; Transactions -> Resale, Inventory -> Contracts,
// Feedback -> Sentiment and Policy -> Regulation are shorter chains.
const MIX: [number, number, number?][] = [[0, 6.5], [0.3, 9.5], [0.6, 5], [6.6, 3.6, 0], [1.6, 6], [2.2, 8], [2.8, 6.8], [0.9, 6.2], [10.3, 3.4, 3], [2, 5.4], [9.9, 4, 1], [7.5, 3.8, 9], [7.7, 4.5, 4], [5.7, 5, 2]]
export const AGENTS_MIX: AgentDef[] = BASE_14.map((x, i) => ({ ...x, start: MIX[i][0], dur: MIX[i][1], after: MIX[i][2] }))
/** How the run is laid out: 3, 5 or 10 serial steps, or a complex run with agents in parallel and in series. */
export type AgentCount = 3 | 5 | 10 | 'mix'
export const agentsFor = (n: AgentCount) => (n === 'mix' ? AGENTS_MIX : AGENTS)
/** the five specific agents called one after another in the 10-step run */
const CALLS: AgentDef[] = [AGENTS[0], AGENTS[1], AGENTS[2], AGENTS_7[3], AGENTS_7[5]]

export const CHECKS = [
  'Buyer shares add up to 100% across segments',
  'Transaction totals reconcile with the sales ledger',
  'Calculated figures are marked as calculated',
  'Forward-looking drivers are labelled as signals, not facts',
  'Gaps recorded: off-plan resale and agent-channel data',
]

export const SQL = `SELECT nationality, COUNT(*) AS reservations,
       ROUND(AVG(unit_price)/1e6, 1) AS avg_ticket_aed_m
FROM   gold.sales_transactions
WHERE  launch_cycle IN ('Q1-25','Q3-25','Q1-26')
GROUP BY nationality
ORDER BY reservations DESC;`

// One plain-language sentence for the business view, switching as the run progresses.
export const EVENTS: { t: number; txt: string }[] = [
  { t: 0, txt: 'Reading your question' },
  { t: 1.6, txt: 'Understood as a Q1 buyer-targeting brief with market drivers' },
  { t: T0[1] + 0.2, txt: 'Planning three lines of enquiry' },
  { t: T0[1] + 2, txt: 'Routed to the Buyer Profile, Market Transaction and Policy & Macro agents' },
  { t: GS + 0.3, txt: 'Policy & Macro Signals Agent is reading the policy tracker' },
  { t: GS + 2.8, txt: 'Buyer Profile Analysis Agent is segmenting buyers by nationality' },
  { t: GS + 5, txt: 'Market Transaction Data Agent is querying the transaction ledger' },
  { t: GS + 6.6, txt: 'Two of three agents have finished' },
  { t: T0[3] + 0.3, txt: 'Checking that shares add up and totals reconcile' },
  { t: T0[3] + 2.6, txt: 'Labelling calculated figures and recording gaps' },
  { t: T0[4] + 0.3, txt: 'Writing the executive summary' },
  { t: T0[4] + 2.4, txt: 'Adding the chart, caveats and sources' },
]

export const BUYERS: [string, number][] = [
  ['UAE nationals', 31],
  ['India', 14],
  ['United Kingdom', 11],
  ['Russia & CIS', 10],
  ['Pakistan', 7],
  ['China', 6],
  ['Egypt', 5],
  ['Saudi Arabia', 5],
  ['Germany', 4],
  ['Lebanon', 3],
  ['France', 2],
  ['Other', 2],
]

export const SOURCES = [
  { name: 'Buyer Profile Database', note: '3 passages' },
  { name: 'Transaction Ledger 2023–26', note: 'pp. 4, 9' },
  { name: 'Inquiry Funnel Report', note: 'p. 2' },
  { name: 'Policy & Macro Tracker', note: 'pp. 1, 6' },
]

export const SOURCES_EXTRA = [
  { name: 'Price List & Payment Plans', note: 'pp. 3, 5' },
  { name: 'Launch Calendar', note: 'p. 1' },
  { name: 'Competitor Launch Tracker', note: 'pp. 2, 7' },
  { name: 'Campaign Performance Report', note: 'p. 4' },
]
export const sourcesFor = (n: AgentCount) =>
  n === 'mix'
    ? [...SOURCES, ...SOURCES_EXTRA, ...AGENTS_14.slice(7).map((a) => ({ name: a.src[0], note: 'p. 2' }))]
    : n === 10
      ? CALLS.flatMap((a) => a.src).map((name) => ({ name, note: 'p. 2' }))
      : SOURCES

export const RECENTS: [string, string[]][] = [
  ['Favourites (2)', ['Ask your workplace assistant', 'Policy Update Quick Search']],
  ['Today (2)', ['HR Guidelines Clarification', 'Resources for the Q4', 'Investment Trends Deep Dive', 'Market Analysis Overview', 'Emerging Technologies in Real Estate']],
  ['Last 7 Days (11)', ['HR Guidelines Clarification', 'Marketing Insights Summary', 'Leasing Renewal Overview', 'Handover Process Questions']],
]

export const STARTERS = [
  { label: 'Buyer targeting brief', prompt: QUESTION },
  { label: 'Quarterly Review', prompt: 'Prepare the quarterly review for the leadership team' },
  { label: 'Finance Risks', prompt: 'Summarise the key finance risks for this quarter' },
]

/* ------------------------------------------------------------------ */
/*  Scenarios: what the thinking looks like depends on the response     */
/*  time. A detailed answer runs every stage; a quick answer runs only  */
/*  the stages that make sense (no agents, no validation for "hi").     */
/* ------------------------------------------------------------------ */
export type StepStyle = 'rows' | 'scatter' | 'agents' | 'scan' | 'write'
export type ScStep = StepDef & {
  style: StepStyle // how the block grid animates this step
  sub: string[] // sub-step labels shown while the step runs
  node: string // short title used in the node graph
  agents?: AgentDef[] // agents involved in this stage (shown in the reasoning pane)
  agent?: AgentDef // a stage that is one specific agent being called
  note?: string // one-line result once the stage is done
}
export type Scenario = {
  id: 'standard' | 'greeting' | 'lookup'
  steps: ScStep[]
  t0: number[]
  total: number
  gs: number // when agents start (-1: no agents)
  agentStep: number // index of the agents step (-1: none)
  validateStep: number // index of the validation step (-1: none)
  agents: AgentDef[]
  checks: string[]
  events: { t: number; txt: string }[]
  chips: string[] // summary chips once finished
  sources: number // sources shown for non-agent scenarios once retrieval ends
  sectionCount: number // response sections to stream in
  agentTotal?: number // how many agents take part (when the stages carry them, rather than parallel agent rows)
  sourceStep?: number // the stage after which the sources are counted (stage-only runs)
  chatTitle: string
}

const layout = (steps: StepDef[]) => {
  const t0: number[] = []
  let total = 0
  steps.forEach((s) => {
    t0.push(total)
    total += s.dur
  })
  return { t0, total }
}

const STD_STYLE: StepStyle[] = ['rows', 'scatter', 'agents', 'scan', 'write']
const STD_SUB = [
  ['Reading question', 'Detecting intent'],
  ['Planning enquiries', 'Routing to agents'],
  [],
  ['Checking totals', 'Reconciling shares'],
  ['Drafting summary', 'Adding sources'],
]
const STD_NODE = ['Understand', 'Plan', 'Agents', 'Validate', 'Summary']

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

/** Complex: fourteen agents, parallel branches and chains in series, inside the five orchestrator stages. */
function makeMix(): Scenario {
  const agents = AGENTS_MIX
  const steps: ScStep[] = STEPS.map((st, i) => ({ ...st, dur: i === 2 ? 15 : st.dur, style: STD_STYLE[i], sub: STD_SUB[i], node: STD_NODE[i] }))
  const { t0, total } = layout(steps)
  const gs = t0[2]
  const ev: { t: number; txt: string }[] = [
    { t: 0.2, txt: 'Intent received' },
    { t: 1.6, txt: 'Understood as a Q1 buyer-targeting brief with market drivers' },
    { t: t0[1] + 0.2, txt: 'Planning fourteen lines of enquiry' },
    { t: t0[1] + 2, txt: 'Routed to fourteen specialist agents' },
  ]
  agents.forEach((ag) => {
    const t1 = gs + ag.start
    ev.push({ t: t1 + 0.3, txt: `${ag.name} is ${lowerFirst(ag.task)}` })
    ev.push({ t: t1 + ag.dur, txt: `${ag.name} finished · ${plural(ag.src.length, 'source')}, ${ag.pass} passages` })
  })
  ev.push(
    { t: t0[3] + 0.8, txt: 'Validation: ' + CHECKS[0] },
    { t: t0[3] + 2.4, txt: 'Validation: ' + CHECKS[1] },
    { t: t0[4] + 0.3, txt: 'Composing the executive summary' },
    { t: t0[4] + 2.4, txt: 'Adding the chart, caveats and sources' },
  )
  ev.sort((x, y) => x.t - y.t)
  const nSrc = sourcesFor('mix').length
  return {
    id: 'standard',
    steps,
    t0,
    total,
    gs,
    agentStep: 2,
    validateStep: 3,
    agents,
    checks: CHECKS,
    events: ev,
    chips: ['5 steps', agents.length + ' agents', nSrc + ' sources', '5 checks passed'],
    sources: nSrc,
    sectionCount: 7,
    chatTitle: CHAT_TITLE,
  }
}

/** Serial runs: every step follows the one before. 3 = the five stages cut down, 5 = the five orchestrator stages,
 *  10 = the five stages plus specific agents being called one after another and the orchestrator collecting their reports. */
function makeSerial(n: 3 | 5 | 10): Scenario {
  const mk = (id: string, title: string, short: string, live: string, dur: number, icon: string, style: StepStyle, sub: string[], node: string, extra: Partial<ScStep> = {}): ScStep => ({
    id, title, short, live, dur, icon, style, sub, node, ...extra,
  })
  // [step index, seconds into the step, narration]
  const E: [number, number, string][] = []
  const brief = 'Understood as a Q1 buyer-targeting brief with market drivers'
  const routed3 = 'Routed to the Buyer Profile, Market Transaction and Policy & Macro agents'
  let steps: ScStep[] = []
  let validateStep = 0
  let sourceStep = 0
  let agentTotal = 3

  if (n === 3) {
    steps = [
      mk('plan', 'Understood the intent and routed the work', 'Understand', 'Understanding and routing', 5.6, 'route', 'rows', ['Reading question', 'Routing to agents'], 'Understand', { agents: AGENTS, note: '3 agents briefed' }),
      mk('agents', 'Agents gathered evidence', 'Agents', 'Agents gathering evidence', 9, 'users', 'scatter', ['Reading sources', 'Collecting evidence'], 'Agents', { agents: AGENTS, note: '3 agents · 4 sources · 9 passages' }),
      mk('wrap', 'Validated the figures and composed the summary', 'Summary', 'Validating and composing', 8.4, 'pen', 'write', ['Checking totals', 'Drafting summary'], 'Summary', { note: 'Brief ready' }),
    ]
    E.push([0, 0.2, 'Intent received'], [0, 1.6, brief], [0, 3.6, routed3], [1, 0.3, 'Three agents are gathering evidence in parallel'], [1, 5.5, 'Most agents have finished, the last one is still reading'])
    E.push([2, 0.8, 'Validation: ' + CHECKS[0]], [2, 2.6, 'Validation: ' + CHECKS[1]], [2, 4.6, 'Composing the executive summary'], [2, 6.6, 'Adding the chart, caveats and sources'])
    validateStep = 2
    sourceStep = 1
  } else if (n === 5) {
    steps = STEPS.map((st, i) => ({
      ...st,
      style: i === 2 ? ('scatter' as StepStyle) : STD_STYLE[i],
      sub: i === 2 ? ['Reading sources', 'Collecting evidence'] : STD_SUB[i],
      node: STD_NODE[i],
      agents: i === 1 || i === 2 ? AGENTS : undefined,
      note: ['Buyer brief · Q1 launches', '3 agents selected', '3 agents · 4 sources · 9 passages', '5 of 5 checks passed', 'Brief ready'][i],
    }))
    E.push([0, 0.2, 'Intent received'], [0, 1.6, brief], [1, 0.2, 'Planning three lines of enquiry'], [1, 2, routed3], [2, 0.3, 'Three agents are gathering evidence in parallel'], [2, 6.5, 'Most agents have finished, the last one is still reading'])
    E.push([3, 0.8, 'Validation: ' + CHECKS[0]], [3, 2.4, 'Validation: ' + CHECKS[1]], [4, 0.3, 'Composing the executive summary'], [4, 2.4, 'Adding the chart, caveats and sources'])
    validateStep = 3
    sourceStep = 2
  } else {
    const calls = CALLS.map((a, k) =>
      mk('call' + k, `${a.name} gathered evidence`, a.short, `${a.name} working`, [3.4, 4, 3, 3, 3.2][k], a.icon, 'scatter', a.subs, a.short, {
        agent: a,
        note: `${plural(a.src.length, 'source')} · ${a.pass} passages`,
      }),
    )
    steps = [
      { ...mk('intent', STEPS[0].title, STEPS[0].short, STEPS[0].live, 2.6, 'eye', 'rows', STD_SUB[0], STD_NODE[0]), note: 'Buyer brief · Q1 launches' },
      mk('route', STEPS[1].title, STEPS[1].short, STEPS[1].live, 3, 'route', 'scatter', STD_SUB[1], STD_NODE[1], { agents: CALLS, note: '5 agents selected' }),
      ...calls,
      mk('merge', 'Aldar X collected the agents’ reports', 'Collect', 'Collecting the agents’ reports', 2.4, 'layers', 'scan', ['Matching findings', 'Flagging gaps'], 'Collect reports', { note: '5 reports consolidated' }),
      { ...mk('val', STEPS[3].title, STEPS[3].short, STEPS[3].live, 4, 'shield', 'scan', STD_SUB[3], STD_NODE[3]), note: '5 of 5 checks passed' },
      { ...mk('comp', STEPS[4].title, STEPS[4].short, STEPS[4].live, 4.4, 'pen', 'write', STD_SUB[4], STD_NODE[4]), note: 'Brief ready' },
    ]
    E.push([0, 0.2, 'Intent received'], [0, 1.6, brief], [1, 0.2, 'Planning five lines of enquiry'], [1, 2, 'Routed to five specialist agents, to be called one after another'])
    calls.forEach((c, k) => {
      const a = c.agent as AgentDef
      E.push([2 + k, 0.3, `${a.name} is ${lowerFirst(a.task)}`], [2 + k, c.dur - 0.8, `${a.name} finished · ${plural(a.src.length, 'source')}, ${a.pass} passages`])
    })
    E.push([7, 0.3, 'Aldar X is collecting the agents’ reports'], [7, 1.5, 'All five reports received, matching findings to the question'])
    E.push([8, 0.8, 'Validation: ' + CHECKS[0]], [8, 2.4, 'Validation: ' + CHECKS[1]], [9, 0.3, 'Composing the executive summary'], [9, 2.4, 'Adding the chart, caveats and sources'])
    validateStep = 8
    sourceStep = 6
    agentTotal = 5
  }

  const { t0, total } = layout(steps)
  const ev = E.map(([i, off, txt]) => ({ t: t0[i] + off, txt })).sort((x, y) => x.t - y.t)
  const nSrc = sourcesFor(n).length
  return {
    id: 'standard',
    steps,
    t0,
    total,
    gs: -1,
    agentStep: -1,
    validateStep,
    agents: [],
    checks: CHECKS,
    events: ev,
    chips: [`${n} steps`, `${agentTotal} agents`, `${nSrc} sources`, '5 checks passed'],
    sources: nSrc,
    sectionCount: 7,
    chatTitle: CHAT_TITLE,
    agentTotal,
    sourceStep,
  }
}

export function makeStandard(n: AgentCount): Scenario {
  return n === 'mix' ? makeMix() : makeSerial(n)
}
const STANDARD_CACHE: Partial<Record<AgentCount, Scenario>> = {}

const GREETING_STEPS: ScStep[] = [
  { id: 'read', title: 'Reading your message', short: 'Read', live: 'Reading your message', dur: 0.9, icon: 'eye', style: 'rows', sub: ['Reading message'], node: 'Read message' },
  { id: 'reply', title: 'Writing a reply', short: 'Reply', live: 'Writing a reply', dur: 1.1, icon: 'pen', style: 'write', sub: ['Greeting you'], node: 'Write reply' },
]
export const GREETING_SC: Scenario = {
  id: 'greeting',
  steps: GREETING_STEPS,
  ...layout(GREETING_STEPS),
  gs: -1,
  agentStep: -1,
  validateStep: -1,
  agents: [],
  checks: [],
  events: [
    { t: 0, txt: 'Reading your message' },
    { t: 0.9, txt: 'Writing a friendly reply' },
  ],
  chips: ['2 steps', 'No sources needed'],
  sources: 0,
  sectionCount: 1,
  chatTitle: 'Quick hello',
}

const LOOKUP_STEPS: ScStep[] = [
  { id: 'read', title: 'Understanding your question', short: 'Understand', live: 'Understanding your question', dur: 0.8, icon: 'eye', style: 'rows', sub: ['Reading question'], node: 'Understanding' },
  { id: 'find', title: 'Finding the answer', short: 'Find', live: 'Finding the answer', dur: 1.5, icon: 'db', style: 'scatter', sub: ['Searching buyer profiles', 'Reading one source'], node: 'Find answer' },
  { id: 'reply', title: 'Writing the answer', short: 'Answer', live: 'Writing the answer', dur: 1, icon: 'pen', style: 'write', sub: ['Writing the answer'], node: 'Write answer' },
]
export const LOOKUP_SC: Scenario = {
  id: 'lookup',
  steps: LOOKUP_STEPS,
  ...layout(LOOKUP_STEPS),
  gs: -1,
  agentStep: -1,
  validateStep: -1,
  agents: [],
  checks: [],
  events: [
    { t: 0, txt: 'Reading your question' },
    { t: 0.8, txt: 'Looking it up in the buyer profile database' },
    { t: 2.3, txt: 'Writing a short answer' },
  ],
  chips: ['3 steps', '1 source'],
  sources: 1,
  sectionCount: 1,
  chatTitle: 'Quick answer',
}

export const isGreeting = (q: string) => /^\s*(hi|hello|hey|hiya|salam|good\s+(morning|afternoon|evening))\b/i.test(q)

/** Which scenario to play: "standard" always runs the detailed flow; "quick" picks a short flow from the prompt. */
export function buildScenario(speed: 'quick' | 'standard', question: string, agents: AgentCount = 5): Scenario {
  if (speed === 'standard') return (STANDARD_CACHE[agents] ??= makeStandard(agents))
  if (isGreeting(question)) return GREETING_SC
  const t = question.trim().replace(/[?!.]+$/, '')
  return { ...LOOKUP_SC, chatTitle: t.length > 38 ? t.slice(0, 37) + '…' : t || LOOKUP_SC.chatTitle }
}

export type QuickAnswer = { text: string; source?: string; followups: string[] }
export function quickAnswer(q: string): QuickAnswer {
  if (isGreeting(q)) {
    return {
      text: 'Hi there! I’m Aldar X. I can help with buyers, sales, leasing and market insights. What would you like to look at?',
      followups: ['Top buyer segment?', 'Average ticket size?'],
    }
  }
  if (/ticket|price|spend/i.test(q)) {
    return {
      text: 'The average ticket is AED 2.9m across the last three launch cycles, up 6% year on year.',
      source: 'Transaction Ledger 2023–26',
      followups: ['Top buyer segment?', 'Hi'],
    }
  }
  if (/buyer|segment|nationalit|who/i.test(q)) {
    return {
      text: 'UAE nationals lead with 31% of reservations, ahead of India (14%) and the United Kingdom (11%).',
      source: 'Buyer Profile Database',
      followups: ['Average ticket size?', 'Hi'],
    }
  }
  return {
    text: 'I don’t have a ready answer for that in this prototype. Try asking about the top buyer segment or the average ticket size.',
    followups: ['Top buyer segment?', 'Average ticket size?'],
  }
}

export const QUICK_STARTERS = [
  { label: 'Hi', prompt: 'Hi' },
  { label: 'Top buyer segment?', prompt: 'What is our top buyer segment?' },
  { label: 'Average ticket size?', prompt: 'What is the average ticket size?' },
]
