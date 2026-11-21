import { dictionaries } from './i18n.js';
import {
  state, save, MODES, MODE_ORDER, LONG_REST_EVERY, EXTRA_MINUTES_MAX, COUNTDOWN_SECONDS,
  awardFor, addReward, rewardsByDay, stats, todayTomatoes, resetHistory, dateKey,
} from './store.js';
import * as audio from './audio.js';
import { icons, awardIcons } from './icons.js';

// ---------- общие помощники ----------

const $ = (sel) => document.querySelector(sel);
const t = (key) => dictionaries[state.settings.lang][key];
const S = () => state.settings;

const ACCENT = {
  cherry: '#F45B45',
  plum: '#EE6A3C',
  yellow: '#F2B630',
  oxheart: '#E8676F',
};
const REST_COLOR = '#568B4D';

const POSES = ['wave', 'think', 'write', 'read', 'dance', 'relax', 'jump'];
const charSrc = (mode, pose) => `assets/characters/${mode}/${pose}.webp`;

function preload(mode) {
  POSES.forEach((p) => { const i = new Image(); i.src = charSrc(mode, p); });
}

// Цвет кнопок под сорт. На жёлтом белый текст плохо читается — там текст тёмный.
function paintAccent(el, mode) {
  el.style.setProperty('--accent', ACCENT[mode]);
  el.style.setProperty('--on-accent', mode === 'yellow' ? '#263B59' : '#FFFFFF');
}

function fmt(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function vibrate(pattern) {
  if (S().vibration && navigator.vibrate) navigator.vibrate(pattern);
}

// ---------- экраны и вкладки ----------

let tab = 'timer';
let timerScreen = 'home'; // home | session | reward

function showScreen() {
  const id = tab === 'timer' ? timerScreen : tab;
  document.querySelectorAll('.screen').forEach((el) => { el.hidden = el.id !== `screen-${id}`; });
  document.querySelectorAll('.tab').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === tab);
    el.setAttribute('aria-current', el.dataset.tab === tab ? 'page' : 'false');
  });
  if (id === 'home') renderHome();
  if (id === 'rewards') renderRewards();
  if (id === 'settings') renderSettings();
  if (id === 'session') renderSession();
  window.scrollTo(0, 0);
}

function setTab(next) {
  tab = next;
  showScreen();
}

// ---------- тексты ----------

function applyTexts() {
  document.documentElement.lang = S().lang;
  document.title = t('appName');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n);
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel));
  });
  const tabs = { timer: ['timer', 'tabTimer'], rewards: ['trophy', 'tabRewards'], settings: ['gear', 'tabSettings'] };
  document.querySelectorAll('.tab').forEach((el) => {
    const [ic, key] = tabs[el.dataset.tab];
    el.innerHTML = `${icons[ic]}<span>${t(key)}</span>`;
  });
  $('#btn-exit').innerHTML = icons.close;
  $('#sheet-close').innerHTML = icons.close;
  $('#sheet-close').setAttribute('aria-label', 'OK');
  $('#cal-prev').innerHTML = icons.back;
  $('#cal-next').innerHTML = icons.next;
  $('#cal-prev').setAttribute('aria-label', t('prevMonth'));
  $('#cal-next').setAttribute('aria-label', t('nextMonth'));
}

// ---------- главный экран ----------

function renderHome() {
  const grid = $('#mode-grid');
  grid.innerHTML = '';
  for (const mode of MODE_ORDER) {
    const { work, rest } = MODES[mode];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mode-card';
    b.style.setProperty('--accent', ACCENT[mode]);
    b.dataset.mode = mode;
    b.setAttribute('aria-pressed', String(S().lastMode === mode));
    b.innerHTML = `
      <span class="mode-pic"><img src="${charSrc(mode, 'wave')}" alt="" draggable="false"></span>
      <span class="mode-label">${t('varieties')[mode]}</span>
      <span class="mode-minutes"><b>${work}</b> ${S().lang === 'ru' ? 'мин' : 'min'}</span>
      <span class="mode-sub">${t('restShort')(rest)}</span>`;
    b.addEventListener('click', () => {
      S().lastMode = mode;
      save();
      grid.querySelectorAll('.mode-card').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      paintAccent($('#btn-start'), mode);
    });
    grid.appendChild(b);
  }
  paintAccent($('#btn-start'), S().lastMode);
  $('#today').textContent = t('todayDone')(todayTomatoes());
}

// ---------- персонаж ----------

const char = {
  el: null,
  imgs: [],
  front: 0,
  pose: null,
  mirror: false,
  timer: null,
  set(mode, pose, mirror = false) {
    if (this.pose === pose && this.mirror === mirror && this.mode === mode) return;
    this.mode = mode; this.pose = pose; this.mirror = mirror;
    const back = this.imgs[1 - this.front];
    const front = this.imgs[this.front];
    back.src = charSrc(mode, pose);
    back.classList.toggle('mirror', mirror);
    const swap = () => {
      back.classList.add('show');
      front.classList.remove('show');
      this.front = 1 - this.front;
    };
    if (back.complete) swap(); else back.onload = swap;
    this.el.dataset.pose = pose;
  },
  stop() { clearTimeout(this.timer); this.timer = null; },
};

// Смена поз во время работы и отдыха
function scheduleWorkPoses(mode) {
  char.stop();
  const seq = ['write', 'read', 'write', 'think'];
  let i = 0;
  const step = () => {
    char.set(mode, seq[i % seq.length]);
    i += 1;
    const ms = (seq[(i - 1) % seq.length] === 'think' ? 9000 : 18000) + Math.random() * 10000;
    char.timer = setTimeout(step, ms);
  };
  step();
}

function scheduleRestPoses(mode) {
  char.stop();
  const seq = [['dance', false, 6000], ['dance', true, 6000], ['dance', false, 6000], ['relax', false, 9000]];
  let i = 0;
  const step = () => {
    const [pose, mirror, ms] = seq[i % seq.length];
    char.set(mode, pose, mirror);
    if (pose === 'relax' && S().whistle) setTimeout(() => audio.whistle(), 700);
    renderNotes(pose === 'dance' || pose === 'relax');
    i += 1;
    char.timer = setTimeout(step, ms);
  };
  step();
}

function renderNotes(on) {
  const box = $('#notes');
  if (!on || S().motion !== 'full') { box.innerHTML = ''; return; }
  if (box.childElementCount) return;
  box.innerHTML = Array.from({ length: 4 }, (_, i) =>
    `<span class="note n${i}">${icons.note}</span>`).join('');
}

// ---------- сессия (логика таймера) ----------
//
// Этапы: work → await («Готов отдохнуть?», ждёт нажатия) → rest → countdown (10…0) → work …
// Время считается от отметок времени, поэтому таймер точен даже если вкладка «засыпала».

let session = state.session;
let loop = null;

function workMs(mode) { return MODES[mode].work * 60000; }
function restMs(mode, long) { return MODES[mode].rest * 60000 * (long ? 2 : 1); }

function startSession(mode) {
  audio.unlock();
  session = state.session = {
    mode,
    phase: 'work',
    phaseEnd: Date.now() + workMs(mode),
    phaseDuration: workMs(mode),
    pausedLeft: null,
    cycles: 0,
    workMs: 0,
    extraUsed: 0,
    long: false,
    startedAt: Date.now(),
  };
  save();
  preload(mode);
  timerScreen = 'session';
  setTab('timer');
  enterPhaseEffects(true);
  audio.chimeGo();
}

function setPhase(phase, duration, from = Date.now()) {
  session.phase = phase;
  session.phaseDuration = duration;
  session.phaseEnd = duration == null ? null : from + duration;
  session.pausedLeft = null;
  save();
}

// Переходы по таймеру. Возвращает true, если этап сменился.
function advance(now) {
  if (!session || session.pausedLeft != null || session.phaseEnd == null) return false;
  if (now < session.phaseEnd) return false;
  const end = session.phaseEnd;
  if (session.phase === 'work') {
    session.cycles += 1;
    session.workMs += session.phaseDuration;
    setPhase('await', null);
    audio.chimeWorkEnd();
    vibrate([200, 120, 200]);
  } else if (session.phase === 'rest') {
    setPhase('countdown', COUNTDOWN_SECONDS * 1000, end);
    vibrate(120);
  } else if (session.phase === 'countdown') {
    setPhase('work', workMs(session.mode), end);
    audio.chimeGo();
    vibrate([80, 80, 80]);
  }
  return true;
}

function startRest() {
  audio.unlock();
  session.long = session.cycles > 0 && session.cycles % LONG_REST_EVERY === 0;
  session.extraUsed = 0;
  setPhase('rest', restMs(session.mode, session.long));
  enterPhaseEffects();
}

function oneMoreMinute() {
  if (session.extraUsed >= EXTRA_MINUTES_MAX) return;
  session.extraUsed += 1;
  setPhase('rest', 60000);
  enterPhaseEffects();
}

function togglePause() {
  audio.unlock();
  if (!session) return;
  if (session.pausedLeft != null) {
    session.phaseEnd = Date.now() + session.pausedLeft;
    session.pausedLeft = null;
  } else {
    if (session.phase !== 'work' && session.phase !== 'rest') return;
    session.pausedLeft = Math.max(0, session.phaseEnd - Date.now());
  }
  save();
  enterPhaseEffects();
}

function finishSession() {
  if (!session) return;
  let ms = session.workMs;
  if (session.phase === 'work') {
    const left = session.pausedLeft != null ? session.pausedLeft : Math.max(0, session.phaseEnd - Date.now());
    ms += session.phaseDuration - left;
  }
  const minutes = Math.round(ms / 60000);
  const award = awardFor(session.cycles);
  const result = { award, cycles: session.cycles, minutes, mode: session.mode };
  addReward(result);
  endSession();
  showReward(result);
}

function endSession() {
  session = state.session = null;
  save();
  char.stop();
  audio.stopAll();
  releaseWakeLock();
  renderNotes(false);
}

// Звук, поза, экран — под текущий этап
function enterPhaseEffects() {
  if (!session) return;
  const { phase, mode } = session;
  const paused = session.pausedLeft != null;
  document.body.dataset.phase = paused ? 'paused' : phase;
  syncSounds();
  requestWakeLock();

  if (paused) {
    char.stop();
    char.set(mode, 'think');
    renderNotes(false);
  } else if (phase === 'work') {
    scheduleWorkPoses(mode);
    renderNotes(false);
  } else if (phase === 'await') {
    char.stop();
    char.set(mode, 'wave');
    renderNotes(false);
  } else if (phase === 'rest') {
    scheduleRestPoses(mode);
  } else if (phase === 'countdown') {
    char.stop();
    char.set(mode, 'wave');
    renderNotes(false);
  }
  renderSession();
}

function syncSounds() {
  if (!session || session.pausedLeft != null) {
    audio.playBackground('off');
    audio.playRest('off');
    return;
  }
  const { phase } = session;
  const wantBg = (phase === 'work' || phase === 'await') ? S().bgSound : 'off';
  const wantRest = (phase === 'rest' || phase === 'countdown') ? S().restMusic : 'off';
  if (audio.currentBackground() !== wantBg) audio.playBackground(wantBg);
  if (audio.currentRest() !== wantRest) audio.playRest(wantRest);
}

// ---------- экран сессии ----------

let lastCountdownSec = null;

function renderSession() {
  if (!session) return;
  const { mode, phase, cycles } = session;
  const paused = session.pausedLeft != null;
  const accent = (phase === 'rest' || phase === 'countdown') ? REST_COLOR : ACCENT[mode];
  const screen = $('#screen-session');
  screen.style.setProperty('--accent', accent);
  screen.style.setProperty('--on-accent', '#FFFFFF');
  screen.style.setProperty('--mode-accent', ACCENT[mode]);

  $('#session-mode').textContent = t('varieties')[mode];
  $('#tomato-count').textContent = `🍅 ${cycles}`;
  $('#tomato-count').setAttribute('aria-label', t('tomatoesDone')(cycles));

  // точки цикла: 4 помидорки до большого отдыха
  const inSet = phase === 'work' ? cycles % LONG_REST_EVERY : ((cycles - 1) % LONG_REST_EVERY) + 1;
  const dots = $('#cycle-dots');
  dots.innerHTML = Array.from({ length: LONG_REST_EVERY }, (_, i) => {
    const cls = i < inSet ? 'dot on' : (phase === 'work' && i === inSet ? 'dot now' : 'dot');
    return `<span class="${cls}"></span>`;
  }).join('');

  let label = t('phaseWork');
  if (phase === 'await') label = t('phaseAwait');
  if (phase === 'rest' || phase === 'countdown') label = session.long ? t('phaseLongRest') : t('phaseRest');
  if (paused) label = t('phasePaused');
  $('#phase').textContent = label;

  $('#btn-pause').innerHTML = paused ? `${icons.play}<span>${t('resume')}</span>` : `${icons.pause}<span>${t('pause')}</span>`;
  $('#btn-pause').hidden = !(phase === 'work' || phase === 'rest');
  const bgOn = S().bgSound !== 'off';
  $('#btn-sound').innerHTML = `${bgOn ? icons.sound : icons.soundOff}<span>${t('sound')}</span>`;
  $('#btn-sound').hidden = phase !== 'work' && phase !== 'await';

  $('#controls').hidden = phase === 'await' || phase === 'countdown';
  $('#await-panel').hidden = phase !== 'await';
  $('#time').hidden = phase === 'await';
  $('#countdown').hidden = phase !== 'countdown';

  const more = $('#btn-more');
  const left = EXTRA_MINUTES_MAX - session.extraUsed;
  more.hidden = left <= 0;
  more.innerHTML = `${icons.plus}<span>${t('oneMoreMinute')}</span><small>${t('minutesLeft')(left)}</small>`;

  tickUI();
}

function tickUI() {
  if (!session) return;
  const now = Date.now();
  const paused = session.pausedLeft != null;
  const left = paused ? session.pausedLeft : (session.phaseEnd == null ? 0 : session.phaseEnd - now);
  $('#time').textContent = fmt(left);
  const ring = $('#ring-fg');
  const C = 2 * Math.PI * 90;
  let progress = 1;
  if (session.phaseDuration) progress = Math.min(1, Math.max(0, left / session.phaseDuration));
  if (session.phase === 'await') progress = 0;
  ring.style.strokeDasharray = `${C}`;
  ring.style.strokeDashoffset = `${C * (1 - progress)}`;

  if (session.phase === 'countdown') {
    const sec = Math.max(0, Math.ceil(left / 1000));
    $('#countdown-num').textContent = String(sec);
    if (sec !== lastCountdownSec) {
      lastCountdownSec = sec;
      if (S().ticks && sec <= COUNTDOWN_SECONDS && sec > 0) audio.tick(false);
      const num = $('#countdown-num');
      num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
    }
  } else {
    lastCountdownSec = null;
  }
}

function startLoop() {
  if (loop) return;
  loop = setInterval(() => {
    if (!session) return;
    let changed = false;
    // догоняем пропущенные этапы (например, если планшет «спал»)
    for (let i = 0; i < 6 && advance(Date.now()); i++) changed = true;
    if (changed) enterPhaseEffects();
    else if (timerScreen === 'session' && tab === 'timer') tickUI();
  }, 250);
}

// ---------- награда ----------

function showReward(result) {
  timerScreen = 'reward';
  setTab('timer');
  const { award, cycles, minutes, mode } = result;
  $('#reward-char img').src = charSrc(mode, 'jump');
  $('#reward-badge').innerHTML = awardIcons[award];
  $('#reward-title').textContent = t('awards')[award].title;
  $('#reward-summary').textContent = t('rewardSummary')(cycles, minutes);
  paintAccent($('#screen-reward'), mode);
  audio.unlock();
  audio.fanfare();
  vibrate([60, 60, 60, 60, 160]);
  confetti();
}

function confetti() {
  const box = $('#confetti');
  box.innerHTML = '';
  if (S().motion !== 'full') return;
  const colors = ['#F45B45', '#F5C84B', '#E98B91', '#568B4D', '#263B59'];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span');
    s.style.left = `${Math.random() * 100}%`;
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = `${Math.random() * 0.8}s`;
    s.style.animationDuration = `${2.4 + Math.random() * 1.6}s`;
    s.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    s.style.setProperty('--x', `${Math.random() * 120 - 60}px`);
    if (i % 3 === 0) s.classList.add('round');
    box.appendChild(s);
  }
  setTimeout(() => { box.innerHTML = ''; }, 5000);
}

// ---------- календарь наград ----------

let calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();

function renderRewards() {
  const st = stats();
  $('#stats').innerHTML = [
    ['🍅', st.tomatoes, t('statTomatoes')],
    ['⏱', st.minutes, t('statMinutes')],
    ['🏅', st.awards, t('statAwards')],
    ['🔥', st.streak, t('statStreak')],
  ].map(([e, n, l]) => `<div class="stat card"><span class="stat-emoji" aria-hidden="true">${e}</span><b class="stat-num">${n}</b><span class="stat-label">${l}</span></div>`).join('');

  $('#cal-month').textContent = `${t('months')[calMonth.getMonth()]} ${calMonth.getFullYear()}`;
  const now = new Date();
  $('#cal-next').disabled = calMonth.getFullYear() === now.getFullYear() && calMonth.getMonth() === now.getMonth();

  const byDay = rewardsByDay();
  const grid = $('#cal-grid');
  const first = new Date(calMonth);
  const offset = (first.getDay() + 6) % 7; // понедельник — первый день
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const today = dateKey();
  let html = t('weekdays').map((w) => `<div class="cal-wd">${w}</div>`).join('');
  for (let i = 0; i < offset; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(new Date(first.getFullYear(), first.getMonth(), d));
    const rec = byDay.get(key);
    let inner = '';
    let label = `${d}`;
    if (rec) {
      inner = ['marathon', 'strong', 'lightning'].filter((a) => rec[a] > 0).map((a) =>
        `<span class="cal-award">${awardIcons[a]}${rec[a] > 1 ? `<span class="cal-count">${rec[a]}</span>` : ''}</span>`).join('');
      label += ': ' + ['marathon', 'strong', 'lightning'].filter((a) => rec[a] > 0)
        .map((a) => `${t('awards')[a].title} ×${rec[a]}`).join(', ');
    }
    html += `<div class="cal-day${key === today ? ' today' : ''}${rec ? ' has' : ''}" aria-label="${label}">
      <span class="cal-num">${d}</span><span class="cal-awards">${inner}</span></div>`;
  }
  grid.innerHTML = html;

  $('#legend').innerHTML = ['lightning', 'strong', 'marathon'].map((a) =>
    `<div class="legend-item card">${awardIcons[a]}<div><b>${t('awards')[a].title}</b><span>${t('awards')[a].rule}</span></div></div>`).join('');
}

// ---------- настройки ----------

function bgOptions() {
  const opts = [['off', t('bgOff')], ['rain', t('bgRain')], ['white', t('bgWhite')], ['brown', t('bgBrown')]];
  if (audio.availableFiles.has('lofi')) opts.push(['lofi', t('bgLofi')]);
  if (audio.availableFiles.has('fire')) opts.push(['fire', t('bgFire')]);
  return opts;
}

function restOptions() {
  const opts = [['off', t('restOff')], ['synth', t('restSynth')]];
  if (audio.availableFiles.has('dance')) opts.push(['file', t('restFile')]);
  return opts;
}

const chips = (name, options, value) => `
  <div class="chips" role="radiogroup" data-name="${name}">
    ${options.map(([v, l]) => `<button type="button" role="radio" class="chip" data-value="${v}" aria-checked="${v === value}">${l}</button>`).join('')}
  </div>`;

const toggle = (name, label, hint, value) => `
  <label class="row toggle-row">
    <span class="row-text"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</span>
    <input type="checkbox" class="switch" data-name="${name}" ${value ? 'checked' : ''}>
  </label>`;

const slider = (name, label, value) => `
  <label class="row slider-row">
    <span class="row-text"><span>${label}</span></span>
    <input type="range" min="0" max="1" step="0.05" value="${value}" data-name="${name}">
  </label>`;

function renderSettings() {
  const s = S();
  $('#settings').innerHTML = `
    <div class="card section">
      <h2>${t('secLanguage')}</h2>
      ${chips('lang', [['ru', 'Русский'], ['en', 'English']], s.lang)}
    </div>

    <div class="card section">
      <h2>${t('secSound')}</h2>
      <div class="field"><div class="field-label">${t('bgSound')}</div>${chips('bgSound', bgOptions(), s.bgSound)}</div>
      ${slider('bgVolume', t('bgVolume'), s.bgVolume)}
      <div class="field"><div class="field-label">${t('restMusic')}</div>${chips('restMusic', restOptions(), s.restMusic)}</div>
      ${toggle('whistle', t('whistle'), '', s.whistle)}
      ${toggle('signals', t('signals'), t('signalsHint'), s.signals)}
      ${slider('signalVolume', t('signalVolume'), s.signalVolume)}
      ${toggle('ticks', t('ticks'), '', s.ticks)}
    </div>

    <div class="card section">
      <h2>${t('secSensory')}</h2>
      <div class="field"><div class="field-label">${t('motion')}</div>
        ${chips('motion', [['full', t('motionFull')], ['calm', t('motionCalm')], ['off', t('motionOff')]], s.motion)}
        <small class="field-hint">${t('motionHint')}</small>
      </div>
      ${toggle('vibration', t('vibration'), t('vibrationHint'), s.vibration)}
    </div>

    <div class="card section">
      <h2>${t('secScreen')}</h2>
      ${toggle('wakeLock', t('wakeLock'), t('wakeLockHint'), s.wakeLock)}
      <details class="install"><summary>${t('install')}</summary><p>${t('installText')}</p></details>
    </div>

    <div class="card section">
      <h2>${t('secData')}</h2>
      <button type="button" class="btn btn-danger" id="btn-reset">${t('resetData')}</button>
    </div>`;
}

function onSettingChange(name, value) {
  const s = S();
  s[name] = value;
  save();
  if (name === 'lang') {
    applyTexts();
    renderSettings();
    return;
  }
  if (name === 'motion') applyMotion();
  if (name === 'bgVolume' || name === 'signalVolume' || name === 'signals') {
    audio.configure({ bgVolume: s.bgVolume, signalVolume: s.signalVolume, signals: s.signals });
  }
  if (name === 'signalVolume' || (name === 'signals' && value)) audio.chimeGo();
  if (name === 'bgSound' || name === 'restMusic') previewSound(name, value);
  if (name === 'wakeLock') value ? requestWakeLock() : releaseWakeLock();
}

let previewTimer = null;
function previewSound(name, value) {
  audio.unlock();
  clearTimeout(previewTimer);
  const inSessionPhase = session && session.pausedLeft == null;
  const relevant = inSessionPhase && (
    (name === 'bgSound' && (session.phase === 'work' || session.phase === 'await')) ||
    (name === 'restMusic' && (session.phase === 'rest' || session.phase === 'countdown')));
  if (relevant) { syncSounds(); return; }
  // короткое прослушивание
  if (name === 'bgSound') { audio.playRest('off'); audio.playBackground(value); }
  else { audio.playBackground('off'); audio.playRest(value); }
  previewTimer = setTimeout(() => {
    if (session) syncSounds(); else audio.stopAll();
  }, 5000);
}

function applyMotion() {
  document.body.classList.remove('motion-full', 'motion-calm', 'motion-off');
  document.body.classList.add(`motion-${S().motion}`);
  if (session) renderNotes(session.phase === 'rest');
}

// ---------- быстрый выбор звука в сессии ----------

function openSoundSheet() {
  audio.unlock();
  const body = $('#sheet-body');
  body.innerHTML = `${chips('bgSound', bgOptions(), S().bgSound)}${slider('bgVolume', t('bgVolume'), S().bgVolume)}`;
  $('#sheet').hidden = false;
}

// ---------- модальное окно ----------

function confirmDialog({ title, text = '', yes, no, pose = 'think', danger = false }) {
  return new Promise((resolve) => {
    const m = $('#modal');
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    $('#modal-text').hidden = !text;
    const mode = session ? session.mode : S().lastMode;
    $('#modal-char').innerHTML = `<img src="${charSrc(mode, pose)}" alt="">`;
    const y = $('#modal-yes'), n = $('#modal-no');
    y.textContent = yes; n.textContent = no;
    y.className = `btn btn-lg ${danger ? 'btn-danger' : 'btn-green'}`;
    m.hidden = false;
    n.focus();
    const done = (v) => {
      m.hidden = true;
      y.onclick = n.onclick = null;
      resolve(v);
    };
    y.onclick = () => done(true);
    n.onclick = () => done(false);
  });
}

// ---------- экран не гаснет ----------

let wakeLock = null;
async function requestWakeLock() {
  if (!S().wakeLock || !session || !('wakeLock' in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { /* браузер не разрешил */ }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

// ---------- события ----------

function bind() {
  // первое касание разблокирует звук (требование iOS/Android)
  const unlockOnce = () => {
    audio.unlock();
    if (session) syncSounds();
  };
  document.addEventListener('pointerdown', unlockOnce, { once: true });

  document.querySelectorAll('.tab').forEach((el) => el.addEventListener('click', () => {
    if (el.dataset.tab === 'timer' && timerScreen === 'reward') timerScreen = session ? 'session' : 'home';
    setTab(el.dataset.tab);
  }));

  $('#btn-start').addEventListener('click', () => startSession(S().lastMode));
  $('#btn-pause').addEventListener('click', togglePause);
  $('#btn-sound').addEventListener('click', openSoundSheet);
  $('#btn-ready').addEventListener('click', startRest);
  $('#btn-more').addEventListener('click', oneMoreMinute);

  $('#btn-done').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: t('confirmDoneTitle'), yes: t('confirmDoneYes'), no: t('confirmDoneNo'), pose: 'think',
    });
    if (ok) finishSession();
  });

  $('#btn-exit').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: t('confirmExitTitle'), text: t('confirmExitText'),
      yes: t('confirmExitYes'), no: t('confirmExitNo'), pose: 'think', danger: true,
    });
    if (ok) {
      endSession();
      timerScreen = 'home';
      setTab('timer');
    }
  });

  $('#btn-to-calendar').addEventListener('click', () => {
    timerScreen = 'home';
    calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
    setTab('rewards');
  });
  $('#btn-reward-home').addEventListener('click', () => { timerScreen = 'home'; setTab('timer'); });

  $('#cal-prev').addEventListener('click', () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderRewards();
  });
  $('#cal-next').addEventListener('click', () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderRewards();
  });

  // настройки и шторка звука: общий обработчик
  const handler = (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      const group = chip.closest('.chips');
      group.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
      onSettingChange(group.dataset.name, chip.dataset.value);
      if (session) renderSession();
      return;
    }
    if (e.target.id === 'btn-reset') {
      confirmDialog({
        title: t('resetConfirmTitle'), text: t('resetConfirmText'),
        yes: t('resetYes'), no: t('resetNo'), danger: true,
      }).then((ok) => { if (ok) resetHistory(); });
    }
  };
  const changeHandler = (e) => {
    const el = e.target;
    if (!el.dataset.name) return;
    if (el.type === 'checkbox') onSettingChange(el.dataset.name, el.checked);
    if (el.type === 'range') onSettingChange(el.dataset.name, Number(el.value));
  };
  for (const id of ['#settings', '#sheet-body']) {
    $(id).addEventListener('click', handler);
    $(id).addEventListener('change', changeHandler);
    $(id).addEventListener('input', (e) => { if (e.target.type === 'range') changeHandler(e); });
  }
  $('#sheet-close').addEventListener('click', () => { $('#sheet').hidden = true; });
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') $('#sheet').hidden = true; });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session) {
      requestWakeLock();
      for (let i = 0; i < 6 && advance(Date.now()); i++) { /* догоняем */ }
      enterPhaseEffects();
    }
  });
}

// ---------- запуск ----------

function init() {
  char.el = $('#char');
  char.imgs = [...char.el.querySelectorAll('img')];
  applyMotion();
  applyTexts();
  audio.configure({ bgVolume: S().bgVolume, signalVolume: S().signalVolume, signals: S().signals });
  bind();
  preload(S().lastMode);

  if (session) {
    preload(session.mode);
    for (let i = 0; i < 6 && advance(Date.now()); i++) { /* догоняем пропущенное */ }
    timerScreen = 'session';
    showScreen();
    enterPhaseEffects();
  } else {
    showScreen();
  }
  startLoop();

  audio.probeFiles().then(() => { if (tab === 'settings') renderSettings(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
