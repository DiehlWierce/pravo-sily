'use strict';
// Городская живность: голуби (разлетаются, если подойти), собаки, кошки, куры. Никому не вредят — оживляют улицы.

class Critter {
  constructor(x, y, o) {
    Object.assign(this, { x, y, hw: 3, hh: 2, r: 4, z: 0, lr: rnd() < 0.5 ? 'l' : 'r', t: rrange(0, 2), frame: 0, moving: false }, o);
    this.home = { x, y };
    const speeds = { pigeon: 14, dog: 30, cat: 26, chicken: 12 };
    this.speed = speeds[this.kind] || 14;
  }
  pickDest() {
    const [x0, y0, x1, y1] = this.area || [tileOf(this.home.x) - 3, tileOf(this.home.y) - 3, tileOf(this.home.x) + 3, tileOf(this.home.y) + 3];
    Nav.ensure();
    for (let i = 0; i < 8; i++) {
      const tx = x0 + ((rnd() * (x1 - x0 + 1)) | 0), ty = y0 + ((rnd() * (y1 - y0 + 1)) | 0);
      if (Nav.free(tx, ty)) { this.dest = { x: tx * TS + rrange(3, 13), y: ty * TS + rrange(6, 13) }; return; }
    }
  }
  update(dt) {
    this.moving = false;
    const p = Game.player, d = dist(p.x, p.y, this.x, this.y);
    if (this.kind === 'pigeon') return this.updatePigeon(dt, d);
    this.t -= dt;
    // Кошки и куры шарахаются от героя, собака иногда тявкает
    if ((this.kind === 'cat' || this.kind === 'chicken') && d < 28) {
      const n = norm(this.x - p.x, this.y - p.y); moveBody(this, n.x * this.speed * 2 * dt, n.y * this.speed * 2 * dt);
      this.lr = n.x > 0 ? 'r' : 'l'; this.moving = true; this.dest = null;
      return;
    }
    if (this.kind === 'dog' && d < 50 && rnd() < 0.004) { Sfx.bark(); this.t = 1.5; this.lr = p.x > this.x ? 'r' : 'l'; }
    if (this.t > 0) return;
    if (!this.dest) this.pickDest();
    if (this.dest && Nav.go(this, this.dest.x, this.dest.y, this.speed, dt)) { this.dest = null; this.t = rrange(1.5, 5); }
    this.moving = !!this.dest;
  }
  updatePigeon(dt, d) {
    if (this.flying) {
      this.flyT -= dt; this.z += 40 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.flyT <= 0) { this.flying = false; this.hidden = true; this.back = rrange(6, 12); }
      return;
    }
    if (this.hidden) {
      this.back -= dt;
      if (this.back <= 0 && dist(Game.player.x, Game.player.y, this.home.x, this.home.y) > 90) {
        Object.assign(this, { hidden: false, x: this.home.x + rrange(-10, 10), y: this.home.y + rrange(-6, 6), z: 0 });
      }
      return;
    }
    if (d < 34 || (d < 60 && Game.player.dashT > 0)) {
      const n = norm(this.x - Game.player.x + rrange(-5, 5), this.y - Game.player.y - 20);
      Object.assign(this, { flying: true, flyT: 1.2, vx: n.x * 70, vy: n.y * 50 - 20 });
      this.lr = n.x > 0 ? 'r' : 'l'; Sfx.flap();
      return;
    }
    // Клюёт землю и переступает
    this.t -= dt;
    if (this.t <= 0) { this.t = rrange(0.4, 1.6); if (rnd() < 0.4) { this.lr = rnd() < 0.5 ? 'l' : 'r'; moveBody(this, (this.lr === 'r' ? 1 : -1) * 3, rrange(-1, 1)); } }
  }
  draw(ctx, cam) {
    if (this.hidden) return;
    const set = Art.spr[this.kind], frames = set[this.lr];
    const frame = this.flying ? (Math.floor(Game.time * 14) % 2) : this.moving ? Math.floor(Game.time * 8) % frames.length : 0;
    const img = frames[frame % frames.length];
    if (!this.flying) drawShadow(ctx, this.x - cam.x, this.y - cam.y, Math.max(2, img.width / 3));
    drawSpr(ctx, img, this.x - img.width / 2 - cam.x, this.y - img.height - this.z - cam.y);
  }
}

// Голуби стайкой: одна точка спавна — несколько птиц
function spawnFlock(x, y, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(new Critter(x + rrange(-12, 12), y + rrange(-8, 8), { kind: 'pigeon' }));
  return out;
}
