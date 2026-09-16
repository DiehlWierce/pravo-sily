'use strict';
// Игрок, телекинез, физические объекты по категориям массы, враги, подбираемые предметы.
// Game — глобальный объект из game.js (objects, enemies, pickups, player, hint, ...).

// ---------- Движение с коллизиями ----------
function overlaps(o, x, y, hw, hh) { return Math.abs(o.x - x) < o.hw + hw && Math.abs(o.y - y) < o.hh + hh; }
function blockedAt(e, x, y) {
  if (World.boxHits(x, y, e.hw, e.hh, false)) return true;
  for (const o of Game.objects) {
    if (o === e || o.state !== 'rest') continue;
    if (overlaps(o, x, y, e.hw, e.hh) && !overlaps(o, e.x, e.y, e.hw, e.hh)) return true;
  }
  return false;
}
function moveBody(e, dx, dy) {
  let hit = false;
  if (dx) { if (!blockedAt(e, e.x + dx, e.y)) e.x += dx; else hit = true; }
  if (dy) { if (!blockedAt(e, e.x, e.y + dy)) e.y += dy; else hit = true; }
  return hit;
}

// ---------- Объекты ----------
const OBJ_KINDS = {
  pebble: { mass: 'light', hw: 2, hh: 2, dmg: 1 },
  rock: { mass: 'light', hw: 4, hh: 3, dmg: 1 },
  crate: { mass: 'medium', hw: 6, hh: 5, dmg: 2 },
  boulder: { mass: 'heavy', hw: 8, hh: 6, dmg: 3 },
};

class Obj {
  constructor(kind, x, y) {
    Object.assign(this, OBJ_KINDS[kind]);
    this.kind = kind; this.x = x; this.y = y; this.home = { x, y };
    this.state = 'rest'; this.owner = null; this.hostile = false;
    this.vx = 0; this.vy = 0; this.z = 0; this.range = 0; this.travelled = 0;
    this.tx = x; this.ty = y; this.temp = false; this.ttl = 0; this.hitSet = new Set();
  }
  launch(dx, dy, speed, range, owner, hostile) {
    this.state = 'thrown'; this.vx = dx * speed; this.vy = dy * speed; this.range = range;
    this.travelled = 0; this.owner = owner; this.hostile = hostile; this.hitSet = new Set(); this.z = 7;
  }
  slide(dx, dy, speed, owner) {
    this.state = 'slide'; this.vx = dx * speed; this.vy = dy * speed; this.owner = owner;
    this.hostile = false; this.hitSet = new Set();
  }
  update(dt) {
    if (this.state === 'held') {
      const k = Math.min(1, dt * 14);
      this.x = lerp(this.x, this.tx, k); this.y = lerp(this.y, this.ty, k); this.z = lerp(this.z, 10, k);
      if (rnd() < 0.3) FX.parts.push({ x: this.x + rrange(-4, 4), y: this.y - this.z + rrange(-4, 2), vx: 0, vy: -10, life: 0.3, max: 0.3, color: '#7cf0ff', size: 1 });
      return;
    }
    if (this.state === 'thrown' || this.state === 'slide') {
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      let hitWall = false;
      if (World.boxHits(nx, this.y, this.hw, this.hh, true)) { hitWall = true; this.vx = -this.vx * 0.3; } else this.x = nx;
      if (World.boxHits(this.x, ny, this.hw, this.hh, true)) { hitWall = true; this.vy = -this.vy * 0.3; } else this.y = ny;
      const sp = Math.hypot(this.vx, this.vy);
      this.travelled += sp * dt;
      // Плита «ловит» пролетающий над ней тяжёлый предмет — прицеливание прощает ошибки
      if (this.mass === 'medium' && !World.gateOpen && World.atPx(this.x, this.y) === 'o') { this.land(); return; }
      if (this.state === 'slide') { this.vx *= Math.pow(0.02, dt); this.vy *= Math.pow(0.02, dt); }
      const struck = this.checkHits();
      if (hitWall) { Sfx.thud(); FX.burst(this.x, this.y, '#999', 5, 40); }
      if (hitWall || struck || (this.state === 'thrown' && this.travelled >= this.range) || (this.state === 'slide' && sp < 12)) this.land();
      return;
    }
    if (this.temp) { this.ttl -= dt; if (this.ttl <= 0) this.remove = true; }
  }
  checkHits() {
    if (this.hostile) {
      const p = Game.player;
      if (p.alive && Math.abs(p.x - this.x) < this.hw + 5 && Math.abs(p.y - 4 - this.y) < this.hh + 7 && p.dashT <= 0) {
        p.hurt(this.dmg, Math.sign(this.vx), Math.sign(this.vy));
        FX.burst(this.x, this.y - this.z, '#ccc', 6, 50);
        return true;
      }
      return false;
    }
    if (this.owner !== 'player') return false;
    let struck = false;
    for (const e of Game.enemies) {
      if (!e.alive || this.hitSet.has(e) || e.z > 4 && this.z < 2) continue;
      if (dist(e.x, e.y, this.x, this.y) < e.r + this.hw + 2) {
        this.hitSet.add(e);
        const n = norm(this.vx, this.vy);
        e.takeHit(this.dmg, 'object', n.x, n.y);
        Game.stats.objectHits++;
        struck = true;
      }
    }
    return struck;
  }
  land() {
    this.state = 'rest'; this.vx = this.vy = 0; this.z = 0; this.hostile = false;
    const tile = World.atPx(this.x, this.y);
    if (tile === '~') {
      Sfx.splash(); FX.burst(this.x, this.y, '#8ac0e0', 10, 50);
      if (this.temp) { this.remove = true; return; }
      this.x = this.home.x; this.y = this.home.y;
      FX.burst(this.x, this.y, '#fff', 6, 30);
      Game.hint(this.mass === 'medium' ? 'Ящик утонул и нашёлся на берегу. Попробуй ещё раз.' : 'Утонуло.', 2.5);
      return;
    }
    if (tile === 'o') Game.onPlate(this);
    if (this.temp) this.ttl = 6;
  }
  draw(ctx, cam) {
    const img = Art.spr[this.kind];
    const alpha = this.temp && this.state === 'rest' && this.ttl < 1.5 ? (Math.sin(this.ttl * 20) > 0 ? 1 : 0.3) : 1;
    drawShadow(ctx, this.x - cam.x, this.y + this.hh - 1 - cam.y, this.hw + 1);
    ctx.globalAlpha = alpha;
    drawSpr(ctx, img, this.x - img.width / 2 - cam.x, this.y + this.hh - img.height - this.z - cam.y);
    if (this.state === 'held' || (this.state !== 'rest' && this.owner === 'boss')) {
      ctx.strokeStyle = this.owner === 'boss' ? 'rgba(200,120,255,0.8)' : 'rgba(124,240,255,0.8)';
      ctx.strokeRect(Math.round(this.x - img.width / 2 - cam.x) - 1.5, Math.round(this.y + this.hh - img.height - this.z - cam.y) - 1.5, img.width + 3, img.height + 3);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- Игрок ----------
class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.hw = 4; this.hh = 3; this.r = 6; this.z = 0;
    this.face = { x: 1, y: 0 }; this.lr = 'r'; this.maxHp = 12; this.hp = 12; this.alive = true;
    this.dashT = 0; this.dashCd = 0; this.dashDir = { x: 1, y: 0 };
    this.atkT = 0; this.atkHit = new Set(); this.invul = 0; this.kvx = 0; this.kvy = 0; this.walk = 0; this.moving = false;
    this.tk = false; this.energy = 100; this.integrity = 100; this.toxin = 0; this.overload = 0;
    this.held = null; this.tkLock = 0; this.sinceUse = 9; this.toxTimer = 0;
    this.crystals = 0; this.herbs = 0; this.channel = 0; this.extractT = 0; this.extractTarget = null; this.liftT = 0;
  }
  get handX() { return this.x + this.face.x * 14; }
  get handY() { return this.y - 2 + this.face.y * 12; }

  update(dt) {
    this.invul = Math.max(0, this.invul - dt); this.dashCd = Math.max(0, this.dashCd - dt);
    this.atkT = Math.max(0, this.atkT - dt); this.tkLock = Math.max(0, this.tkLock - dt);
    this.sinceUse += dt;
    this.updateBody(dt);
    if (this.liftT > 0) return;
    if (this.channel > 0) {
      this.channel -= dt;
      if (rnd() < 0.5) FX.burst(this.x + this.face.x * 4, this.y - 8, '#7cf0ff', 1, 30, 0.4);
      if (this.channel <= 0) this.finishIntegration();
      return;
    }
    if (Game.locked) return;
    this.handleInput(dt);
  }

  updateBody(dt) {
    if (this.liftT > 0) {
      this.liftT -= dt; this.z = 16 * Math.sin(Math.min(1, (0.7 - this.liftT) / 0.7) * Math.PI);
      if (this.held) this.drop();
      if (this.liftT <= 0) { this.z = 0; this.invul = 0; FX.shake = 6; Sfx.thud(); this.hurt(2, this.liftDir.x, this.liftDir.y); }
      return;
    }
    if (this.kvx || this.kvy) {
      moveBody(this, this.kvx * dt, this.kvy * dt);
      this.kvx *= Math.pow(0.001, dt); this.kvy *= Math.pow(0.001, dt);
      if (Math.abs(this.kvx) + Math.abs(this.kvy) < 5) this.kvx = this.kvy = 0;
    }
    // Ресурсы телекинеза
    if (this.tk) {
      if (this.held) {
        this.energy -= (this.held.mass === 'medium' ? 9 : 1.5) * dt; this.sinceUse = 0;
        this.held.tx = this.handX; this.held.ty = this.handY;
        if (this.energy <= 0) { this.energy = 0; this.drop(); Game.hint('Энергия кончилась — предмет упал.', 2); }
      } else if (this.sinceUse > 0.5) this.energy = Math.min(100, this.energy + 24 * dt);
      this.overload = Math.max(0, this.overload - 14 * dt);
    }
    this.toxin = Math.max(0, this.toxin - 0.6 * dt);
    if (this.toxin > 60) {
      this.toxTimer += dt;
      if (this.toxTimer > (this.toxin > 90 ? 2 : 5)) { this.toxTimer = 0; this.hurt(1, 0, 0, true); Game.hint('Токсины распада жгут кровь. Трава (E) выводит их.', 2.5); }
    } else this.toxTimer = 0;
  }

  handleInput(dt) {
    let mx = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    let my = (Input.held('down') ? 1 : 0) - (Input.held('up') ? 1 : 0);
    this.moving = !!(mx || my);
    if (this.moving) {
      const n = norm(mx, my); this.face = n;
      if (mx) this.lr = mx > 0 ? 'r' : 'l';
      mx = n.x; my = n.y;
    }
    if (Input.pressed('b') && this.dashCd <= 0) {
      this.dashT = 0.16; this.dashCd = 0.55; this.dashDir = this.moving ? { x: mx, y: my } : { ...this.face };
      Sfx.dash(); FX.burst(this.x, this.y, '#bbb', 6, 30, 0.3);
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      moveBody(this, this.dashDir.x * 230 * dt, this.dashDir.y * 230 * dt);
      if (rnd() < 0.6) FX.parts.push({ x: this.x, y: this.y - 4, vx: 0, vy: 0, life: 0.2, max: 0.2, color: '#6b6f5a', size: 2 });
    } else if (this.moving) {
      const sp = (this.held && this.held.mass === 'medium' ? 45 : 72) * (this.overload > 80 ? 0.7 : 1);
      moveBody(this, mx * sp * dt, my * sp * dt);
      this.walk += dt * 8;
    }

    // A: извлечение / нож
    const corpse = Game.enemies.find(e => e.dead && e.hasCrystal && dist(e.x, e.y, this.x, this.y) < 20);
    if (corpse && Input.held('a')) {
      if (this.extractTarget !== corpse) { this.extractTarget = corpse; this.extractT = 0; }
      this.extractT += dt;
      if (rnd() < 0.3) FX.burst(corpse.x, corpse.y - 4, '#7cf0ff', 1, 20);
      if (this.extractT >= 0.9) { this.extractT = 0; this.extractTarget = null; Game.extract(corpse); }
    } else {
      this.extractT = 0; this.extractTarget = null;
      if (Input.pressed('a') && !corpse) this.attack();
    }
    if (Input.pressed('a') && corpse) Game.hint('Держи J, чтобы извлечь источник', 1.5);

    if (Input.pressed('x')) this.tk ? (this.held ? this.throwHeld() : this.grab()) : Game.hint('Телекинеза пока нет. Ты — непользователь.', 2);
    if (Input.pressed('y')) this.tk ? this.push() : Game.hint('Телекинеза пока нет.', 1.5);
    if (Input.pressed('l')) this.startIntegration();
    if (Input.pressed('r')) this.useHerb();

    if (this.atkT > 0.06) {
      const hx = this.x + this.face.x * 11, hy = this.y - 4 + this.face.y * 11;
      for (const e of Game.enemies) if (e.alive && !this.atkHit.has(e) && e.z < 6 && dist(e.x, e.y - 4, hx, hy) < e.r + 8) {
        this.atkHit.add(e); e.takeHit(1, 'knife', this.face.x, this.face.y);
      }
    }
  }

  attack() {
    if (this.atkT > 0 || this.held) return;
    this.atkT = 0.2; this.atkHit = new Set(); Sfx.slash();
  }

  canTK(energyCost) {
    if (this.tkLock > 0) { Game.hint('Перегрузка! Руки не слушаются.', 1.2); return false; }
    if (this.integrity <= 0) { Game.hint('Кристалл истощён. Q — интегрировать новый.', 2.5); return false; }
    if (this.energy < energyCost) { Game.hint('Не хватает энергии.', 1.2); return false; }
    return true;
  }
  wear(energy, integ, over) {
    this.energy -= energy; this.sinceUse = 0;
    this.integrity = Math.max(0, this.integrity - integ);
    this.toxin = Math.min(100, this.toxin + integ * 0.9);
    this.overload += over;
    if (this.overload >= 100) {
      this.overload = 45; this.tkLock = 1.5; this.drop();
      this.invul = 0; this.hurt(1, 0, 0, true); Sfx.pain(); FX.flash = 0.5; FX.flashColor = '#f33';
      Game.hint('ПЕРЕГРУЗКА. Нервы горят — дай руке остыть.', 2.5);
    } else if (this.integrity <= 0) Game.hint('Кристалл рассыпался. Q — интеграция нового.', 3);
  }

  grab() {
    let best = null, bestScore = 1e9, heavySeen = false;
    for (const o of Game.objects) {
      if (o.state === 'held') continue;
      const d = dist(o.x, o.y, this.x, this.y - 2);
      const incoming = o.hostile && o.state === 'thrown';
      const maxR = incoming ? 110 : o.mass === 'medium' ? 70 : 100;
      if (d > maxR) continue;
      const n = norm(o.x - this.x, o.y - this.y);
      const dot = n.x * this.face.x + n.y * this.face.y;
      if (d > 26 && dot < 0.35 && !incoming) continue;
      if (!World.los(this.x, this.y - 4, o.x, o.y - 2)) continue;
      if (o.mass === 'heavy') { heavySeen = true; continue; }
      const score = d - (incoming ? 1000 : 0) - dot * 20;
      if (score < bestScore) { bestScore = score; best = o; }
    }
    if (!best) { Game.hint(heavySeen ? 'Слишком тяжело. Источник пока слаб.' : 'Нечего схватить — повернись к предмету.', 1.8); return; }
    const cost = best.mass === 'medium' ? 12 : 4;
    if (!this.canTK(cost)) return;
    const caught = best.hostile;
    best.state = 'held'; best.owner = 'player'; best.hostile = false; best.temp = false; best.vx = best.vy = 0;
    this.held = best;
    this.wear(cost, best.mass === 'medium' ? 3 : 1, caught ? 22 : 12);
    Sfx.grab(); FX.burst(best.x, best.y, '#7cf0ff', 8, 40);
    Game.stats.grabs++;
    if (caught) { Game.stats.catches++; Game.once('caught', () => Game.hint('Пойман! Теперь верни его (L).', 2)); }
    Game.once('firstGrab', () => Game.onFirstGrab());
  }

  throwHeld() {
    const o = this.held; if (!o) return;
    const cost = o.mass === 'medium' ? 16 : 8;
    if (this.energy < cost) { Game.hint('Не хватает энергии на бросок.', 1.2); return; }
    let a = Math.atan2(this.face.y, this.face.x);
    if (this.overload > 60) a += rrange(-0.35, 0.35);
    const medium = o.mass === 'medium';
    o.launch(Math.cos(a), Math.sin(a), medium ? 170 : 270, medium ? 58 : 180, 'player', false);
    this.held = null;
    this.wear(cost, medium ? 4 : 2, medium ? 25 : 15);
    Sfx.throw(); Game.stats.throws++;
  }

  drop() { if (this.held) { this.held.state = 'rest'; this.held.land(); this.held = null; } }

  push() {
    if (!this.canTK(20)) return;
    this.wear(20, 3, 22);
    Sfx.push(); FX.shake = 3;
    const f = this.face;
    for (let i = 0; i < 18; i++) {
      const a = Math.atan2(f.y, f.x) + rrange(-0.7, 0.7), s = rrange(80, 160);
      FX.parts.push({ x: this.x, y: this.y - 4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3, max: 0.3, color: '#bff8ff', size: 1 });
    }
    if (this.held) { const o = this.held; this.held = null; o.launch(f.x, f.y, 320, 200, 'player', false); }
    for (const o of Game.objects) {
      if (o.state === 'held' || o.mass === 'heavy') continue;
      const d = dist(o.x, o.y, this.x, this.y), n = norm(o.x - this.x, o.y - this.y);
      if (o.hostile && o.state === 'thrown' && d < 48) {
        const v = Math.hypot(o.vx, o.vy); o.launch(-o.vx / v, -o.vy / v, v * 1.2, 200, 'player', false);
        Game.stats.reflects++; FX.burst(o.x, o.y, '#fff', 8, 60); continue;
      }
      if (d < 60 && n.x * f.x + n.y * f.y > 0.3 && World.los(this.x, this.y - 4, o.x, o.y)) o.slide(n.x, n.y, o.mass === 'medium' ? 170 : 240, 'player');
    }
    for (const e of Game.enemies) {
      if (!e.alive) continue;
      const d = dist(e.x, e.y, this.x, this.y), n = norm(e.x - this.x, e.y - this.y);
      if (d < 56 && n.x * f.x + n.y * f.y > 0.2) e.pushed(n.x, n.y);
    }
  }

  startIntegration() {
    if (!this.tk) { Game.hint('Не знаешь, как использовать кристаллы.', 1.5); return; }
    if (this.crystals <= 0) { Game.hint('Нет кристаллов для интеграции. Добывай их из существ силы.', 2); return; }
    if (this.integrity >= 100) { Game.hint('Имплант цел — интеграция не нужна.', 1.5); return; }
    if (this.held) this.drop();
    this.channel = 1.1; Sfx.pain();
    Game.hint('Интеграция... терпи.', 1.2);
  }
  finishIntegration() {
    this.crystals--; this.integrity = 100; this.overload = 0;
    this.toxin = Math.min(100, this.toxin + 12);
    this.invul = 0; this.hurt(1, 0, 0, true);
    FX.flash = 0.6; FX.flashColor = '#7cf0ff'; FX.shake = 5; Sfx.crystal();
    Game.stats.integrations++;
    Game.hint('Новый кристалл прирос к нервам. Имплант восстановлен.', 2.5);
  }

  useHerb() {
    if (this.herbs <= 0) { Game.hint('Нет трав-антидотов.', 1.2); return; }
    if (this.toxin < 5) { Game.hint('Токсинов почти нет — трава не нужна.', 1.5); return; }
    this.herbs--; this.toxin = Math.max(0, this.toxin - 50); Sfx.pick(); FX.burst(this.x, this.y - 6, '#9ae070', 10, 40);
  }

  hurt(dmg, dx, dy, silent) {
    if (!this.alive || (!silent && (this.invul > 0 || this.dashT > 0))) return;
    this.hp -= dmg; this.invul = silent ? this.invul : 1;
    if (dx || dy) { const n = norm(dx, dy); this.kvx = n.x * 160; this.kvy = n.y * 160; }
    Sfx.hurt(); FX.shake = Math.max(FX.shake, 4); FX.burst(this.x, this.y - 6, '#d02040', 6, 50);
    if (this.held && !silent) this.drop();
    if (this.hp <= 0) { this.hp = 0; this.alive = false; Game.onPlayerDeath(); }
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    drawShadow(ctx, sx, sy, 5);
    if (this.invul > 0 && Math.floor(this.invul * 16) % 2 === 0) return;
    const frame = this.moving && this.dashT <= 0 ? Math.floor(this.walk) % 2 : 0;
    const set = this.channel > 0 && Math.floor(this.channel * 12) % 2 ? Art.spr.hero.flash : Art.spr.hero;
    const shake = this.overload > 80 ? rrange(-1, 1) : 0;
    drawSpr(ctx, set[this.lr][frame], sx - 5 + shake, sy - 13 - this.z);
    if (this.tk) { // кристалл-имплант на руке
      const pulse = 0.5 + 0.5 * Math.sin(Game.time * 6);
      ctx.fillStyle = this.integrity > 0 ? `rgba(124,240,255,${0.6 + pulse * 0.4})` : '#445';
      ctx.fillRect(Math.round(sx + (this.lr === 'r' ? 4 : -5)), Math.round(sy - 6 - this.z), 1, 2);
    }
    if (this.atkT > 0) {
      const a = Math.atan2(this.face.y, this.face.x), t = 1 - this.atkT / 0.2;
      ctx.strokeStyle = `rgba(255,255,255,${1 - t})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy - 5, 11, a - 1 + t * 0.6, a + 0.6 + t * 0.6); ctx.stroke(); ctx.lineWidth = 1;
    }
    if (this.held) {
      ctx.fillStyle = 'rgba(124,240,255,0.7)';
      for (let i = 1; i < 5; i++) {
        const t = i / 5 + (Game.time * 2 % 0.2);
        ctx.fillRect(Math.round(lerp(sx, this.held.x - cam.x, t)), Math.round(lerp(sy - 7, this.held.y - this.held.z - cam.y, t)), 1, 1);
      }
    }
    if (this.extractT > 0) {
      ctx.strokeStyle = '#7cf0ff'; ctx.beginPath();
      ctx.arc(sx, sy - 20, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.extractT / 0.9)); ctx.stroke();
    }
  }
}

// ---------- Враги ----------
class Enemy {
  constructor(x, y, o) {
    this.x = x; this.y = y; this.home = { x, y }; this.z = 0; this.kvx = 0; this.kvy = 0;
    this.alive = true; this.dead = false; this.hasCrystal = true; this.flashT = 0; this.stun = 0;
    this.lr = 'l'; this.state = 'idle'; this.t = rrange(0.5, 1.5); this.fade = 1.5;
    Object.assign(this, o); this.hp = this.maxHp;
  }
  sees(range) {
    const p = Game.player;
    return p.alive && dist(p.x, p.y, this.x, this.y) < range && World.los(this.x, this.y - 4, p.x, p.y - 4);
  }
  takeHit(dmg, src, dx, dy) {
    if (!this.alive) return;
    const kb = this.state === 'stunned' ? 30 : 120; // оглушённого не отбрасываем далеко — можно добить серией
    this.hp -= dmg; this.flashT = 0.15; this.kvx = dx * kb; this.kvy = dy * kb;
    Sfx.hit(); FX.burst(this.x, this.y - 5, this.blood || '#a04030', 6, 50); FX.shake = Math.max(FX.shake, 2);
    if (this.hp <= 0) this.die();
  }
  pushed(dx, dy) {
    this.kvx = dx * 260; this.kvy = dy * 260; this.stun = Math.max(this.stun, 0.9); this.state = 'stunned';
    FX.burst(this.x, this.y - 5, '#bff8ff', 6, 40);
  }
  die() {
    this.alive = false; this.dead = true; this.state = 'dead'; Game.stats.kills++;
    FX.burst(this.x, this.y - 5, '#7cf0ff', 12, 60, 0.6); Sfx.thud();
    Game.onEnemyKilled(this);
  }
  baseUpdate(dt) {
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.kvx || this.kvy) {
      moveBody(this, this.kvx * dt, this.kvy * dt);
      this.kvx *= Math.pow(0.002, dt); this.kvy *= Math.pow(0.002, dt);
      if (Math.abs(this.kvx) + Math.abs(this.kvy) < 5) this.kvx = this.kvy = 0;
    }
    if (this.dead) { if (!this.hasCrystal) { this.fade -= dt; if (this.fade <= 0) this.remove = true; } return false; }
    if (this.state === 'stunned') {
      this.stun -= dt;
      if (rnd() < 0.15) FX.parts.push({ x: this.x + rrange(-4, 4), y: this.y - 14, vx: 0, vy: -8, life: 0.4, max: 0.4, color: '#ffe060', size: 1 });
      if (this.stun <= 0) { this.state = 'idle'; this.t = 0.4; }
      return false;
    }
    return true;
  }
  touchPlayer(dmg) {
    const p = Game.player;
    if (p.alive && p.z < 4 && dist(p.x, p.y, this.x, this.y) < this.r + 5) { const n = norm(p.x - this.x, p.y - this.y); p.hurt(dmg, n.x, n.y); return true; }
    return false;
  }
  draw(ctx, cam) {
    const set = Art.spr[this.sprite], img = (this.flashT > 0 ? set.flash : set)[this.lr][0];
    const sx = this.x - cam.x, sy = this.y - cam.y;
    drawShadow(ctx, sx, sy, this.r - 1);
    if (this.dead) {
      ctx.globalAlpha = this.hasCrystal ? 0.55 : Math.max(0, this.fade / 1.5) * 0.55;
      drawSpr(ctx, img, sx - img.width / 2, sy - img.height + 2);
      ctx.globalAlpha = 1;
      if (this.hasCrystal) {
        const b = Math.sin(Game.time * 5) * 1.5;
        drawSpr(ctx, Art.spr.crystal, sx - 2, sy - img.height - 6 + b);
      }
      return;
    }
    let ox = 0;
    if (this.state === 'windup') ox = rrange(-1, 1);
    drawSpr(ctx, img, sx - img.width / 2 + ox, sy - img.height - this.z);
  }
}

// Шипогрыз: разгоняется по прямой. Ножом не пробить, пока не оглушён ударом о препятствие.
class Spiker extends Enemy {
  constructor(x, y) { super(x, y, { name: 'Шипогрыз', sprite: 'spiker', maxHp: 3, r: 7, hw: 5, hh: 3, blood: '#6a3020' }); this.dir = { x: 0, y: 0 }; }
  takeHit(dmg, src, dx, dy) {
    if (src === 'knife' && this.state !== 'stunned') {
      Sfx.clang(); FX.burst(this.x + dx * 6, this.y - 6, '#fff', 4, 40);
      Game.player.kvx = -dx * 120; Game.player.kvy = -dy * 120;
      Game.once('spikerHide', () => Game.hint('Шкура не пробивается! Заставь его врезаться в дерево или камень.', 3.5));
      return;
    }
    super.takeHit(src === 'knife' ? dmg * 1 : dmg, src, dx, dy);
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const p = Game.player; this.t -= dt;
    switch (this.state) {
      case 'idle':
        if (this.sees(100)) { this.state = 'windup'; this.t = 0.55; Game.once('seeSpiker', () => Game.onSeeSpiker()); break; }
        if (this.t <= 0) { const a = rnd() * 7; this.dir = { x: Math.cos(a), y: Math.sin(a) }; this.state = 'wander'; this.t = rrange(0.6, 1.2); }
        break;
      case 'wander':
        moveBody(this, this.dir.x * 25 * dt, this.dir.y * 25 * dt);
        if (this.dir.x) this.lr = this.dir.x > 0 ? 'r' : 'l';
        if (this.sees(100)) { this.state = 'windup'; this.t = 0.55; }
        else if (this.t <= 0) { this.state = 'idle'; this.t = rrange(0.5, 1.5); }
        break;
      case 'windup': {
        const n = norm(p.x - this.x, p.y - this.y); this.dir = n; this.lr = n.x > 0 ? 'r' : 'l';
        if (this.t <= 0) { this.state = 'charge'; this.t = 1.1; Sfx.dash(); }
        break;
      }
      case 'charge': {
        const hit = moveBody(this, this.dir.x * 190 * dt, this.dir.y * 190 * dt);
        if (rnd() < 0.5) FX.parts.push({ x: this.x, y: this.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#5e4630', size: 2 });
        if (hit) {
          this.state = 'stunned'; this.stun = 2.4; FX.shake = 5; Sfx.thud(); FX.burst(this.x + this.dir.x * 8, this.y - 4, '#ddd', 10, 60);
          Game.once('spikerStun', () => Game.hint('Оглушён! Бей ножом (J)!', 2.5));
        } else if (this.touchPlayer(2)) { this.state = 'idle'; this.t = 1; }
        else if (this.t <= 0) { this.state = 'idle'; this.t = 0.8; }
        break;
      }
    }
  }
}

// Костяной прыгун: прыгает по дуге в точку, где стоял игрок, и не может свернуть в воздухе.
class Jumper extends Enemy {
  constructor(x, y) { super(x, y, { name: 'Костяной прыгун', sprite: 'jumper', maxHp: 2, r: 6, hw: 5, hh: 3, blood: '#d8d0b8' }); }
  takeHit(dmg, src, dx, dy) {
    if (this.state === 'air' && src === 'knife') return;
    if (this.state === 'air') { this.z = 0; this.state = 'stunned'; this.stun = 1.8; Game.once('jumperDown', () => Game.hint('Сбит в прыжке!', 2)); }
    super.takeHit(dmg, src, dx, dy);
  }
  pushed(dx, dy) {
    if (this.state === 'air') { this.z = 0; this.stun = 1.8; }
    super.pushed(dx, dy);
  }
  update(dt) {
    if (!this.baseUpdate(dt)) { if (this.state !== 'air') this.z = 0; return; }
    const p = Game.player; this.t -= dt;
    switch (this.state) {
      case 'idle':
        if (this.t <= 0 && this.sees(120)) { this.state = 'crouch'; this.t = 0.4; this.lr = p.x > this.x ? 'r' : 'l'; }
        break;
      case 'crouch':
        if (this.t <= 0) {
          this.from = { x: this.x, y: this.y }; this.to = { x: p.x, y: p.y };
          const d = dist(this.x, this.y, p.x, p.y);
          if (d > 90) { const n = norm(p.x - this.x, p.y - this.y); this.to = { x: this.x + n.x * 90, y: this.y + n.y * 90 }; }
          this.state = 'air'; this.t = 0.7; Sfx.dash();
        }
        break;
      case 'air': {
        const k = 1 - this.t / 0.7;
        this.z = Math.sin(k * Math.PI) * 26;
        const nx = lerp(this.from.x, this.to.x, k), ny = lerp(this.from.y, this.to.y, k);
        if (!World.boxHits(nx, ny, this.hw, this.hh, true)) { this.x = nx; this.y = ny; }
        if (this.t <= 0) {
          this.z = 0; this.state = 'land'; this.t = 0.8; FX.burst(this.x, this.y, '#aaa', 8, 50); Sfx.thud();
          if (World.boxHits(this.x, this.y, this.hw, this.hh, false)) { this.x = this.from.x; this.y = this.from.y; }
          this.touchPlayer(1);
        }
        break;
      }
      case 'land':
        if (this.t <= 0) { this.state = 'idle'; this.t = rrange(0.3, 0.8); }
        break;
    }
  }
  draw(ctx, cam) {
    if (this.state === 'air') drawShadow(ctx, this.x - cam.x, this.y - cam.y, 5 - this.z / 10);
    super.draw(ctx, cam);
  }
}

// Метатель: держит дистанцию и кидает камни, которые можно поймать телекинезом.
class Thrower extends Enemy {
  constructor(x, y) { super(x, y, { name: 'Метатель', sprite: 'thrower', maxHp: 2, r: 6, hw: 4, hh: 3, blood: '#6a8050' }); this.cd = 1.5; }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const p = Game.player, d = dist(p.x, p.y, this.x, this.y);
    if (!this.sees(170)) return;
    this.lr = p.x > this.x ? 'r' : 'l';
    const n = norm(p.x - this.x, p.y - this.y);
    if (d < 70) moveBody(this, -n.x * 50 * dt, -n.y * 50 * dt);
    else if (d > 125) moveBody(this, n.x * 35 * dt, n.y * 35 * dt);
    else moveBody(this, -n.y * 20 * dt, n.x * 20 * dt);
    this.cd -= dt;
    if (this.cd <= 0) {
      this.cd = 2.3;
      const stone = new Obj('rock', this.x + n.x * 8, this.y + n.y * 4);
      stone.temp = true; stone.launch(n.x, n.y, 140, 190, 'enemy', true);
      Game.objects.push(stone); Sfx.throw();
      Game.once('seeThrower', () => Game.hint('Метатель! Лови камень хваткой (L) или отбей толчком (I).', 4));
    }
  }
}

// ---------- Подбираемое ----------
class Pickup {
  constructor(kind, x, y) { this.kind = kind; this.x = x; this.y = y; this.t = rnd() * 6; }
  update(dt) {
    this.t += dt;
    const p = Game.player;
    if (dist(p.x, p.y - 3, this.x, this.y) < 10) {
      if (this.kind === 'herb') { p.herbs++; Game.hint('Трава-антидот +1 (E — вывести токсины)', 2); }
      else { if (p.hp >= p.maxHp) return; p.hp = Math.min(p.maxHp, p.hp + 4); Game.hint('Ягоды: +2 сердца', 1.5); }
      Sfx.pick(); FX.burst(this.x, this.y, '#fff', 6, 30); this.remove = true;
    }
  }
  draw(ctx, cam) {
    const img = Art.spr[this.kind];
    drawSpr(ctx, img, this.x - img.width / 2 - cam.x, this.y - img.height + Math.sin(this.t * 3) - cam.y);
  }
}

class Campfire {
  constructor(x, y) { this.x = x; this.y = y; }
  update(dt) {
    if (rnd() < 0.3) FX.parts.push({ x: this.x + rrange(-3, 3), y: this.y - 6, vx: rrange(-5, 5), vy: -rrange(15, 30), life: 0.7, max: 0.7, color: rnd() < 0.5 ? '#ffb040' : '#ff6020', size: 1 });
  }
  draw(ctx, cam) {
    const sx = Math.round(this.x - cam.x), sy = Math.round(this.y - cam.y);
    ctx.fillStyle = 'rgba(255,160,60,0.10)'; ctx.beginPath(); ctx.arc(sx, sy - 4, 26 + Math.sin(Game.time * 9), 0, 7); ctx.fill();
    ctx.fillStyle = '#4a2e18'; ctx.fillRect(sx - 6, sy - 2, 12, 2); ctx.fillRect(sx - 4, sy - 3, 8, 1);
    const f = Math.floor(Game.time * 8) % 2;
    ctx.fillStyle = '#ff6020'; ctx.fillRect(sx - 3, sy - 7 - f, 6, 5 + f);
    ctx.fillStyle = '#ffc040'; ctx.fillRect(sx - 1 - f, sy - 9 + f, 3, 6 - f);
    ctx.fillStyle = '#fff0a0'; ctx.fillRect(sx, sy - 5, 1, 3);
  }
}
