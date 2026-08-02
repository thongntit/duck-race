export const RACE_DURATION_PRESETS = Object.freeze({
  quick: 12_000,
  steady: 20_000,
  long: 30_000,
});

export function getRaceDurationMs(preset) {
  return RACE_DURATION_PRESETS[preset] ?? RACE_DURATION_PRESETS.steady;
}
