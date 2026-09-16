'use strict';
// Люди: собеседники, наблюдатели (хозяева прилавков и домов), преследователи, охотник.

function drawHuman(ctx, cam, e, o = {}) {
  const sx = e.x - cam.x, sy = e.y - cam.y;
  const set = Art.spr[e.who], frames = (e.flashT > 0 ? set.flash : set)[e.lr];
  if (o.lying || e.lying) {
    ctx.save(); ctx.translate(Math.round(sx), Math.round(sy - 6)); ctx.rotate(-Math.PI / 2);
    ctx.globalAlpha = o.alpha || 1; ctx.drawImage(frames[0], -7, -5); ctx.restore(); ctx.globalAlpha = 1;
    return;
  }
  drawShadow(ctx, sx, sy, 5);
  const frame = e.moving ? Math.floor(Game.time * 8) % 2 : 0;
  const drop = (o.kneel ? 3 : 0) + (e.sit ? 2 : 0);
  drawSpr(ctx, frames[frame], sx - 5 + (o.shake ? rrange(-1, 1) : 0), sy - 13 + drop);
}
function drawIcon(ctx, cam, e, ch, color) {
  const sx = Math.round(e.x - cam.x), sy = Math.round(e.y - cam.y - 24 + Math.sin(Game.time * 10));
  ctx.fillStyle = '#000'; ctx.fillRect(sx - 2, sy - 1, 5, 9);
  ctx.fillStyle = color;
  if (ch === '!') { ctx.fillRect(sx - 1, sy, 3, 5); ctx.fillRect(sx - 1, sy + 6, 3, 1); }
  else { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx + 1, sy + 1, 1, 2); ctx.fillRect(sx, sy + 3, 1, 2); ctx.fillRect(sx, sy + 6, 1, 1); }
}
function stepTo(e, gx, gy, speed, dt) {
  const d = dist(e.x, e.y, gx, gy);
  if (d < 3) return true;
  const n = norm(gx - e.x, gy - e.y), s = Math.min(speed * dt, d);
  // Упёрся совсем — пробуем боком. Если хоть по одной оси продвинулся, не мешаем, иначе тело дёргается туда-обратно
  const shift = (dx, dy) => { const ox = e.x, oy = e.y; moveBody(e, dx, dy); return Math.abs(e.x - ox) + Math.abs(e.y - oy); };
  if (shift(n.x * s, n.y * s) < s * 0.25 && shift(-n.y * s, n.x * s) < s * 0.25) shift(n.y * s, -n.x * s);
  e.moving = true; if (Math.abs(n.x) > 0.2) e.lr = n.x > 0 ? 'r' : 'l';
  e.angle = Math.atan2(n.y, n.x);
  return false;
}

// ---------- Собеседник ----------
class NPC {
  constructor(x, y, o) {
    Object.assign(this, { x, y, hw: 4, hh: 3, r: 6, z: 0, alive: true, lr: o.face || 'r', moving: false, flashT: 0 }, o);
  }
  update(dt) {
    this.moving = false;
    if (this.goal) { if (Nav.go(this, this.goal.x, this.goal.y, this.goalSpeed || 40, dt)) { const cb = this.goal.done; this.goal = null; cb && cb(); } return; }
    const p = Game.player;
    if (!this.lying && dist(p.x, p.y, this.x, this.y) < 40) this.lr = p.x > this.x ? 'r' : 'l';
  }
  interaction(p) {
    if (this.hidden || dist(p.x, p.y, this.x, this.y) > 38 || !Story.canTalk(this)) return null;
    return { key: this, x: this.x, y: this.y - 22, label: 'Space: говорить', done: () => Story.talk(this) };
  }
  draw(ctx, cam) { if (!this.hidden) drawHuman(ctx, cam, this); }
}

// ---------- Наблюдатель: хозяин прилавка или дома. Оглядывается, может дремать ----------
class Watcher extends NPC {
  constructor(x, y, o) {
    super(x, y, { look: [1.5, 3], angles: [Math.PI / 2, 0, Math.PI], ...o });
    this.angle = this.angles[0]; this.t = rrange(...this.look); this.awake = true; this.warn = 0; this.ai = 0;
    this.half = this.sit ? 1.0 : 0.85; this.range = this.sit ? 56 : 72;
  }
  update(dt) {
    super.update(dt);
    if (this.goal || this.hidden) return;
    this.t -= dt; this.warn = Math.max(0, this.warn - dt);
    if (this.sit) {
      if (this.t <= 0) { this.awake = !this.awake; this.t = this.awake ? rrange(...this.look) * 0.7 : rrange(...this.look); }
      if (this.awake) this.angle = Math.PI / 2 + Math.sin(Game.time * 1.3) * 1.2;
      else if (rnd() < 0.02) FX.parts.push({ x: this.x + 4, y: this.y - 16, vx: 4, vy: -8, life: 1, max: 1, color: '#ccd', size: 1 });
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
    if (this.awake && Story.showCone(this) && dist(p.x, p.y, this.x, this.y) < 140)
      drawCone(ctx, cam, this, this.angle, this.half, this.range, this.seesPlayer() ? 'rgba(255,70,50,0.22)' : 'rgba(255,220,120,0.12)');
    drawHuman(ctx, cam, this, { shake: this.warn > 0 });
    if (this.warn > 0) drawIcon(ctx, cam, this, '?', '#ffe080');
    if (this.sit && !this.awake) { ctx.fillStyle = '#ccd'; ctx.fillRect(Math.round(this.x - cam.x + 5), Math.round(this.y - cam.y - 18), 3, 1); }
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
    return { key: this, x: this.x, y: this.y - 22, label: 'Space: заговорить', done: () => { this.startChase(); Story.onTalkEnemy(this); } };
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
        if (this.alertT <= 0) { this.state = 'chase'; this.lostT = 0; Story.onSpotted(this); }
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
        if (p.alive && dist(p.x, p.y, this.x, this.y) < 10 && p.dashT <= 0) Story.onCaught(this);
        break;
      }
      case 'search':
        this.searchT -= dt; this.angle += dt * 2.4; this.lr = Math.cos(this.angle) > 0 ? 'r' : 'l';
        if (this.last && dist(this.x, this.y, this.last.x, this.last.y) > 4) Nav.go(this, this.last.x, this.last.y, this.patrolSpeed * 1.5, dt);
        if (seen) this.startChase();
        else if (this.searchT <= 0) { this.state = this.hunt ? 'hunt' : 'return'; this.huntT = 0; Story.onLost(this); }
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

// ---------- Охотник ----------
// Бросает камни полем. Устаёт после серии бросков — видно только по позе. Приходя в себя, отшвыривает героя.
class Hunter extends Enemy {
  constructor(x, y, o) {
    super(x, y, { name: 'Охотник', sprite: 'hunter', hp: 8, dmg: 1, xp: 60, r: 6, hw: 4, hh: 3, force: true, blood: '#a02030' }, { lvl: 6, ...o });
    this.maxHp = 8; this.hp = 8; this.dmg = 1; this.xp = 60;
    this.who = 'hunter'; this.keepBody = true; this.state = 'wait'; this.throwCd = 1; this.thrown = 0; this.lifted = null; this.hitsInWindow = 0; this.moving = false; this.tireAfter = 5;
  }
  hurt(dmg, dx, dy) { if (this.state === 'cutscene') { FX.burst(this.x, this.y - 6, '#c878ff', 6, 40); this.kvx = (dx || 0) * 80; this.kvy = (dy || 0) * 80; } }
  takeHit(dmg, src, dx, dy) {
    if (!this.alive || this.state === 'cutscene' || this.state === 'wait' || this.state === 'panting') return;
    if (this.state !== 'tired') {
      Sfx.clang(); FX.burst(this.x - dx * 6, this.y - 6, '#c878ff', 10, 50);
      const p = Game.player; p.kvx = -dx * 220; p.kvy = -dy * 220;
      Game.once('hunterField', () => Game.hint('Воздух вокруг него плотный, как стена. Уворачивайся и жди, пока он выдохнется.', 4));
      return;
    }
    super.takeHit(dmg, src, dx, dy);
    this.kvx *= 0.3; this.kvy *= 0.3;
    if (this.alive && ++this.hitsInWindow >= 2) { this.state = 'recover'; this.t = 0.3; }
  }
  die() {
    this.alive = false; this.dead = true; this.state = 'down';
    this.dropLifted(); FX.burst(this.x, this.y - 5, '#c878ff', 16, 70, 0.8); Sfx.thud(); FX.shake = 8;
    Game.onKill(this);
    Story.onHunterDown(this);
  }
  interaction(p) {
    if (!this.dead || this.looted || dist(p.x, p.y, this.x, this.y) > 22) return null;
    return { key: this, x: this.x, y: this.y - 16, hold: 1.0, label: 'Держи Space: обыскать сумку охотника', done: () => { this.looted = true; Story.lootHunter(); } };
  }
  dropLifted() { if (this.lifted) { this.lifted.state = 'rest'; this.lifted.land(); this.lifted = null; } }
  update(dt) {
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.kvx || this.kvy) { moveBody(this, this.kvx * dt, this.kvy * dt); this.kvx *= Math.pow(0.002, dt); this.kvy *= Math.pow(0.002, dt); if (Math.abs(this.kvx) + Math.abs(this.kvy) < 5) this.kvx = this.kvy = 0; }
    this.moving = false;
    if (this.goal) { if (Nav.go(this, this.goal.x, this.goal.y, 45, dt)) { const cb = this.goal.done; this.goal = null; cb && cb(); } return; }
    if (this.dead) {
      if (this.looted) { this.fade -= dt; if (this.fade <= 0) this.remove = true; }
      return;
    }
    const p = this.tgt;
    if (this.lifted) { this.lifted.tx = this.x + (this.lr === 'r' ? 7 : -7); this.lifted.ty = this.y - 2; this.lifted.carryZ = 14; }
    this.t -= dt;
    switch (this.state) {
      case 'wait': case 'panting':
        if (p && p.alive !== false) this.lr = p.x > this.x ? 'r' : 'l';
        if (this.state === 'panting' && rnd() < 0.08) puff(this.x, this.y - 14, '#dde');
        break;
      case 'hop':
        this.t -= dt;
        moveBody(this, this.hopDir.x * 230 * dt, this.hopDir.y * 230 * dt);
        if (rnd() < 0.5) puff(this.x, this.y, '#8a7a5a');
        if (this.t <= 0) { this.state = 'fight'; this.throwCd = 0.35; }
        break;
      case 'cutscene': case 'fight': {
        if (!p || !p.alive) break;
        this.lr = p.x > this.x ? 'r' : 'l';
        const d = dist(p.x, p.y, this.x, this.y), n = norm(p.x - this.x, p.y - this.y);
        this.hopCd = Math.max(0, (this.hopCd || 0) - dt);
        if (this.state === 'fight' && d < 26) {   // подпустил вплотную — отшвыривает и отпрыгивает
          const push = dist(p.x, p.y, this.x, this.y) < 18;
          if (push) { p.kvx = -n.x * 320; p.kvy = -n.y * 320; Sfx.push(); FX.burst(this.x, this.y - 6, '#c878ff', 12, 60); }
          if (this.hopCd <= 0) { this.hopCd = 3; this.state = 'hop'; this.t = 0.3; this.hopDir = { x: -n.x, y: -n.y }; this.dropLifted(); Sfx.dash(); break; }
        }
        const want = d < 70 ? -1 : d > 120 ? 1 : 0;
        if (!this.lifted) { moveBody(this, (n.x * want * 42 - n.y * 18) * dt, (n.y * want * 42 + n.x * 18) * dt); this.moving = want !== 0; }
        this.throwCd -= dt;
        if (!this.lifted && this.throwCd <= 0) this.lift();
        else if (this.lifted && this.t <= 0) this.throwAt(p);
        break;
      }
      case 'tired':
        if (rnd() < 0.12) puff(this.x + rrange(-3, 3), this.y - 12, '#dde');
        if (this.t <= 0) { this.state = 'recover'; this.t = 0.3; }
        break;
      case 'recover':
        if (this.t <= 0) this.shockwave();
        break;
    }
  }
  lift() {
    let best = null, bd = 130, far = null, fd = 1e9;
    for (const o of Game.objects) {
      if (o.state !== 'rest' || o.mass !== 'light') continue;
      const d = dist(o.x, o.y, this.x, this.y);
      if (d < bd) { bd = d; best = o; }
      if (d < fd) { fd = d; far = o; }
    }
    if (!best) {   // камни кончились рядом — идёт за ближайшим, ничего не создавая
      this.throwCd = 0.6;
      if (far) this.goal = { x: far.x + rrange(-14, 14), y: far.y + 12, done: () => { this.throwCd = 0; } };
      return;
    }
    best.state = 'held'; best.owner = 'hunter'; this.lifted = best; this.t = 0.38; Sfx.grab();
  }
  throwAt(p) {
    const o = this.lifted; this.lifted = null;
    const lead = p.moving ? 0.22 : 0, pf = p.face || { x: 0, y: 0 };
    const n = norm(p.x + pf.x * 72 * lead - o.x, p.y - 3 + pf.y * 72 * lead - o.y);
    o.launch(n.x, n.y, this.state === 'cutscene' ? 190 : 215, 240, 'hunter', true);
    o.dmg = 10; o.targets = [p];
    Sfx.throw();
    this.throwCd = this.state === 'cutscene' ? 0.7 : rrange(0.55, 0.95);
    if (this.state === 'fight' && ++this.thrown >= this.tireAfter) {
      this.state = 'tired'; this.t = 2.3; this.thrown = 0; this.hitsInWindow = 0; this.tireAfter = 5 + ((rnd() * 3) | 0);
      Game.once('hunterTired', () => Game.hint('Он еле стоит на ногах... Сейчас!', 2.5));
    }
  }
  shockwave() {
    const p = Game.player;
    this.state = 'fight'; this.throwCd = 0.8; Sfx.push(); FX.shake = 5;
    for (let i = 0; i < 24; i++) { const a = rnd() * 7, s = rrange(60, 160); FX.parts.push({ x: this.x, y: this.y - 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, color: '#c878ff', size: 1 }); }
    if (dist(p.x, p.y, this.x, this.y) < 60) { const n = norm(p.x - this.x, p.y - this.y); p.kvx = n.x * 300; p.kvy = n.y * 300; }
    Game.once('hunterRecover', () => Game.hint('Пришёл в себя и отшвырнул меня. Снова уворачиваться.', 3));
  }
  // Бросок в постановочной сцене: камень летит в зверя и никого не ранит
  sceneThrow(target) {
    let best = null, bd = 1e9;
    for (const o of Game.objects) { if (o.state !== 'rest' || o.mass !== 'light') continue; const d = dist(o.x, o.y, this.x, this.y); if (d < bd) { bd = d; best = o; } }
    if (!best) return;
    this.lr = target.x > this.x ? 'r' : 'l';
    const n = norm(target.x - best.x, target.y - 4 - best.y);
    best.launch(n.x, n.y, 210, 260, 'hunter', false);
    Sfx.throw(); Sfx.grab();
  }
  startFight() { this.state = 'fight'; this.target = null; this.throwCd = 0.2; this.thrown = 0; this.tireAfter = 5; }
  draw(ctx, cam) {
    if (this.dead) { drawHuman(ctx, cam, this, { lying: true, alpha: this.looted ? Math.max(0, this.fade / 1.2) : 1 }); return; }
    const kneel = this.state === 'tired' || this.state === 'panting';
    drawHuman(ctx, cam, this, { kneel, shake: this.state === 'recover' });
    const glow = kneel ? 0.3 : 0.6 + 0.4 * Math.sin(Game.time * 6);
    ctx.fillStyle = `rgba(200,140,255,${glow})`;
    ctx.fillRect(Math.round(this.x - cam.x + (this.lr === 'r' ? 4 : -5)), Math.round(this.y - cam.y - 6 + (kneel ? 3 : 0)), 1, 2);
    if (this.lifted) {
      ctx.fillStyle = 'rgba(200,140,255,0.8)';
      for (let i = 1; i < 5; i++) { const t = i / 5; ctx.fillRect(Math.round(lerp(this.x - cam.x, this.lifted.x - cam.x, t)), Math.round(lerp(this.y - cam.y - 6, this.lifted.y - this.lifted.z - cam.y, t)), 1, 1); }
    }
    const p = Game.player;
    if (this.state === 'fight' && dist(p.x, p.y, this.x, this.y) < 140) Game.labels.push({ x: this.x, y: this.y - 22, text: `ур.${this.lvl}`, color: '#ff9080' });
  }
}
