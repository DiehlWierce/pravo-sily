'use strict';
// Синтезированные звуки. В Godot заменяются на AudioStreamPlayer с файлами — имена звуков сохраняются.

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
    slap: () => { noise(0.06, 0.18); tone(520, 0.08, 'triangle', 0.08, -300); },
    clang: () => tone(1400, 0.1, 'triangle', 0.06, -900),
    grab: () => tone(220, 0.18, 'sine', 0.1, 330),
    throw: () => tone(500, 0.15, 'sine', 0.1, -380),
    push: () => { tone(120, 0.25, 'sine', 0.16, -60); noise(0.2, 0.05); },
    force: () => { tone(180, 0.3, 'sine', 0.08, 240); tone(90, 0.3, 'triangle', 0.05, 60); },
    pick: () => tone(880, 0.12, 'triangle', 0.07, 440),
    crystal: () => { tone(660, 0.3, 'sine', 0.08, 660); tone(990, 0.4, 'sine', 0.05, 330); },
    thud: () => { tone(80, 0.2, 'sine', 0.2, -40); noise(0.15, 0.1); },
    splash: () => noise(0.3, 0.08),
    blip: () => tone(1200, 0.02, 'square', 0.015),
    gate: () => { tone(90, 0.5, 'sawtooth', 0.08, 40); noise(0.4, 0.06); },
    alarm: () => { tone(880, 0.08, 'square', 0.06); setTimeout(() => tone(1100, 0.1, 'square', 0.06), 90); },
    roar: () => { tone(90, 0.5, 'sawtooth', 0.14, 60); noise(0.4, 0.08); },
    coin: () => { tone(1500, 0.06, 'triangle', 0.05); setTimeout(() => tone(2000, 0.1, 'triangle', 0.05), 60); },
    flap: () => { noise(0.05, 0.05); setTimeout(() => noise(0.05, 0.04), 70); },
    bark: () => { tone(420, 0.07, 'sawtooth', 0.05, -200); setTimeout(() => tone(380, 0.08, 'sawtooth', 0.05, -200), 110); },
  };
})();
