/** Aldar colour tokens (Figma "Colors" library + colour styles). The reasoning panes only use these:
 *  ink (brand purple), sky, shale (greys), success, terracotta, and the styles Turquoise / Dusk / Sun. */
const MAP: Record<string, string> = {
  '#2f245c': '#2f245c', // ink/700
  '#49658b': '#49658b', // sky/800
  '#12b76a': '#12b76a', // success/500
  '#2bb8d6': '#7ac9d4', // → style Turquoise
  '#8b5cf6': '#8174c4', // → ink/400
  '#f2994a': '#f18f5a', // → terracotta/500
  '#e8618c': '#c4644c', // → style Dusk
}
export const pal = (c: string) => MAP[c.toLowerCase()] ?? c
