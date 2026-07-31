const UINT32_RANGE = 0x1_0000_0000;
const FINALE_START = 0.75;
const MIN_ENTRANTS = 2;
const MAX_ENTRANTS = 12;
const textEncoder = new TextEncoder();
const EVENT_DECK = [
  { title: 'Cross-current', description: 'Paper-water ribbons sweep across the toy river.' },
  { title: 'Reed slalom', description: 'Foam reeds pop up beside a seeded lane.' },
  { title: 'Splash zone', description: 'Cardboard droplets spray beside a seeded lane.' },
  { title: 'River ripple', description: 'A crank wheel sends ripples through the river mat.' },
  { title: 'Cheering bank', description: 'The crowd raises painted signs beside a seeded lane.' },
  { title: 'Driftwood gate', description: 'Chunky toy logs swing into view beside a seeded lane.' },
];

function requireCrypto() {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) {
    throw new Error('This browser does not provide the cryptographic APIs QuackTrack requires.');
  }
  return globalThis.crypto;
}

function secureUint32() {
  const value = new Uint32Array(1);
  requireCrypto().getRandomValues(value);
  return value[0];
}

function createSeed() {
  const values = new Uint32Array(4);
  requireCrypto().getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('');
}

function normalizeEntrants(entrants) {
  if (!Array.isArray(entrants) || entrants.length < MIN_ENTRANTS) {
    throw new Error('A race needs at least two entrants.');
  }
  if (entrants.length > MAX_ENTRANTS) {
    throw new Error('A race supports at most 12 entrants.');
  }

  const normalizedEntrants = entrants.map((entrant, index) => {
    const id = String(entrant?.id ?? '').trim();
    const name = String(entrant?.name ?? '').trim();
    if (!id || !name) {
      throw new Error(`Entrant ${index + 1} needs both an id and a name.`);
    }
    return { id, name };
  });

  const entrantIds = new Set(normalizedEntrants.map((entrant) => entrant.id));
  if (entrantIds.size !== normalizedEntrants.length) {
    throw new Error('Each entrant needs a unique id.');
  }

  return normalizedEntrants;
}

async function sha256(text) {
  const bytes = await requireCrypto().subtle.digest('SHA-256', textEncoder.encode(text));
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');
}

export function uniformIndex(size, randomUint32 = secureUint32) {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('size must be a positive integer.');
  }

  const rejectedValues = UINT32_RANGE % size;
  let value;
  do {
    value = Number(randomUint32());
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) {
      throw new Error('randomUint32 must return an unsigned 32-bit integer.');
    }
  } while (value < rejectedValues);

  return value % size;
}

export async function createRace(entrants, options = {}) {
  const normalizedEntrants = normalizeEntrants(entrants);
  const seed = options.seed ?? createSeed();
  const winnerIndex = uniformIndex(normalizedEntrants.length, options.randomUint32 ?? secureUint32);
  const winner = normalizedEntrants[winnerIndex];
  const commitment = await sha256(`${seed}|${winner.id}`);

  return {
    entrants: normalizedEntrants,
    winner,
    seed,
    commitment,
  };
}

export async function verifyRaceProof(race) {
  if (!race?.winner?.id || !race?.seed || !race?.commitment || !Array.isArray(race.entrants)) {
    return false;
  }

  const winnerExists = race.entrants.some((entrant) => entrant.id === race.winner.id);
  if (!winnerExists) {
    return false;
  }

  return (await sha256(`${race.seed}|${race.winner.id}`)) === race.commitment;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(seed) {
  let value = 2_166_136_261;
  for (const character of String(seed)) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16_777_619);
  }
  return value >>> 0;
}

function createSeededRandom(seed) {
  let value = hashSeed(seed);
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

function shuffle(items, random) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function earlyProgress(duckId, story, fraction) {
  const duck = story.ducks[duckId];
  const rollingWake = Math.sin(fraction * 19 + duck.phase) * 0.005;
  const position = 0.035 + fraction * 0.74 + duck.laneBias + rollingWake;
  return clamp(position, 0.01, 0.62);
}

export function createRaceStory(race) {
  if (!race?.seed || !race?.winner?.id || !Array.isArray(race.entrants)) {
    throw new Error('A locked race is required to create a story.');
  }

  const random = createSeededRandom(race.seed);
  const duckIds = race.entrants.map((entrant) => entrant.id);
  if (!duckIds.includes(race.winner.id)) {
    throw new Error('The locked winner must be an entrant.');
  }
  const ducks = Object.fromEntries(duckIds.map((id) => [id, {
    laneBias: (random() - 0.5) * 0.018,
    phase: random() * Math.PI * 2,
  }]));
  const eventDuckOrder = shuffle(duckIds, random);
  const eventTimes = [0.3, 0.5, 0.68];
  const events = shuffle(EVENT_DECK, random).slice(0, eventTimes.length).map((event, index) => {
    const { title, description } = event;
    return {
      at: eventTimes[index],
      title,
      description,
      duckId: eventDuckOrder[index % eventDuckOrder.length],
    };
  });
  const finishOrder = [
    race.winner.id,
    ...shuffle(duckIds.filter((id) => id !== race.winner.id), random),
  ];
  const finishTargets = Object.fromEntries(finishOrder.map((id, index) => [
    id,
    index === 0 ? 1 : Math.max(0.76, 0.955 - index * 0.033),
  ]));
  const story = { ducks, events, finishOrder, finishTargets };
  const startPositions = Object.fromEntries(duckIds.map((id) => [id, earlyProgress(id, story, FINALE_START)]));

  return { ...story, startPositions };
}

export function getRacePositions(race, story, fraction) {
  if (!story?.ducks || !story?.startPositions || !race?.entrants) {
    throw new Error('A race and its story are required to calculate positions.');
  }

  const elapsed = clamp(fraction, 0, 1);
  const inFinale = elapsed >= FINALE_START;
  const finaleFraction = inFinale ? (elapsed - FINALE_START) / (1 - FINALE_START) : 0;
  const finaleEase = smoothstep(finaleFraction);

  const positions = race.entrants.map((entrant) => {
    const start = story.startPositions[entrant.id];
    const target = story.finishTargets[entrant.id];
    const wake = inFinale
      ? Math.sin(finaleFraction * 15 + story.ducks[entrant.id].phase) * 0.009 * finaleEase * (1 - finaleEase)
      : 0;
    const progress = inFinale
      ? clamp(start + (target - start) * finaleEase + wake, 0, 1)
      : earlyProgress(entrant.id, story, elapsed);
    return { ...entrant, progress };
  });

  return positions
    .sort((left, right) => right.progress - left.progress)
    .map((duck, index) => ({ ...duck, place: index + 1 }));
}
