'use strict';
// Предметы и точки мира: камни и ящики, снаряды, травы, костры, кучи хлама, тайники и прилавки.

// ---------- Предметы: камни (снаряды охотника), ящики, бочки, валуны ----------
class Obj {
  constructor(kind, x, y) {
    Object.assign(this, OBJ_KINDS[kind]);
    Object.assign(this, { kind, x, y, home: { x, y }, state: 'rest', owner: null, hostile: false, vx: 0, vy: 0, z: 0, range: 0, travelled: 0, tx: x, ty: y, temp: false, ttl: 0, targets: null });
  }
  // owner — кто бросил (сущность); hostile — ранит ли; targets — явный список целей (иначе все враги владельца)
  launch(dx, dy, speed, range, owner, hostile) {
    Object.assign(this, { state: 'thrown', vx: dx * speed, vy: dy * speed, range, travelled: 0, owner, hostile, z: 7 });
  }
  get forced() { return this.owner && this.owner.force && (this.state === 'held' || this.state === 'thrown'); }
  update(dt) {
    if (this.state === 'held') {
      const k = Math.min(1, dt * 16);
      this.x = lerp(this.x, this.tx, k); this.y = lerp(this.y, this.ty, k); this.z = lerp(this.z, this.carryZ || 10, k);
      if (this.forced) Aura.sparks(this.x, this.y - this.z, 0.6);
      return;
    }
    if (this.state === 'thrown') {
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      let hitWall = false;
      if (World.boxHits(nx, this.y, this.hw, this.hh, true)) hitWall = true; else this.x = nx;
      if (World.boxHits(this.x, ny, this.hw, this.hh, true)) hitWall = true; else this.y = ny;
      this.travelled += Math.hypot(this.vx, this.vy) * dt;
      if (this.forced && rnd() < 0.7) FX.add({ x: this.x, y: this.y - this.z, vx: 0, vy: 0, life: 0.25, max: 0.25, color: FORCE.push.color, size: 1 });
      let struck = false;
      if (this.hostile) for (const t of this.targets || Combat.hostilesOf(this.owner)) {
        if (!t.alive || (t.z || 0) > 10 || t.dashT > 0) continue;
        if (Math.abs(t.x - this.x) < this.hw + (t.hw || 5) && Math.abs(t.y - 4 - this.y) < this.hh + 7) {
          Combat.hit(t, this.dmg, Math.sign(this.vx), Math.sign(this.vy), 'rock', this.owner);
          FX.burst(this.x, this.y - this.z, '#ccc', 6, 50); struck = true; break;
        }
      }
      if (hitWall) { Sfx.thud(); FX.burst(this.x, this.y, '#999', 5, 40); }
      if (hitWall || struck || this.travelled >= this.range) this.land();
      return;
    }
    if (this.temp) { this.ttl -= dt; if (this.ttl <= 0) this.remove = true; }
  }
  land() {
    this.state = 'rest'; this.vx = this.vy = 0; this.z = 0; this.hostile = false;
    if (World.solidWalk(World.atPx(this.x, this.y))) { if (this.temp) this.remove = true; else { this.x = this.home.x; this.y = this.home.y; } }
    if (this.temp) this.ttl = 5;
  }
  draw(ctx, cam) {
    const img = Art.spr[this.kind];
    const alpha = this.temp && this.state === 'rest' && this.ttl < 1.5 ? (Math.sin(this.ttl * 20) > 0 ? 1 : 0.3) : 1;
    const x = this.x - img.width / 2 - cam.x, y = this.y + this.hh - img.height - this.z - cam.y;
    drawShadow(ctx, this.x - cam.x, this.y + this.hh - 1 - cam.y, this.hw + 1);
    if (this.forced) Aura.draw(ctx, img, x, y, 0.8 + 0.2 * Math.sin(Game.time * 12));
    ctx.globalAlpha = alpha; drawSpr(ctx, img, x, y); ctx.globalAlpha = 1;
  }
}

// Шип метателя: ранит врагов того, кто выстрелил
class Spike {
  constructor(x, y, dx, dy, speed, dmg, owner) { Object.assign(this, { x, y, vx: dx * speed, vy: dy * speed, dmg, ttl: 1.6, owner }); }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.ttl -= dt;
    if (this.ttl <= 0 || World.solidFly(World.atPx(this.x, this.y))) { this.remove = true; return; }
    if (rnd() < 0.5) FX.add({ x: this.x, y: this.y - 4, vx: 0, vy: 0, life: 0.2, max: 0.2, color: FORCE.push.color, size: 1 });
    for (const t of Combat.hostilesOf(this.owner)) {
      if (!Combat.canTouch(t) || Math.abs(t.x - this.x) > (t.hw || 5) + 1 || Math.abs(t.y - 5 - this.y) > 7) continue;
      Combat.hit(t, this.dmg, Math.sign(this.vx), Math.sign(this.vy), 'spike', this.owner);
      FX.burst(this.x, this.y, '#e0d4a8', 5, 40); this.remove = true; return;
    }
  }
  draw(ctx, cam) {
    const a = Math.atan2(this.vy, this.vx);
    ctx.save(); ctx.translate(Math.round(this.x - cam.x), Math.round(this.y - cam.y - 4)); ctx.rotate(a);
    ctx.fillStyle = `rgba(${FORCE.push.rgb},0.5)`; ctx.fillRect(-2, -1, 7, 3);
    ctx.drawImage(Art.spr.spike, -2, 0); ctx.restore();
  }
}

// Метательный нож героя: летит по прямой, пробивает только уязвимого зверя
class ThrownKnife {
  constructor(x, y, dx, dy, dmg) { const c = CONFIG.player.throwKnife; Object.assign(this, { x, y, vx: dx * c.speed, vy: dy * c.speed, dmg, life: c.life }); }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
    if (this.life <= 0 || World.solidFly(World.atPx(this.x, this.y))) { this.remove = true; FX.puff(this.x, this.y, '#aaa', 3); return; }
    for (const e of Game.enemies) {
      if (!e.alive || e.z > 6 || dist(e.x, e.y - 4, this.x, this.y) > e.r + 4) continue;
      e.takeHit(this.dmg, 'knife', Math.sign(this.vx), Math.sign(this.vy), Game.player); this.remove = true; return;
    }
  }
  draw(ctx, cam) {
    const n = norm(this.vx, this.vy), x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y - 5);
    ctx.fillStyle = '#d8dce0'; for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x - n.x * i), Math.round(y - n.y * i), 1, 1);
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(Math.round(x - n.x * 5), Math.round(y - n.y * 5), 1, 1);
  }
}

// ---------- Травы и ягоды: подбираются, если наступить ----------
class Pickup {
  constructor(kind, x, y) { this.kind = kind; this.x = x; this.y = y; this.t = rnd() * 6; }
  update(dt) {
    this.t += dt;
    const p = Game.player;
    if (!p.alive || dist(p.x, p.y - 3, this.x, this.y) > 10) return;
    if (this.kind === 'herb') { Inv.add('herbs'); Game.hint('Целебная трава: немного лечит (вещи — Enter)', 2.5); }
    else { if (p.hp >= p.maxHp && p.stamina > p.maxStamina * 0.9) return; p.eat(25, 2, 'Ягоды: немного сил'); }
    Sfx.pick(); FX.burst(this.x, this.y, '#fff', 6, 30); this.remove = true;
  }
  draw(ctx, cam) {
    const img = Art.spr[this.kind];
    drawSpr(ctx, img, this.x - img.width / 2 - cam.x, this.y - img.height + Math.sin(this.t * 3) - cam.y);
  }
}

// ---------- Точка взаимодействия: дверь, проход, доска заказов, место находки ----------
class Spot {
  constructor(x, y, o) { Object.assign(this, { x, y, r: 20, hold: 0 }, o); }
  update() { }
  interaction(p) {
    if (this.used || (this.cond && !this.cond()) || dist(p.x, p.y, this.x, this.y) > this.r) return null;
    return { key: this, x: this.x, y: this.y - 18, label: typeof this.label === 'function' ? this.label() : this.label, hold: this.hold, done: () => this.fn(this) };
  }
  draw(ctx, cam) {
    if (!this.sprite || this.used) return;
    const img = Art.spr[this.sprite];
    drawSpr(ctx, img, this.x - img.width / 2 - cam.x, this.y - img.height - cam.y);
  }
}

// ---------- Костёр: жарка, отдых, сохранение ----------
class Campfire {
  constructor(x, y, o = {}) { Object.assign(this, { x, y, lit: false }, o); }
  update() {
    if (this.lit && rnd() < 0.3) FX.add({ x: this.x + rrange(-3, 3), y: this.y - 6, vx: rrange(-5, 5), vy: -rrange(15, 30), life: 0.7, max: 0.7, color: rnd() < 0.5 ? '#ffb040' : '#ff6020', size: 1 });
  }
  interaction(p) {
    if (dist(p.x, p.y, this.x, this.y) > 22) return null;
    return { key: this, x: this.x, y: this.y - 18, label: this.lit ? 'Space: костёр' : 'Space: разжечь костёр', done: () => Game.useCampfire(this) };
  }
  draw(ctx, cam) {
    const sx = Math.round(this.x - cam.x), sy = Math.round(this.y - cam.y);
    ctx.fillStyle = '#6a6a66'; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; ctx.fillRect(sx + Math.round(Math.cos(a) * 7) - 1, sy + Math.round(Math.sin(a) * 3) - 1, 3, 2); }
    ctx.fillStyle = '#4a2e18'; ctx.fillRect(sx - 5, sy - 2, 10, 2); ctx.fillRect(sx - 3, sy - 3, 6, 1);
    if (!this.lit) return;
    ctx.fillStyle = 'rgba(255,160,60,0.12)'; ctx.beginPath(); ctx.arc(sx, sy - 4, 30 + Math.sin(Game.time * 9), 0, 7); ctx.fill();
    const f = Math.floor(Game.time * 8) % 2;
    ctx.fillStyle = '#ff6020'; ctx.fillRect(sx - 3, sy - 7 - f, 6, 5 + f);
    ctx.fillStyle = '#ffc040'; ctx.fillRect(sx - 1 - f, sy - 9 + f, 3, 6 - f);
    ctx.fillStyle = '#fff0a0'; ctx.fillRect(sx, sy - 5, 1, 3);
  }
}

// ---------- Куча хлама: после обыска исчезает. gives — вместо хлама особый предмет ----------
class JunkPile {
  constructor(x, y, o) { Object.assign(this, { x, y, item: 'Хлам' }, o); }
  update() { }
  interaction(p) {
    if (this.remove || dist(p.x, p.y, this.x, this.y) > 18) return null;
    return {
      key: this, x: this.x, y: this.y - 16, hold: 0.8, label: 'Держи Space: рыться в мусоре',
      tick: () => { if (rnd() < 0.2) Sfx.blip(); },
      done: () => {
        this.remove = true; Sfx.pick(); FX.burst(this.x, this.y - 3, '#8a7a60', 8, 30);
        if (this.gives) { Inv.add(this.gives); Game.hint(`Нашёл: ${ITEMS[this.gives].name.toLowerCase()}!`, 2.5); }
        else { Inv.add('junk'); Game.hint(`Нашёл: ${this.item}`, 2); }
        Game.onJunk(this);
      },
    };
  }
  draw(ctx, cam) { drawSpr(ctx, Art.spr.junk, this.x - 7 - cam.x, this.y - 7 - cam.y); }
}

// ---------- Тайник, прилавок, сундук ----------
// Без хозяев — просто обыскать (но в людном месте могут заметить). С хозяевами — кража: см. systems/theft.js
class Container {
  constructor(x, y, o) {
    Object.assign(this, { x, y, name: 'вещи', owners: [], loot: {}, cool: 0, kind: 'crate' }, o);
    this.y = y - 4;
    if (!this.hold) this.hold = CONFIG.theft.hold[this.kind] || 1;
  }
  get stealing() { return this.owners.length > 0; }
  update() { }
  interaction(p) {
    if (this.used || dist(p.x, p.y, this.x, this.y) > 30 || this.cool > Game.time) return null;
    if (!Events.allow('can:loot', this)) return null;
    return {
      key: this, x: this.x, y: this.y - 12, hold: this.hold,
      label: `Держи Space: ${this.stealing ? 'стащить' : 'обыскать'} ${this.name}`,
      tick: () => {
        const seer = Theft.witness(this);
        if (seer) { Theft.caught(seer, this); return false; }
      },
      done: () => { this.used = true; Game.onContainer(this); },
    };
  }
  draw(ctx, cam) {
    if (this.used || !this.icon) return;
    const img = Art.spr[this.icon];
    drawSpr(ctx, img, this.x - img.width / 2 - cam.x, this.y - img.height - 2 + (this.icon === 'pendant' ? Math.sin(Game.time * 4) : 0) - cam.y);
    if (this.icon === 'pendant' && Math.floor(Game.time * 3) % 3 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(this.x + 2 - cam.x), Math.round(this.y - 9 - cam.y), 1, 1); }
  }
}
