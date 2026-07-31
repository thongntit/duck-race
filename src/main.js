import './style.css';
import {
  createRace,
  createRaceStory,
  getRacePositions,
  verifyRaceProof,
} from './race-engine.js';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const RACE_DURATION_MS = REDUCED_MOTION ? 1500 : 13_500;
const COUNTDOWN_STEP_MS = REDUCED_MOTION ? 210 : 650;
const DUCK_COLORS = ['#ffcc35', '#ff7961', '#70c5dd', '#f3a3bf', '#9acc71', '#bca6e3', '#f3a45e', '#8fd1b5', '#ec8e76', '#bdcf81', '#f1bd5b', '#9fbae4'];
const IDLE_DUCKS = [
  { id: 'idle-1', name: 'Ready' },
  { id: 'idle-2', name: 'Set' },
  { id: 'idle-3', name: 'Wind' },
  { id: 'idle-4', name: 'Go' },
];

const elements = {
  app: document.querySelector('.toybox-app'),
  form: document.querySelector('#race-form'),
  drawer: document.querySelector('#race-crate'),
  entrants: document.querySelector('#entrants'),
  entrantCount: document.querySelector('#entrant-count'),
  rosterChips: document.querySelector('#roster-chips'),
  course: document.querySelector('#course'),
  formMessage: document.querySelector('#form-message'),
  start: document.querySelector('#start-race'),
  reset: document.querySelector('#reset-race'),
  proofText: document.querySelector('#proof-text'),
  proofTicket: document.querySelector('#proof-ticket'),
  stage: document.querySelector('#toy-stage'),
  placard: document.querySelector('#stage-placard'),
  placardKicker: document.querySelector('#placard-kicker'),
  placardTitle: document.querySelector('#placard-title'),
  placardCopy: document.querySelector('#placard-copy'),
  lanes: document.querySelector('#lanes'),
  clock: document.querySelector('#race-clock'),
  courseState: document.querySelector('#course-state'),
  packStatus: document.querySelector('#pack-status'),
  burst: document.querySelector('#ribbon-burst'),
  winnerAnnouncement: document.querySelector('#winner-announcement'),
  winnerAnnouncementName: document.querySelector('#winner-announcement-name'),
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
  countdownTimer: 0,
  placardTimer: 0,
  startedAt: 0,
  activeBeat: 'setup',
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

function updateRosterPreview() {
  const entrants = parseEntrants(elements.entrants.value);
  elements.entrantCount.textContent = `${entrants.length} DUCK${entrants.length === 1 ? '' : 'S'}`;
  elements.rosterChips.innerHTML = entrants.length
    ? entrants.map((entrant, index) => `<span class="roster-chip" style="--chip-color:${DUCK_COLORS[index % DUCK_COLORS.length]}"><b>${escapeHtml(entrant.name.slice(0, 1).toUpperCase())}</b>${escapeHtml(entrant.name)}</span>`).join('')
    : '<span class="roster-empty">Your duck tags appear here.</span>';
  if (state.phase === 'setup') mountIdleDucks(entrants);
}

function showFormMessage(message = '') {
  elements.formMessage.textContent = message;
}

function validateEntrants(entrants) {
  if (entrants.length === 0) return 'Add at least two named ducks before winding up.';
  if (entrants.length === 1) return 'Add one more named duck before winding up.';
  if (entrants.length > 12) return 'Use no more than 12 named ducks in one race.';
  return '';
}

function formatTime(fraction) {
  const seconds = Math.min(Math.floor(fraction * RACE_DURATION_MS / 1000), Math.floor(RACE_DURATION_MS / 1000));
  return `00:${String(seconds).padStart(2, '0')}`;
}

function duckMarkup(entrant, index, scale) {
  const color = DUCK_COLORS[index % DUCK_COLORS.length];
  const initial = entrant.name.slice(0, 1).toUpperCase();
  return `<div class="lane" data-lane="${entrant.id}">
    <div class="duck-runner" data-duck="${entrant.id}" style="--duck-color:${color}; --duck-scale:${scale}; left:13%" aria-label="${escapeHtml(entrant.name)} duck">
      <span class="duck-wake"></span><span class="duck-body"><i></i></span><span class="duck-head"><i class="duck-eye"></i><i class="duck-cheek"></i></span><span class="duck-bill"></span><span class="duck-bib">${escapeHtml(initial)}</span><span class="duck-tag">${escapeHtml(entrant.name)}</span>
    </div>
  </div>`;
}

function mountLanes(entrants) {
  const scale = entrants.length > 8 ? 0.66 : entrants.length > 5 ? 0.78 : 1;
  elements.lanes.style.setProperty('--duck-count', entrants.length);
  elements.lanes.innerHTML = entrants.map((entrant, index) => duckMarkup(entrant, index, scale)).join('');
}

function mountIdleDucks(entrants) {
  const visibleDucks = entrants.length >= 2 ? entrants.slice(0, 4) : IDLE_DUCKS;
  mountLanes(visibleDucks);
}

function eventKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const EVENT_REPORTS = {
  'Cross-current': 'Desk fan whoosh! Paper-water ribbons sweep sideways.',
  'Reed slalom': 'Foam reeds pop up on springs across the river mat.',
  'Splash zone': 'The squeeze bulb sends cardboard droplets over a lane.',
  'River ripple': 'The crank wheel presses ripples through the blue mat.',
  'Cheering bank': 'Pegboard spectators raise their painted signs.',
  'Driftwood gate': 'Chunky toy logs swing into a temporary gate.',
};

function setStageBeat(key, event = null) {
  elements.stage.dataset.stageEvent = key;
  if (event) {
    const lane = state.race.entrants.findIndex((duck) => duck.id === event.duckId);
    const laneCenter = 37 + ((Math.max(lane, 0) + 0.5) / state.race.entrants.length) * 54;
    elements.stage.style.setProperty('--event-lane', String(Math.max(lane, 0)));
    elements.stage.style.setProperty('--event-lane-top', `${laneCenter}%`);
  } else {
    elements.stage.style.removeProperty('--event-lane');
    elements.stage.style.removeProperty('--event-lane-top');
  }
}

function showPlacard(kicker, title, copy, clearAfter = 0) {
  window.clearTimeout(state.placardTimer);
  elements.placardKicker.textContent = kicker;
  elements.placardTitle.textContent = title;
  elements.placardCopy.textContent = copy;
  elements.placard.classList.remove('placard-cleared');
  if (clearAfter) {
    state.placardTimer = window.setTimeout(() => {
      elements.placard.classList.add('placard-cleared');
    }, clearAfter);
  }
}

function updateRaceBeat(fraction) {
  const activeEvent = state.story.events.filter((event) => event.at <= fraction).at(-1);
  const beat = fraction >= 0.72
    ? { key: 'final-bend', kicker: 'FINAL BEND', title: 'The finish ramp rises!', message: 'Nobody is clear as the ribbon gets close.' }
    : activeEvent
      ? {
        key: eventKey(activeEvent.title),
        kicker: 'TOYBOX BEAT',
        title: activeEvent.title,
        message: EVENT_REPORTS[activeEvent.title] ?? 'The toy river changes shape around the pack.',
        event: activeEvent,
      }
      : { key: 'locked', kicker: 'TICKET SEALED', title: 'The river starts to wobble', message: 'The pack stays close at the starting reeds.' };

  if (state.activeBeat === beat.key) return;
  state.activeBeat = beat.key;
  setStageBeat(beat.key, beat.event);
  showPlacard(beat.kicker, beat.title, beat.message, beat.event ? 2200 : 0);
  if (beat.event) elements.live.textContent = `${beat.title}. ${beat.message}`;
}

function renderPositions(fraction) {
  const positions = getRacePositions(state.race, state.story, fraction);
  for (const duck of positions) {
    const node = elements.lanes.querySelector(`[data-duck="${duck.id}"]`);
    if (!node) continue;
    node.style.left = `${13 + duck.progress * 78}%`;
  }
}

function updatePackStatus(fraction) {
  const status = fraction < 0.3
    ? 'The pack bobs away from the reeds.'
    : fraction < 0.5
      ? 'The spring current wobbles everyone.'
      : fraction < 0.72
        ? 'Nobody is clear.'
        : 'The pack bunches at the ribbon.';
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

function runCountdown(step = 0) {
  const countdown = [
    { state: 'winding', kicker: 'WIND', title: 'Key turns…', copy: 'The little spring winds tight.' },
    { state: 'compressed', kicker: 'SNAP', title: 'Spring compresses…', copy: 'The starting gate is ready to pop.' },
    { state: 'gate-open', kicker: 'GO', title: 'Gate lifts!', copy: 'The sealed toy story starts now.' },
  ];
  const current = countdown[step];
  elements.stage.dataset.launchState = current.state;
  showPlacard(current.kicker, current.title, current.copy);
  elements.packStatus.textContent = current.copy;
  elements.live.textContent = `${current.title} ${current.copy}`;

  if (step < countdown.length - 1) {
    state.countdownTimer = window.setTimeout(() => runCountdown(step + 1), COUNTDOWN_STEP_MS);
  } else {
    state.countdownTimer = window.setTimeout(beginRace, COUNTDOWN_STEP_MS);
  }
}

function beginRace() {
  state.phase = 'running';
  state.startedAt = performance.now();
  state.activeBeat = 'countdown';
  elements.stage.dataset.launchState = 'racing';
  elements.packStatus.textContent = 'The pack bobs away from the reeds.';
  elements.live.textContent = 'The gate lifted. The fair race is underway.';
  state.frame = window.requestAnimationFrame(tick);
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
  state.phase = 'countdown';
  state.activeBeat = 'countdown';

  mountLanes(entrants);
  renderPositions(0);
  setStageBeat('locked');
  elements.proofText.textContent = `SEALED · SHA-256 ${state.race.commitment.slice(0, 16)}…`;
  elements.proofTicket.classList.add('ticket-locked');
  elements.courseState.textContent = elements.course.value === 'random'
    ? 'RANDOM · VISUAL ROUTE ONLY'
    : 'TANGLEWATER · VISUAL ROUTE';
  elements.clock.textContent = '00:00';
  elements.resultCard.classList.add('hidden');
  elements.winnerAnnouncement.classList.add('hidden');
  elements.burst.classList.remove('bursting');
  elements.verificationStatus.textContent = '';
  elements.drawer.inert = true;
  elements.app.classList.add('race-launched');
  elements.live.textContent = 'Fair result sealed before the countdown.';
  runCountdown();
}

async function completeRace() {
  state.phase = 'finished';
  window.clearTimeout(state.placardTimer);
  const winnerNode = elements.lanes.querySelector(`[data-duck="${state.race.winner.id}"]`);
  winnerNode?.setAttribute('data-finished', 'true');
  setStageBeat('finish');
  elements.stage.dataset.launchState = 'finished';
  showPlacard('RIBBON BURST', `${state.race.winner.name} takes the ribbon!`, 'The sealed ticket can now be unfolded.');
  elements.packStatus.textContent = 'The river mat settles after a very close finish.';
  elements.resultTitle.textContent = `${state.race.winner.name} wins the toybox ribbon!`;
  elements.resultText.textContent = 'This name was committed before the key turned. Unfold the ticket to check the proof locally.';
  elements.winnerAnnouncementName.textContent = state.race.winner.name;
  elements.winnerAnnouncement.classList.remove('hidden');
  elements.proofReveal.textContent = `seed ${state.race.seed} · SHA-256 ${state.race.commitment}`;
  elements.resultCard.classList.remove('hidden');
  elements.burst.classList.add('bursting');
  elements.start.disabled = false;
  elements.proofText.textContent = 'TICKET OPEN · result and proof revealed';
  elements.proofTicket.classList.remove('ticket-locked');
  elements.live.textContent = `${state.race.winner.name} won the toybox ribbon. The ticket is ready for verification.`;
}

function resetRace() {
  window.cancelAnimationFrame(state.frame);
  window.clearTimeout(state.countdownTimer);
  window.clearTimeout(state.placardTimer);
  state = {
    phase: 'setup', race: null, story: null, frame: 0, countdownTimer: 0, placardTimer: 0, startedAt: 0, activeBeat: 'setup',
  };
  elements.stage.dataset.launchState = 'resting';
  setStageBeat('setup');
  elements.proofText.textContent = 'SEALED TICKET · waiting to wind';
  elements.proofTicket.classList.remove('ticket-locked');
  showPlacard('READY', 'Open the race crate', 'Set the ducks loose on the river mat.');
  elements.lanes.innerHTML = '';
  mountIdleDucks(parseEntrants(elements.entrants.value));
  elements.clock.textContent = '00:00';
  elements.courseState.textContent = elements.course.value === 'random'
    ? 'RANDOM · VISUAL ROUTE ONLY'
    : 'TANGLEWATER · VISUAL ROUTE';
  elements.packStatus.textContent = 'The playset is ready.';
  elements.resultCard.classList.add('hidden');
  elements.winnerAnnouncement.classList.add('hidden');
  elements.winnerAnnouncementName.textContent = '—';
  elements.burst.classList.remove('bursting');
  elements.drawer.inert = false;
  elements.app.classList.remove('race-launched');
  elements.entrants.focus();
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (state.phase === 'setup') startRace();
});
elements.entrants.addEventListener('input', updateRosterPreview);
elements.course.addEventListener('change', () => {
  if (state.phase === 'setup') {
    elements.courseState.textContent = elements.course.value === 'random'
      ? 'RANDOM · VISUAL ROUTE ONLY'
      : 'TANGLEWATER · VISUAL ROUTE';
  }
});
elements.reset.addEventListener('click', resetRace);
elements.verify.addEventListener('click', async () => {
  const verified = await verifyRaceProof(state.race);
  elements.verificationStatus.textContent = verified
    ? 'Verified — the revealed seed and winner reproduce this ticket.'
    : 'This ticket could not be verified.';
  elements.live.textContent = elements.verificationStatus.textContent;
});

updateRosterPreview();
