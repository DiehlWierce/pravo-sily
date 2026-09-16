'use strict';
// Герой, предметы, звери и существа силы, точки взаимодействия. Game — глобальный объект из game.js.

// ---------- Общие помощники ----------
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
function inCone(src, angle, half, range, t) {
  const d = dist(src.x, src.y, t.x, t.y);
  if (d > range) return false;
  let a = Math.atan2(t.y - src.y, t.x - src.x) - angle;
  a = Math.atan2(Math.sin(a), Math.cos(a));
  return Math.abs(a) <= half && World.sight(src.x, src.y - 6, t.x, t.y - 6);
}
function drawCone(ctx, cam, src, angle, half, range, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(Math.round(src.x - cam.x), Math.round(src.y - 6 - cam.y));
  ctx.arc(Math.round(src.x - cam.x), Math.round(src.y - 6 - cam.y), range, angle - half, angle + half);
  ctx.closePath(); ctx.fill();
}
function puff(x, y, color, n = 1) {
  for (let i = 0; i < n; i++) FX.parts.push({ x: x + rrange(-4, 4), y: y + rrange(-3, 3), vx: rrange(-8, 8), vy: -rrange(6, 18), life: 0.4, max: 0.4, color, size: 1 });
}
function ring(x, y, r, color, n = 22) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; FX.parts.push({ x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 2, vx: Math.cos(a) * r * 3, vy: Math.sin(a) * r * 1.5, life: 0.3, max: 0.3, color, size: 1 }); }
}

// ---------- Предметы (камни для охотника, бочки, ящики) ----------
const OBJ_KINDS = {
  rock: { mass: 'light', hw: 4, hh: 3, dmg: 1 },
  crate: { mass: 'medium', hw: 6, hh: 5, dmg: 1 },
  barrel: { mass: 'medium', hw: 4, hh: 4, dmg: 1 },
  boulder: { mass: 'heavy', hw: 8, hh: 6, dmg: 2 },
};
class Obj {
  constructor(kind, x, y) {
    Object.assign(this, OBJ_KINDS[kind]);
    Object.assign(this, { kind, x, y, home: { x, y }, state: 'rest', owner: null, hostile: false, vx: 0, vy: 0, z: 0, range: 0, travelled: 0, tx: x, ty: y, temp: false, ttl: 0, targets: null });
  }
  launch(dx, dy, speed, range, owner, hostile) {
    Object.assign(this, { state: 'thrown', vx: dx * speed, vy: dy * speed, range, travelled: 0, owner, hostile, z: 7 });
  }
  update(dt) {
    if (this.state === 'held') {
      const k = Math.min(1, dt * 16);
      this.x = lerp(this.x, this.tx, k); this.y = lerp(this.y, this.ty, k); this.z = lerp(this.z, this.carryZ || 10, k);
      return;
    }
    if (this.state === 'thrown') {
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      let hitWall = false;
      if (World.boxHits(nx, this.y, this.hw, this.hh, true)) hitWall = true; else this.x = nx;
      if (World.boxHits(this.x, ny, this.hw, this.hh, true)) hitWall = true; else this.y = ny;
      this.travelled += Math.hypot(this.vx, this.vy) * dt;
      let struck = false;
      if (this.hostile) for (const t of this.targets || [Game.player]) {
        if (t.alive && Math.abs(t.x - this.x) < this.hw + 5 && Math.abs(t.y - 4 - this.y) < this.hh + 7 && !(t.dashT > 0)) {
          t.hurt(this.dmg, Math.sign(this.vx), Math.sign(this.vy)); FX.burst(this.x, this.y - this.z, '#ccc', 6, 50); struck = true; break;
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
    drawShadow(ctx, this.x - cam.x, this.y + this.hh - 1 - cam.y, this.hw + 1);
    ctx.globalAlpha = alpha;
    drawSpr(ctx, img, this.x - img.width / 2 - cam.x, this.y + this.hh - img.height - this.z - cam.y);
    ctx.globalAlpha = 1;
    if (this.owner === 'hunter' && this.state === 'held') {
      ctx.strokeStyle = 'rgba(200,140,255,0.8)';
      ctx.strokeRect(Math.round(this.x - img.width / 2 - cam.x) - 1.5, Math.round(this.y + this.hh - img.height - this.z - cam.y) - 1.5, img.width + 3, img.height + 3);
    }
  }
}

// Шип метателя
class Spike {
  constructor(x, y, dx, dy, speed, dmg) { Object.assign(this, { x, y, vx: dx * speed, vy: dy * speed, dmg, ttl: 1.6 }); }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.ttl -= dt;
    if (this.ttl <= 0 || World.solidFly(World.atPx(this.x, this.y))) { this.remove = true; return; }
    const p = Game.player;
    if (p.alive && p.dashT <= 0 && Math.abs(p.x - this.x) < 5 && Math.abs(p.y - 5 - this.y) < 7) {
      p.hurt(this.dmg, Math.sign(this.vx), Math.sign(this.vy)); FX.burst(this.x, this.y, '#e0d4a8', 5, 40); this.remove = true;
    }
  }
  draw(ctx, cam) {
    const a = Math.atan2(this.vy, this.vx);
    ctx.save(); ctx.translate(Math.round(this.x - cam.x), Math.round(this.y - cam.y - 4)); ctx.rotate(a);
    ctx.drawImage(Art.spr.spike, -2, 0); ctx.restore();
  }
}

// ---------- Снаряжение ----------
const WEAPONS = {
  knife: { name: 'Отцовский нож', dmg: 1, reach: 11, desc: 'Короткий, потёртый. Режет лучше, чем кажется.' },
  shortsword: { name: 'Короткий меч', dmg: 2, reach: 13, price: 60, rank: 'G', desc: 'Простая сталь. Урон заметно выше ножа.' },
  cleaver: { name: 'Боевой тесак', dmg: 3, reach: 13, price: 150, rank: 'F-', desc: 'Тяжёлый клинок охотников на кабанов.' },
  huntblade: { name: 'Клинок охотника', dmg: 4.5, reach: 15, price: 320, rank: 'E-', desc: 'Гильдейская работа. Длинный, злой, точный.' },
};
const ARMORS = {
  rags: { name: 'Рваная рубаха', def: 0, desc: 'Защищает от холода. От когтей — нет.' },
  quilted: { name: 'Стёганка', def: 1, price: 50, rank: 'G', desc: 'Удар зверя ослабляется на 1.' },
  leather: { name: 'Кожаный доспех', def: 2, price: 140, rank: 'F-', desc: 'Удар зверя ослабляется на 2.' },
  mail: { name: 'Кольчуга', def: 3, price: 360, rank: 'E-', slow: 0.92, desc: 'Удар ослабляется на 3, но чуть медленнее бег.' },
};

// Метательный нож: летит по прямой, пробивает только уязвимого зверя
class ThrownKnife {
  constructor(x, y, dx, dy, dmg) { Object.assign(this, { x, y, vx: dx * 240, vy: dy * 240, dmg, life: 0.6 }); }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
    if (this.life <= 0 || World.solidFly(World.atPx(this.x, this.y))) { this.remove = true; puff(this.x, this.y, '#aaa', 3); return; }
    for (const e of Game.enemies) {
      if (!e.alive || e.z > 6 || dist(e.x, e.y - 4, this.x, this.y) > e.r + 4) continue;
      e.takeHit(this.dmg, 'knife', Math.sign(this.vx), Math.sign(this.vy)); this.remove = true; return;
    }
  }
  draw(ctx, cam) {
    const n = norm(this.vx, this.vy), x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y - 5);
    ctx.fillStyle = '#d8dce0'; for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x - n.x * i), Math.round(y - n.y * i), 1, 1);
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(Math.round(x - n.x * 5), Math.round(y - n.y * 5), 1, 1);
  }
}

// ---------- Герой ----------
const STAT_ORDER = ['str', 'hp', 'sta'];
const STAT_NAMES = { str: 'Сила', hp: 'Здоровье', sta: 'Выносливость' };

class Player {
  constructor(x, y) {
    Object.assign(this, {
      x, y, hw: 4, hh: 3, r: 6, z: 0, face: { x: 1, y: 0 }, lr: 'r', alive: true, sprite: 'hero',
      level: 1, xp: 0, stats: { str: 1, hp: 1, sta: 1 },
      maxHp: 10, hp: 10, maxStamina: 100, stamina: 100, staminaT: 0, tiredMsg: 0, hasKnife: false, quickItem: null,
      dashT: 0, dashCd: 0, dashDir: { x: 1, y: 0 }, atkT: 0, atkHit: new Set(), invul: 0, kvx: 0, kvy: 0,
      walk: 0, moving: false, holdT: 0, holdTarget: null, liftT: 0, speed: 72, toxT: 0, msgT: 0,
      implant: null, abilities: { push: false },
      inv: { coins: 0, junk: [], goods: [], bread: 0, medicine: 0, meatRaw: 0, meatCooked: 0, herbs: 0, crystals: 0, scroll: false, pendant: false, salve0: 0, quest: { letter: 0, cargo: 0 } },
      gear: { weapon: 'knife', armor: 'rags' }, knives: 0,
    });
  }
  get weapon() { return WEAPONS[this.gear.weapon] || WEAPONS.knife; }
  get armor() { return ARMORS[this.gear.armor] || ARMORS.rags; }
  get damage() { return this.weapon.dmg + 0.5 * (this.stats.str - 1); }
  get staminaRegen() { return 22 + 5 * (this.stats.sta - 1); }
  xpNext() { return Math.round(15 * Math.pow(this.level, 1.5)); }
  gainXp(n) {
    if (!n) return;
    this.xp += n;
    const ups = [];
    while (this.xp >= this.xpNext()) {
      this.xp -= this.xpNext(); this.level++;
      const stat = STAT_ORDER[(this.level - 2) % 3];
      this.stats[stat]++;
      if (stat === 'hp') { this.maxHp += 3; this.hp += 3; }
      if (stat === 'sta') this.maxStamina += 15;
      this.stamina = this.maxStamina;
      ups.push(stat);
    }
    if (ups.length) Game.onLevelUp(ups);
  }

  update(dt) {
    this.invul = Math.max(0, this.invul - dt); this.dashCd = Math.max(0, this.dashCd - dt); this.atkT = Math.max(0, this.atkT - dt);
    this.updateBody(dt);
    Game.prompt = null;
    if (Game.locked || !this.alive) { this.moving = false; return; }
    this.handleInput(dt);
  }

  updateBody(dt) {
    if (this.kvx || this.kvy) {
      moveBody(this, this.kvx * dt, this.kvy * dt);
      this.kvx *= Math.pow(0.001, dt); this.kvy *= Math.pow(0.001, dt);
      if (Math.abs(this.kvx) + Math.abs(this.kvy) < 5) this.kvx = this.kvy = 0;
    }
    if (Game.locked) return;
    this.staminaT += dt;
    if (this.staminaT > 0.6) this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
  }

  handleInput(dt) {
    let mx = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    let my = (Input.held('down') ? 1 : 0) - (Input.held('up') ? 1 : 0);
    this.moving = !!(mx || my);
    if (this.moving) { const n = norm(mx, my); this.face = n; if (mx) this.lr = mx > 0 ? 'r' : 'l'; mx = n.x; my = n.y; }

    if (Input.pressed('b') && this.dashCd <= 0 && this.spend(20)) {
      this.dashT = 0.16; this.dashCd = 0.5; this.dashDir = this.moving ? { x: mx, y: my } : { ...this.face };
      Sfx.dash(); FX.burst(this.x, this.y, '#bbb', 6, 30, 0.3);
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      moveBody(this, this.dashDir.x * 235 * dt, this.dashDir.y * 235 * dt);
      if (rnd() < 0.6) FX.parts.push({ x: this.x, y: this.y - 4, vx: 0, vy: 0, life: 0.2, max: 0.2, color: '#6b6f5a', size: 2 });
    } else if (this.moving) {
      const spd = this.speed * (this.armor.slow || 1);
      moveBody(this, mx * spd * dt, my * spd * dt);
      this.walk += dt * 8;
    }

    // A (Space): нажать — взаимодействие, удерживать — обыскать / стащить
    const it = Game.findInteraction(this);
    if (it) {
      Game.prompt = { label: it.label, x: it.x, y: it.y, progress: 0 };
      if (it.hold) {
        if (Input.held('a')) {
          if (this.holdTarget !== it.key) { this.holdTarget = it.key; this.holdT = 0; }
          this.holdT += dt; Game.prompt.progress = this.holdT / it.hold;
          if (it.tick && it.tick(dt) === false) { this.holdT = 0; this.holdTarget = null; }
          else if (this.holdT >= it.hold) { this.holdT = 0; this.holdTarget = null; it.done(); }
        } else { this.holdT = 0; this.holdTarget = null; }
      } else if (Input.pressed('a')) it.done();
    } else { this.holdT = 0; this.holdTarget = null; }

    if (Input.pressed('x')) this.attack();
    if (Input.pressed('y')) this.ability();
    if (Input.pressed('r')) this.useQuick();

    if (this.atkT > 0.06) {
      const reach = this.weapon.reach, hx = this.x + this.face.x * reach, hy = this.y - 4 + this.face.y * reach;
      for (const e of Game.enemies) if (e.alive && !this.atkHit.has(e) && e.z < 6 && dist(e.x, e.y - 4, hx, hy) < e.r + 8) {
        this.atkHit.add(e); e.takeHit(this.damage, 'knife', this.face.x, this.face.y);
      }
    }
  }

  spend(n) {
    if (this.stamina < n) {
      if (Game.time > this.tiredMsg) { this.tiredMsg = Game.time + 1.5; Game.hint('Нет сил. Отдышись.', 1); }
      return false;
    }
    this.stamina -= n; this.staminaT = 0; return true;
  }
  attack() {
    if (!this.hasKnife) {
      if (Game.time > this.msgT) { this.msgT = Game.time + 2; Game.hint('Бить нечем. Нужен нож.', 2); }
      return;
    }
    if (this.atkT > 0 || !this.spend(7)) return;
    this.atkT = 0.2; this.atkHit = new Set(); Sfx.slash();
  }
  ability() {
    if (this.knives > 0 && this.hasKnife !== undefined) {
      if (this.atkT > 0 || this.knifeCd > Game.time || !this.spend(6)) return;
      this.knives--; this.knifeCd = Game.time + 0.35; Sfx.throw();
      Game.projectiles.push(new ThrownKnife(this.x + this.face.x * 6, this.y - 2 + this.face.y * 6, this.face.x, this.face.y, 1.5 + 0.5 * (this.stats.str - 1)));
      if (this.knives === 0) Game.hint('Метательные ножи кончились. Купить у оружейника.', 2.5);
      return;
    }
    if (!this.abilities.push && Game.time > this.msgT) { this.msgT = Game.time + 2; Game.hint('Во мне нет никакой силы. Только нож и ноги.', 1.8); }
  }
  // Кнопка быстрого действия: что на неё назначено в меню, то и применяется
  useQuick() {
    if (!this.quickItem) { Game.hint('Быстрая кнопка пуста. Назначь предмет в вещах (Enter).', 2.5); return; }
    if (!Game.useQuickItem(this.quickItem)) Game.hint('Этого больше нет.', 1.5);
  }
  eat(stamina, heal, msg) {
    this.stamina = Math.min(this.maxStamina, this.stamina + stamina); this.hp = Math.min(this.maxHp, this.hp + heal);
    Sfx.pick(); FX.burst(this.x, this.y - 8, '#e0b070', 6, 30); if (msg) Game.hint(msg, 1.8);
    if (Story.onAte) Story.onAte();
  }

  hurt(dmg, dx, dy, silent) {
    if (!this.alive || (!silent && (this.invul > 0 || this.dashT > 0)) || Game.flags.godmode) return;
    if (!silent) dmg = Math.max(1, dmg - this.armor.def);   // одежда гасит часть удара
    this.hp -= dmg; if (!silent) this.invul = 1;
    if (dx || dy) { const n = norm(dx, dy); this.kvx = n.x * 160; this.kvy = n.y * 160; }
    Sfx.hurt(); FX.shake = Math.max(FX.shake, 4); FX.burst(this.x, this.y - 6, '#d02040', 6, 50);
    if (this.hp <= 0) { this.hp = 0; this.alive = false; Game.onPlayerDeath(); }
  }

  draw(ctx, cam) {
    const sx = this.x - cam.x, sy = this.y - cam.y;
    drawShadow(ctx, sx, sy, 5);
    if (this.invul > 0 && Math.floor(this.invul * 16) % 2 === 0) return;
    const frame = this.moving && this.dashT <= 0 ? Math.floor(this.walk) % 2 : 0;
    drawSpr(ctx, Art.spr[this.sprite][this.lr][frame], sx - 5, sy - 13 - this.z);
    if (this.atkT > 0) {
      const a = Math.atan2(this.face.y, this.face.x), t = 1 - this.atkT / 0.2;
      ctx.strokeStyle = `rgba(255,255,255,${1 - t})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy - 5, 11, a - 1 + t * 0.6, a + 0.6 + t * 0.6); ctx.stroke(); ctx.lineWidth = 1;
    }
  }
}

// ---------- Звери ----------
class Enemy {
  constructor(x, y, base, o = {}) {
    Object.assign(this, {
      x, y, home: { x, y }, z: 0, kvx: 0, kvy: 0, alive: true, dead: false, flashT: 0, stun: 0,
      lr: 'l', state: 'idle', t: rrange(0.5, 1.5), fade: 1.2, hw: 5, hh: 3, r: 6, sight: 120,
      looted: false, force: false, target: null, lvl: 1,
    }, base, o);
    const k = 1 + 0.4 * (this.lvl - 1);
    this.maxHp = base.hp * k; this.hp = this.maxHp;
    this.dmg = Math.round((base.dmg || 0) * (1 + 0.12 * (this.lvl - 1)));
    this.xp = (base.xp || 0) * this.lvl;
    this.loot = { crystals: base.crystals || 0, meat: base.meat || 0 };
  }
  get tgt() { return this.target || Game.player; }
  sees(range) {
    const p = this.tgt;
    return p.alive && dist(p.x, p.y, this.x, this.y) < range && World.sight(this.x, this.y - 4, p.x, p.y - 4);
  }
  // Зверь замечает добычу: слышит вблизи даже за кустами, видит — дальше
  notices(range) {
    const p = this.tgt;
    if (!p.alive) return false;
    const d = dist(p.x, p.y, this.x, this.y);
    return d < 80 || (d < range && World.sight(this.x, this.y - 4, p.x, p.y - 4));
  }
  approach(dt, speed, range = 200) {
    const p = this.tgt;
    if (!p.alive || dist(p.x, p.y, this.x, this.y) > range) return false;
    stepTo(this, p.x, p.y, speed, dt);   // stepTo умеет скользить вдоль деревьев, а не упираться в них
    return true;
  }
  // Шкура и кость держат нож, пока герой слаб: пробить можно ударом не слабее остатка здоровья зверя
  guard(dmg, dx, dy, key, text) {
    if (dmg >= this.hp) return false;
    Sfx.clang(); FX.burst(this.x + dx * 6, this.y - 6, '#fff', 5, 45);
    const p = Game.player;
    if (dist(p.x, p.y, this.x, this.y) < 30) { p.kvx = -dx * 150; p.kvy = -dy * 150; }
    Game.once(key, () => Game.hint(text, 4.5));
    return true;
  }
  // Отталкивает героя, если тот лезет вплотную не вовремя
  repel(dt) {
    this.repelCd = Math.max(0, (this.repelCd || 0) - dt);
    const p = this.tgt;
    if (this.repelCd > 0 || !p.alive || (p.z || 0) > 4 || p.dashT > 0) return;
    if (dist(p.x, p.y, this.x, this.y) > this.r + 9) return;
    this.repelCd = 1.5;
    const n = norm(p.x - this.x || 1, p.y - this.y);
    p.kvx = n.x * 280; p.kvy = n.y * 280;
    ring(this.x, this.y, 9, '#e8e0c8', 12); Sfx.push();
    Game.once('repelHint', () => Game.hint('Он отшвыривает меня одним движением. Соваться вплотную нельзя.', 4));
  }
  takeHit(dmg, src, dx, dy) {
    if (!this.alive) return;
    const kb = this.state === 'stunned' || this.state === 'panting' || this.state === 'tired' ? 25 : 100;
    this.hp -= dmg; this.flashT = 0.15; this.kvx = dx * kb; this.kvy = dy * kb;
    Sfx.hit(); FX.burst(this.x, this.y - 5, this.blood || '#a04030', 6, 50); FX.shake = Math.max(FX.shake, 2);
    if (this.hp <= 0.001) this.die();
    else if (this.onHurt) this.onHurt(src);
  }
  hurt(dmg, dx, dy) { this.takeHit(dmg, 'object', Math.sign(dx) || 0, Math.sign(dy) || 0); }
  die() {
    this.alive = false; this.dead = true; this.state = 'dead'; this.z = 0;
    FX.burst(this.x, this.y - 5, this.force ? '#7cf0ff' : '#a04030', 12, 60, 0.6); Sfx.thud();
    Game.onKill(this);
  }
  interaction(p) {
    if (!this.dead || this.looted || dist(p.x, p.y, this.x, this.y) > 20) return null;
    return {
      key: this, x: this.x, y: this.y - 16, hold: 0.9,
      label: this.loot.crystals ? 'Держи Space: вырезать кристалл' : 'Держи Space: разделать тушу',
      tick: () => { if (rnd() < 0.3) puff(this.x, this.y - 4, this.loot.crystals ? '#7cf0ff' : '#a04030'); },
      done: () => { this.looted = true; Game.onLoot(this); },
    };
  }
  baseUpdate(dt) {
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.kvx || this.kvy) {
      moveBody(this, this.kvx * dt, this.kvy * dt);
      this.kvx *= Math.pow(0.002, dt); this.kvy *= Math.pow(0.002, dt);
      if (Math.abs(this.kvx) + Math.abs(this.kvy) < 5) this.kvx = this.kvy = 0;
    }
    if (this.dead) { if (this.looted) { this.fade -= dt; if (this.fade <= 0) this.remove = true; } return false; }
    if (this.state === 'stunned') {
      this.stun -= dt;
      if (rnd() < 0.15) FX.parts.push({ x: this.x + rrange(-4, 4), y: this.y - 14, vx: 0, vy: -8, life: 0.4, max: 0.4, color: '#ffe060', size: 1 });
      if (this.stun <= 0) { this.state = 'idle'; this.t = 0.3; }
      return false;
    }
    return true;
  }
  touch(dmg, reach = 5) {
    const p = this.tgt;
    if (p.alive && (p.z || 0) < 4 && dist(p.x, p.y, this.x, this.y) < this.r + reach) {
      const n = norm(p.x - this.x, p.y - this.y); p.hurt(dmg, n.x, n.y); return true;
    }
    return false;
  }
  leash(dt) {
    if (dist(this.x, this.y, this.home.x, this.home.y) > 200 && !this.sees(this.sight)) {
      const n = norm(this.home.x - this.x, this.home.y - this.y); moveBody(this, n.x * 40 * dt, n.y * 40 * dt); return true;
    }
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
    drawSpr(ctx, img, sx - img.width / 2 + ox, sy - img.height - this.z);
    if ((this.state === 'panting' || this.state === 'tired') && rnd() < 0.15)
      FX.parts.push({ x: this.x + rrange(-5, 5), y: this.y - img.height - 2, vx: 0, vy: -10, life: 0.5, max: 0.5, color: '#dde', size: 1 });
    const p = Game.player;
    if (!this.hideLevel && dist(p.x, p.y, this.x, this.y) < 120)
      Game.labels.push({ x: this.x, y: this.y - img.height - this.z - 8, text: `ур.${this.lvl}`, color: this.lvl > p.level ? '#ff9080' : '#d8d0c0' });
  }
}

class Rabbit extends Enemy {
  constructor(x, y, o) { super(x, y, { name: 'Заяц', sprite: 'rabbit', hp: 1, xp: 2, meat: 1, r: 4, hw: 3, hh: 2 }, o); this.run = 0; this.rest = 0; }
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
  constructor(x, y, o) { super(x, y, { name: 'Кабан', sprite: 'boar', hp: 3, dmg: 2, xp: 5, meat: 2, r: 7 }, o); this.angry = false; }
  onHurt() { this.angry = true; if (this.state !== 'charge') { this.state = 'windup'; this.t = 0.5; } }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const p = Game.player; this.t -= dt;
    if (this.state === 'windup') {
      const n = norm(p.x - this.x, p.y - this.y); this.dir = n; this.lr = n.x > 0 ? 'r' : 'l';
      if (this.t <= 0) { this.state = 'charge'; this.t = 0.6; Sfx.dash(); }
    } else if (this.state === 'charge') {
      const hit = moveBody(this, this.dir.x * 150 * dt, this.dir.y * 150 * dt);
      if (this.touch(this.dmg) || hit || this.t <= 0) { this.state = 'idle'; this.t = 1.2; }
    } else {
      if (this.angry && this.t <= 0 && this.sees(90)) { this.state = 'windup'; this.t = 0.5; return; }
      this.wander(dt, 12);
    }
  }
}

// Шипогрыз: серии быстрых рывков, после серии — передышка. Нож берёт только оглушённого или выдохшегося.
class Spiker extends Enemy {
  constructor(x, y, o) {
    super(x, y, { name: 'Шипогрыз', sprite: 'spiker', hp: 4, dmg: 7, xp: 12, crystals: 1, meat: 1, r: 7, force: true, sight: 130, blood: '#6a3020' }, o);
    this.chain = 0; this.dir = { x: 1, y: 0 };
  }
  sprName() { return this.disguised ? 'boar' : 'spiker'; }
  get hideLevel() { return this.disguised; }
  reveal() {
    if (!this.disguised) return;
    this.disguised = false; FX.burst(this.x, this.y - 8, '#ff3030', 16, 70, 0.6); FX.shake = 6; Sfx.roar();
    Story.onSpikerReveal(this);
  }
  vulnerable() { return this.state === 'stunned' || this.state === 'panting' || this.state === 'gap'; }
  takeHit(dmg, src, dx, dy) {
    if (this.disguised) this.reveal();
    if (src === 'knife' && !this.vulnerable() && this.guard(dmg, dx, dy, 'spikerHide',
      'Нож отскакивает от шкуры! Жди передышки после рывков или заставь врезаться в дерево.')) return;
    super.takeHit(dmg, src, dx, dy);
  }
  update(dt) {
    if (!this.baseUpdate(dt)) return;
    const p = this.tgt; this.t -= dt;
    if (this.disguised) { this.wander(dt, 12); if (p.alive && dist(p.x, p.y, this.x, this.y) < 56) this.reveal(); return; }
    if (!this.vulnerable()) this.repel(dt);
    switch (this.state) {
      case 'idle':
        if (this.notices(this.sight)) { this.state = 'windup'; this.t = 0.32; this.chain = 0; break; }
        if (this.leash(dt)) break;
        if (!this.approach(dt, 45)) this.wander(dt, 22);
        break;
      case 'windup':
        if (this.t > 0.1) { const n = norm(p.x - this.x, p.y - this.y); this.dir = n; this.lr = n.x > 0 ? 'r' : 'l'; }
        if (this.t <= 0) { this.state = 'charge'; this.t = 0.62; Sfx.dash(); }
        break;
      case 'charge': {
        const hit = moveBody(this, this.dir.x * 275 * dt, this.dir.y * 275 * dt);
        if (rnd() < 0.6) FX.parts.push({ x: this.x, y: this.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#5e4630', size: 2 });
        if (hit) {
          this.state = 'stunned'; this.stun = 2.3; FX.shake = 6; Sfx.thud(); FX.burst(this.x + this.dir.x * 8, this.y - 4, '#ddd', 10, 60);
          Game.once('spikerStun', () => Game.hint('Врезался! Бей, пока оглушён!', 2.5));
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
    if (++this.chain >= 2) { this.state = 'panting'; this.t = 1.7; this.chain = 0; Game.once('spikerPant', () => Game.hint('Выдохся после серии рывков — бей сейчас!', 2.5)); }
    else { this.state = 'gap'; this.t = 0.45; }
  }
}

// Костяной прыгун: хищник с когтями. Бьёт силой вокруг себя при прыжке и в месте приземления.
class Jumper extends Enemy {
  constructor(x, y, o, base) {
    super(x, y, Object.assign({ name: 'Костяной прыгун', sprite: 'jumper', hp: 4, dmg: 9, xp: 16, crystals: 2, r: 7, hw: 5, force: true, sight: 140, blood: '#8a5040', reach: 90, blast: 24 }, base), o);
    this.jumps = 0;
  }
  vulnerable() { return this.state === 'land' || this.state === 'tired' || this.state === 'stunned'; }
  takeHit(dmg, src, dx, dy) {
    if (this.state === 'air') return;
    if (src === 'knife' && !this.vulnerable()) {
      Sfx.clang(); FX.burst(this.x, this.y - 6, '#fff', 4, 40);
      Game.player.kvx = -dx * 120; Game.player.kvy = -dy * 120;
      Game.once('jumperBone', () => Game.hint('Костяные пластины держат удар. Бей сразу после приземления или когда выдохнется.', 4.5));
      return;
    }
    super.takeHit(dmg, src, dx, dy);
  }
  blastAt(x, y) {
    const r = this.blast;
    if (this.scene) { ring(x, y, r, '#e0b060', 26); Sfx.thud(); FX.shake = Math.max(FX.shake, 4); return; }
    ring(x, y, r, this.big ? '#e0b060' : '#d8d0b8', this.big ? 30 : 20); Sfx.thud(); FX.shake = Math.max(FX.shake, this.big ? 5 : 3);
    const p = this.tgt;
    if (p.alive && (p.z || 0) < 4 && !(p.dashT > 0) && dist(p.x, p.y, x, y) < r) {
      const n = norm(p.x - x || 1, p.y - y); p.hurt(this.dmg, n.x, n.y);
      if (p.kvx !== undefined) { p.kvx = n.x * 220; p.kvy = n.y * 220; }
    }
  }
  update(dt) {
    if (!this.baseUpdate(dt)) { if (this.state !== 'air') this.z = 0; return; }
    const p = this.tgt; this.t -= dt;
    if (!this.vulnerable() && this.state !== 'air') this.repel(dt);
    switch (this.state) {
      case 'idle':
        if (this.t <= 0 && this.notices(this.sight)) { this.state = 'crouch'; this.t = 0.45; this.lr = p.x > this.x ? 'r' : 'l'; }
        else if (!this.leash(dt) && !this.approach(dt, 30)) this.wander(dt, 10);
        break;
      case 'crouch':
        if (this.t <= 0) {
          this.from = { x: this.x, y: this.y }; this.to = { x: p.x, y: p.y };
          if (dist(this.x, this.y, p.x, p.y) > this.reach) { const n = norm(p.x - this.x, p.y - this.y); this.to = { x: this.x + n.x * this.reach, y: this.y + n.y * this.reach }; }
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
          if (++this.jumps >= 3) { this.jumps = 0; this.state = 'tired'; this.t = 1.9; Game.once('jumperTired', () => Game.hint('Выдохся! Сейчас!', 2)); }
          else { this.state = 'land'; this.t = 0.75; }
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
    const warn = (x, y, a) => { ctx.strokeStyle = `rgba(255,190,90,${a})`; ctx.beginPath(); ctx.ellipse(Math.round(x - cam.x), Math.round(y - cam.y), this.blast, this.blast * 0.5, 0, 0, 7); ctx.stroke(); };
    if (this.alive && this.state === 'crouch') warn(this.x, this.y, 0.3 + 0.5 * (1 - this.t / 0.45));
    if (this.alive && this.state === 'air') { warn(this.to.x, this.to.y, 0.35 + 0.5 * (1 - this.t / this.airMax)); drawShadow(ctx, this.x - cam.x, this.y - cam.y, (this.big ? 10 : 5) - this.z / 10); }
    super.draw(ctx, cam);
  }
}
// Методы для постановочной сцены: прыжки и смерть по расписанию, без случайностей ИИ
Jumper.prototype.sceneJump = function (x, y) {
  this.from = { x: this.x, y: this.y }; this.to = { x, y };
  this.state = 'air'; this.t = 0.62; this.airMax = 0.62; this.scene = true; Sfx.dash();
};
Jumper.prototype.sceneDie = function () {
  this.alive = false; this.dead = true; this.state = 'dead'; this.z = 0;
  FX.burst(this.x, this.y - 6, '#d8d0b8', 18, 70, 0.8); Sfx.thud(); FX.shake = 6;
};

class BigJumper extends Jumper {
  constructor(x, y, o) { super(x, y, o, { name: 'Большой костяной прыгун', sprite: 'bigJumper', hp: 5, dmg: 12, xp: 0, r: 12, hw: 9, hh: 5, big: true, reach: 110, sight: 220, blast: 34 }); this.hideLevel = true; }
}

// Метатель: зверь, выстреливает веером шипов
class Thrower extends Enemy {
  constructor(x, y, o) { super(x, y, { name: 'Метатель', sprite: 'thrower', hp: 3, dmg: 7, xp: 18, crystals: 3, r: 6, hw: 5, force: true, blood: '#6a5040', sight: 170 }, o); this.cd = 1.5; }
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
      if (rnd() < 0.5) puff(this.x, this.y, '#5e4630');
      if (this.t <= 0) { this.state = 'idle'; this.cd = Math.min(this.cd, 0.5); }
      return;
    }
    if (this.state === 'windup') {
      this.t -= dt;
      if (this.t <= 0) {
        const a = Math.atan2(n.y, n.x);
        for (const off of [-0.22, 0, 0.22]) Game.projectiles.push(new Spike(this.x, this.y - 4, Math.cos(a + off), Math.sin(a + off), 175, this.dmg));
        Sfx.throw(); this.state = 'idle'; this.cd = 2.2;
        Game.once('seeThrower', () => Game.hint('Метатель стреляет шипами веером. Рывок сквозь шипы или уходи в сторону.', 4));
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
  draw(ctx, cam) {
    if (this.alive && this.state === 'windup' && Math.floor(Game.time * 20) % 2) { this.flashT = 0.02; }
    super.draw(ctx, cam);
  }
}

// ---------- Подбираемое и точки взаимодействия ----------
class Pickup {
  constructor(kind, x, y) { this.kind = kind; this.x = x; this.y = y; this.t = rnd() * 6; }
  update(dt) {
    this.t += dt;
    const p = Game.player;
    if (!p.alive || dist(p.x, p.y - 3, this.x, this.y) > 10) return;
    if (this.kind === 'herb') { p.inv.herbs++; Game.hint('Целебная трава: немного лечит (вещи — Enter)', 2.5); }
    else { if (p.hp >= p.maxHp && p.stamina > p.maxStamina * 0.9) return; p.eat(25, 2, 'Ягоды: немного сил'); }
    Sfx.pick(); FX.burst(this.x, this.y, '#fff', 6, 30); this.remove = true;
  }
  draw(ctx, cam) {
    const img = Art.spr[this.kind];
    drawSpr(ctx, img, this.x - img.width / 2 - cam.x, this.y - img.height + Math.sin(this.t * 3) - cam.y);
  }
}

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

class Campfire {
  constructor(x, y, o = {}) { Object.assign(this, { x, y, lit: false }, o); }
  update() {
    if (this.lit && rnd() < 0.3) FX.parts.push({ x: this.x + rrange(-3, 3), y: this.y - 6, vx: rrange(-5, 5), vy: -rrange(15, 30), life: 0.7, max: 0.7, color: rnd() < 0.5 ? '#ffb040' : '#ff6020', size: 1 });
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

// Куча хлама: после обыска исчезает
class JunkPile {
  constructor(x, y, o) { Object.assign(this, { x, y, item: 'Хлам' }, o); }
  update() { }
  interaction(p) {
    if (this.remove || dist(p.x, p.y, this.x, this.y) > 18) return null;
    return {
      key: this, x: this.x, y: this.y - 16, hold: 0.8, label: 'Держи Space: рыться в мусоре',
      tick: () => { if (rnd() < 0.2) Sfx.blip(); },
      done: () => { this.remove = true; p.inv.junk.push(this.item); Sfx.pick(); FX.burst(this.x, this.y - 3, '#8a7a60', 8, 30); Game.hint(`Нашёл: ${this.item}`, 2); Game.onJunk(this); },
    };
  }
  draw(ctx, cam) { drawSpr(ctx, Art.spr.junk, this.x - 7 - cam.x, this.y - 7 - cam.y); }
}

// Прилавок, стол, сундук: стащить можно, пока хозяева не смотрят
class Container {
  constructor(x, y, o) { Object.assign(this, { x, y, name: 'вещи', owners: [], hold: 1, loot: {}, cool: 0 }, o); this.y = y - 4; }
  update() { }
  // Ловят не только хозяева: если рядом кто-то смотрит на тебя — красть нельзя
  watchers() {
    const p = Game.player;
    const list = this.owners.map(r => Game.roles[r]).filter(w => w && !w.hidden && w.seesPlayer);
    if (this.watched) for (const n of Game.npcs) {
      if (!n.seesPlayer || n.hidden || list.includes(n)) continue;
      if (dist(n.x, n.y, p.x, p.y) < 150) list.push(n);
    }
    return list;
  }
  interaction(p) {
    if (this.used || dist(p.x, p.y, this.x, this.y) > 30 || this.cool > Game.time) return null;
    if (Story.canLoot && !Story.canLoot(this)) return null;
    const steal = this.owners.length > 0;
    return {
      key: this, x: this.x, y: this.y - 12, hold: this.hold,
      label: `Держи Space: ${steal ? 'стащить' : 'обыскать'} ${this.name}`,
      tick: () => {
        const seer = this.watchers().find(w => w.seesPlayer());
        if (seer) { this.cool = Game.time + 3; Story.caughtStealing(seer, this); return false; }
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
