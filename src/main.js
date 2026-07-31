import './style.css';
import {
  createRace,
  createRaceStory,
  getRacePositions,
  verifyRaceProof,
} from './race-engine.js';

const RACE_DURATION_MS = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1500 : 13_500;
const DUCK_COLORS = ['#ffce47', '#ec7a48', '#9dd6d0', '#e7a9b6', '#a8d17c', '#b8a4d9', '#f0a965', '#8ac2e2', '#e99b75', '#b0c9a0', '#e8ba59', '#a6b7df'];

const elements = {
  form: document.querySelector('#race-form'),
  entrants: document.querySelector('#entrants'),
  entrantCount: document.querySelector('#entrant-count'),
  course: document.querySelector('#course'),
  formMessage: document.querySelector('#form-message'),
  start: document.querySelector('#start-race'),
  reset: document.querySelector('#reset-race'),
  title: document.querySelector('#monitor-title'),
  proofText: document.querySelector('#proof-text'),
  proofStrip: document.querySelector('#proof-strip'),
  eventCard: document.querySelector('#event-card'),
  stage: document.querySelector('.river-stage'),
  lanes: document.querySelector('#lanes'),
  clock: document.querySelector('#race-clock'),
  courseState: document.querySelector('#course-state'),
  packStatus: document.querySelector('#pack-status'),
  resultCard: document.querySelector('#result-card'),
  resultTitle: document.querySelector('#result-title'),
  resultText: document.querySelector('#result-text'),
  proofReveal: document.querySelector('#proof-reveal'),
  verify: document.querySelector('#verify-proof'),
  verificationStatus: document.querySelector('#verification-status'),
  live: document.querySelector('#live-region'),
};

let state = {
  phase: 'setup',
  race: null,
  story: null,
  frame: 0,
  startedAt: 0,
  activeBeat: 'setup',
  course: 'tanglewater',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  })[character]);
}

function parseEntrants(value) {
  const names = value
    .split(/\n|,/)
    .map((name) => name.trim().replace(/\s+/g, ' ').slice(0, 28))
    .filter(Boolean);
  return names.map((name, index) => ({ id: `duck-${index + 1}`, name }));
}

function updateEntrantCount() {
  const count = parseEntrants(elements.entrants.value).length;
  elements.entrantCount.textContent = `${count} duck${count === 1 ? '' : 's'}`;
}

function showFormMessage(message = '') {
  elements.formMessage.textContent = message;
}

function validateEntrants(entrants) {
  if (entrants.length === 0) return 'Add at least two named ducks before launching.';
  if (entrants.length === 1) return 'Add one more named duck before launching.';
  if (entrants.length > 12) return 'Use no more than 12 named ducks in one race.';
  return '';
}

function formatTime(fraction) {
  const seconds = Math.min(Math.floor(fraction * RACE_DURATION_MS / 1000), Math.floor(RACE_DURATION_MS / 1000));
  return `00:${String(seconds).padStart(2, '0')}`;
}

function duckMarkup(entrant, color) {
  return `<div class="lane" data-lane="${entrant.id}">
    <span class="lane-name">${escapeHtml(entrant.name)}</span>
    <div class="duck-runner" data-duck="${entrant.id}" style="--duck-color:${color}; left:15%" aria-label="${escapeHtml(entrant.name)}">
      <span class="duck-head"><i class="duck-eye"></i></span><span class="duck-body"></span><span class="duck-bib">${String(entrant.name).slice(0, 1).toUpperCase()}</span>
    </div>
  </div>`;
}

function mountLanes(entrants) {
  elements.lanes.style.setProperty('--duck-count', entrants.length);
  elements.lanes.innerHTML = entrants.map((entrant, index) => duckMarkup(entrant, DUCK_COLORS[index % DUCK_COLORS.length])).join('');
}

function eventKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const EVENT_REPORTS = {
  'Cross-current': 'A sideways current redraws the river.',
  'Reed slalom': 'A reed wall narrows the channel.',
  'Splash zone': 'A bright splash rolls across the lanes.',
  'River ripple': 'Concentric wakes pull the picture tight.',
  'Cheering bank': 'The riverbank erupts in paper signs.',
  'Driftwood gate': 'Driftwood divides the water, then clears.',
};

function setStageBeat(key, event = null) {
  elements.stage.dataset.stageEvent = key;
  if (event) {
    const lane = state.race.entrants.findIndex((duck) => duck.id === event.duckId);
    elements.stage.style.setProperty('--event-lane', String(Math.max(lane, 0)));
  } else {
    elements.stage.style.removeProperty('--event-lane');
  }
}

function renderEventCard(label, title, message) {
  elements.eventCard.innerHTML = `<span class="event-index">${label}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
}

function updateRaceBeat(fraction) {
  const activeEvent = state.story.events.filter((event) => event.at <= fraction).at(-1);
  const beat = fraction >= 0.72
    ? { key: 'final-bend', label: 'FINAL BEND', title: 'The finish narrows', message: 'The pack reaches the bend together.' }
    : activeEvent
      ? {
        key: eventKey(activeEvent.title),
        label: 'RIVER REPORT',
        title: activeEvent.title,
        message: EVENT_REPORTS[activeEvent.title] ?? 'The river changes shape around the pack.',
        event: activeEvent,
      }
      : { key: 'locked', label: 'LOCKED', title: 'Proof committed', message: 'The result is set. The river can only tell the story.' };

  if (state.activeBeat === beat.key) return;
  state.activeBeat = beat.key;
  setStageBeat(beat.key, beat.event);
  renderEventCard(beat.label, beat.title, beat.message);
  if (beat.event) elements.live.textContent = `${beat.title}. ${beat.message}`;
}

function renderPositions(fraction) {
  const positions = getRacePositions(state.race, state.story, fraction);
  for (const duck of positions) {
    const node = elements.lanes.querySelector(`[data-duck="${duck.id}"]`);
    if (!node) continue;
    node.style.left = `${15 + duck.progress * 78}%`;
    node.setAttribute('aria-label', duck.name);
  }
}

function updatePackStatus(fraction) {
  const status = fraction < 0.3
    ? 'The pack launches from the reeds.'
    : fraction < 0.5
      ? 'The pack is tight through the current.'
      : fraction < 0.72
        ? 'Nobody has broken clear.'
        : 'The field turns the final bend together.';
  elements.packStatus.textContent = status;
}

function tick(timestamp) {
  const fraction = Math.min((timestamp - state.startedAt) / RACE_DURATION_MS, 1);
  renderPositions(fraction);
  updateRaceBeat(fraction);
  elements.clock.textContent = formatTime(fraction);
  updatePackStatus(fraction);

  if (fraction < 1) {
    state.frame = window.requestAnimationFrame(tick);
  } else {
    completeRace();
  }
}

async function startRace() {
  const entrants = parseEntrants(elements.entrants.value);
  const entrantError = validateEntrants(entrants);
  if (entrantError) {
    showFormMessage(entrantError);
    return;
  }

  showFormMessage();
  elements.start.disabled = true;
  state.race = await createRace(entrants);
  state.story = createRaceStory(state.race);
  state.phase = 'running';
  state.startedAt = performance.now();
  state.activeBeat = 'locked';
  state.course = elements.course.value === 'random' ? 'tanglewater' : elements.course.value;

  mountLanes(entrants);
  renderPositions(0);
  setStageBeat('locked');
  elements.title.textContent = 'The whistle blows. Nobody knows.';
  elements.proofText.textContent = `Result locked: SHA‑256 ${state.race.commitment.slice(0, 18)}…`;
  elements.proofStrip.classList.add('race-active');
  renderEventCard('LOCKED', 'Proof committed', 'The result is set. The river can only tell the story.');
  elements.courseState.textContent = elements.course.value === 'random'
    ? 'RANDOM ROUTE · TANGLEWATER FOR V1'
    : 'TANGLEWATER · MARSH COURSE';
  elements.packStatus.textContent = 'The pack launches from the reeds.';
  elements.clock.textContent = '00:00';
  elements.resultCard.classList.add('hidden');
  elements.reset.classList.add('hidden');
  elements.verificationStatus.textContent = '';
  elements.live.textContent = 'Fair race launched. Result locked before the animation.';
  document.querySelector('.app-shell').classList.add('race-active');
  state.frame = window.requestAnimationFrame(tick);
}

async function completeRace() {
  state.phase = 'finished';
  const winnerNode = elements.lanes.querySelector(`[data-duck="${state.race.winner.id}"]`);
  winnerNode?.setAttribute('data-finished', 'true');
  elements.title.textContent = 'Photo finish, proof intact.';
  setStageBeat('finish');
  elements.packStatus.textContent = `${state.race.winner.name} crosses first.`;
  elements.resultTitle.textContent = `${state.race.winner.name} wins the river.`;
  elements.resultText.textContent = 'Their result was locked before the ducks started moving — now verify it yourself.';
  elements.proofReveal.textContent = `seed ${state.race.seed}  ·  SHA-256 ${state.race.commitment}`;
  elements.resultCard.classList.remove('hidden');
  elements.reset.classList.remove('hidden');
  elements.start.disabled = false;
  elements.proofText.textContent = 'Proof revealed. The race animation did not choose the winner.';
  elements.live.textContent = `${state.race.winner.name} won. The seed and proof are available for verification.`;
}

function resetRace() {
  window.cancelAnimationFrame(state.frame);
  state = {
    phase: 'setup',
    race: null,
    story: null,
    frame: 0,
    startedAt: 0,
    activeBeat: 'setup',
    course: 'tanglewater',
  };
  elements.title.textContent = 'Waiting at the starting reeds';
  elements.proofText.textContent = 'The commitment appears the moment you launch.';
  elements.proofStrip.classList.remove('race-active');
  renderEventCard('UP NEXT', 'Set your lineup', 'The river needs at least two ducks.');
  setStageBeat('setup');
  elements.lanes.innerHTML = '';
  elements.clock.textContent = '00:00';
  elements.courseState.textContent = 'TANGLEWATER · MARSH COURSE';
  elements.packStatus.textContent = 'The pack is waiting.';
  elements.resultCard.classList.add('hidden');
  elements.reset.classList.add('hidden');
  document.querySelector('.app-shell').classList.remove('race-active');
  elements.entrants.focus();
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (state.phase !== 'running') startRace();
});
elements.entrants.addEventListener('input', updateEntrantCount);
elements.reset.addEventListener('click', resetRace);
elements.verify.addEventListener('click', async () => {
  const verified = await verifyRaceProof(state.race);
  elements.verificationStatus.textContent = verified
    ? '✓ Verified — revealed seed and winner reproduce the commitment.'
    : 'Proof could not be verified.';
});

updateEntrantCount();
