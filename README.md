# QuackTrack

An original, auditable duck-race picker. It replaces the predictable part of a race timer with a transparent promise: the winner is chosen fairly and cryptographically committed before the animation starts; the animated river makes the reveal fun without changing the result.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

Read `ARCHITECTURE.md` before changing race behavior. In particular, no `Math.random()` is allowed in outcome or visual paths.
