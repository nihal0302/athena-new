import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Prototype settings.
 *  - thinking: which design variation plays while the assistant thinks.
 *  - speed:    "quick" runs the short flow (no agents for a simple "hi"); "standard" runs the detailed flow.
 * To add a variation: add an option below and branch on it in ChatScreen.
 */
export type VariantState = {
  thinking: 'globe' | 'blocks' | 'graph'
  speed: 'quick' | 'standard'
}

export const DEFAULT_VARIANTS: VariantState = { thinking: 'globe', speed: 'standard' }

export type ControlDef = {
  key: keyof VariantState
  label: string
  options: { id: string; label: string }[]
}

export const CONTROLS: ControlDef[] = [
  {
    key: 'thinking',
    label: 'Variation',
    options: [
      { id: 'globe', label: 'Globe' },
      { id: 'blocks', label: 'Blocks' },
      { id: 'graph', label: 'Graph' },
    ],
  },
  {
    key: 'speed',
    label: 'Response time',
    options: [
      { id: 'quick', label: 'Quick' },
      { id: 'standard', label: 'Detailed' },
    ],
  },
]

const STORAGE_KEY = 'athena-v2-variants'

/** keep only values that still exist (older saved settings may name a variation that was removed) */
function sanitize(raw: Partial<Record<string, string>>): VariantState {
  const out = { ...DEFAULT_VARIANTS } as Record<string, string>
  for (const c of CONTROLS) {
    const v = raw[c.key]
    if (v && c.options.some((o) => o.id === v)) out[c.key] = v
  }
  return out as unknown as VariantState
}

function load(): VariantState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return sanitize(JSON.parse(raw))
  } catch {
    /* storage unavailable: fall back to defaults */
  }
  return DEFAULT_VARIANTS
}

type Ctx = { variants: VariantState; set: <K extends keyof VariantState>(k: K, v: VariantState[K]) => void; reset: () => void }
const VariantsContext = createContext<Ctx>({ variants: DEFAULT_VARIANTS, set: () => {}, reset: () => {} })

export function VariantsProvider({ children }: { children: ReactNode }) {
  const [variants, setVariants] = useState<VariantState>(load)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(variants))
    } catch {
      /* ignore */
    }
  }, [variants])
  return (
    <VariantsContext.Provider
      value={{
        variants,
        set: (k, v) => setVariants((s) => ({ ...s, [k]: v })),
        reset: () => setVariants(DEFAULT_VARIANTS),
      }}
    >
      {children}
    </VariantsContext.Provider>
  )
}

export const useVariants = () => useContext(VariantsContext)
