# QuackTrack — MVP contract

## Product promise

QuackTrack is an original, local-first duck-race game for choosing a person without a boring or obviously decided animation. It is **not** a clone of Online Stopwatch’s art, UI, code, or wording.

The setup surface is primarily **Operate**; the race surface is **Monitor**. Setup must be fast. During a race, the visual hierarchy must make current events, the pack, and finish state glanceable.

## Fairness contract

1. When the user presses **Start race**, exactly one winner is selected with uniform probability among entrants via the browser cryptographic random number generator.
2. The game creates `SHA-256(seed|winnerId)` and displays the hash prefix before the animation begins. The result is therefore locked before any duck moves.
3. The animation may be dramatic, but it cannot change the locked winner. At reveal it shows the seed and full commitment so the client can recompute the proof.
4. All visual variation comes from a deterministic seeded PRNG. Replaying the same seed produces the same course events and positions.
5. Never use `Math.random()` for outcomes or race visuals.

This MVP is client-only, so it provides auditability to the participant using the app—not protection against the person controlling browser code. A hosted multiplayer version must move the commitment and final reveal to a server or independent verification endpoint.

## Small, single-owner architecture

- `src/race-engine.js`: outcome selection, proof, deterministic event generation, position model. No DOM.
- `src/main.js`: DOM state, render loop, input and accessibility announcements. It never selects a winner.
- `src/style.css`: original visual system and responsive layout.
- `test/race-engine.test.js`: fairness and determinism behavior.

The big lesson from Claude of Duty is to retain the *discipline*, not its scale: a written contract, deterministic behavior, and reproducible test/playtest tooling. This is a small game; one owner should integrate the coupled outcome, animation, and UI rather than parallelizing them blindly.

## Definition of done for the MVP

- 2–12 named entrants; duplicates and blank lines are handled clearly.
- Equal-probability winner, cryptographic commitment, reveal proof.
- A 12–16 second race with varied currents/splash events and rotating early leaders, so no obvious winner appears early.
- Keyboard-operable setup and race reset.
- Unit tests cover locked winner/proof, uniform-index mapping boundary, deterministic scene generation, and late-race finish.
- `npm test` and `npm run build` pass.
- A browser playtest starts, finishes, verifies proof, and reports no console errors.
