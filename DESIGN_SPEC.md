# QuackTrack — Product & Game Design Specification

**Status:** Proposed — design approval required before further implementation

**Working name:** QuackTrack. It is memorable but provisional; do not spend effort on branding or a domain until the game loop is approved.

---

## 1. The problem we are solving

The reference product succeeds as a utility: add names, start ducks, get a winner. Its weak point is experiential: a linear race makes the likely winner readable early, and a small fixed vocabulary of movement makes repeat races feel interchangeable.

QuackTrack must be an **original, trustworthy race-picker** that gives a host a quick answer and gives the room a short, lively, unpredictable show.

It must not copy Online Stopwatch’s artwork, page composition, controls, language, or game assets.

### Product promise

> Every duck has an equal chance. The result is locked before the animation begins. The river makes the reveal worth watching.

That distinction is important. This is not a fake physics race that pretends movement chose the winner. It is a transparent, auditable picker rendered as a game.

---

## 2. Target user and jobs

### Primary user: the host

A teacher, facilitator, streamer, parent, team lead, or friend choosing one person for a turn, prize, speaking order, or small decision.

They need to:

1. paste or type names in under 20 seconds;
2. trust that every person has the same chance;
3. hold attention for 10–15 seconds without the winner being obvious;
4. restart immediately for the next selection.

### Secondary user: everyone watching

They need to:

1. recognize their duck without needing a legend;
2. understand that the race is fair;
3. enjoy a tense finale rather than watch a foregone conclusion;
4. see and hear the result clearly.

### Explicit non-goals for v1

- no accounts, sign-in, ads, payment, or user-generated art;
- no gambling, wagering, paid boosts, or entrant-specific advantages;
- no fake claim that visual “physics” produced the winner;
- no 100–1,000 entrant race in the first release;
- no online multiplayer or server proof in v1.

**V1 participant limit:** 2–12 named ducks. This preserves readable lanes on a laptop, tablet, and phone.

---

## 3. Product shape and interaction surfaces

This is a two-surface product, not a marketing landing page.

1. **Configure (before launch):** fast roster input, one course choice, clear fairness explanation, one dominant start action.
2. **Monitor (during and after launch):** an immersive course with only the information a spectator needs: current beat, pack state, final reveal, and proof.

The setup is intentionally quiet. During the race, the game owns the screen. A host should not need to manage settings while people are watching.

### Primary desktop composition

- **Left / compact control rail:** roster, course selector, Start.
- **Right / dominant stage:** river course, event callouts, proof state.
- **After finish:** result card appears below the stage, never covering a lane or the winning duck.

### Mobile composition

- Configure screen first.
- On launch, transition to a near-full-screen race stage.
- Keep only: event label, course, “fair result locked” chip, and Reset after finish.
- Put technical proof in a disclosure sheet rather than shrinking it into unreadable UI.

---

## 4. Fairness model: non-negotiable

### The choice model

1. The host presses **Start fair race**.
2. The browser uses cryptographic randomness to select exactly one entrant with uniform probability.
3. It creates a commitment: `SHA-256(seed|winnerId)`.
4. The UI shows the commitment prefix immediately, before any duck moves.
5. A deterministic seed drives every visual event, trajectory, and finishing order.
6. At the finish, the seed and full commitment are revealed. The user can verify them locally.

The animation may not alter the selected winner. No race event may favor or penalize an entrant in outcome terms.

### Honest limitation

A client-only app lets participants audit one completed selection, but it cannot prevent the person controlling browser code from modifying it. If QuackTrack becomes a hosted team or classroom product, outcome selection and commitment must move to a server or independent verification endpoint.

### Tension rule

Before the final 25% of a race, visible leaders are **dramatic only**, not predictive.

Implementation acceptance rule:

- Before 75% elapsed time, no duck may be more than 9 visual-progress points ahead of the median.
- At least two distinct ducks must lead or be tied for lead during the early/middle race when there are 4+ entrants.
- The chosen winner may not receive a unique visual boost before the final beat.
- In the final 25%, the winning duck crosses first; second place must stay visually close enough to retain suspense.

This is a directed narrative envelope, openly paired with the “result locked” promise—not deceptive simulated competition.

---

## 5. The game loop

### Race duration

**13 seconds standard**. It is long enough to create anticipation and short enough to repeat in a classroom or meeting.

`prefers-reduced-motion` turns this into a 1.5–2 second beat-by-beat reveal with the same proof and result.

### Race beats

| Beat | Time | What viewers see | Purpose |
|---|---:|---|---|
| Lock | 0.0s | Whistle, proof hash prefix, all ducks leave the reeds | Establish trust before spectacle |
| Scramble | 0–3.5s | Tight pack; currents shuffle short-lived leads | Remove an obvious opening favorite |
| Course beat 1 | 3.5–6.5s | A visible river event changes the formation | Make each race feel different |
| Course beat 2 | 6.5–9.5s | A different event/composition shifts attention | Prevent a repeated middle section |
| Final bend | 9.5–12.5s | Two or three contenders converge on the finish | Earn anticipation |
| Reveal | 12.5–13s | Winner crosses, river freezes, proof opens | Deliver a decisive ending |

### Event deck

Every race draws a seeded, non-repeating sequence of 2–3 events. Events are **visual story beats**, not winner modifiers.

V1 deck:

- **Cross-current:** the river nudges the pack sideways; the leader changes.
- **Reed slalom:** a duck appears to thread a dense patch of reeds.
- **Splash zone:** a wave momentarily hides and re-reveals part of the pack.
- **River ripple:** the pack compresses into a near-tie.
- **Cheering bank:** visual crowd/noise energy; a different duck takes the momentary lead.
- **Driftwood gate:** the field breaks into two clusters, then rejoins.

No event may repeat within one race. The same seed must recreate the same sequence for debugging and proof review.

### Course families

Use one course family in the first playable prototype; make the system ready for three.

1. **Tanglewater (v1, default):** bright marsh, reeds, paper-cut water ripples. Friendly and readable.
2. **Lantern Run (v1.1):** dusk water, warm lanterns, slower visual pulse. Same mechanics, different stage language.
3. **Storm Drain Sprint (v1.1):** rainy urban channel, quick water sheets and reflections. More energetic, not darker or hostile.

The host can choose **Random** or a named course. Courses change events, audio palette, and visual treatment—not odds.

---

## 6. Information design during a race

### Show

- the current event in one short sentence;
- visible duck names/initials in their lanes;
- an unobtrusive “result locked” proof indicator;
- a simple course timer/progress pulse;
- the final result and optional proof verification.

### Hide until the finale

- numeric percentage positions;
- a persistent ranked leaderboard;
- speed bars, odds, “power,” or any signal that teaches viewers who will win;
- the raw seed and full commitment.

A current leaderboard in the first 75% contradicts the goal: it turns the game back into something to solve. Replace it with language such as “The pack is tight” or “Three ducks reach the bend together.”

---

## 7. Visual direction

### Selected direction: **Riverside print broadcast**

The game should feel like a tiny, charming sports broadcast made with screen-printed field-guide graphics—not a kindergarten timer and not a generic game dashboard.

- **Mood:** clever, warm, lightly absurd, trustworthy.
- **Composition:** editorial control rail + a wide river monitor.
- **Type:** characterful serif for decisive moments; compact mono for proof, time, and broadcast labels; humanist sans for controls.
- **Color:** ink teal, marsh green, parchment, warm signal orange, one restrained winner yellow.
- **Texture:** small water marks, imperfect course edges, printed registration offsets—subtle enough to preserve readability.
- **Ducks:** simple original CSS/SVG characters with lane color, initial bib, and different swim poses. No borrowed rubber-duck art.
- **Motion:** water and duck movement communicate pace; decorations do not loop gratuitously.

### Visual anti-goals

- no blue/purple tech gradients;
- no glassmorphism;
- no rows of generic feature cards;
- no emoji duck as the final visual asset;
- no neon casino/racing aesthetic;
- no copy of the reference site’s bright green keypad or cartoon river composition.

### Design-system starting tokens

| Token | Role | Initial direction |
|---|---|---|
| Ink | text / outline | deep blue-green |
| River | course surface | saturated but not neon teal |
| Parchment | app background | warm off-white, light paper grain |
| Signal | action / danger | vermilion orange |
| Winner | only at reveal | sunlit yellow |
| Proof | technical surfaces | desaturated mint |

Use one accent per state. Winner yellow must not be used as an early predictor.

---

## 8. Accessibility and inclusivity

- Keyboard: roster input, course selector, Start, New race, Verify proof must be operable in tab order.
- Screen reader: announce race start, only meaningful event changes, winner, and proof verification; do not announce every animation frame.
- Motion: respect `prefers-reduced-motion` with a short, discrete reveal sequence.
- Color: duck identity uses name/initial/bib and position—not color alone.
- Text: all buttons ≥44px touch target; no essential text below 12px on mobile.
- Audio: optional and off by default until there is a useful accessibility-controlled sound design.

---

## 9. AI-assisted build workflow, adapted from Claude of Duty

The useful lesson from Claude of Duty is not “spawn many agents to make a huge game.” It is **contracts, deterministic behavior, and hard evidence**.

### Workflow

1. **Approve this design spec first.** No more UI changes until the product contract is accepted.
2. **One integrator owns coupled behavior:** outcome selection, trajectory tension, and the on-screen information policy change together. Do not parallelize those changes blindly.
3. **Small, isolated workstreams only:** one owner can improve the duck art or one course visual system, but may not alter the fairness engine.
4. **Seeded reproducibility:** the same seed reproduces a race precisely for screenshot and logic review.
5. **Critic pass after each milestone:** check whether a race reveals too much too early, whether a result card hides the course, and whether any decoration hurts clarity.
6. **Only then add variety:** course packs, costumes, guest mode, or sound come after the core loop is trusted.

---

## 10. V1 scope and acceptance criteria

### Must ship in the first coherent prototype

- 2–12 entrants; paste one name per line, preserve duplicates safely.
- Default Tanglewater course plus a **Random** choice placeholder that does not change odds.
- 13-second auditable race with at least 6 event combinations.
- No persistent ranks before the final bend.
- CSPRNG selection, pre-race SHA-256 commitment, post-race proof verification.
- Original duck/course visuals; no third-party art assets required.
- Responsive desktop and phone flow; reduced-motion version.

### Quality gates before calling it ready

- Fairness: unit tests prove valid winner, uniform-index boundary behavior, proof verification, and no visual function changes the winner.
- Determinism: same seed gives same event deck and position checkpoints.
- Variety: sampling 100 seeds produces at least 20 distinct story signatures for a 4-duck race.
- Tension: sampled races obey the early lead-gap rule and show multiple early/middle leaders where possible.
- UX: manual playtest confirms a user can launch with names, understand “result locked,” see the winner, verify the proof, and restart without instructions.
- Visual: result UI never obscures the finish line or winner; no console errors; desktop and mobile screenshots reviewed.

### Explicitly defer

- public links / shared results;
- hostable server-backed verification;
- 13–100+ racers;
- custom duck costumes and uploaded logos;
- sound effects and music;
- saved course preferences.

---

## 11. Decisions requested before design implementation

1. **Core product promise:** approve the “auditable picker disguised as a river race” model, rather than a physically simulated race whose result is unknown until the end.
2. **Visual direction:** approve Riverside print broadcast as the baseline, or name a different reference direction.
3. **Use case:** v1 is optimized for a host on a laptop/tablet with people watching. If the main use is solo streamer overlays, classrooms, or mobile party play, that should change the layout and pacing priorities.
4. **Name:** keep `QuackTrack` as a working name or change it before identity work begins.

Until these choices are approved, treat existing UI code as a disposable exploration—not the design source of truth.
