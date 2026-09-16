'use strict';
// Герой: движение, рывок, удар, метательные ножи, взаимодействие, уровни.
// Вещи лежат в inv (см. systems/inventory.js), снаряжение — в gear.

class Player {
  constructor(x, y) {
    const c = CONFIG.player;
    Object.assign(this, {
      x, y, hw: 4, hh: 3, r: 6, z: 0, face: { x: 1, y: 0 }, lr: 'r', alive: true, sprite: 'hero', faction: 'player',
      level: 1, xp: 0, stats: { str: 1, hp: 1, sta: 1 },
      maxHp: c.maxHp, hp: c.maxHp, maxStamina: c.maxStamina, stamina: c.maxStamina, staminaT: 0, tiredMsg: 0, msgT: 0,
      hasKnife: false, quickItem: null, knifeCd: 0,
      dashT: 0, dashCd: 0, dashDir: { x: 1, y: 0 }, atkT: 0, atkHit: new Set(), invul: 0, kvx: 0, kvy: 0,
      walk: 0, moving: false, holdT: 0, holdTarget: null,
      implant: null, abilities: {},
      inv: Inv.empty(),
      gear: { weapon: 'knife', armor: 'rags' },
    });
  }
  get weapon() { return WEAPONS[this.gear.weapon] || WEAPONS.knife; }
  get armor() { return ARMORS[this.gear.armor] || ARMORS.rags; }
  get damage() { return this.weapon.dmg + CONFIG.levels.damagePerStr * (this.stats.str - 1); }
  get staminaRegen() { return CONFIG.player.staminaRegen + CONFIG.player.staminaRegenPerLevel * (this.stats.sta - 1); }
  xpNext() { const L = CONFIG.levels; return Math.round(L.xpBase * Math.pow(this.level, L.xpPower)); }
  gainXp(n) {
    if (!n) return;
    const L = CONFIG.levels;
    this.xp += n;
    const ups = [];
    while (this.xp >= this.xpNext()) {
      this.xp -= this.xpNext(); this.level++;
      const stat = L.statOrder[(this.level - 2) % L.statOrder.length];
      this.stats[stat]++;
      if (stat === 'hp') { this.maxHp += L.hpPerLevel; this.hp += L.hpPerLevel; }
      if (stat === 'sta') this.maxStamina += L.staminaPerLevel;
      this.stamina = this.maxStamina;
      ups.push(stat);
    }
    if (ups.length) Game.onLevelUp(ups);
  }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  update(dt) {
    this.invul = Math.max(0, this.invul - dt); this.dashCd = Math.max(0, this.dashCd - dt); this.atkT = Math.max(0, this.atkT - dt);
    updateKnockback(this, dt, 0.001);
    if (!Game.locked) {
      this.staminaT += dt;
      if (this.staminaT > CONFIG.player.staminaRegenDelay) this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegen * dt);
    }
    Game.prompt = null;
    if (Game.locked || !this.alive) { this.moving = false; return; }
    this.handleInput(dt);
  }

  handleInput(dt) {
    const c = CONFIG.player;
    let mx = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    let my = (Input.held('down') ? 1 : 0) - (Input.held('up') ? 1 : 0);
    this.moving = !!(mx || my);
    if (this.moving) { const n = norm(mx, my); this.face = n; if (mx) this.lr = mx > 0 ? 'r' : 'l'; mx = n.x; my = n.y; }

    if (Input.pressed('b') && this.dashCd <= 0 && this.spend(c.dash.cost)) {
      this.dashT = c.dash.time; this.dashCd = c.dash.cooldown; this.dashDir = this.moving ? { x: mx, y: my } : { ...this.face };
      Sfx.dash(); FX.burst(this.x, this.y, '#bbb', 6, 30, 0.3);
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      moveBody(this, this.dashDir.x * c.dash.speed * dt, this.dashDir.y * c.dash.speed * dt);
      if (rnd() < 0.6) FX.add({ x: this.x, y: this.y - 4, vx: 0, vy: 0, life: 0.2, max: 0.2, color: '#6b6f5a', size: 2 });
    } else if (this.moving) {
      const spd = c.speed * (this.armor.slow || 1);
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
    if (Input.pressed('y')) this.throwKnife();
    if (Input.pressed('r')) this.useQuick();

    if (this.atkT > 0.06) {
      const reach = this.weapon.reach, hx = this.x + this.face.x * reach, hy = this.y - 4 + this.face.y * reach;
      for (const e of Game.enemies) if (e.alive && !this.atkHit.has(e) && e.z < 6 && dist(e.x, e.y - 4, hx, hy) < e.r + 8) {
        this.atkHit.add(e); e.takeHit(this.damage, 'knife', this.face.x, this.face.y, this);
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
    if (this.atkT > 0 || !this.spend(CONFIG.player.attack.cost)) return;
    this.atkT = CONFIG.player.attack.time; this.atkHit = new Set(); Sfx.slash();
  }
  // Y (K): метательный нож, если есть. Позже здесь будут способности импланта
  throwKnife() {
    const c = CONFIG.player.throwKnife;
    if (Inv.count('knives') > 0) {
      if (this.atkT > 0 || this.knifeCd > Game.time || !this.spend(c.cost)) return;
      Inv.take('knives'); this.knifeCd = Game.time + c.cooldown; Sfx.throw();
      Game.projectiles.push(new ThrownKnife(this.x + this.face.x * 6, this.y - 2 + this.face.y * 6, this.face.x, this.face.y, 1.5 + 0.5 * (this.stats.str - 1)));
      if (!Inv.count('knives')) Game.hint('Метательные ножи кончились. Купить у оружейника.', 2.5);
      return;
    }
    if (Game.time > this.msgT) { this.msgT = Game.time + 2; Game.hint('Во мне нет никакой силы. Только нож и ноги.', 1.8); }
  }
  // Кнопка быстрого действия: что на неё назначено в меню, то и применяется
  useQuick() {
    if (!this.quickItem) { Game.hint('Быстрая кнопка пуста. Назначь предмет в вещах (Enter).', 2.5); return; }
    if (!Inv.use(this.quickItem)) Game.hint('Этого больше нет.', 1.5);
  }
  eat(stamina, heal, msg) {
    this.stamina = Math.min(this.maxStamina, this.stamina + stamina); this.heal(heal);
    Sfx.pick(); FX.burst(this.x, this.y - 8, '#e0b070', 6, 30); if (msg) Game.hint(msg, 1.8);
    Events.emit('ate');
  }

  // silent — урон без неуязвимости и без поглощения одеждой (сюжетные удары)
  hurt(dmg, dx, dy, silent) {
    if (!this.alive || (!silent && (this.invul > 0 || this.dashT > 0)) || Game.flags.godmode) return;
    if (!silent) dmg = Math.max(1, dmg - this.armor.def);
    this.hp -= dmg; if (!silent) this.invul = CONFIG.player.invulAfterHit;
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
      const a = Math.atan2(this.face.y, this.face.x), t = 1 - this.atkT / CONFIG.player.attack.time;
      ctx.strokeStyle = `rgba(255,255,255,${1 - t})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy - 5, 11, a - 1 + t * 0.6, a + 0.6 + t * 0.6); ctx.stroke(); ctx.lineWidth = 1;
    }
  }
}
