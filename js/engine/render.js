'use strict';
// Холсты и текст. Мир рисуется в буфер 320×240 и масштабируется целым числом;
// текст рисуется поверх, уже в масштабе экрана, чтобы оставаться чётким.

const screen = document.getElementById('screen');
const dctx = screen.getContext('2d');
const buffer = makeCanvas(W, H);
const bctx = buffer.getContext('2d');
let S = 1;   // масштаб экрана относительно буфера

function resize() {
  const scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  const dpr = window.devicePixelRatio || 1;
  screen.style.width = W * scale + 'px'; screen.style.height = H * scale + 'px';
  screen.width = W * scale * dpr; screen.height = H * scale * dpr;
  S = scale * dpr;
}
addEventListener('resize', resize); resize();

const vignette = (() => {
  const c = makeCanvas(W, H), x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 220);
  g.addColorStop(0, 'rgba(5,8,12,0)'); g.addColorStop(1, 'rgba(5,8,12,0.7)');
  x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
})();

function font(size) { return `bold ${Math.round(size * S)}px Menlo, Consolas, "DejaVu Sans Mono", monospace`; }
function text(str, x, y, o = {}) {
  const { color = '#f4ecd8', size = 7, align = 'left', shadow = true, alpha = 1 } = o;
  dctx.font = font(size); dctx.textAlign = align; dctx.textBaseline = 'top'; dctx.globalAlpha = alpha;
  if (shadow) { dctx.fillStyle = 'rgba(0,0,0,0.85)'; dctx.fillText(str, x * S + Math.max(1, S * 0.5), y * S + Math.max(1, S * 0.5)); }
  dctx.fillStyle = color; dctx.fillText(str, x * S, y * S); dctx.globalAlpha = 1;
}
function wrap(str, maxW, size) {
  dctx.font = font(size);
  const out = [];
  for (const para of String(str).split('\n')) {
    const words = para.split(' '); let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (dctx.measureText(t.replace(/~/g, '')).width > maxW * S && cur) { out.push(cur); cur = w; } else cur = t;
    }
    out.push(cur);
  }
  return out;
}
function box(x, y, w, h, alpha = 0.9) {
  bctx.fillStyle = `rgba(10,8,14,${alpha})`; bctx.fillRect(x, y, w, h);
  bctx.strokeStyle = '#5a4a60'; bctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function drawSpr(ctx, img, x, y) { ctx.drawImage(img, Math.round(x), Math.round(y)); }
function drawShadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), w, Math.max(1.5, w * 0.35), 0, 0, 7); ctx.fill();
}
// Попадает ли точка мира в кадр (с запасом) — чтобы не рисовать то, чего не видно
function onScreen(x, y, cam, margin = 40) {
  return x > cam.x - margin && x < cam.x + W + margin && y > cam.y - margin && y < cam.y + H + margin * 1.5;
}
