# Athena v2 · Aldar Phase 2 prototype: handover

Written 8 Nov 2026 so work can continue in another Claude account or session. Everything below is based on what was actually built and decided in the original session. Paste this whole file into the new session first, then point it at the project folder.

---

## 1. Who and why

- **User:** Nihal Sahu (Delphi Consulting, design/delivery side). Working with Dana Karaeen (leads the Aldar engagement), Dhruket Patel and Narendra Patel (design). The customer is **Aldar** (UAE real estate group). The product is **Athena**, Aldar's enterprise AI assistant. In the UI the assistant is called **Aldar X** and the app "Aldar AI".
- **Goal:** a clickable prototype, made with AI and shown as **screenshots** (not as HTML), to put a "Version 2" visual in the Phase 2 proposal. It builds on what the team designed for an earlier client project, **ENEC**, and should be better.
- **Deadline:** an initial direction about 2 weeks after the 4 Nov 2026 call, so around **18 Nov 2026**. Not a full design, one or two screens that show the direction.
- **Why early:** Aldar kept changing designs mid-project in Phase 1. Aligning now avoids that in Phase 2.
- **Prototype caption:** label it a tentative view, with detailed design assessment in week 1 of the project.

## 2. What Dana expects (from the 4 Nov meeting)

Three tracks, in her priority order:

1. **Agent repository (top priority, not in ENEC).**
   - All agents visible to everyone (leadership decision). Only people with access can use an agent; others see a locked state with request access.
   - Enterprise-wide agents first (policy assistant, meeting companion, data insights), then departments.
   - Department page with "Ask HR"-style suggested prompts that drop into a new chat.
   - States: available, requested (pending approval), coming soon with "Notify me".
   - Agents open inside Athena, not a separate interface (rename the "Open" button).
   - UI stays English. Agent answers must reply in Arabic when the user writes Arabic.
2. **Thinking mode.** ENEC options: business steps with %/time/sources/agents/checks, signals, streaming, agents view (the live one), simple focus, swim-lane (Dana does not care about swim-lane). Show SQL queries (Aldar will want them). Simple view in chat plus detailed trace on the right.
3. **Response formatting.** Crisp executive summary always (headline + bullets), grouped sections, charts that toggle to tables, full-screen chart, and layouts that adapt to the question (KPI boxes and graphs only when the data supports them). Design the top 10-15 expected questions first.

**Decided:** use vibe-coding with Aldar's existing design system, share **screenshots not HTML** (HTML looks LLM-generated), present as version 1 vs version 2.

## 3. Source material (all on Nihal's machine)

| What | Path / link |
|---|---|
| Meeting transcript | `C:\Users\NihalSahu\Downloads\Aldar Phase 2 Planning_ Designs.docx` |
| Athena v2 capability deck | `C:\Users\NihalSahu\Downloads\Athena v2 — Capability RoadmapV2.pptx` |
| ENEC HTML prototype (reference) | `C:\Users\NihalSahu\Downloads\ENEC_Executive_Advisor_Prototype_2.html` |
| Figma file "Aldar Client File" | key `VRxHv8olBXft6pE7EWGFYT`; conversation screen node `40043389-66871`; home screen node `40043389-74717` |
| Reference images (Pinterest) | https://in.pinterest.com/pin/425801339792075957/ (dotted globe), https://in.pinterest.com/pin/425801339792075949/ (cursors/chips) |
| Earlier single-file HTML prototype | `C:\Delphi Claude\athena-v2-prototype.html` (superseded; reference only) |

Deck facts that matter: 19 new capabilities in 5 pillars; design enhancements DES-01 to DES-08 for the repository; mockups for repository home and an "Ask HR" department hub. Note a typo in the deck: DES-07 references NEW-17, access requests is NEW-18.

## 4. What exists now

A **Vite + React 19 + TypeScript** app, local only, ready to push to GitHub and host on Vercel. Project folder: `C:\Delphi Claude\athena-v2`.

Not built: the agent repository screens (Dana's top priority), Arabic, anything in Figma. The prototype covers the **home screen and the conversation screen** (thinking + response). All data is illustrative, not real Aldar numbers (the sample is a buyer-targeting brief for Q1 launches).

### Screens and behaviour
- **Home:** dark glass look from Figma. Centred hero, glass starter chips, input box, Recent Chats menu open, top nav. Everything is centred on one axis with the top nav.
- **On send:** goes to the conversation screen and **collapses** the Recent Chats menu to a small rail. The right Reasoning pane is **collapsed by default**.
- **Conversation layout:** thread and input box share one column (`--thread: 584px`), centred between the two panes (`--shift: -32px`). Panes **overlay**; the conversation never moves when a pane opens. Input is a text row that grows with the text, controls row below (Aldar X chip, counter, files chip "3", attach, mic, send), disclaimer 8px from the bottom.
- **Order in the thread:** user message with attachment thumbnails, then the thinking card (business level), then the response **only after thinking finishes**, streamed in section by section.
- **Thinking card:** title is the entry point to the detailed pane (chevron). Detailed pane ("Reasoning") lists steps, all collapsed by default; includes agent progress, a SQL viewer and validation checks.
- **Finish transition:** card eases from tall to a compact "Thinking completed ›" with summary chips; no scroll jump.
- **Response (detailed):** executive summary with KPI tiles, buyer-mix chart (chart/table toggle, full-screen with orientation/sort/labels/bars-shown), progress rings ("calculated" tags), market drivers, caveats, not covered, follow-ups, sources, action row. Glass-styled.
- **Response (quick):** short glass card with the AI reply text and the four action icons only. **No chips** (explicit request).

### The two prototype settings (bottom-left pill, "Prototype controls")
Compact toggles, no descriptions, no revision tags in names:
- **Variation:** `Globe` | `Blocks` | `Graph` (how thinking is shown).
- **Response time:** `Quick` | `Detailed`.
- Buttons: Replay, Reset (to Globe + Detailed). Saved in `localStorage` key `athena-v2-variants` (old values are sanitised).
- The pill is large, purple, shows the current variation as a badge, and pulses until opened once per session. It sits ~28px from the bottom; the Recent Chats menu is shortened (bottom 88px) to make room.

### Response time scenarios (`src/data/scenario.ts`)
| Scenario | When | Steps | Length |
|---|---|---|---|
| `standard` (Detailed) | always for Detailed | Understand, Plan, Agents (3 parallel), Validate, Compose | 23 s |
| `greeting` (Quick) | prompt starts with hi/hello/hey/salam/good morning... | Read message, Write reply (no agents, sources, checks) | 2 s |
| `lookup` (Quick) | any other prompt | Understand, Find answer (1 source), Write answer | 3.3 s |

Quick answers are canned: greeting, "top buyer segment", "average ticket", and an honest "no ready answer in this prototype" fallback. In Quick mode the home starter chips become Hi / Top buyer segment? / Average ticket size? (**open question:** the user's last note on quick chips was ambiguous; only the in-answer follow-up chips were removed).

### The three variations (all share the same glass card style and the same text layout where noted)
1. **Globe** (`GlobeCard.tsx`)
   - Left: shimmering step title with chevron (opens details), one-line sub-step, `time · % complete`. Right: sparse dotted globe (46 dots).
   - Cycle repeats: rotate about 55°, stop, 3-6 dots light up gold, dotted lines connect them, two small chips with sub-step names, hold, reset.
   - Finish: card 84px tall, "Thinking completed" + chips, small grey globe turns slowly (one turn about 13.5 s, `SLOW = 0.000465`), dots at 55% size.
2. **Blocks** (`BlocksCard.tsx`)
   - Same text layout. Right: a canvas grid of wide flat blocks (11 columns, rows per step depend on step count so the grid is always about 10 rows). One single blue (`#6a88ee`).
   - Per-step animation styles: rows, scatter, agents (two cursors "Buyer profiles"/"Transactions" click, each click fills a group of 2-3 blocks), scan (glass bar), write (top line first). Glass chips with differently coloured dots per label.
   - A faint dotted glow lives only **outside** the card edge (nothing under the glass), drifts and leaks a little, fades outward.
   - Finish: blocks turn grey, zoom (scale 2.7) inside a clipped strip on the right (about 28% of the card, about 25px clear of the chips) and fade to 0.
3. **Graph** (`GraphCard.tsx`)
   - Top row: "Thinking ›" and `time · %`. Below: dotted canvas with small rectangular nodes (stage title + live sub-step). Connectors grow out of the previous node(s) with a glowing head; the next node is created on arrival. Parallel agents branch out and merge back.
   - Three columns visible; the view pans left for the 4th and 5th stage. Done nodes dim (about 45%), no "Done" text; running node is highlighted. No port circles.
   - Card height adapts: about 232px with parallel agents, about 142px for single-row quick flows.

### Helper URL parameters (for review and screenshots)
- `?speed=N` plays the run N times faster (1-20).
- `?freeze=SECONDS` holds the run at that moment (detailed step starts: 0, 2.6, 5.6, 14.6, 18.6; ends at 23 s).

## 5. Project structure

```
athena-v2/
  index.html                 Poppins font
  package.json               scripts: dev, build, preview
  README.md                  run/build/deploy notes
  HANDOVER.md                this file
  src/
    main.tsx  App.tsx        app shell, screen switching, menu state
    hooks.ts                 useRun (simulated clock), deriveRun(t, scenario), SPEED, FREEZE, useToast
    variants.tsx             settings registry (CONTROLS), provider, localStorage
    styles.css               tokens + all styles (one file, sections per variation)
    data/scenario.ts         scenarios, steps, agents, events, chart data, sources, quick answers
    components/
      Screens.tsx            HomeScreen, ChatScreen
      Shell.tsx              TopBar, RecentsMenu, Composer
      ControlsPanel.tsx      the Prototype controls pill + panel
      GlobeCard.tsx  BlocksCard.tsx  GraphCard.tsx   the three variations
      Thinking.tsx           ReasoningPanel (right pane), scenario-aware
      Response.tsx           Response (detailed) + QuickResponse
      Charts.tsx             bar chart, chart/table card, full-screen chart
      Icon.tsx               inline SVG icons, Sparkle, GoldSparkle
```

To add a variation: add an option in `src/variants.tsx` and branch in `ChatScreen` (`Screens.tsx`). To add a scenario: add to `scenario.ts` and `buildScenario`.

## 6. Run, build, deploy

```bash
cd "C:\Delphi Claude\athena-v2"
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + build to dist/
```

- During the session a dev server was left running at **http://localhost:5180** (started in the background; it may not survive a restart).
- **GitHub:** the user created an empty repo `https://github.com/nihal0302/athena-v2` and cloned it to `C:\Delphi Claude\athena-v2\athena-v2` (nested inside the project; it has only an "Initial commit" with `.gitattributes`). The real code is in the parent folder `C:\Delphi Claude\athena-v2` and is **not committed or pushed yet**. To publish: copy the project files (excluding `node_modules`, `dist`, and this nested clone) into the clone, or run `git init` in the parent and add the remote. `.gitignore` already excludes `node_modules` and `dist`.
- **Vercel:** import the GitHub repo; Vite is auto-detected (build `npm run build`, output `dist`); no env vars.

## 7. Design tokens

Aldar tokens from Figma: brand `#2f245c`, steel blue `#49658b`, lavender (user bubble) `#e9e6f7`, warm grey background `#f7f6f4`, success `#12b76a`, border `#d4d4d4`, ink `#252525`, sun/gold `#FFD059`. Font **Poppins** (400/500/600). Glass card recipe: `linear-gradient(135deg, rgba(255,255,255,.55), rgba(255,255,255,.22))`, 1px white border, `backdrop-filter: blur(18px) saturate(150%)`, soft purple shadow. Avatar uses a gold twin-sparkle (`GoldSparkle`); the "Aldar X" chip uses a blue sparkle.

## 8. How the user likes to work (carry these over)

- Short, specific visual refinements, one at a time. They look at screenshots and say what to change.
- **Calm, premium, uncluttered.** Reduce movement and noise; fewer bold colours; one colour where asked (blocks are one blue). Avoid busy labels; keep text to one line with an ellipsis where needed.
- Do not show internal details unless asked (no revision tags in names, no long descriptions in settings).
- Colour must not clash with the lavender user bubble or the chat background.
- Verify visually before saying done; report plainly what was and was not checked.
- Screenshots, not HTML, go to the client.
- They said "Not now" to: rebuilding the screens as native Figma layers, and to committing to git (they later set up GitHub themselves).

## 9. Gotchas learned

- **Preview/browser tooling:** the in-app browser pane is often hidden, so animation frames only advance when a screenshot is taken. Screenshots are cropped to about 800x520; for a full view scale the app with JS (`.app` transform: `scale(.62)`) or zoom with a transform. Use `?freeze=` to inspect a single moment, and `?speed=` for runs. After class changes on mount, CSS transitions look half-done; wait or nudge with another screenshot.
- **Vite dev server:** an edit to `styles.css` was once missed; `touch` the file to force a reload. The user's browser tab can also show a stale build; ask for a hard refresh (Ctrl+Shift+R). Revision tags like "(rev 9)" were added to the old variation labels for that reason and later removed on request.
- **Launch config:** `C:\Delphi Claude\.claude\launch.json` belongs to another project (MoFam) and starts the wrong server. Do not edit it; start this app with `npm run dev -- --port 5180` in the background instead.
- **Windows shell:** long heredocs and multi-line `node -e "..."` strings break in Git Bash. Write patch scripts to a `.cjs` file and run them, or use the file Write/Edit tools.
- Stopping a background task did not kill the underlying Vite node process; check `netstat -ano | grep :5180`.
- `canvas.roundRect` needs a modern Chrome. `@property` is used for animating CSS variables.

## 10. Suggested next steps

1. **Agent repository screens (Dana's top priority):** repository home (enterprise-wide first, then departments, search by task, access states, coming soon + notify me), department hub with "Ask HR" prompts, agent detail. The deck (slides 13-15) has the spec.
2. Pick a final thinking variation (or keep all three for the proposal) and capture **screenshots** at: home, thinking in progress, thinking finished with response, quick answer, and the right Reasoning pane open.
3. Optional: native Figma version of the chosen screens (the user declined for now).
4. Publish to GitHub and Vercel (section 6), share the link with the team.
5. Open questions: quick-mode home chips (keep or remove), Arabic answers, whether to keep three agents or two in the detailed flow.

## 11. Prompt to start a new session

> I'm continuing a project. Read `HANDOVER.md` in `C:\Delphi Claude\athena-v2` first. It's a React + Vite prototype of Aldar's Athena v2 conversation experience (home screen, thinking variations, response). Run it with `npm run dev`, then check it in the browser before changing anything. My next task is: <describe it>.
