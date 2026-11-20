import { useState } from 'react'
import { ControlsPanel } from './components/ControlsPanel'
import { ChatScreen, HomeScreen } from './components/Screens'
import { Repository } from './components/Repository'
import { RepositoryV2 } from './components/RepositoryV2'
import { useToast } from './hooks'
import { VariantsProvider, useVariants } from './variants'
import type { Agent } from './data/agents'

export default function App() {
  const [view, setView] = useState<'home' | 'chat' | 'repo'>('home')
  const [question, setQuestion] = useState('')
  const [runId, setRunId] = useState(0)
  const [menuOpen, setMenuOpen] = useState(true) // open on home, collapsed once a chat starts
  const toast = useToast()

  const ask = (q: string) => {
    if (!q) return
    setQuestion(q)
    setRunId((r) => r + 1)
    setMenuOpen(false) // recent chats collapse as soon as the user sends
    setView('chat')
  }
  const [agent, setAgent] = useState<Agent | null>(null) // agent picked in the repository; shown on the new-chat screen
  const openRepo = () => setView('repo')
  const [draft, setDraft] = useState('') // a request typed in the repository finder, waiting in the composer
  const startWith = (a: Agent, prompt?: string) => {
    setAgent(a)
    setDraft(prompt ?? '')
    setView('home')
    setMenuOpen(true)
  }
  const newChat = () => {
    setAgent(null)
    setDraft('')
    setView('home')
    setMenuOpen(true)
  }

  return (
    <VariantsProvider>
    <div className="app">
      {view === 'repo' ? (
        <RepoSwitch onNew={newChat} onRepo={openRepo} onAsk={ask} onStart={startWith} onToast={toast.show} />
      ) : view === 'home' ? (
        <HomeScreen menuOpen={menuOpen} onMenu={() => setMenuOpen(!menuOpen)} onNew={newChat} onAsk={ask} onRepo={openRepo} agent={agent} draft={draft} onClearAgent={() => setAgent(null)} />
      ) : (
        <ChatScreen
          question={question}
          runId={runId}
          menuOpen={menuOpen}
          onMenu={() => setMenuOpen(!menuOpen)}
          onNew={newChat}
          onAsk={ask}
          onToast={toast.show}
          onRepo={openRepo}
        />
      )}
      <ControlsPanel onReplay={view === 'chat' ? () => ask(question) : undefined} />
      <div className={'toast' + (toast.on ? ' on' : '')}>{toast.msg}</div>
    </div>
    </VariantsProvider>
  )
}

/** picks the repository layout from the prototype settings */
function RepoSwitch(p: { onNew: () => void; onRepo: () => void; onAsk: (q: string) => void; onStart: (a: Agent, prompt?: string) => void; onToast: (m: string) => void }) {
  const { variants } = useVariants()
  return variants.repo === 'v2' ? <RepositoryV2 {...p} /> : <Repository {...p} />
}
