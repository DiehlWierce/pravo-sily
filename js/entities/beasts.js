'use strict';
// Звери. Обычные (заяц, кабан) и звери силы (шипогрыз, прыгуны, метатель).
// Звери силы светятся фиолетовым, когда применяют силу: рывок, прыжок, выстрел, толчок.

class Rabbit extends Enemy {
  constructor(x, y, o) { super(x, y, 'rabbit', o); this.run = 0; this.rest = 0; }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const p = Game.player, d = dist(p.x, p.y, this.x, this.y); this.t -= dt;
    this.rest = Math.max(0, this.rest - dt);
    if (d < 70 && this.rest <= 0 && p.alive) {
      this.run += dt;
      const n = norm(this.x - p.x, this.y - p.y);
      if (moveBody(this, (n.x + rrange(-0.3, 0.3)) * 100 * dt, (n.y + rrange(-0.3, 0.3)) * 100 * dt)) moveBody(this, -n.y * 100 * dt, n.x * 100 * dt);
      this.lr = n.x > 0 ? 'r' : 'l';
      if (this.run > 1.6) { this.run = 0; this.rest = 1; }
    } else this.wander(dt, 15);
  }
}

class Boar extends Enemy {
  constructor(x, y, o) { super(x, y, 'boar', o); this.angry = false; }
  onHurt(src, attacker) { this.angry = true; this.target = attacker || Game.player; if (this.state !== 'charge') { this.state = 'windup'; this.t = 0.5; } }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const p = this.target && this.target.alive ? this.target : Game.player; this.t -= dt;
    if (this.state === 'windup') {
      const n = norm(p.x - this.x, p.y - this.y); this.dir = n; this.lr = n.x > 0 ? 'r' : 'l';
      if (this.t <= 0) { this.state = 'charge'; this.t = 0.6; Sfx.dash(); }
    } else if (this.state === 'charge') {
      const hit = moveBody(this, this.dir.x * 150 * dt, this.dir.y * 150 * dt);
      const touched = Combat.canTouch(p) && dist(p.x, p.y, this.x, this.y) < this.r + 5;
      if (touched) { const n = norm(p.x - this.x, p.y - this.y); Combat.hit(p, this.dmg, n.x, n.y, 'tusk', this); }
      if (touched || hit || this.t <= 0) { this.state = 'idle'; this.t = 1.2; }
    } else {
      if (this.angry && this.t <= 0 && dist(p.x, p.y, this.x, this.y) < 90 && World.sight(this.x, this.y - 4, p.x, p.y - 4)) { this.state = 'windup'; this.t = 0.5; return; }
      this.wander(dt, 12);
    }
  }
}

// Шипогрыз: серии быстрых рывков, после серии — передышка. Нож берёт только оглушённого или выдохшегося.
class Spiker extends Enemy {
  constructor(x, y, o) { super(x, y, 'spiker', o); this.chain = 0; this.dir = { x: 1, y: 0 }; }
  sprName() { return this.disguised ? 'boar' : 'spiker'; }
  get hideLevel() { return this.disguised; }
  reveal() {
    if (!this.disguised) return;
    this.disguised = false; FX.burst(this.x, this.y - 8, '#ff3030', 16, 70, 0.6); FX.shake = 6; Sfx.roar();
    Events.emit('spiker:reveal', this);
  }
  vulnerable() { return this.state === 'stunned' || this.state === 'panting' || this.state === 'gap'; }
  forceGlow() {
    if (this.disguised) return 0;
    if (this.state === 'charge') return 1;
    if (this.state === 'windup') return 0.5;
    return super.forceGlow();
  }
  takeHit(dmg, src, dx, dy, attacker) {
    if (this.disguised) this.reveal();
    if (src === 'knife' && !this.vulnerable() && this.guard(dmg, dx, dy, 'spikerHide',
      'Нож отскакивает от шкуры! Жди передышки после рывков или заставь врезаться в дерево.', attacker)) return;
    super.takeHit(dmg, src, dx, dy, attacker);
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const p = this.tgt; this.t -= dt;
    if (this.disguised) { this.wander(dt, 12); const hero = Game.player; if (hero.alive && dist(hero.x, hero.y, this.x, this.y) < 56) this.reveal(); return; }
    if (!this.vulnerable()) this.repel(dt);
    switch (this.state) {
      case 'idle':
        if (this.notices(this.sight)) { this.state = 'windup'; this.t = 0.32; this.chain = 0; break; }
        if (this.leash(dt)) break;
        if (!this.approach(dt, 45)) this.wander(dt, 22);
        break;
      case 'windup':
        if (this.t > 0.1 && p.alive) { const n = norm(p.x - this.x, p.y - this.y); this.dir = n; this.lr = n.x > 0 ? 'r' : 'l'; }
        if (this.t <= 0) { this.state = 'charge'; this.t = 0.62; Sfx.dash(); }
        break;
      case 'charge': {
        const hit = moveBody(this, this.dir.x * 275 * dt, this.dir.y * 275 * dt);
        if (rnd() < 0.6) FX.add({ x: this.x, y: this.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: rnd() < 0.5 ? '#5e4630' : FORCE.push.color, size: 2 });
        if (hit) {
          this.state = 'stunned'; this.stun = 2.3; FX.shake = 6; Sfx.thud(); FX.burst(this.x + this.dir.x * 8, this.y - 4, '#ddd', 10, 60);
          if (dist(Game.player.x, Game.player.y, this.x, this.y) < 160) Game.once('spikerStun', () => Game.hint('Врезался! Бей, пока оглушён!', 2.5));
        } else if (this.touch(this.dmg) || this.t <= 0) this.nextCharge();
        break;
      }
      case 'gap':   // короткая пауза между рывками — здесь шкура не спасает
        if (this.t <= 0) { if (this.notices(this.sight + 40)) { this.state = 'windup'; this.t = 0.28; } else { this.state = 'idle'; this.t = 0.5; } }
        break;
      case 'panting':
        if (this.t <= 0) { this.state = 'idle'; this.t = 0; }
        break;
    }
  }
  nextCharge() {
    if (++this.chain >= 2) {
      this.state = 'panting'; this.t = 1.7; this.chain = 0;
      if (this.target === Game.player) Game.once('spikerPant', () => Game.hint('Выдохся после серии рывков — бей сейчас!', 2.5));
    } else { this.state = 'gap'; this.t = 0.45; }
  }
}

// Костяной прыгун: хищник с когтями. Бьёт силой вокруг себя при прыжке и в месте приземления.
class Jumper extends Enemy {
  constructor(x, y, o, kind = 'jumper') { super(x, y, kind, o); this.jumps = 0; }
  vulnerable() { return this.state === 'land' || this.state === 'tired' || this.state === 'stunned'; }
  forceGlow() {
    if (this.state === 'air') return 1;
    if (this.state === 'crouch') return 0.4 + 0.6 * (1 - this.t / 0.45);
    return super.forceGlow();
  }
  takeHit(dmg, src, dx, dy, attacker) {
    if (this.state === 'air') return;
    // Пластины большого прыгуна гасят камни: всерьёз ранит только после приземления или когда выдохся
    if (this.big && src === 'rock') {
      dmg *= this.vulnerable() ? 0.6 : 0.15;
      if (!this.vulnerable()) { Sfx.clang(); FX.burst(this.x, this.y - 10, '#e8e0d0', 6, 50); }
    }
    if (src === 'knife' && !this.vulnerable()) {
      Sfx.clang(); FX.burst(this.x, this.y - 6, '#fff', 4, 40);
      if (attacker && attacker.kvx !== undefined) knock(attacker, -dx * 120, -dy * 120);
      if (attacker === Game.player) Game.once('jumperBone', () => Game.hint('Костяные пластины держат удар. Бей сразу после приземления или когда выдохнется.', 4.5));
      return;
    }
    super.takeHit(dmg, src, dx, dy, attacker);
  }
  // Удар силой по кругу: ранит всех врагов прыгуна в радиусе
  blastAt(x, y) {
    const r = this.blast;
    this.pulseForce(0.5);
    FX.ring(x, y, r, FORCE.push.color, this.big ? 30 : 20); FX.ring(x, y, r * 0.6, FORCE.push.light, 12);
    Sfx.thud(); if (dist(Game.player.x, Game.player.y, x, y) < 220) FX.shake = Math.max(FX.shake, this.big ? 5 : 3);
    for (const t of Combat.hostilesOf(this)) {
      if (!Combat.canTouch(t) || dist(t.x, t.y, x, y) >= r + (t.hw || 4)) continue;
      const n = norm(t.x - x || 1, t.y - y);
      Combat.hit(t, this.dmg, n.x, n.y, 'blast', this);
      knock(t, n.x * 220, n.y * 220);
    }
  }
  update(dt) {
    if (!this.baseUpdate(dt)) { if (this.state !== 'air') this.z = 0; return; }
    const p = this.tgt; this.t -= dt;
    if (!this.vulnerable() && this.state !== 'air') this.repel(dt);
    switch (this.state) {
      case 'idle':
        if (this.t <= 0 && this.notices(this.sight)) { this.state = 'crouch'; this.t = 0.45; this.lr = p.x > this.x ? 'r' : 'l'; this.aim = { x: p.x, y: p.y }; }
        else if (!this.leash(dt) && !this.approach(dt, 30)) this.wander(dt, 10);
        break;
      case 'crouch':
        if (p.alive) this.aim = { x: p.x, y: p.y };
        if (this.t <= 0) {
          this.from = { x: this.x, y: this.y }; this.to = { ...this.aim };
          if (dist(this.x, this.y, this.to.x, this.to.y) > this.reach) { const n = norm(this.to.x - this.x, this.to.y - this.y); this.to = { x: this.x + n.x * this.reach, y: this.y + n.y * this.reach }; }
          this.blastAt(this.x, this.y);
          this.state = 'air'; this.t = 0.62; this.airMax = 0.62; Sfx.dash();
        }
        break;
      case 'air': {
        const k = 1 - this.t / this.airMax;
        this.z = Math.sin(k * Math.PI) * (this.big ? 34 : 26);
        const nx = lerp(this.from.x, this.to.x, k), ny = lerp(this.from.y, this.to.y, k);
        if (!World.boxHits(nx, ny, this.hw, this.hh, true)) { this.x = nx; this.y = ny; }
        if (this.t <= 0) {
          this.z = 0;
          if (World.boxHits(this.x, this.y, this.hw, this.hh, false)) { this.x = this.from.x; this.y = this.from.y; }
          this.blastAt(this.x, this.y);
          if (++this.jumps >= 3) {
            this.jumps = 0; this.state = 'tired'; this.t = 1.9;
            if (this.target === Game.player) Game.once('jumperTired', () => Game.hint('Выдохся! Сейчас!', 2));
          } else { this.state = 'land'; this.t = 0.75; }
        }
        break;
      }
      case 'land': case 'tired':
        if (this.t <= 0) { this.state = 'idle'; this.t = rrange(0.2, 0.5); }
        break;
    }
  }
  draw(ctx, cam) {
    // Предупреждающие круги: вокруг перед прыжком и в точке приземления
    const warn = (x, y, a) => { ctx.strokeStyle = `rgba(${FORCE.push.rgb},${a})`; ctx.beginPath(); ctx.ellipse(Math.round(x - cam.x), Math.round(y - cam.y), this.blast, this.blast * 0.5, 0, 0, 7); ctx.stroke(); };
    if (this.alive && this.state === 'crouch') warn(this.x, this.y, 0.35 + 0.55 * (1 - this.t / 0.45));
    if (this.alive && this.state === 'air') { warn(this.to.x, this.to.y, 0.4 + 0.5 * (1 - this.t / this.airMax)); drawShadow(ctx, this.x - cam.x, this.y - cam.y, (this.big ? 10 : 5) - this.z / 10); }
    super.draw(ctx, cam);
  }
}

class BigJumper extends Jumper {
  constructor(x, y, o) { super(x, y, o, 'bigJumper'); this.hideLevel = true; }
}

// Метатель: зверь, выстреливает веером шипов силой
class Thrower extends Enemy {
  constructor(x, y, o) { super(x, y, 'thrower', o); this.cd = 1.5; }
  forceGlow() {
    if (this.state === 'windup') return 0.4 + 0.6 * (1 - this.t / 0.5);
    if (this.state === 'hop') return 0.9;
    return super.forceGlow();
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const p = this.tgt, d = dist(p.x, p.y, this.x, this.y);
    if (!this.notices(this.sight)) { if (!this.approach(dt, 26)) this.wander(dt, 10); this.t -= dt; return; }
    this.lr = p.x > this.x ? 'r' : 'l';
    const n = norm(p.x - this.x, p.y - this.y);
    this.hopCd = Math.max(0, (this.hopCd || 0) - dt);
    if (this.state === 'hop') {
      this.t -= dt;
      moveBody(this, this.dir.x * 200 * dt, this.dir.y * 200 * dt);
      if (rnd() < 0.5) FX.puff(this.x, this.y, '#5e4630');
      if (this.t <= 0) { this.state = 'idle'; this.cd = Math.min(this.cd, 0.5); }
      return;
    }
    if (this.state === 'windup') {
      this.t -= dt;
      if (this.t <= 0) {
        const a = Math.atan2(n.y, n.x);
        for (const off of [-0.22, 0, 0.22]) Game.projectiles.push(new Spike(this.x, this.y - 4, Math.cos(a + off), Math.sin(a + off), 175, this.dmg, this));
        Sfx.throw(); this.state = 'idle'; this.cd = 2.2; this.pulseForce(0.4);
        if (p === Game.player) Game.once('seeThrower', () => Game.hint('Метатель стреляет шипами веером. Рывок сквозь шипы или уходи в сторону.', 4));
      }
      return;
    }
    if (d < 44 && this.hopCd <= 0) {   // подпустил слишком близко — отпрыгивает рывком
      this.hopCd = 2.4; this.state = 'hop'; this.t = 0.32; this.dir = { x: -n.x, y: -n.y }; Sfx.dash();
      return;
    }
    if (d < 64) moveBody(this, -n.x * 48 * dt, -n.y * 48 * dt);
    else if (d > 125) moveBody(this, n.x * 34 * dt, n.y * 34 * dt);
    else moveBody(this, -n.y * 20 * dt, n.x * 20 * dt);
    this.cd -= dt;
    if (this.cd <= 0) { this.state = 'windup'; this.t = 0.5; }
  }
  sprName() { return 'thrower'; }
}
