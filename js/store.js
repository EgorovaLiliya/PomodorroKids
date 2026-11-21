// Хранение данных на устройстве (localStorage).

const KEY = 'pomodorrokids.v1';

export const MODES = {
  cherry:  { work: 10, rest: 2 },
  plum:    { work: 15, rest: 3 },
  yellow:  { work: 20, rest: 4 },
  oxheart: { work: 25, rest: 5 },
};

export const MODE_ORDER = ['cherry', 'plum', 'yellow', 'oxheart'];

// Сколько циклов до длинного отдыха (отдых x2)
export const LONG_REST_EVERY = 4;
// Сколько раз за один перерыв можно нажать «Ещё минутку»
export const EXTRA_MINUTES_MAX = 2;
// Длительность отсчёта перед работой, секунд
export const COUNTDOWN_SECONDS = 10;

const prefersReducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const defaultSettings = () => ({
  lang: (navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en',
  lastMode: 'cherry',
  bgSound: 'rain',
  bgVolume: 0.5,
  restMusic: 'synth',
  whistle: true,
  signals: true,
  signalVolume: 0.6,
  ticks: true,
  motion: prefersReducedMotion ? 'calm' : 'full',
  vibration: true,
  wakeLock: true,
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const saved = load() || {};

export const state = {
  settings: { ...defaultSettings(), ...(saved.settings || {}) },
  history: Array.isArray(saved.history) ? saved.history : [],
  session: saved.session || null,
};

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* хранилище недоступно (приватный режим) — работаем без сохранения */
  }
}

export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function awardFor(cycles) {
  if (cycles >= 8) return 'marathon';
  if (cycles >= 4) return 'strong';
  return 'lightning';
}

export function addReward({ award, cycles, minutes, mode }) {
  state.history.push({ date: dateKey(), ts: Date.now(), award, cycles, minutes, mode });
  save();
}

export function rewardsByDay() {
  const map = new Map();
  for (const h of state.history) {
    if (!map.has(h.date)) map.set(h.date, { lightning: 0, strong: 0, marathon: 0 });
    map.get(h.date)[h.award] += 1;
  }
  return map;
}

export function stats() {
  let tomatoes = 0, minutes = 0;
  for (const h of state.history) {
    tomatoes += h.cycles;
    minutes += h.minutes;
  }
  const days = new Set(state.history.map((h) => h.date));
  // Серия дней подряд: считаем от сегодня (или от вчера, если сегодня ещё нет награды)
  let streak = 0;
  const d = new Date();
  if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dateKey(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return { tomatoes, minutes, awards: state.history.length, streak };
}

export function todayTomatoes() {
  const today = dateKey();
  let n = state.history.filter((h) => h.date === today).reduce((s, h) => s + h.cycles, 0);
  if (state.session) n += state.session.cycles;
  return n;
}

export function resetHistory() {
  state.history = [];
  save();
}
