// Все звуки приложения. Дождь, шумы, мелодия, свист и сигналы синтезируются в браузере
// (Web Audio API), поэтому файлы для них не нужны.
// Lo-fi, камин и танцевальная музыка берутся из файлов в assets/audio/, если они там есть.

export const FILE_SOUNDS = {
  lofi: 'assets/audio/lofi.mp3',
  fire: 'assets/audio/fireplace.mp3',
  dance: 'assets/audio/dance.mp3',
};

let ctx = null;
let master, bgBus, restBus, sigBus;
let current = { bg: null, rest: null };
const fileBuffers = new Map();
export const availableFiles = new Set();

let settings = { bgVolume: 0.5, signalVolume: 0.6, signals: true };

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  bgBus = ctx.createGain();
  restBus = ctx.createGain();
  sigBus = ctx.createGain();
  bgBus.connect(master);
  restBus.connect(master);
  sigBus.connect(master);
  applyVolumes();
  return ctx;
}

// Вызывать из обработчика нажатия: браузеры (особенно iOS) разрешают звук только после касания.
export function unlock() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

export function configure(s) {
  settings = { ...settings, ...s };
  applyVolumes();
}

function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const bg = settings.bgVolume * settings.bgVolume; // квадрат — ближе к восприятию громкости
  bgBus.gain.setTargetAtTime(bg, t, 0.1);
  restBus.gain.setTargetAtTime(bg, t, 0.1);
  sigBus.gain.setTargetAtTime(settings.signals ? settings.signalVolume : 0, t, 0.05);
}

// Проверяем, какие звуковые файлы лежат в assets/audio
export async function probeFiles() {
  await Promise.all(Object.entries(FILE_SOUNDS).map(async ([key, url]) => {
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (r.ok) availableFiles.add(key);
    } catch { /* нет файла */ }
  }));
  return availableFiles;
}

// ---------- шумы ----------

function noiseBuffer(kind, seconds = 6) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') {
        d[i] = w * 0.22;
      } else if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      } else { // pink
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;    b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;    b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.08;
        b6 = w * 0.115926;
      }
    }
    // плавная склейка конца и начала петли
    const fade = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] = d[i] * k + d[len - fade + i] * (1 - k);
    }
  }
  return buf;
}

function loopSource(buffer, dest) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(dest);
  src.start();
  return src;
}

function fadeGain(dest) {
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
  g.connect(dest);
  return g;
}

function makeRain(dest) {
  const out = fadeGain(dest);
  // ровный шелест
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
  const bed = ctx.createGain(); bed.gain.value = 0.9;
  hp.connect(lp); lp.connect(bed); bed.connect(out);
  const src = loopSource(noiseBuffer('pink'), hp);
  // медленные «порывы»
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.25;
  lfo.connect(lfoGain); lfoGain.connect(bed.gain); lfo.start();
  // отдельные капли
  const dropBuf = noiseBuffer('white', 0.2);
  const timer = setInterval(() => {
    const now = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const t = now + Math.random() * 0.12;
      const s = ctx.createBufferSource(); s.buffer = dropBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 4500; bp.Q.value = 3 + Math.random() * 5;
      const g = ctx.createGain();
      const peak = 0.05 + Math.random() * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.04);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      s.connect(bp); bp.connect(g);
      if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; g.connect(pan); pan.connect(out); } else g.connect(out);
      s.start(t, Math.random() * 0.1, 0.08);
    }
  }, 120);
  return { stop: () => stopNodes(out, [src, lfo], timer) };
}

function makeNoise(kind, dest) {
  const out = fadeGain(dest);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.value = kind === 'white' ? 9000 : 1200;
  lp.connect(out);
  const src = loopSource(noiseBuffer(kind), lp);
  return { stop: () => stopNodes(out, [src]) };
}

async function makeFile(key, dest) {
  const url = FILE_SOUNDS[key];
  let buf = fileBuffers.get(key);
  if (!buf) {
    const data = await fetch(url).then((r) => r.arrayBuffer());
    buf = await new Promise((res, rej) => ctx.decodeAudioData(data, res, rej));
    fileBuffers.set(key, buf);
  }
  const out = fadeGain(dest);
  const src = loopSource(buf, out);
  return { stop: () => stopNodes(out, [src]) };
}

function stopNodes(out, sources, timer) {
  if (timer) clearInterval(timer);
  const t = ctx.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setTargetAtTime(0, t, 0.3);
  setTimeout(() => {
    sources.forEach((s) => { try { s.stop(); } catch { /* уже остановлен */ } });
    out.disconnect();
  }, 1500);
}

// ---------- весёлая мелодия для отдыха ----------

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// 4 такта по 8 восьмых: до мажор → ля минор → фа мажор → соль мажор. 0 = пауза
const MELODY = [
  76, 79, 0, 76, 72, 74, 76, 0,
  69, 72, 76, 0, 74, 72, 69, 0,
  65, 69, 72, 0, 74, 72, 69, 72,
  74, 0, 71, 74, 79, 0, 0, 0,
];
const BASS = [48, 45, 41, 43];

function pluck(dest, t, freq, dur, vol) {
  const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 4;
  const g = ctx.createGain(); const g2 = ctx.createGain(); g2.gain.value = 0.15;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(dest);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}

function softBass(dest, t, freq, dur, vol) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}

function makeMelody(dest) {
  const out = fadeGain(dest);
  const vol = ctx.createGain(); vol.gain.value = 0.55; vol.connect(out);
  const shakerBuf = noiseBuffer('white', 0.1);
  const step = 60 / 112 / 2; // восьмая при 112 уд/мин
  let next = ctx.currentTime + 0.1;
  let i = 0;
  const timer = setInterval(() => {
    while (next < ctx.currentTime + 0.3) {
      const idx = i % MELODY.length;
      const note = MELODY[idx];
      if (note) pluck(vol, next, mtof(note), 0.45, 0.22);
      if (idx % 4 === 0) softBass(vol, next, mtof(BASS[Math.floor(idx / 8)]), step * 3.5, 0.2);
      if (idx % 2 === 1) {
        const s = ctx.createBufferSource(); s.buffer = shakerBuf;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.06, next); g.gain.exponentialRampToValueAtTime(0.0001, next + 0.05);
        s.connect(hp); hp.connect(g); g.connect(vol); s.start(next, 0, 0.06);
      }
      next += step; i += 1;
    }
  }, 100);
  return { stop: () => stopNodes(out, [], timer) };
}

// ---------- публичные функции ----------

async function build(kind, dest) {
  if (kind === 'rain') return makeRain(dest);
  if (kind === 'white' || kind === 'brown') return makeNoise(kind, dest);
  if (kind === 'synth') return makeMelody(dest);
  if (kind === 'lofi' || kind === 'fire' || kind === 'dance') {
    if (!availableFiles.has(kind)) return null;
    return makeFile(kind, dest);
  }
  return null;
}

let bgToken = 0, restToken = 0;

export async function playBackground(kind) {
  if (!ensureCtx()) return;
  const token = ++bgToken;
  if (current.bg) { current.bg.handle?.stop(); current.bg = null; }
  if (!kind || kind === 'off') return;
  const handle = await build(kind, bgBus).catch(() => null);
  if (token !== bgToken) { handle?.stop(); return; }
  current.bg = { kind, handle };
}

export async function playRest(kind) {
  if (!ensureCtx()) return;
  const token = ++restToken;
  if (current.rest) { current.rest.handle?.stop(); current.rest = null; }
  if (!kind || kind === 'off') return;
  const handle = await build(kind === 'file' ? 'dance' : kind, restBus).catch(() => null);
  if (token !== restToken) { handle?.stop(); return; }
  current.rest = { kind, handle };
}

export function currentBackground() { return current.bg?.kind || 'off'; }
export function currentRest() { return current.rest?.kind || 'off'; }

export function stopAll() {
  playBackground('off');
  playRest('off');
}

function bell(t, freq, vol = 0.35, dur = 1.4) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.76;
  const g = ctx.createGain(); const g2 = ctx.createGain(); g2.gain.value = 0.12;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(sigBus);
  o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
}

// Мягкий сигнал «время работы вышло»
export function chimeWorkEnd() {
  if (!ensureCtx()) return;
  const t = ctx.currentTime + 0.05;
  bell(t, mtof(84)); bell(t + 0.22, mtof(88)); bell(t + 0.44, mtof(91), 0.3, 2);
}

// Тихий «тик» на отсчёте
export function tick(last = false) {
  if (!ensureCtx()) return;
  const t = ctx.currentTime + 0.01;
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = last ? 1320 : 990;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g); g.connect(sigBus); o.start(t); o.stop(t + 0.1);
}

// «Поехали!» — начало работы
export function chimeGo() {
  if (!ensureCtx()) return;
  const t = ctx.currentTime + 0.05;
  bell(t, mtof(79), 0.3, 0.8); bell(t + 0.16, mtof(84), 0.32, 1.2);
}

// Фанфары за награду
export function fanfare() {
  if (!ensureCtx()) return;
  const t = ctx.currentTime + 0.05;
  [72, 76, 79, 84].forEach((m, i) => bell(t + i * 0.13, mtof(m), 0.3, 0.9));
  [72, 76, 79, 84].forEach((m) => bell(t + 0.6, mtof(m), 0.16, 2.2));
}

// Свист помидорки: короткая мелодия с вибрато и скольжением между нотами
export function whistle() {
  if (!ensureCtx()) return;
  const phrases = [
    [[79, 0.18], [84, 0.18], [88, 0.3], [86, 0.18], [84, 0.4]],
    [[84, 0.2], [79, 0.2], [81, 0.2], [84, 0.5]],
    [[76, 0.15], [79, 0.15], [84, 0.25], [83, 0.15], [79, 0.45]],
  ];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  const t0 = ctx.currentTime + 0.05;
  const o = ctx.createOscillator(); o.type = 'sine';
  const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
  const vibG = ctx.createGain(); vibG.gain.value = 14;
  vib.connect(vibG); vibG.connect(o.frequency);
  const g = ctx.createGain(); g.gain.value = 0;
  o.connect(g); g.connect(restBus);
  let t = t0;
  o.frequency.setValueAtTime(mtof(phrase[0][0]), t);
  g.gain.setValueAtTime(0, t);
  for (const [m, d] of phrase) {
    o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.04);
    g.gain.linearRampToValueAtTime(0.09, t + 0.03);
    g.gain.linearRampToValueAtTime(0.06, t + d - 0.02);
    t += d;
  }
  g.gain.linearRampToValueAtTime(0, t + 0.05);
  o.start(t0); vib.start(t0); o.stop(t + 0.1); vib.stop(t + 0.1);
}

// Короткий звук-превью при выборе в настройках
export async function preview(kind) {
  await playBackground(kind);
}
