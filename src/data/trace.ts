import type { Scenario } from './scenario'

/** Technical reasoning trace: 12 engineering-level stages for the detailed (standard) answer, specific to the question
 *  that is asked in the prototype (a Q1 buyer-targeting brief). It is laid over the run's own clock, so the stages start
 *  and finish in step with the real run: six before the agents are called, two while they run and merge, two for
 *  validation and grounding, two for composing and streaming the answer. Each stage carries the technical information
 *  that is streamed into it while it runs. */
export type TechStage = {
  id: string
  title: string
  /** shown while the stage runs */
  live: string
  /** shown once it is done */
  note: string
  start: number
  end: number
  /** technical information streamed into the stage, one statement per line */
  lines: string[]
  /** stages with live content of their own */
  kind?: 'agents' | 'checks'
}

export type TechStatus = 'pend' | 'act' | 'done'

export function techStages(sc: Scenario): TechStage[] | null {
  if (sc.id !== 'standard') return null
  const total = sc.total

  // where the agents run (first agent start to last agent end) and where validation sits
  const agIdx = sc.steps.findIndex((s) => s.id === 'agents')
  const callIdx = sc.steps.map((s, i) => (s.agent ? i : -1)).filter((i) => i >= 0)
  let a1 = total * 0.36
  let a2 = total * 0.64
  if (agIdx >= 0) {
    a1 = sc.t0[agIdx]
    a2 = sc.t0[agIdx] + sc.steps[agIdx].dur
  } else if (callIdx.length) {
    a1 = sc.t0[callIdx[0]]
    a2 = sc.t0[callIdx[callIdx.length - 1]] + sc.steps[callIdx[callIdx.length - 1]].dur
  }
  let v1 = sc.validateStep >= 0 ? sc.t0[sc.validateStep] : a2
  let v2 = sc.validateStep >= 0 ? sc.t0[sc.validateStep] + sc.steps[sc.validateStep].dur : a2 + (total - a2) * 0.5
  v1 = Math.max(v1, a2)
  if (v2 > total - 0.8) v2 = v1 + (total - v1) * 0.5 // validation and writing share one step in the short layout
  v2 = Math.max(v2, v1 + 0.5)

  // cut a window into consecutive parts by weight
  const cut = (from: number, to: number, w: number[]) => {
    const sum = w.reduce((a, b) => a + b, 0)
    let at = from
    return w.map((x) => {
      const s = at
      at += ((to - from) * x) / sum
      return [s, at] as [number, number]
    })
  }
  const pre = cut(0, a1, [14, 16, 16, 20, 18, 16])
  const run2 = cut(a1, a2, [82, 18])
  const val = cut(v1, v2, [68, 32])
  const comp = cut(v2, total, [56, 44])
  const nAg = sc.agentTotal ?? sc.agents.length ?? 3

  const defs: Omit<TechStage, 'start' | 'end'>[] = [
    {
      id: 'parse',
      title: 'Parse request · extract entities',
      live: 'Tokenising the request and extracting entities',
      note: '4 entities · 31 tokens',
      lines: [
        "Tokenised the request into 31 tokens (language: en) and normalised the casing of 'Q1'.",
        'Entity pass found launch_cycle = Q1, dimension = nationality, metric = reservations and an open ask for market_drivers.',
        "Resolved 'buyers' to the buyer_profile entity and 'prioritise' to a ranking task (top-n by reservation share).",
        'No personal data detected in the prompt, so the request is forwarded unmodified.',
      ],
    },
    {
      id: 'classify',
      title: 'Classify intent · select template',
      live: 'Classifying the intent and choosing a response template',
      note: 'buyer_targeting_brief · 0.94',
      lines: [
        'Intent classifier scored buyer_targeting_brief at 0.94; the runner-up, market_overview, scored 0.04.',
        'Selected response template brief.buyer_mix.v3 (summary, buyer mix, launch plan, drivers, caveats).',
        'Response mode set to detailed, which enables the multi-agent path; the quick-lookup path was rejected.',
        'Guardrails: pii_scan = pass, data scope = internal sales data, no external web access requested.',
      ],
    },
    {
      id: 'scope',
      title: 'Resolve scope · data domains',
      live: 'Resolving the time window and data domains',
      note: '3 launch cycles · 4 data domains',
      lines: [
        "Expanded 'Q1 launches' to the last three launch cycles: Q1-25, Q3-25 and Q1-26.",
        'Mapped the request to four data domains: buyer_profiles, sales_transactions, policy_tracker and launch_calendar.',
        'Fixed the grain at nationality × launch_cycle, with ticket size and inquiry conversion as secondary metrics.',
        'Checked freshness: the newest partition is 2026-10-31, inside the 7-day SLA for every domain.',
      ],
    },
    {
      id: 'plan',
      title: 'Build query plan (DAG)',
      live: 'Building the execution plan',
      note: '3 parallel branches · 1 join',
      lines: [
        'Decomposed the request into three independent retrieval branches: profiles, transactions and policy.',
        'A merge node joins the branches on nationality, followed by a validation node and a composition node (7 nodes in all).',
        'No branch depends on another, so all three are scheduled together with max_concurrency = 3.',
        'Estimated critical path is 21 s, set by the transactions branch (SQL over gold.sales_transactions).',
      ],
    },
    {
      id: 'authorise',
      title: 'Select & authorise agents',
      live: 'Selecting agents and checking access',
      note: `${nAg || 3} agents · RBAC passed`,
      lines: [
        'Mapped each branch to a specialist: Buyer Profile Analysis, Market Transaction Data and Policy & Macro Signals.',
        "Checked the caller's role against each agent's scope: buyer_profiles:read, sales_transactions:read, policy_tracker:read. All granted.",
        'No write scopes were requested, so every agent runs read-only.',
        'Opened an audit record with correlation id trace-7f3a for the whole run.',
      ],
    },
    {
      id: 'bind',
      title: 'Bind tools · set budgets',
      live: 'Binding tools and setting budgets',
      note: '3 tools · 24k token budget',
      lines: [
        'Bound three tools: sql_runner for the ledger, vector_search for profile and policy passages, doc_reader for source pages.',
        'Set a shared budget of 24,000 tokens and a 20 s timeout per agent, with at most one retry.',
        'The retrieval cache is warm: 62% of the planned lookups were served from cache.',
        'SQL sandbox configured as read-only with a 5,000-row result cap.',
      ],
    },
    {
      id: 'execute',
      title: 'Execute agents in parallel',
      live: `Running ${nAg || 3} agents in parallel`,
      note: '3 agents · 4 sources · 9 passages',
      kind: 'agents',
      lines: [
        'Dispatched the three agents at the same moment; each runs its own retrieval loop and reports back on its own.',
        'Retrieval is hybrid: BM25 plus vector search, top_k = 6, followed by a cross-encoder rerank.',
        'The ledger agent runs a read-only query against gold.sales_transactions and joins the inquiry funnel report.',
      ],
    },
    {
      id: 'merge',
      title: 'Merge & reconcile outputs',
      live: 'Merging the agent outputs',
      note: '9 passages · 0 conflicts · 2 gaps',
      lines: [
        'Collected 9 passages from 4 sources and de-duplicated overlaps (0 removed).',
        'Joined the agent outputs on nationality: 12 rows merged, 0 conflicting values.',
        'Flagged two gaps for the answer: off-plan resale and agent-channel data are not covered by the sources.',
        'Tagged every finding with its source id so citations can be attached later.',
      ],
    },
    {
      id: 'validate',
      title: 'Validate figures',
      live: 'Validating the figures',
      note: `${sc.checks.length} of ${sc.checks.length} checks passed`,
      kind: 'checks',
      lines: [
        `Running ${sc.checks.length} rules against the merged figures: share totals, ledger reconciliation, calculated labels, signal labelling and gaps.`,
        "Each check recomputes the figure from the raw rows instead of trusting an agent's summary.",
      ],
    },
    {
      id: 'ground',
      title: 'Ground claims · attach citations',
      live: 'Grounding every claim in a source',
      note: '14 of 14 claims grounded',
      lines: [
        'Extracted 14 claims from the draft findings and matched each one to a source passage.',
        'Grounding result: 14 of 14 claims supported; none dropped and none softened.',
        'Attached citations to 4 sources and numbered them in the order they were first used.',
        'Three computed values (average ticket, share, conversion) are labelled as calculated.',
      ],
    },
    {
      id: 'compose',
      title: 'Compose structured answer',
      live: 'Composing the structured answer',
      note: '7 sections · 1 chart',
      lines: [
        'Built the outline from template brief.buyer_mix.v3: summary, buyer mix, launch plan, drivers, caveats, follow-ups, sources.',
        'Chart spec: bar chart of share_pct by nationality (top 10), with a table view for accessibility.',
        'Wrote four key points under the summary, each with one number and its change on the last cycle.',
        'Applied the response format protocol section.v1 (header, lead, pointers, visual, note).',
      ],
    },
    {
      id: 'stream',
      title: 'Render & stream response',
      live: 'Rendering and streaming the response',
      note: '~620 tokens · streamed',
      lines: [
        'Rendered the structured answer to about 620 output tokens.',
        'Streaming is on: sections are emitted in order and the first two go out before the reasoning has finished.',
        'Inline citations resolved to the numbered source list; feedback actions attached below the answer.',
        'Run closed: audit record trace-7f3a stored with 12 stages and every check passed.',
      ],
    },
  ]
  const windows = [...pre, ...run2, ...val, ...comp]
  return defs.map((d, i) => ({ ...d, start: windows[i][0], end: windows[i][1] }))
}

export const techStatus = (ts: TechStage, t: number, done: boolean): TechStatus => (done || t >= ts.end ? 'done' : t >= ts.start ? 'act' : 'pend')
