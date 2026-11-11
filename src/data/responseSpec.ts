/**
 * RESPONSE LAYOUT PROTOCOL
 * ------------------------
 * Every generated answer is a stack of SECTIONS. A section is always built from the same BLOCKS in the same order, and every
 * gap between things comes from one spacing scale, so related things sit close and unrelated things sit far apart.
 *
 *   section  = header → lead → body → visual → note        (any block may be absent, the order never changes)
 *   answer   = section · section · … · follow-ups · sources (the last two are "utility" sections: unnumbered)
 *
 * The backend (model prompt + renderer) must only emit the section types below; the renderer owns all spacing.
 * The CSS tokens (--sp-*) in styles.css mirror SPACING one-to-one.
 */

/** Spacing scale in px. Rule: the closer two things belong together, the smaller the gap. */
export const SPACING = {
  /** label ↔ its own title, number badge ↔ heading text */
  tight: 6,
  /** between elements inside one block: heading → lead, paragraph → paragraph, list row → list row */
  element: 12,
  /** between blocks inside one section: lead → pointers, text → chart */
  block: 24,
  /** end of a section: space above the divider and below it before the next section header */
  section: 28,
} as const

export type BlockKind = 'header' | 'lead' | 'body' | 'pointers' | 'visual' | 'rows' | 'cards' | 'note' | 'chips' | 'actions'

export interface SectionType {
  id: string
  /** when the model should use it */
  use: string
  /** blocks, in the order they must appear */
  blocks: BlockKind[]
  numbered: boolean
}

export const SECTION_TYPES: SectionType[] = [
  { id: 'summary', use: 'First section of every full answer: the recommendation in one headline plus 3 to 5 numbered key points.', blocks: ['header', 'lead', 'pointers'], numbered: true },
  { id: 'analysis', use: 'A finding explained in prose, backed by a chart or table.', blocks: ['header', 'lead', 'visual', 'note'], numbered: true },
  { id: 'metrics', use: 'Progress against a target or plan: 2 to 4 gauges or KPI tiles.', blocks: ['header', 'body', 'cards', 'note'], numbered: true },
  { id: 'breakdown', use: 'A list of named drivers or factors, each with a short explanation and a strength tag.', blocks: ['header', 'rows'], numbered: true },
  { id: 'caution', use: 'Caveats, data-quality issues and assumptions the reader must know before acting.', blocks: ['header', 'rows'], numbered: true },
  { id: 'followups', use: 'Always second to last: up to 3 next questions as chips.', blocks: ['header', 'chips'], numbered: false },
  { id: 'sources', use: 'Always last: the sources used, the illustrative-data note and the feedback actions.', blocks: ['header', 'chips', 'note', 'actions'], numbered: false },
]

/** Prompt contract handed to the backend / model so every answer follows the protocol. */
export const RESPONSE_PROTOCOL_PROMPT = `
Structure every answer as numbered sections using only these types: ${SECTION_TYPES.map((s) => s.id).join(', ')}.
Open with "summary". Close with "followups" then "sources". Use one section per idea; never nest sections.
Inside a section keep this order: header, lead (one or two sentences, the takeaway in bold), body or pointers, visual, note.
Spacing is applied by the renderer, never by the text: do not add blank lines, dividers or decorative headings.
Spacing scale: ${Object.entries(SPACING).map(([k, v]) => `${k} ${v}px`).join(', ')}.
`.trim()
