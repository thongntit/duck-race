import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRace,
  createRaceStory,
  getRacePositions,
  uniformIndex,
  verifyRaceProof,
} from '../src/race-engine.js';

const entrants = [
  { id: 'ada', name: 'Ada' },
  { id: 'bao', name: 'Bảo' },
  { id: 'chi', name: 'Chi' },
  { id: 'duy', name: 'Duy' },
];

test('validates the 2–12 entrant contract, preserves duplicate names, and rejects duplicate ids', async () => {
  await assert.rejects(
    createRace([{ id: 'only', name: 'Only' }]),
    /at least two entrants/,
  );

  await assert.rejects(
    createRace(Array.from({ length: 13 }, (_, index) => ({ id: `duck-${index}`, name: `Duck ${index}` }))),
    /at most 12 entrants/,
  );

  await assert.rejects(
    createRace([
      { id: 'same-id', name: 'First name' },
      { id: 'same-id', name: 'Second name' },
    ]),
    /unique id/,
  );

  const duplicateNameRace = await createRace([
    { id: 'duck-one', name: 'Pat' },
    { id: 'duck-two', name: 'Pat' },
  ], {
    seed: 'duplicate-names-are-safe',
    randomUint32: () => 1,
  });
  assert.equal(duplicateNameRace.winner.id, 'duck-two');
});

test('uses rejection sampling at the unsigned 32-bit boundary', () => {
  const sampledValues = [0, 0xffff_ffff];
  assert.equal(uniformIndex(3, () => sampledValues.shift()), 0);
  assert.deepEqual(sampledValues, []);
});

test('requires the locked winner to be an entrant before creating a visual story', () => {
  assert.throws(
    () => createRaceStory({
      entrants,
      winner: { id: 'not-in-the-race', name: 'Ghost duck' },
      seed: 'invalid-story',
    }),
    /locked winner must be an entrant/,
  );
});

test('locks one valid winner and creates a proof that verifies before animation begins', async () => {
  const race = await createRace(entrants, {
    seed: 'test-seed-2026',
    randomUint32: () => 2,
  });

  assert.equal(race.winner.id, 'chi');
  assert.equal(race.commitment.length, 64);
  assert.equal(await verifyRaceProof(race), true);
});

test('rejects proof records tampered after the result is locked', async () => {
  const race = await createRace(entrants, {
    seed: 'proof-tampering-2026',
    randomUint32: () => 0,
  });
  const tamperedCommitment = race.commitment.endsWith('0')
    ? `${race.commitment.slice(0, -1)}1`
    : `${race.commitment.slice(0, -1)}0`;

  assert.equal(await verifyRaceProof({ ...race, commitment: tamperedCommitment }), false);
  assert.equal(await verifyRaceProof({ ...race, seed: 'different-seed' }), false);
  assert.equal(await verifyRaceProof({ ...race, winner: entrants[1] }), false);
  assert.equal(await verifyRaceProof({ ...race, entrants: entrants.slice(1) }), false);
});

test('draws a deterministic, non-repeating three-event story with meaningful seed variation', async () => {
  const race = await createRace(entrants, {
    seed: 'repeatable-story-2026',
    randomUint32: () => 1,
  });
  const firstStory = createRaceStory(race);
  const secondStory = createRaceStory(race);

  assert.deepEqual(firstStory.events, secondStory.events);
  assert.equal(firstStory.events.length, 3);
  assert.equal(new Set(firstStory.events.map((event) => event.title)).size, firstStory.events.length);

  const signatures = new Set();
  for (let index = 0; index < 16; index += 1) {
    const variedRace = await createRace(entrants, {
      seed: `event-variety-${index}`,
      randomUint32: () => 1,
    });
    const story = createRaceStory(variedRace);
    signatures.add(story.events.map((event) => event.title).join('|'));
  }
  assert.ok(signatures.size >= 6, `expected at least six event combinations; got ${signatures.size}`);
});

test('keeps the early pack tight, rotates leaders, and gives no pre-finale advantage to the locked winner', async () => {
  const earlyCheckpoints = [0.06, 0.2, 0.35, 0.5, 0.65, 0.74];
  const leaderIds = new Set();

  for (let seedIndex = 0; seedIndex < 12; seedIndex += 1) {
    const sharedOptions = { seed: `suspense-envelope-${seedIndex}` };
    const firstWinnerRace = await createRace(entrants, { ...sharedOptions, randomUint32: () => 0 });
    const lastWinnerRace = await createRace(entrants, { ...sharedOptions, randomUint32: () => 3 });
    const firstWinnerStory = createRaceStory(firstWinnerRace);
    const lastWinnerStory = createRaceStory(lastWinnerRace);

    for (const checkpoint of earlyCheckpoints) {
      const positions = getRacePositions(firstWinnerRace, firstWinnerStory, checkpoint);
      const matchingPositions = getRacePositions(lastWinnerRace, lastWinnerStory, checkpoint);
      const progressById = Object.fromEntries(positions.map((duck) => [duck.id, duck.progress]));
      const matchingProgressById = Object.fromEntries(matchingPositions.map((duck) => [duck.id, duck.progress]));
      assert.deepEqual(matchingProgressById, progressById, `winner influenced progress at ${checkpoint}`);

      const sortedProgress = positions.map((duck) => duck.progress).sort((left, right) => left - right);
      const median = (sortedProgress[1] + sortedProgress[2]) / 2;
      const leaders = positions.filter((duck) => duck.progress === positions[0].progress);
      for (const leader of leaders) leaderIds.add(leader.id);
      assert.ok(positions[0].progress - median <= 0.09, `lead exceeded nine points at ${checkpoint}`);
    }
  }

  assert.ok(leaderIds.size >= 2, `expected multiple early leaders; got ${[...leaderIds].join(', ')}`);
});

test('assigns distinct ducks to the seeded visual beats', async () => {
  for (let seedIndex = 0; seedIndex < 12; seedIndex += 1) {
    const race = await createRace(entrants, {
      seed: `event-targets-${seedIndex}`,
      randomUint32: () => 0,
    });
    const story = createRaceStory(race);
    const eventDuckIds = story.events.map((event) => event.duckId);

    assert.equal(new Set(eventDuckIds).size, story.events.length);
    assert.ok(eventDuckIds.every((duckId) => entrants.some((entrant) => entrant.id === duckId)));
  }
});

test('uses each event target only for visual placement and never for race progress', async () => {
  const race = await createRace(entrants, {
    seed: 'visual-only-obstacles',
    randomUint32: () => 0,
  });
  const story = createRaceStory(race);
  const storyWithoutTargets = {
    ...story,
    events: story.events.map((event) => ({ ...event, duckId: 'not-an-entrant' })),
  };

  for (const checkpoint of [0.3, 0.5, 0.68]) {
    assert.deepEqual(
      getRacePositions(race, story, checkpoint),
      getRacePositions(race, storyWithoutTargets, checkpoint),
      `event target changed race progress at ${checkpoint}`,
    );
  }
});

test('enters the final bend from the exact locked early-race positions', async () => {
  const race = await createRace(entrants, {
    seed: 'continuous-final-bend',
    randomUint32: () => 2,
  });
  const story = createRaceStory(race);
  const finalBendPositions = getRacePositions(race, story, 0.75);

  for (const duck of finalBendPositions) {
    assert.equal(duck.progress, story.startPositions[duck.id]);
  }
});

test('uses a repeatable story but keeps the winner undecidable through the early pack', async () => {
  const race = await createRace(entrants, {
    seed: 'river-loop-2026',
    randomUint32: () => 1,
  });
  const firstStory = createRaceStory(race);
  const secondStory = createRaceStory(race);

  assert.deepEqual(firstStory, secondStory);
  for (const checkpoint of [0, 0.25, 0.5, 0.74, 0.75, 0.9, 1]) {
    assert.deepEqual(
      getRacePositions(race, firstStory, checkpoint),
      getRacePositions(race, secondStory, checkpoint),
      `expected identical positions at ${checkpoint}`,
    );
  }

  const earlyPositions = getRacePositions(race, firstStory, 0.55);
  const earlySpread = Math.max(...earlyPositions.map((duck) => duck.progress))
    - Math.min(...earlyPositions.map((duck) => duck.progress));
  assert.ok(earlySpread < 0.14, `expected a tight early pack; got ${earlySpread}`);

  const finishPositions = getRacePositions(race, firstStory, 1);
  assert.equal(finishPositions[0].id, race.winner.id);
  assert.equal(finishPositions[0].place, 1);
  assert.equal(finishPositions.find((duck) => duck.id === race.winner.id)?.progress, 1);
  assert.ok(finishPositions.filter((duck) => duck.id !== race.winner.id).every((duck) => duck.progress < 1));
  assert.ok(1 - finishPositions[1].progress <= 0.08, 'runner-up should remain visibly close');
});
