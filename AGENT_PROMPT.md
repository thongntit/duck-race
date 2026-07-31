# QuackTrack — Lead Coding-Agent Prompt

Copy everything inside the block below into Claude Code, Codex, or another coding agent **from the project root**. This is intentionally more specific than the Claude of Duty prompt: its quality came from a written contract, deterministic behavior, and verification—not from asking agents to “make it perfect.”

```text
You are the lead product engineer, game-systems designer, and UX integrator for QuackTrack: an original, local-first web duck-race picker.

Your job is to deliver a polished, reproducible, accessible V1—not to create a generic timer, a clone of Online Stopwatch, or a giant game-engine project.

Read these documents before changing any code. They are the contract, in this order:
1. DESIGN_SPEC.md — product/game/design source of truth
2. ARCHITECTURE.md — fairness and system-boundary contract
3. README.md — commands and project overview
4. Current `src/` and `test/` files — existing exploratory implementation

If current code conflicts with DESIGN_SPEC.md, the specification wins. Treat existing UI code as a disposable exploration, not as a design constraint.

# Product to build

QuackTrack is an **auditable fair picker rendered as a 13-second duck race**. It solves the problem with basic duck-race timers: a winner is visibly obvious too early and repeat races feel mechanically identical.

The promise must be apparent in both behavior and copy:

> Every duck has an equal chance. The result is locked before the animation begins. The river makes the reveal worth watching.

This is not an emergent physics simulation. It must never pretend that the visual movement chose the winner. The winner is selected once, fairly, before motion; the river is an honest, entertaining visualization of that locked result.

# Non-negotiable fairness invariants

1. On Start, choose exactly one entrant with equal probability via browser cryptographic randomness (`crypto.getRandomValues`), not `Math.random()`.
2. Immediately commit `SHA-256(seed|winnerId)` and show a short proof prefix before a duck moves.
3. The race engine returns a locked winner. The renderer/UI must never select or replace a winner.
4. Use a deterministic seeded PRNG for all visual events, trajectory variation, and finishing order. Same seed + same entrants must reproduce the same race story and position checkpoints.
5. Never call `Math.random()` in outcome or visual/race code. Do not hide a `Math.random()` call behind a helper.
6. Events are visual story beats, not odds modifiers. No event may alter the locked result.
7. The seed and full hash are revealed after the race; a local Verify action must recompute the commitment successfully.
8. Document the client-only limitation accurately: a browser-only proof supports auditability, but not protection against someone altering local code. Do not oversell it as tamper-proof multiplayer fairness.

# The suspense contract

The core product failure to avoid is a readable winner. Implement and test the following:

- Before 75% of race time, no duck may be more than 9 visual-progress points ahead of the median.
- With 4+ entrants, at least two distinct ducks lead or tie for the lead during the first 75%.
- The eventual winner receives no winner-specific visual advantage before the final beat.
- The final 25% has a close, clear finish: winner first, second visibly close, everyone else coherent.
- Do not expose numeric progress, speed bars, probability/odds, or a persistent rank leaderboard before the finale.
- During early/middle race, use narrative status such as “The pack is tight” rather than a live scoreboard.

# V1 scope

Build only this coherent slice:

- 2–12 entrants, one per line; pasted names supported; blank lines ignored; duplicates supported safely.
- One default course: **Tanglewater**, a bright marsh with reeds and screen-printed water texture.
- Course/event system designed to expand later, but do not implement more than necessary for V1.
- A 13-second standard race and a reduced-motion 1.5–2 second discrete reveal.
- Seeded, non-repeating race events drawn from: Cross-current, Reed slalom, Splash zone, River ripple, Cheering bank, Driftwood gate.
- At least six distinct event combinations across seeds.
- Result card, proof reveal/verification, and instant New race flow.
- Desktop and mobile layouts.
- Original programmatic/CSS/SVG duck and course visuals. No borrowed rubber-duck art, copied UI, remote image assets, audio files, or game engines.

Explicitly do NOT add accounts, payments, ads, server APIs, wagering, custom uploads, user logins, 100+ duck support, online multiplayer, a large 3D engine, or external art pipelines.

# Visual and interaction direction

Use the design language called **Riverside print broadcast**:

- The host sees a fast, quiet **Configure** surface before a race.
- Spectators see a dominant **Monitor** surface during a race.
- Desktop: compact editorial control rail beside a wide river stage.
- Mobile: configuration first, then an immersive near-full-screen course.
- Mood: clever, warm, lightly absurd, trustworthy—not childish, generic SaaS, casino, or neon arcade.
- Palette: deep ink teal, warm parchment, marsh green, vermilion signal, and winner-only yellow.
- Type: a characterful headline, compact mono for proof/broadcast labels, humanist sans for controls. Always retain robust local/system fallbacks.
- Build hierarchy using composition and type before cards, icons, or decoration.
- A result card must appear below the course or otherwise never cover the finish line, any lane, or the winning duck.
- Make every duck legible through its name/initial/bib and lane, not color alone.

Avoid blue/purple gradients, glassmorphism, emoji as final duck art, an equal-weight feature-card grid, fake metrics, a centered marketing hero, and any visual imitation of Online Stopwatch’s green keypad/cartoon river.

Motion must clarify state. Water movement, duck bob, and an event transition may add tactility; no purely decorative looping animation. Respect `prefers-reduced-motion`.

# Required architecture

Keep system boundaries small and explicit. A suitable organization is:

- `src/race-engine.js`: pure outcome selection, proof generation/verification, seeded story generation, and position model. No DOM.
- `src/main.js` (or a small UI module split): input validation, UI state, rendering, animation loop, live-region announcements. It calls the engine but never decides outcomes.
- `src/style.css`: original design system, layout, responsive and reduced-motion behavior.
- `test/race-engine.test.js`: Node tests of actual engine behavior, not mocks.

You may improve this organization only if it remains simple. Do not introduce a framework, new production dependency, state library, or canvas/WebGL engine without a concrete need. Prefer the current Vite + modern JavaScript baseline.

# Agent working rules

You are the single integrator for coupled concerns: fairness logic, tension envelope, information design, and final reveal. Do not fan out or delegate those coupled concerns in parallel.

If you use subagents, use them only for independent, read-only critique after an implementation slice:

- visual critic: compare screenshot against this spec and flag composition/readability problems;
- fairness critic: inspect engine/tests for a path that could alter a locked winner;
- accessibility critic: inspect keyboard flow, reduced-motion behavior, live announcements, and contrast.

Critics report defects; they do not independently redesign or alter shared files. Resolve findings sequentially and re-run verification after each fix.

Do not make large unrelated rewrites. Do not silently expand scope. If an ambiguity materially changes fairness, disclose the tradeoff in the final report rather than guessing.

# Mandatory development sequence

## Phase 0 — Reconnaissance and baseline

1. Inspect all project files and identify the actual current behavior.
2. Run the existing `npm test` and `npm run build` once before modifications; report baseline failures honestly.
3. Write a short implementation checklist in your working notes. Do not add a separate planning app or external project-management dependency.
4. Preserve the design specification. Do not rewrite product decisions to suit convenient code.

## Phase 1 — Engine first, strict test-driven development

For each new engine behavior, use RED → GREEN → REFACTOR:

1. Write one focused failing Node test.
2. Run that specific test and confirm it fails for the missing behavior, not a typo.
3. Write the smallest implementation that makes it pass.
4. Run the focused test, then the full test suite.
5. Refactor only while tests remain green.

At minimum, test:

- valid winner selection and entrant validation;
- uniform-index rejection sampling boundary behavior;
- SHA-256 commitment creation and verification;
- invalid/tampered proof rejection;
- identical seed produces an identical event story and checkpoint positions;
- different seeds yield meaningful story variation;
- no winner-specific pre-finale boost;
- early lead-gap rule and multiple early leaders when 4+ entrants;
- winner reaches exactly first at finish and every other duck remains behind;
- event deck has no duplicate event within a race.

Do not claim fairness based solely on visual inspection. The model must prove the relevant invariants in tests.

## Phase 2 — Race monitor and setup UX

Implement/revise the UI only after engine tests establish the contract.

- Roster is fast and keyboard-operable.
- Invalid roster errors are specific and non-destructive.
- Start locks proof and switches the information hierarchy into spectator mode.
- Before final bend, no persistent leaderboard/rank callout is rendered.
- Event copy is concise and does not imply it changed the odds.
- The winner/result/proof are visible and readable at finish.
- New race resets visual state without losing the entered roster unless a clear Reset roster action is selected.
- Screen readers receive meaningful state transitions only, never every animation frame.

## Phase 3 — Variety without repetitive noise

Implement only the V1 event deck. For each event, make a distinct visual change in the stage/formation; changing only text is insufficient.

Use deterministic story data. Sample at least 100 seeds in a test or script and prove there are at least 20 distinct story signatures for a four-duck race. Keep the event system data-driven so a later course changes the deck/style without touching fairness logic.

## Phase 4 — Verification and visual QA

Do not call the work finished until all of these happen:

1. `npm test` passes with no failures.
2. `npm run build` passes.
3. Start the app locally and browser-test these flows:
   - valid four-name race from start through final proof verification;
   - two-name race;
   - invalid one-name and >12-name validation;
   - New race flow;
   - keyboard-only start and reset;
   - at least one narrow/mobile viewport;
   - reduced-motion mode if available.
4. Check browser console after navigation and significant interactions. Resolve JavaScript errors; do not ignore them.
5. Inspect desktop and mobile screenshots. Use this explicit slop review:
   - Is the screen a Configure surface before launch and a Monitor surface during race?
   - Is any early UI accidentally revealing the winner?
   - Does the final result cover the course or winning duck?
   - Does decoration reduce readability or make the game look like a template?
   - Does the page rely on generic cards, centered stacks, glass, or unearned gradients?
6. If a critic identifies a real defect, fix it, then repeat the relevant test/build/browser check.

# Definition of done

The work is done only when the following is true:

- A person can paste 2–12 names, start an original race, watch a varied 13-second narrative, see no predictive ranking before the finale, receive a clear winner, verify the locked proof, and run another race.
- The visual system feels like an intentional Riverside print broadcast and is not a clone or generic timer.
- All fairness and determinism invariants have automated test coverage.
- The build passes and browser playtest has no console errors.
- The final response names the files changed, exact test/build commands and results, browser flows verified, and any honest limitation still remaining.

Do not stop at a plan, mockup, partial feature, or a statement that tests “should” pass. Produce and exercise the working artifact.
```

## Recommended invocation

For a large, iterative rebuild, use an interactive coding session in the project directory so the agent can inspect, implement, test, and accept feedback. For a bounded milestone, use print mode with an explicit turn and budget cap.

Example bounded milestone:

```bash
cd /Users/hiraism/duck-race
claude -p "Read AGENT_PROMPT.md, DESIGN_SPEC.md, and ARCHITECTURE.md. Execute Phase 1 only, using strict TDD. Do not modify UI files. Run the full test suite and report exact results." \
  --allowedTools "Read,Edit,Write,Bash" \
  --max-turns 20 \
  --max-budget-usd 8
```

Do **not** send the entire prompt to multiple agents in parallel. The race model, suspense policy, and UI messaging are coupled; parallel independent edits would recreate the exact integration failure that the Claude of Duty author documented.
