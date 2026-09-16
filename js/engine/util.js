'use strict';
// Константы экрана и математика. Ничего не знает об игре — переносится в Godot как есть (Vector2, lerp, clamp).

const W = 320, H = 240, TS = 16;   // логическое разрешение и размер тайла

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
function norm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }
// Разница углов в диапазоне [0, π]
function angleDiff(a, b) { return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); }

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
const pick = (arr) => arr[(rnd() * arr.length) | 0];

// Центр тайла в пикселях: x — середина, y — «ступни» персонажа
const tc = (tx, ty) => ({ x: tx * TS + 8, y: ty * TS + 10 });
const tileOf = (px) => Math.floor(px / TS);

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Русские окончания: plural(3, 'медяк', 'медяка', 'медяков')
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}
