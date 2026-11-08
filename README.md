# Athena v2 · Aldar AI prototype

Clickable prototype of the Phase 2 conversation experience: home screen, collapsed-by-default menu and reasoning pane, a business-level thinking view in the thread, and a structured response.

All data is illustrative (`src/data/scenario.ts`). None of it is real Aldar data.

**Stack:** Vite · React 19 · TypeScript. No backend, no env vars.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Use a window at least 1100px wide (designed at 1280×832).

## Build

```bash
npm run build     # type-checks, then outputs ./dist
npm run preview   # serve the production build locally
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Athena v2 prototype"
git branch -M main
git remote add origin https://github.com/<your-org>/<repo>.git
git push -u origin main
```

## Deploy on Vercel

1. Vercel dashboard → **Add New → Project** → import the GitHub repo.
2. Framework preset is detected as **Vite** (build `npm run build`, output `dist`). No changes needed.
3. Deploy, then share the generated URL.

Or from the CLI: `npx vercel` (preview) and `npx vercel --prod`.

## Structure

```
src/
  App.tsx                  screen switching + menu state
  hooks.ts                 simulated run engine (useRun / deriveRun)
  data/scenario.ts         question, steps, agents, checks, chart + response data
  components/
    Screens.tsx            HomeScreen, ChatScreen
    Shell.tsx              TopBar, RecentsMenu, Composer
    Thinking.tsx           ThinkingCard (business view) + ReasoningPanel (detail pane)
    Response.tsx           response sections
    Charts.tsx             bar chart, chart/table card, full-screen chart
  styles.css               design tokens + all styles
```

## Behaviour notes

- Home: recent chats menu open. Sending a prompt moves to the conversation screen and collapses the menu.
- Conversation: menu and right Reasoning pane are collapsed by default.
- While the agents work, the thread shows the business view (5 stages, live sentence, counts). **View details** opens the right pane, where every step starts collapsed.
- The response appears only after reasoning finishes, then streams in section by section.

## Prototype controls and review helpers

- **Prototype controls** (bottom-left pill) has two toggles:
  - **Variation**: Globe, Blocks or Graph (how the thinking is shown).
  - **Response time**: Quick or Detailed. Detailed plays the full five-stage run (agents, validation, a full brief). Quick plays a short run: a greeting like "hi" is just two steps with no agents or sources, and any other short question is three steps with one source. Quick answers are a short glass card instead of the full brief, and the home starter chips switch to short questions.
  Settings live in `src/variants.tsx`; scenarios (steps, timings, answers) live in `src/data/scenario.ts`.
- `?speed=N` plays the simulated run N times faster (1 to 20), e.g. `/?speed=4`.
- `?freeze=SECONDS` holds the run at one moment so you can inspect a single step, e.g. `/?freeze=9` (agents step).
  Steps start at 0s (understand), 2.6s (plan), 5.6s (agents), 14.6s (validate) and 18.6s (summarise); the run ends at 23s.
