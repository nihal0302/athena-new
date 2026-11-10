import type { RunState } from '../hooks'

/** Small row of dots, one per agent (queued, working, done) plus a count. Only shown while the agents are running. */
export const agentsLive = (run: RunState) => run.sc.agents.length > 0 && !run.done && run.t >= run.sc.gs

export function AgentDots({ run }: { run: RunState }) {
  const n = run.sc.agents.length
  if (!agentsLive(run)) return null
  return (
    <span className="agd" aria-label={run.finishedAgents + ' of ' + n + ' agents finished'}>
      <span className="row">
        {run.agentProgress.map((p, k) => (
          <i key={k} className={p >= 1 ? 'd' : p > 0 ? 'w' : ''} />
        ))}
      </span>
      <b>{run.finishedAgents}/{n}</b>
    </span>
  )
}
