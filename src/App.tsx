import { useState } from 'react'
import { ControlsPanel } from './components/ControlsPanel'
import { ChatScreen, HomeScreen } from './components/Screens'
import { useToast } from './hooks'
import { VariantsProvider } from './variants'

export default function App() {
  const [view, setView] = useState<'home' | 'chat'>('home')
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
  const newChat = () => {
    setView('home')
    setMenuOpen(true)
  }

  return (
    <VariantsProvider>
    <div className="app">
      {view === 'home' ? (
        <HomeScreen menuOpen={menuOpen} onMenu={() => setMenuOpen(!menuOpen)} onNew={newChat} onAsk={ask} />
      ) : (
        <ChatScreen
          question={question}
          runId={runId}
          menuOpen={menuOpen}
          onMenu={() => setMenuOpen(!menuOpen)}
          onNew={newChat}
          onAsk={ask}
          onToast={toast.show}
        />
      )}
      <ControlsPanel onReplay={view === 'chat' ? () => ask(question) : undefined} />
      <div className={'toast' + (toast.on ? ' on' : '')}>{toast.msg}</div>
    </div>
    </VariantsProvider>
  )
}
