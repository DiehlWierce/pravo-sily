'use strict';
// Мини-босс Кейл — низкоуровневый пользователь с кристаллом в руке.
// Каждое его действие тратит энергию. Истощённый Кейл уязвим для ножа — это и есть «победа хитростью».

class Boss extends Enemy {
  constructor(x, y) {
    super(x, y, { name: 'Кейл', sprite: 'boss', maxHp: 5, r: 6, hw: 4, hh: 3, blood: '#a02030' });
    this.isBoss = true; this.active = false; this.state = 'idle';
    this.reset();
  }
  reset() {
    this.x = this.home.x; this.y = this.home.y; this.hp = this.maxHp; this.alive = true; this.dead = false;
    this.hasCrystal = true; this.state = 'idle'; this.active = false; this.energy = 100;
    this.t = 1; this.lifted = null; this.grabCd = 4; this.pushCd = 0; this.strafe = 1; this.kvx = this.kvy = 0;
    this.cast = null;
  }

  takeHit(dmg, src, dx, dy) {
    if (!this.alive) return;
    if (this.state !== 'exhausted') {
      const p = Game.player;
      Sfx.clang(); FX.burst(this.x - dx * 6, this.y - 6, '#c878ff', 10, 50);
      p.kvx = -dx * 200; p.kvy = -dy * 200;
      Game.once('bossField', () => Game.hint('Его поле отбрасывает нож. Уклоняйся (K), пока он не выдохнется.', 3.5));
      return;
    }
    super.takeHit(dmg, src, dx, dy);
    this.kvx *= 0.4; this.kvy *= 0.4;
  }
  pushed() { }

  die() {
    this.alive = false; this.dead = true; this.state = 'dead'; this.active = false;
    if (this.lifted) { this.lifted.state = 'rest'; this.lifted.land(); this.lifted = null; }
    FX.burst(this.x, this.y - 5, '#c878ff', 16, 70, 0.8); Sfx.thud(); FX.shake = 8;
    Game.onBossDefeated(this);
  }

  spend(e) { this.energy -= e; }

  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const p = Game.player;
    if (!this.active) { this.lr = p.x > this.x ? 'r' : 'l'; return; }
    const d = dist(p.x, p.y, this.x, this.y);
    this.t -= dt; this.grabCd -= dt; this.pushCd -= dt;

    if (this.lifted) { this.lifted.tx = this.x + (this.lr === 'r' ? 6 : -6); this.lifted.ty = this.y - 4; }

    switch (this.state) {
      case 'idle':
      case 'move': {
        this.lr = p.x > this.x ? 'r' : 'l';
        if (d > 260) { // игрок убежал — возвращается и восстанавливается
          const h = norm(this.home.x - this.x, this.home.y - this.y);
          moveBody(this, h.x * 50 * dt, h.y * 50 * dt); this.energy = Math.min(100, this.energy + 20 * dt);
          break;
        }
        const n = norm(p.x - this.x, p.y - this.y);
        const want = d < 60 ? -1 : d > 105 ? 1 : 0;
        if (rnd() < dt * 0.5) this.strafe *= -1;
        if (moveBody(this, (n.x * want * 45 - n.y * this.strafe * 30) * dt, (n.y * want * 45 + n.x * this.strafe * 30) * dt)) this.strafe *= -1;
        this.energy = Math.min(100, this.energy + 5 * dt);
        if (this.t > 0) break;
        if (this.energy < 15) { this.exhaust(); break; }
        if (d < 30 && this.pushCd <= 0 && this.energy >= 20) { this.state = 'pushWind'; this.t = 0.35; break; }
        if (this.grabCd <= 0 && this.energy >= 45 && rnd() < 0.5) {
          this.state = 'grabWind'; this.t = 0.9; this.cast = { x: p.x, y: p.y }; Sfx.grab();
          Game.once('bossGrab', () => Game.hint('Фиолетовый круг — он схватит тебя полем! Выходи рывком (K).', 3));
          break;
        }
        this.startLift();
        break;
      }
      case 'lift':
        if (this.t <= 0) this.throwRock();
        break;
      case 'grabWind':
        if (this.t <= 0) {
          this.spend(35); this.grabCd = 5;
          if (dist(p.x, p.y, this.cast.x, this.cast.y) < 17 && p.dashT <= 0 && p.alive) {
            p.liftT = 0.7; p.liftDir = norm(p.x - this.x || 1, p.y - this.y); Sfx.pain(); FX.shake = 4;
          } else FX.burst(this.cast.x, this.cast.y, '#c878ff', 12, 60);
          this.cast = null; this.after(0.7);
        }
        break;
      case 'pushWind':
        if (this.t <= 0) {
          this.spend(20); this.pushCd = 2.5; Sfx.push(); FX.shake = 4;
          for (let i = 0; i < 20; i++) { const a = rnd() * 7, s = rrange(60, 140); FX.parts.push({ x: this.x, y: this.y - 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, color: '#c878ff', size: 1 }); }
          if (d < 40) { const n = norm(p.x - this.x, p.y - this.y); p.hurt(1, n.x, n.y); p.kvx = n.x * 260; p.kvy = n.y * 260; }
          this.after(0.6);
        }
        break;
      case 'exhausted':
        if (rnd() < 0.1) FX.parts.push({ x: this.x + rrange(-4, 4), y: this.y - 14, vx: 0, vy: 15, life: 0.4, max: 0.4, color: '#8ac0e0', size: 1 });
        if (this.t <= 0) { this.state = 'move'; this.energy = 60; this.t = 0.8; }
        break;
      case 'cool':
        if (this.t <= 0) { this.state = 'move'; this.t = rrange(0.6, 1.2); }
        break;
    }
  }

  after(t) { if (this.energy < 15) this.exhaust(); else { this.state = 'cool'; this.t = t; } }

  exhaust() {
    this.state = 'exhausted'; this.t = 3.4; this.energy = Math.max(0, this.energy);
    Sfx.hurt(); FX.burst(this.x, this.y - 10, '#8ac0e0', 8, 30);
    Game.once('bossTired', () => Game.hint('Выдохся! Бей ножом (J), пока он не пришёл в себя!', 3));
  }

  startLift() {
    let best = null, bd = 150;
    for (const o of Game.objects) {
      if (o.state !== 'rest' || o.mass !== 'light') continue;
      const dd = dist(o.x, o.y, this.x, this.y);
      if (dd < bd) { bd = dd; best = o; }
    }
    if (!best) { // вырывает камень из земли
      best = new Obj('rock', this.x + rrange(-10, 10), this.y + 6); best.temp = true;
      Game.objects.push(best); this.spend(6); Sfx.thud(); FX.burst(best.x, best.y, '#5e4630', 10, 50);
    }
    best.state = 'held'; best.owner = 'boss'; best.hostile = false;
    this.lifted = best; this.spend(18);
    this.state = 'lift'; this.t = 0.6; Sfx.grab();
  }

  throwRock() {
    const p = Game.player, o = this.lifted; this.lifted = null;
    if (!o) { this.after(0.5); return; }
    const lead = p.moving ? 0.25 : 0;
    const n = norm(p.x + p.face.x * 72 * lead - o.x, p.y - 3 + p.face.y * 72 * lead - o.y);
    o.launch(n.x, n.y, 200, 230, 'boss', true);
    o.temp = true;
    Sfx.throw();
    this.after(rrange(0.4, 0.9));
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    if (this.cast) {
      const k = 1 - this.t / 0.9;
      ctx.strokeStyle = `rgba(200,120,255,${0.4 + k * 0.6})`;
      ctx.beginPath(); ctx.ellipse(Math.round(this.cast.x - cam.x), Math.round(this.cast.y - cam.y), 17, 8, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(200,120,255,${k * 0.3})`; ctx.fill();
    }
    if (this.dead) { super.draw(ctx, cam); return; }
    drawShadow(ctx, sx, sy, 5);
    const set = this.flashT > 0 ? Art.spr.boss.flash : Art.spr.boss;
    const kneel = this.state === 'exhausted' ? 2 : 0;
    const shake = this.state === 'pushWind' || this.state === 'grabWind' ? rrange(-1, 1) : 0;
    drawSpr(ctx, set[this.lr][0], sx - 5 + shake, sy - 13 + kneel);
    // Кристалл в руке и его свечение зависит от энергии
    const glow = this.energy / 100;
    ctx.fillStyle = `rgba(200,120,255,${0.35 + glow * 0.65})`;
    ctx.fillRect(Math.round(sx + (this.lr === 'r' ? 4 : -5)), Math.round(sy - 6 + kneel), 1, 2);
    if (this.lifted) {
      ctx.fillStyle = 'rgba(200,120,255,0.8)';
      for (let i = 1; i < 5; i++) { const t = i / 5; ctx.fillRect(Math.round(lerp(sx, this.lifted.x - cam.x, t)), Math.round(lerp(sy - 6, this.lifted.y - this.lifted.z - cam.y, t)), 1, 1); }
    }
    if (this.active) { // полоска энергии над головой — учит механике истощения
      ctx.fillStyle = '#1a1020'; ctx.fillRect(Math.round(sx - 8), Math.round(sy - 19), 16, 3);
      ctx.fillStyle = this.energy < 30 ? '#ff6080' : '#c878ff'; ctx.fillRect(Math.round(sx - 7), Math.round(sy - 18), Math.round(14 * clamp(this.energy / 100, 0, 1)), 1);
    }
  }
}
