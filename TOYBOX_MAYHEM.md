# QuackTrack Visual Refit — Toybox Mayhem

**Status:** Approved visual direction — implementation source of truth for the stage-first UI refit.

## The correction

The existing Riverside print-broadcast UI is competent, but it behaves like a static desk: a large form on the left and a comparatively small race screen on the right. The race is the payoff, so it must own the composition.

**Primary surface:** Event stage.
**Secondary surface:** Configure drawer.

QuackTrack should feel like someone opened a cherished, slightly chaotic wind-up race set on a playroom floor — tactile plastic, painted wood, oversized mechanical props, camera-flash moments, and a real sense of anticipation. It must remain original; do not imitate a branded toy line, a specific game, or the reference Duck Race site.

## Product promise retained

- The race remains a local, auditable picker.
- The winner is cryptographically committed before motion starts.
- A delightful animation tells the locked outcome; it must not suggest that visible physics chose it.
- No rank, named leader, or scoreboard appears before the final bend.
- Course choice remains visual-only in V1.

## Composition

### Setup: “Open the race crate”

- Full viewport / near-full-viewport toy stage dominates the page.
- A compact floating header contains the wordmark, fairness-seal icon, and an unobtrusive `HOW IT'S FAIR` trigger.
- The river set is already visible, full scale, with two to four oversized idle ducks bobbing or rocking gently.
- Entrant setup is a **Race Crate drawer** from the lower edge or right edge, never a dominant fixed column.
- The drawer holds a roster textarea, course choice, live duck-count, and a single unmistakable `WIND UP & RACE` control.
- Each entered name is previewed as a painted toy name tag / tiny roster chip, not a data-table row.
- A wind-up key or large tactile button is the visual focal point of the launch action.

### Launch: “Wind, snap, go”

1. Drawer tucks away and stage gains space.
2. A three-beat physical countdown happens: key turns → spring compresses → starting gate lifts.
3. The SHA-256 commitment is a small sealed-ticket / tamper seal. It is visible but never visually louder than the spectacle.
4. Motion begins only after the countdown. Reduced-motion mode skips to a concise named sequence while keeping state changes legible.

### Race: “The toy set comes alive”

- The camera language should be implied through composition: large ducks, short lanes, close finish ribbon, parallax scenery — not a distant static scoreboard.
- Ducks are deliberately big with readable color, bib initial, subtle plastic shine, and physical bob/tilt. Avoid emoji, stock images, and third-party art.
- The stage must remain the widest and tallest object on the page.
- The current short status line remains but is neutral before the final bend: “The pack bunches at the reeds”, “The spring current wobbles everyone”, “Nobody is clear.”
- Event report appears as a small stamped placard over the course, then clears. It must not cover ducks or act like a panel-heavy dashboard.

### Result: “Ribbon burst”

- The winning duck reaches an oversized finish ribbon/pedestal.
- A small, brief original confetti treatment uses paper stars, stickers, or cardboard cut-outs — no casino effects.
- Winner card is an achievement plaque/polaroid layered beside or below the stage, not a giant generic alert card.
- Proof reveal unfolds from the sealed ticket and the verify action remains keyboard reachable.
- “Run it again” is immediate and preserves roster.

## Toy stage language

### Materials

- Matte painted wood, injection-molded plastic, rubber bumpers, corrugated cardboard, sticker decals, scuffed screen print.
- Use hard-edged shadows and a small number of intentional offset layers. Avoid glassmorphism, generic card grids, neon gradients, and infinite decorative particles.
- Daylight palette: butter yellow, race-red, pool blue, spring green, pink plastic, dark inky outlines, warm cream background.

### Scene props

Reinterpret the deterministic event deck as physical toy-set disruptions. Every event must produce an unambiguous visual stage change:

| Engine event | Toybox visual beat |
|---|---|
| Cross-current | A side-mounted desk fan spins up and blows paper-water ribbons sideways. |
| Reed slalom | Foam reeds pop out on springs to narrow the channel. |
| Splash zone | A squeeze-bulb / water-wheel sprays cardboard droplets near the assigned lane. |
| River ripple | A crank wheel sends concentric molded ripples through the mat. |
| Cheering bank | Pegboard spectators raise hand-painted signs on sticks. |
| Driftwood gate | Chunky toy logs swing down and make a temporary gate. |
| Final bend | The finish ramp rises, flags snap, and the camera/geometry pulls toward the ribbon. |

### Duck motion

- Keep the existing tested `getRacePositions()` values exactly as the source of position.
- Render only presentation motion on top: gentle bob, tiny yaw, splash wake, and finish bounce.
- Event emphasis can reference `event.duckId` visually but must not disclose place or imply a win.
- Do not render `#1`, ranks, leaderboards, speed bars, percentage probabilities, or a named leader before finish.

## Interaction and accessibility

- Minimum 44px targets for drawer, course selector, launch, verify, and rerun controls.
- Focus order: logo → fair explanation → drawer controls → launch → proof verify → rerun.
- Live announcements describe neutral beats before finale; announce a name only on the winner reveal.
- `prefers-reduced-motion`: no looping prop animation, no bouncy transition; compact race sequence remains understandable.
- Color never identifies a duck alone: bib initial and name remain present.

## Engineering constraints

- Preserve `src/race-engine.js` and `test/race-engine.test.js` behavior unless a new failing test proves an engine defect.
- No new packages, UI frameworks, images, SVG libraries, audio assets, or API calls.
- `index.html`, `src/main.js`, and `src/style.css` may be substantially restructured.
- Use semantic controls and CSS-driven decorative objects.
- Keep Vite build and Node tests passing.

## Acceptance checks

1. At desktop width, the stage is immediately the dominant surface; setup is a compact drawer, not a left-column dashboard.
2. At least four scene props are visible at setup, so the screen reads as a toy set even before a race.
3. Launch sequence has a visible wind-up/countdown state distinct from the active race.
4. Every event title maps to a different visual prop/state.
5. No pre-finale leader/rank/probability element is present in DOM or user-visible copy.
6. Result layout does not cover the finish line or winner.
7. Roster persists after rerun; course remains visual-only; proof verification still works.
8. Layout works at mobile width with drawer controls and stage remaining legible.
9. `npm test` and `npm run build` pass; a browser playtest shows no JavaScript errors.
