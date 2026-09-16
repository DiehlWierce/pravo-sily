'use strict';
// Люди: собеседники, наблюдатели (хозяева прилавков и домов), прохожие, преследователи.

// Спрайт человека. Смотрит только влево или вправо: любое другое направление считается «вправо»
function drawHuman(ctx, cam, e, o = {}) {
  const sx = e.x - cam.x, sy = e.y - cam.y;
  const set = Art.spr[e.who] || Art.spr.villager, lr = e.lr === 'l' ? 'l' : 'r';
  const frames = (e.flashT > 0 ? set.flash : set)[lr];
  if (o.lying || e.lying) {
    ctx.save(); ctx.translate(Math.round(sx), Math.round(sy - 6)); ctx.rotate(-Math.PI / 2);
    ctx.globalAlpha = o.alpha || 1; ctx.drawImage(frames[0], -7, -5); ctx.restore(); ctx.globalAlpha = 1;
    return;
  }
  drawShadow(ctx, sx, sy, 5);
  const frame = e.moving ? Math.floor(Game.time * 8) % 2 : 0;
  const drop = (o.kneel ? 3 : 0) + (e.sit ? 2 : 0);
  const x = sx - 5 + (o.shake ? rrange(-1, 1) : 0), y = sy - 13 + drop;
  if (o.glow) Aura.draw(ctx, set[lr][frame], x, y, o.glow);
  drawSpr(ctx, frames[frame], x, y);
  if (e.carry) drawSpr(ctx, Art.spr[e.carry], sx + (lr === 'r' ? -8 : 1), sy - 17 + drop);
}
function drawIcon(ctx, cam, e, ch, color) {
  const sx = Math.round(e.x - cam.x), sy = Math.round(e.y - cam.y - 24 + Math.sin(Game.time * 10));
  ctx.fillStyle = '#000'; ctx.fillRect(sx - 2, sy - 1, 5, 9);
  ctx.fillStyle = color;
  if (ch === '!') { ctx.fillRect(sx - 1, sy, 3, 5); ctx.fillRect(sx - 1, sy + 6, 3, 1); }
  else { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx + 1, sy + 1, 1, 2); ctx.fillRect(sx, sy + 3, 1, 2); ctx.fillRect(sx, sy + 6, 1, 1); }
}

// ---------- Собеседник ----------
class NPC {
  constructor(x, y, o) {
    Object.assign(this, { x, y, hw: 4, hh: 3, r: 6, z: 0, alive: true, moving: false, flashT: 0 }, o);
    this.lr = this.face === 'l' ? 'l' : 'r';
  }
  update(dt) {
    this.moving = false;
    if (this.goal) { if (Nav.go(this, this.goal.x, this.goal.y, this.goalSpeed || 40, dt)) { const cb = this.goal.done; this.goal = null; cb && cb(); } return; }
    const p = Game.player;
    if (!this.lying && dist(p.x, p.y, this.x, this.y) < 40) this.lr = p.x > this.x ? 'r' : 'l';
  }
  interaction(p) {
    if (this.hidden || dist(p.x, p.y, this.x, this.y) > 38 || !Events.allow('can:talk', this)) return null;
    return { key: this, x: this.x, y: this.y - 22, label: 'Space: говорить', done: () => Talk.open(this) };
  }
  // Реплика над головой
  bark(text, ttl = 2.6) { Game.bubbles = Game.bubbles.filter(b => b.e !== this); Game.bubbles.push({ e: this, text, ttl }); }
  draw(ctx, cam) { if (!this.hidden) drawHuman(ctx, cam, this); }
}

// ---------- Наблюдатель: хозяин прилавка или дома. Оглядывается, может дремать ----------
// Перед поворотом над головой мелькает «?» — это подсказка, когда можно успеть стащить.
// Поймал на краже — какое-то время смотрит прямо на героя (suspect).
class Watcher extends NPC {
  constructor(x, y, o) {
    super(x, y, { look: [1.5, 3], angles: [Math.PI / 2, 0, Math.PI], ...o });
    this.angle = this.angles[0]; this.t = rrange(...this.look); this.awake = true; this.warn = 0; this.ai = 0; this.suspectT = 0;
    this.half = this.sit ? 1.0 : 0.85; this.range = this.sit ? 56 : 72;
  }
  suspect(t) { this.suspectT = t; this.awake = true; }
  update(dt) {
    super.update(dt);
    if (this.goal || this.hidden) return;
    this.t -= dt; this.warn = Math.max(0, this.warn - dt);
    if (this.suspectT > 0) {
      this.suspectT -= dt;
      const p = Game.player; this.angle = Math.atan2(p.y - this.y, p.x - this.x); this.lr = p.x > this.x ? 'r' : 'l';
      return;
    }
    if (this.sit) {
      if (this.t <= 0) { this.awake = !this.awake; this.t = this.awake ? rrange(...this.look) * 0.7 : rrange(...this.look); }
      if (this.awake) this.angle = Math.PI / 2 + Math.sin(Game.time * 1.3) * 1.2;
      else if (rnd() < 0.02) FX.add({ x: this.x + 4, y: this.y - 16, vx: 4, vy: -8, life: 1, max: 1, color: '#ccd', size: 1 });
    } else {
      if (this.t <= 0.45 && this.t > 0 && !this.warned) { this.warned = true; this.warn = 0.45; }
      if (this.t <= 0) {
        this.ai = (this.ai + 1) % this.angles.length; this.angle = this.angles[this.ai];
        this.t = rrange(...this.look); this.warned = false;
      }
      if (Math.cos(this.angle) > 0.3) this.lr = 'r'; else if (Math.cos(this.angle) < -0.3) this.lr = 'l';
    }
  }
  seesPlayer() { return !this.hidden && this.awake && Game.player.alive && inCone(this, this.angle, this.half, this.range, Game.player); }
  draw(ctx, cam) {
    if (this.hidden) return;
    const p = Game.player;
    if (this.awake && Theft.showCone(this) && dist(p.x, p.y, this.x, this.y) < 140)
      drawCone(ctx, cam, this, this.angle, this.half, this.range, this.seesPlayer() ? 'rgba(255,70,50,0.22)' : 'rgba(255,220,120,0.12)');
    drawHuman(ctx, cam, this, { shake: this.warn > 0 });
    if (this.suspectT > 0) drawIcon(ctx, cam, this, '!', '#ffb040');
    else if (this.warn > 0) drawIcon(ctx, cam, this, '?', '#ffe080');
    if (this.sit && !this.awake) { ctx.fillStyle = '#ccd'; ctx.fillRect(Math.round(this.x - cam.x + 5), Math.round(this.y - cam.y - 18), 3, 1); }
  }
}

// ---------- Прохожий: бродит по своему кварталу, останавливается, болтает. Замечает кражу ----------
class Walker extends NPC {
  constructor(x, y, o) {
    const c = CONFIG.walker;
    super(x, y, { speed: rrange(...c.speed), range: c.range, half: c.half, barks: 'city', ...o });
    this.angle = rnd() * 7; this.pause = rrange(0, 2); this.dest = null; this.barkT = rrange(4, 12); this.suspectT = 0;
  }
  suspect(t) { this.suspectT = t; this.dest = null; }
  pickDest() {
    const [x0, y0, x1, y1] = this.area || [tileOf(this.x) - 6, tileOf(this.y) - 6, tileOf(this.x) + 6, tileOf(this.y) + 6];
    Nav.ensure();
    for (let i = 0; i < 12; i++) {
      const tx = x0 + ((rnd() * (x1 - x0 + 1)) | 0), ty = y0 + ((rnd() * (y1 - y0 + 1)) | 0);
      if (Nav.free(tx, ty)) { this.dest = tc(tx, ty); return; }
    }
    this.pause = 1;
  }
  update(dt) {
    this.moving = false;
    if (this.hidden) return;
    const p = Game.player;
    if (this.suspectT > 0) {
      this.suspectT -= dt; this.angle = Math.atan2(p.y - this.y, p.x - this.x); this.lr = p.x > this.x ? 'r' : 'l';
      return;
    }
    if (this.pause > 0) {
      this.pause -= dt;
      this.angle += Math.sin(Game.time * 0.9 + this.x) * dt;
      if (dist(p.x, p.y, this.x, this.y) < 40) { this.lr = p.x > this.x ? 'r' : 'l'; this.angle = Math.atan2(p.y - this.y, p.x - this.x); }
    } else {
      if (!this.dest) this.pickDest();
      if (this.dest && Nav.go(this, this.dest.x, this.dest.y, this.speed, dt)) { this.dest = null; this.pause = rrange(1, 4.5); }
    }
    this.barkT -= dt;
    if (this.barkT <= 0) {
      this.barkT = rrange(8, 18);
      if (dist(p.x, p.y, this.x, this.y) < 110 && Game.bubbles.length < 2 && BARKS[this.barks]) this.bark(pick(BARKS[this.barks]));
    }
  }
  seesPlayer() { return !this.hidden && Game.player.alive && inCone(this, this.angle, this.half, this.range, Game.player); }
  interaction(p) {
    if (this.hidden || dist(p.x, p.y, this.x, this.y) > 30 || !Events.allow('can:talk', this)) return null;
    return { key: this, x: this.x, y: this.y - 22, label: 'Space: окликнуть', done: () => { this.pause = 3; Talk.passerby(this); } };
  }
  draw(ctx, cam) {
    if (this.hidden) return;
    drawHuman(ctx, cam, this);
    if (this.suspectT > 0) drawIcon(ctx, cam, this, '!', '#ffb040');
  }
}

// ---------- Преследователь / патрульный. Заговоришь с ним — сразу заметит ----------
// Ходит по поиску пути (Nav): обходит дома, заборы и бочки. Безжалостный (relentless) знает, где герой, и не отстаёт.
// Состояние hunt: услышал шум — идёт на звук, пока не увидит героя.
class Chaser extends NPC {
  constructor(x, y, o) {
    super(x, y, { speed: 64, patrolSpeed: 26, huntSpeed: 42, range: 84, half: 0.75, route: null, relentless: false, lantern: false, active: true, ...o });
    this.state = this.route ? 'patrol' : 'idle'; this.ri = 0; this.angle = o.angle || 0; this.lostT = 0; this.alertT = 0;
    this.home = { x, y }; this.trailIdx = 0; this.searchT = 0; this.baseAngle = this.angle;
  }
  interaction(p) {
    if (this.hidden || !this.active || this.state === 'chase' || this.state === 'alert' || dist(p.x, p.y, this.x, this.y) > 30) return null;
    return { key: this, x: this.x, y: this.y - 22, label: 'Space: заговорить', done: () => { this.startChase(); Events.emit('chase:talked', this); } };
  }
  seesPlayer() {
    const p = Game.player;
    if (!p.alive) return false;
    if (inCone(this, this.angle, this.half, this.range, p)) return true;
    return dist(p.x, p.y, this.x, this.y) < 20 && World.sight(this.x, this.y - 6, p.x, p.y - 6);
  }
  startChase() {
    if (this.state === 'chase' || this.state === 'alert') return;
    this.state = 'alert'; this.alertT = this.relentless ? 0.2 : 0.4; Sfx.alarm();
    this.trailIdx = Math.max(0, Game.trail.length - 1);
  }
  update(dt) {
    this.moving = false;
    if (this.goal) { if (Nav.go(this, this.goal.x, this.goal.y, this.goalSpeed || this.speed, dt)) { const cb = this.goal.done; this.goal = null; cb && cb(); } return; }
    if (!this.active || this.hidden) return;
    // Толпа не слипается в одну точку: соседи мягко расталкивают друг друга
    for (const o of Game.npcs) {
      if (o === this || !(o instanceof Chaser) || !o.active || o.hidden) continue;
      const d = dist(this.x, this.y, o.x, o.y);
      if (d < 11 && d > 0.01) moveBody(this, (this.x - o.x) / d * 26 * dt, (this.y - o.y) / d * 26 * dt);
    }
    const p = Game.player, seen = this.seesPlayer();
    switch (this.state) {
      case 'idle':
        if (this.look) this.angle = this.baseAngle + Math.sin(Game.time * 0.6 + this.x) * 0.9;   // водит фонарём, но за спину не смотрит
        if (seen) this.startChase();
        break;
      case 'patrol': {
        const pt = this.route[this.ri];
        if (Nav.go(this, pt.x, pt.y, this.patrolSpeed, dt)) this.ri = (this.ri + 1) % this.route.length;
        if (seen) this.startChase();
        break;
      }
      case 'hunt':
        if (this.huntDelay > 0) {   // услышал крик: оборачивается на звук и только потом идёт
          this.huntDelay -= dt; this.angle = Math.atan2(p.y - this.y, p.x - this.x); this.lr = p.x > this.x ? 'r' : 'l';
          if (seen) this.startChase();
          break;
        }
        this.huntT -= dt;
        if (!this.huntAt || this.huntT <= 0) { this.huntAt = { x: p.x + rrange(-48, 48), y: p.y + rrange(-40, 40) }; this.huntT = rrange(1.8, 3); }
        if (Nav.go(this, this.huntAt.x, this.huntAt.y, this.huntSpeed, dt)) this.huntT = Math.min(this.huntT, 0.4);
        if (seen) this.startChase();
        break;
      case 'alert':
        this.alertT -= dt; this.angle = Math.atan2(p.y - this.y, p.x - this.x); this.lr = p.x > this.x ? 'r' : 'l';
        if (this.alertT <= 0) { this.state = 'chase'; this.lostT = 0; Events.emit('chase:spotted', this); }
        break;
      case 'chase': {
        const direct = World.sight(this.x, this.y - 4, p.x, p.y - 4);
        if (direct) { this.lostT = 0; this.trailIdx = Math.max(0, Game.trail.length - 1); Nav.go(this, p.x, p.y, this.speed, dt); this.last = { x: p.x, y: p.y }; }
        else if (this.relentless) { this.lostT += dt; Nav.go(this, p.x, p.y, this.speed, dt); }
        else {   // идёт по следу: срезает к самой дальней точке следа, до которой есть прямой проход
          this.lostT += dt;
          const tr = Game.trail, end = tr.length - 1;
          for (let k = 0; k < 6 && this.trailIdx < end && Nav.clear(this, tr[this.trailIdx + 1].x, tr[this.trailIdx + 1].y); k++) this.trailIdx++;
          const tp = tr[Math.min(this.trailIdx, end)];
          if (tp && Nav.go(this, tp.x, tp.y, this.speed, dt)) this.trailIdx++;
          if (this.lostT > 2.6) { this.state = 'search'; this.searchT = 2.6; }
        }
        if (p.alive && dist(p.x, p.y, this.x, this.y) < 10 && p.dashT <= 0) Events.emit('chase:caught', this);
        break;
      }
      case 'search':
        this.searchT -= dt; this.angle += dt * 2.4; this.lr = Math.cos(this.angle) > 0 ? 'r' : 'l';
        if (this.last && dist(this.x, this.y, this.last.x, this.last.y) > 4) Nav.go(this, this.last.x, this.last.y, this.patrolSpeed * 1.5, dt);
        if (seen) this.startChase();
        else if (this.searchT <= 0) { this.state = this.hunt ? 'hunt' : 'return'; this.huntT = 0; Events.emit('chase:lost', this); }
        break;
      case 'return':
        if (Nav.go(this, this.home.x, this.home.y, this.patrolSpeed, dt)) { this.state = this.route ? 'patrol' : 'idle'; this.ri = 0; }
        if (seen) this.startChase();
        break;
    }
  }
  reset() { this.x = this.home.x; this.y = this.home.y; this.state = this.route ? 'patrol' : 'idle'; this.ri = 0; this.lostT = 0; this.goal = null; this.nav = null; }
  draw(ctx, cam) {
    if (this.hidden) return;
    if (this.lantern) {
      const g = ctx.createRadialGradient(this.x - cam.x, this.y - 8 - cam.y, 2, this.x - cam.x, this.y - 8 - cam.y, 34);
      g.addColorStop(0, 'rgba(255,200,100,0.25)'); g.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = g; ctx.fillRect(this.x - cam.x - 34, this.y - cam.y - 42, 68, 68);
    }
    if (this.active && this.showCone !== false && this.state !== 'chase')
      drawCone(ctx, cam, this, this.angle, this.half, this.range, this.state === 'alert' ? 'rgba(255,70,50,0.25)' : 'rgba(255,220,120,0.12)');
    drawHuman(ctx, cam, this);
    if (this.lantern) drawSpr(ctx, Art.spr.lantern, this.x - cam.x + (this.lr === 'r' ? 4 : -7), this.y - cam.y - 7);
    if (this.state === 'alert' || this.state === 'chase') drawIcon(ctx, cam, this, '!', '#ff5040');
    else if (this.state === 'search' || (this.state === 'hunt' && this.active)) drawIcon(ctx, cam, this, '?', '#ffe080');
  }
}
