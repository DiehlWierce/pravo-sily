'use strict';
// Базовые константы, ввод, звук, частицы, утилиты.

const W = 320, H = 240, TS = 16;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
function norm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = Math.random;
const rrange = (a, b) => a + rnd() * (b - a);

// ---------- Ввод: клавиатура + геймпад, раскладка как на хендхелде ----------
const Input = (() => {
  const keys = {};
  const binds = {
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    a: ['KeyJ', 'Space'],      // A — нож / взаимодействие / далее
    b: ['KeyK', 'ShiftLeft'],  // B — рывок
    x: ['KeyL'],               // X — телекинетическая хватка / бросок
    y: ['KeyI'],               // Y — толчок
    l: ['KeyQ'],               // L — интеграция кристалла
    r: ['KeyE'],               // R — антидот
    start: ['Enter', 'Escape'],
  };
  const now = {}, last = {};
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    Sfx.unlock();
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function update() {
    let gp = null;
    if (navigator.getGamepads) for (const g of navigator.getGamepads()) if (g) { gp = g; break; }
    const btn = i => !!(gp && gp.buttons[i] && gp.buttons[i].pressed);
    const ax = gp ? gp.axes[0] || 0 : 0, ay = gp ? gp.axes[1] || 0 : 0;
    const pad = {
      up: btn(12) || ay < -0.45, down: btn(13) || ay > 0.45,
      left: btn(14) || ax < -0.45, right: btn(15) || ax > 0.45,
      a: btn(0), b: btn(1), x: btn(2), y: btn(3), l: btn(4), r: btn(5), start: btn(9),
    };
    for (const act in binds) {
      last[act] = now[act];
      now[act] = binds[act].some(c => keys[c]) || pad[act];
    }
    if (gp && Object.values(pad).some(Boolean)) Sfx.unlock();
  }
  return { update, held: a => !!now[a], pressed: a => !!now[a] && !last[a] };
})();

// ---------- Простые синтезированные звуки ----------
const Sfx = (() => {
  let ac = null;
  function unlock() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
    if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol = 0.1) {
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf; g.gain.value = vol; s.connect(g).connect(ac.destination); s.start();
  }
  return {
    unlock,
    slash: () => tone(900, 0.07, 'square', 0.04, -600),
    dash: () => noise(0.12, 0.06),
    hit: () => { tone(160, 0.12, 'square', 0.1, -100); noise(0.08, 0.08); },
    hurt: () => tone(300, 0.25, 'sawtooth', 0.1, -220),
    clang: () => tone(1400, 0.1, 'triangle', 0.06, -900),
    grab: () => tone(220, 0.18, 'sine', 0.1, 330),
    throw: () => tone(500, 0.15, 'sine', 0.1, -380),
    push: () => { tone(120, 0.25, 'sine', 0.16, -60); noise(0.2, 0.05); },
    pick: () => tone(880, 0.12, 'triangle', 0.07, 440),
    crystal: () => { tone(660, 0.3, 'sine', 0.08, 660); tone(990, 0.4, 'sine', 0.05, 330); },
    thud: () => { tone(80, 0.2, 'sine', 0.2, -40); noise(0.15, 0.1); },
    splash: () => noise(0.3, 0.08),
    blip: () => tone(1200, 0.02, 'square', 0.015),
    gate: () => { tone(90, 0.5, 'sawtooth', 0.08, 40); noise(0.4, 0.06); },
    pain: () => { tone(200, 0.6, 'sawtooth', 0.12, -150); tone(210, 0.6, 'square', 0.05, -160); },
  };
})();

// ---------- Частицы и тряска экрана ----------
const FX = {
  parts: [], shake: 0, flash: 0, flashColor: '#fff',
  burst(x, y, color, n = 8, speed = 60, life = 0.4, size = 1) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, s = speed * (0.3 + rnd() * 0.7);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.5 + rnd() * 0.5), max: life, color, size });
    }
  },
  update(dt) {
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.life -= dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt * 2.5);
  },
  draw(ctx, cam) {
    for (const p of this.parts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  },
};
