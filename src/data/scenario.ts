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
  { id: 'intent', title: 'Buyer Intent Analysis', short: 'Understand', live: 'Understanding your request', dur: 2.6, icon: 'eye' },
  { id: 'route', title: 'Intelligence Routing to Domain Agents', short: 'Plan', live: 'Planning and routing the work', dur: 3, icon: 'route' },
  { id: 'agents', title: 'Domain Agents Gathering Evidence', short: 'Agents', live: 'Agents working in parallel', dur: 9, icon: 'users' },
  { id: 'val', title: 'Validation and Cross-checks', short: 'Validate', live: 'Cross-checking every figure', dur: 4, icon: 'shield' },
  { id: 'comp', title: 'Composing the Brief', short: 'Summarise', live: 'Writing the answer', dur: 4.4, icon: 'pen' },
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
  icon: string
  color: string
  dur: number
  src: string[]
  pass: number
  task: string
  sql?: boolean
}

export const AGENTS: AgentDef[] = [
  { name: 'Buyer Profile Analysis Agent', icon: 'users', color: '#2f245c', dur: 6.5, src: ['Buyer Profile Database'], pass: 3, task: 'Segmenting buyers by nationality, ticket size and channel' },
  { name: 'Market Transaction Data Agent', icon: 'db', color: '#49658b', dur: 9, src: ['Transaction Ledger 2023–26', 'Inquiry Funnel Report'], pass: 4, task: 'Querying transactions and inquiry-to-reservation conversion', sql: true },
  { name: 'Policy & Macro Signals Agent', icon: 'globe', color: '#2bb8d6', dur: 5, src: ['Policy & Macro Tracker'], pass: 2, task: 'Reading policy and macro drivers for the target markets' },
]

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
const STD_NODE = ['Understanding', 'Plan & route', 'Agents', 'Validate figures', 'Compose brief']

export const STANDARD_SC: Scenario = {
  id: 'standard',
  steps: STEPS.map((s, i) => ({ ...s, style: STD_STYLE[i], sub: STD_SUB[i], node: STD_NODE[i] })),
  t0: T0,
  total: TOTAL,
  gs: GS,
  agentStep: 2,
  validateStep: 3,
  agents: AGENTS,
  checks: CHECKS,
  events: EVENTS,
  chips: ['5 steps', '3 agents', '4 sources', '5 checks passed'],
  sources: 4,
  sectionCount: 8,
  chatTitle: CHAT_TITLE,
}

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
export function buildScenario(speed: 'quick' | 'standard', question: string): Scenario {
  if (speed === 'standard') return STANDARD_SC
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
