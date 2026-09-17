'use strict';
// Базовый зверь: здоровье и уровни, выбор цели по фракциям, толчки, защита шкурой, добыча, свечение силы.
// Конкретные звери — entities/beasts.js, охотник — entities/hunter.js. Характеристики — data/enemies.js.

const NOBODY = { alive: false, x: -9999, y: -9999, z: 0 };   // «цели нет»

// Урон и цели: кто кого может ранить
const Combat = {
  actors() { return [Game.player, ...Game.enemies]; },
  hostilesOf(src) { return this.actors().filter(t => t && t.alive && t !== src && !t.dormant && Factions.hostile(src, t)); },
  canTouch(t) { return t.alive && (t.z || 0) < 4 && !(t.dashT > 0); },
  hit(t, dmg, dx, dy, src, attacker) {
    if (t === Game.player) t.hurt(dmg, dx, dy);
    else t.hurt(dmg, dx, dy, src, attacker);
  },
};

class Enemy {
  constructor(x, y, kind, o = {}) {
    const base = BEASTS[kind];
    Object.assign(this, {
      kind, x, y, home: { x, y }, z: 0, kvx: 0, kvy: 0, alive: true, dead: false, flashT: 0, stun: 0,
      lr: 'l', state: 'idle', t: rrange(0.5, 1.5), fade: 1.2, hw: 5, hh: 3, r: 6, sight: 120,
      looted: false, force: false, target: null, lvl: 1, faction: 'beast', auraT: 0, retargetT: 0,
    }, base, o);
    const L = CONFIG.enemyLevel, k = 1 + L.hp * (this.lvl - 1);
    this.maxHp = base.hp * k; this.hp = this.maxHp;
    this.dmg = Math.round((base.dmg || 0) * (1 + L.dmg * (this.lvl - 1)));
    this.xp = (base.xp || 0) * this.lvl;
    this.loot = { crystals: base.crystals || 0, meat: base.meat || 0 };
  }

  // ---------- Цель ----------
  get tgt() { return this.target && this.target.alive ? this.target : NOBODY; }
  // Раз в 0.4 с: ближайший враг, которого слышно (вплотную) или видно
  retarget(dt) {
    this.retargetT -= dt;
    if (this.retargetT > 0) return;
    this.retargetT = 0.4;
    if (this.sticky && this.target && this.target.alive) return;   // держится своей цели (например, в дуэли)
    if (this.target && this.target.alive && dist(this.target.x, this.target.y, this.x, this.y) < this.sight * 1.4) return;
    let best = null, bd = this.sight * 1.2;
    for (const t of Combat.hostilesOf(this)) {
      const d = dist(t.x, t.y, this.x, this.y);
      if (d < bd && (d < 80 || World.sight(this.x, this.y - 4, t.x, t.y - 4))) { best = t; bd = d; }
    }
    this.target = best;
  }
  sees(range) {
    const p = this.tgt;
    return p.alive && dist(p.x, p.y, this.x, this.y) < range && World.sight(this.x, this.y - 4, p.x, p.y - 4);
  }
  // Замечает добычу: слышит вблизи даже за кустами, видит — дальше
  notices(range) {
    const p = this.tgt;
    if (!p.alive) return false;
    const d = dist(p.x, p.y, this.x, this.y);
    return d < 80 || (d < range && World.sight(this.x, this.y - 4, p.x, p.y - 4));
  }
  approach(dt, speed, range = 200) {
    const p = this.tgt;
    if (!p.alive || dist(p.x, p.y, this.x, this.y) > range) return false;
    Nav.go(this, p.x, p.y, speed, dt);
    return true;
  }

  // ---------- Сила ----------
  pulseForce(t = 0.4) { this.auraT = Math.max(this.auraT, t); }
  // Насколько сильно светится сейчас (0..1). Наследники добавляют свечение по состояниям
  forceGlow() { return this.force ? clamp(this.auraT / 0.4, 0, 1) : 0; }

  // Шкура и кость держат нож, пока герой слаб: пробить можно ударом не слабее остатка здоровья зверя
  guard(dmg, dx, dy, key, text, attacker) {
    if (dmg >= this.hp) return false;
    Sfx.clang(); FX.burst(this.x + dx * 6, this.y - 6, '#fff', 5, 45);
    if (attacker && attacker.kvx !== undefined && dist(attacker.x, attacker.y, this.x, this.y) < 30) knock(attacker, -dx * 150, -dy * 150);
    if (attacker === Game.player) Game.once(key, () => Game.hint(text, 4.5));
    return true;
  }
  // Отталкивает силой того, кто лезет вплотную не вовремя
  repel(dt) {
    this.repelCd = Math.max(0, (this.repelCd || 0) - dt);
    if (this.repelCd > 0) return;
    for (const t of Combat.hostilesOf(this)) {
      if ((t.z || 0) > 4 || t.dashT > 0 || dist(t.x, t.y, this.x, this.y) > this.r + (t.r || 6) + 3) continue;
      this.repelCd = 1.5; this.pulseForce(0.5);
      const n = norm(t.x - this.x || 1, t.y - this.y);
      knock(t, n.x * 280, n.y * 280);
      FX.ring(this.x, this.y, 9, FORCE.push.color, 14); Sfx.push();
      if (t === Game.player) Game.once('repelHint', () => Game.hint('Он отшвыривает меня одним движением. Соваться вплотную нельзя.', 4));
      return;
    }
  }

  // ---------- Урон ----------
  takeHit(dmg, src, dx, dy, attacker) {
    if (!this.alive) return;
    if (attacker) {
      this.lastHitBy = attacker;
      if (Factions.hostile(this, attacker)) this.target = attacker;
    }
    const kb = this.state === 'stunned' || this.state === 'panting' || this.state === 'tired' ? 25 : 100;
    this.hp -= dmg; this.flashT = 0.15; this.kvx = dx * kb; this.kvy = dy * kb;
    Sfx.hit(); FX.burst(this.x, this.y - 5, this.blood || '#a04030', 6, 50); FX.shake = Math.max(FX.shake, 2);
    if (this.hp <= 0.001) this.die();
    else if (this.onHurt) this.onHurt(src, attacker);
  }
  hurt(dmg, dx, dy, src = 'object', attacker = null) { this.takeHit(dmg, src, Math.sign(dx) || 0, Math.sign(dy) || 0, attacker); }
  die() {
    this.alive = false; this.dead = true; this.state = 'dead'; this.z = 0;
    FX.burst(this.x, this.y - 5, this.force ? '#7cf0ff' : '#a04030', 12, 60, 0.6); Sfx.thud();
    Game.onKill(this);
  }
  get killedByPlayer() { return this.lastHitBy === Game.player; }

  interaction(p) {
    if (!this.dead || this.looted || dist(p.x, p.y, this.x, this.y) > 20 + this.r) return null;
    return {
      key: this, x: this.x, y: this.y - 16, hold: 0.9,
      label: this.loot.crystals ? 'Держи Space: вырезать кристалл' : 'Держи Space: разделать тушу',
      tick: () => { if (rnd() < 0.3) FX.puff(this.x, this.y - 4, this.loot.crystals ? '#7cf0ff' : '#a04030'); },
      done: () => { this.looted = true; Game.onLoot(this); },
    };
  }

  // Оказался внутри дерева или стены (завал, толчок, сдвиг карты) — выбираемся на свободное место,
  // иначе тело не может сдвинуться ни на пиксель и бой встаёт намертво
  unstick() {
    if (!World.boxHits(this.x, this.y, this.hw, this.hh, false)) return;
    const f = Game.freeSpot(this.x, this.y);
    this.x = f.x; this.y = f.y; this.nav = null;
  }
  // Общее для всех: отбрасывание, оглушение, смерть. false — дальше ИИ не думает
  baseUpdate(dt) {
    this.flashT = Math.max(0, this.flashT - dt);
    this.auraT = Math.max(0, this.auraT - dt);
    updateKnockback(this, dt);
    this.unstick();
    if (this.dead) { if (this.looted) { this.fade -= dt; if (this.fade <= 0) this.remove = true; } return false; }
    if (this.dormant) return false;
    this.retarget(dt);
    if (this.state === 'stunned') {
      this.stun -= dt;
      if (rnd() < 0.15) FX.add({ x: this.x + rrange(-4, 4), y: this.y - 14, vx: 0, vy: -8, life: 0.4, max: 0.4, color: '#ffe060', size: 1 });
      if (this.stun <= 0) { this.state = 'idle'; this.t = 0.3; }
      return false;
    }
    return true;
  }
  touch(dmg, reach = 5) {
    const p = this.tgt;
    if (Combat.canTouch(p) && dist(p.x, p.y, this.x, this.y) < this.r + reach) {
      const n = norm(p.x - this.x, p.y - this.y); Combat.hit(p, dmg, n.x, n.y, 'claw', this); return true;
    }
    return false;
  }
  leash(dt) {
    if (dist(this.x, this.y, this.home.x, this.home.y) > 200 && !this.sees(this.sight)) { Nav.go(this, this.home.x, this.home.y, 40, dt); return true; }
    return false;
  }
  wander(dt, speed) {
    if (this.t <= 0) { const a = rnd() * 7; this.dir = { x: Math.cos(a), y: Math.sin(a) }; this.t = rrange(0.6, 1.6); this.walking = rnd() < 0.6; }
    if (this.walking && this.dir) { moveBody(this, this.dir.x * speed * dt, this.dir.y * speed * dt); if (this.dir.x) this.lr = this.dir.x > 0 ? 'r' : 'l'; }
  }

  sprName() { return this.sprite; }
  draw(ctx, cam) {
    const set = Art.spr[this.sprName()], img = (this.flashT > 0 ? set.flash : set)[this.lr][0];
    const sx = this.x - cam.x, sy = this.y - cam.y;
    drawShadow(ctx, sx, sy, this.r - 1);
    if (this.dead) {
      ctx.globalAlpha = this.looted ? Math.max(0, this.fade / 1.2) * 0.6 : 0.6;
      drawSpr(ctx, img, sx - img.width / 2, sy - img.height + 2);
      ctx.globalAlpha = 1;
      if (!this.looted && this.loot.crystals) drawSpr(ctx, Art.spr.crystal, sx - 2, sy - img.height - 6 + Math.sin(Game.time * 5) * 1.5);
      return;
    }
    const ox = this.state === 'windup' || this.state === 'crouch' ? rrange(-1, 1) : 0;
    const x = sx - img.width / 2 + ox, y = sy - img.height - this.z;
    const glow = this.forceGlow();
    if (glow > 0) { Aura.draw(ctx, set[this.lr][0], x, y, glow); Aura.sparks(this.x, this.y - this.z - img.height / 2, glow); }
    drawSpr(ctx, img, x, y);
    if ((this.state === 'panting' || this.state === 'tired') && rnd() < 0.15)
      FX.add({ x: this.x + rrange(-5, 5), y: this.y - img.height - 2, vx: 0, vy: -10, life: 0.5, max: 0.5, color: '#dde', size: 1 });
    const p = Game.player;
    if (!this.hideLevel && !this.dormant && Settings.get('levels') && dist(p.x, p.y, this.x, this.y) < 120)
      Game.labels.push({ x: this.x, y: this.y - img.height - this.z - 8, text: `ур.${this.lvl}`, color: this.lvl > p.level ? '#ff9080' : '#d8d0c0' });
  }
}
