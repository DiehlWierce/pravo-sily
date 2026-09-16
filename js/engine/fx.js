'use strict';
// Частицы, тряска экрана, вспышки и свечение силы.

// Цвет силы. Стартовая сила — толчки, броски, прыжки, выстрелы — фиолетовая.
// Другие виды силы в будущих главах получат свои цвета здесь же.
const FORCE = {
  push: { color: '#b46cff', rgb: '180,108,255', light: '#e2c8ff' },
};

const FX = {
  parts: [], shake: 0, flash: 0, flashColor: '#fff', maxParts: 700,
  add(p) { if (this.parts.length < this.maxParts) this.parts.push(p); },
  burst(x, y, color, n = 8, speed = 60, life = 0.4, size = 1) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, s = speed * (0.3 + rnd() * 0.7);
      this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.5 + rnd() * 0.5), max: life, color, size });
    }
  },
  puff(x, y, color, n = 1) {
    for (let i = 0; i < n; i++) this.add({ x: x + rrange(-4, 4), y: y + rrange(-3, 3), vx: rrange(-8, 8), vy: -rrange(6, 18), life: 0.4, max: 0.4, color, size: 1 });
  },
  // Кольцо, расходящееся по земле: удар силы, отталкивание
  ring(x, y, r, color, n = 22) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      this.add({ x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 2, vx: Math.cos(a) * r * 3, vy: Math.sin(a) * r * 1.5, life: 0.3, max: 0.3, color, size: 1 });
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

// Ореол силы: светящийся контур спрайта и мягкое свечение вокруг.
// k — сила свечения 0..1. Сущность сама решает, когда светиться (см. Enemy.forceGlow).
const Aura = {
  cache: new WeakMap(),
  outline(img, color) {
    let byColor = this.cache.get(img);
    if (!byColor) { byColor = {}; this.cache.set(img, byColor); }
    if (!byColor[color]) {
      const c = makeCanvas(img.width, img.height), x = c.getContext('2d');
      x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in';
      x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      byColor[color] = c;
    }
    return byColor[color];
  },
  draw(ctx, img, x, y, k, force = FORCE.push) {
    if (k <= 0.01) return;
    x = Math.round(x); y = Math.round(y);
    const cx = x + img.width / 2, cy = y + img.height / 2, r = Math.max(img.width, img.height) * 0.95 + 4;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0, `rgba(${force.rgb},${0.42 * k})`); g.addColorStop(1, `rgba(${force.rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const o = this.outline(img, force.color);
    ctx.globalAlpha = clamp(0.9 * k, 0, 1);
    ctx.drawImage(o, x - 1, y); ctx.drawImage(o, x + 1, y); ctx.drawImage(o, x, y - 1); ctx.drawImage(o, x, y + 1);
    ctx.globalAlpha = 1;
  },
  // Искры вокруг светящегося существа
  sparks(x, y, k, force = FORCE.push) {
    if (rnd() < 0.5 * k) FX.add({ x: x + rrange(-7, 7), y: y + rrange(-12, 2), vx: rrange(-6, 6), vy: -rrange(10, 26), life: 0.45, max: 0.45, color: rnd() < 0.5 ? force.color : force.light, size: 1 });
  },
};
