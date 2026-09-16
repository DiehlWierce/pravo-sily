'use strict';
// Охотник-интегрированный. Обычный боец, а не сценка: поднимает силой камни, что лежат вокруг,
// кидает их во врага, отпрыгивает, отшвыривает вплотную, выдыхается после серии бросков.
//
// Режимы:
//   dormant      — спит, пока герой не подошёл к поляне
//   дуэль        — враги только звери (фракция hunter), сражается с большим прыгуном
//   hates player — после встречи с героем дерётся и с ним (босс)
// Звери не могут его убить: вне усталости поле силы гасит удар, в усталости он теряет немного здоровья.

class Hunter extends Enemy {
  constructor(x, y, o) {
    super(x, y, 'hunter', o);
    this.maxHp = BEASTS.hunter.hp; this.hp = this.maxHp; this.dmg = 1; this.xp = BEASTS.hunter.xp;
    Object.assign(this, { who: 'hunter', keepBody: true, state: 'fight', throwCd: 1, thrown: 0, lifted: null, hitsInWindow: 0, tireAfter: 5, hates: [], moving: false });
  }
  get boss() { return this.hates.includes('player'); }
  forceGlow() {
    if (this.state === 'hop' || this.state === 'recover') return 1;
    if (this.lifted) return 0.75 + 0.25 * Math.sin(Game.time * 14);
    return super.forceGlow();
  }

  // Удар зверя или камня: поле силы держит, пока охотник не выдохся
  hurt(dmg, dx, dy, src, attacker) {
    if (!this.alive || this.dormant) return;
    if (attacker && attacker !== Game.player) {
      if (this.state !== 'tired') {
        this.pulseForce(0.5); FX.burst(this.x, this.y - 6, FORCE.push.color, 10, 50); Sfx.clang();
        knock(this, (dx || 0) * 90, (dy || 0) * 90);
        return;
      }
      this.hp = Math.max(2, this.hp - dmg * 0.35); this.flashT = 0.15; knock(this, (dx || 0) * 60, (dy || 0) * 60);
      Sfx.hit(); FX.burst(this.x, this.y - 5, this.blood, 6, 50);
      return;
    }
    this.takeHit(dmg, src, Math.sign(dx) || 0, Math.sign(dy) || 0, attacker);
  }
  takeHit(dmg, src, dx, dy, attacker) {
    if (!this.alive || this.dormant) return;
    const byHero = attacker === Game.player;
    if (byHero && !this.boss) Events.emit('hunter:provoked', this);
    if (['panting', 'loot', 'cut', 'wait'].includes(this.state) && !this.boss) return;
    if (this.state !== 'tired') {
      Sfx.clang(); FX.burst(this.x - dx * 6, this.y - 6, FORCE.push.color, 10, 50); this.pulseForce(0.5);
      if (byHero) {
        knock(Game.player, -dx * 220, -dy * 220);
        Game.once('hunterField', () => Game.hint('Воздух вокруг него плотный, как стена. Уворачивайся и жди, пока он выдохнется.', 4));
      }
      return;
    }
    super.takeHit(dmg, src, dx, dy, attacker);
    this.kvx *= 0.3; this.kvy *= 0.3;
    if (this.alive && ++this.hitsInWindow >= 2) { this.state = 'recover'; this.t = 0.3; }
  }
  die() {
    this.alive = false; this.dead = true; this.state = 'down';
    this.dropLifted(); FX.burst(this.x, this.y - 5, FORCE.push.color, 16, 70, 0.8); Sfx.thud(); FX.shake = 8;
    Game.onKill(this);
    Events.emit('hunter:down', this);
  }
  interaction(p) {
    if (!this.dead || this.looted || dist(p.x, p.y, this.x, this.y) > 22) return null;
    return { key: this, x: this.x, y: this.y - 16, hold: 1.0, label: 'Держи Space: обыскать сумку охотника', done: () => { this.looted = true; Events.emit('hunter:looted', this); } };
  }
  dropLifted() { if (this.lifted) { this.lifted.state = 'rest'; this.lifted.land(); this.lifted = null; } }

  // После дуэли: подойти к туше и вырезать кристаллы
  lootCorpse(corpse) {
    this.dropLifted(); this.target = null;
    this.state = 'loot'; this.corpse = corpse;
  }
  startFight(asBoss) {
    if (asBoss && !this.boss) this.hates.push('player');
    Object.assign(this, { dormant: false, state: 'fight', target: null, retargetT: 0, throwCd: 0.2, thrown: 0, tireAfter: 5, hitsInWindow: 0 });
  }

  update(dt) {
    this.flashT = Math.max(0, this.flashT - dt);
    this.auraT = Math.max(0, this.auraT - dt);
    updateKnockback(this, dt);
    this.moving = false;
    if (this.dead) { if (this.looted) { this.fade -= dt; if (this.fade <= 0) this.remove = true; } return; }
    if (this.dormant) return;
    if (this.goal) { if (Nav.go(this, this.goal.x, this.goal.y, 45, dt)) { const cb = this.goal.done; this.goal = null; cb && cb(); } return; }
    if (this.lifted) { this.lifted.tx = this.x + (this.lr === 'r' ? 7 : -7); this.lifted.ty = this.y - 2; this.lifted.carryZ = 14; }
    this.t -= dt;
    switch (this.state) {
      case 'loot': {
        const c = this.corpse;
        if (!c || c.looted) { this.state = 'panting'; break; }
        this.lr = c.x > this.x ? 'r' : 'l';
        if (Nav.go(this, c.x - (c.x > this.x ? 12 : -12), c.y, 40, dt)) { this.state = 'cut'; this.t = 2.2; }
        break;
      }
      case 'cut':
        if (rnd() < 0.3) FX.puff(this.corpse.x, this.corpse.y - 6, '#7cf0ff');
        if (this.t <= 0) {
          this.corpse.looted = true; this.corpse.loot.crystals = 0; Sfx.crystal();
          FX.burst(this.corpse.x, this.corpse.y - 8, '#7cf0ff', 16, 60);
          this.state = 'panting'; Events.emit('hunter:cut', this);
        }
        break;
      case 'wait': case 'panting':
        this.lr = Game.player.x > this.x ? 'r' : 'l';
        if (this.state === 'panting' && rnd() < 0.08) FX.puff(this.x, this.y - 14, '#dde');
        break;
      case 'hop':
        moveBody(this, this.hopDir.x * 230 * dt, this.hopDir.y * 230 * dt);
        if (rnd() < 0.5) FX.puff(this.x, this.y, '#8a7a5a');
        if (this.t <= 0) { this.state = 'fight'; this.throwCd = 0.35; }
        break;
      case 'fight': {
        this.retarget(dt);
        const p = this.tgt;
        if (!p.alive) { this.dropLifted(); break; }
        this.lr = p.x > this.x ? 'r' : 'l';
        const d = dist(p.x, p.y, this.x, this.y), n = norm(p.x - this.x, p.y - this.y);
        this.hopCd = Math.max(0, (this.hopCd || 0) - dt);
        if (d < 26 + (p.r || 6)) {   // подпустил вплотную — отшвыривает и отпрыгивает
          if (d < 18 + (p.r || 6)) { knock(p, n.x * 320, n.y * 320); this.pulseForce(0.5); Sfx.push(); FX.burst(this.x, this.y - 6, FORCE.push.color, 12, 60); }
          if (this.hopCd <= 0) {
            // Отпрыгивает от врага, а в дуэли — ещё и в сторону своей поляны
            const hn = norm(this.home.x - this.x, this.home.y - this.y), k = this.boss ? 0 : 0.6;
            this.hopCd = 3; this.state = 'hop'; this.t = 0.3; this.hopDir = norm(-n.x + hn.x * k, -n.y + hn.y * k); this.dropLifted(); Sfx.dash(); break;
          }
        }
        const want = d < 70 ? -1 : d > 120 ? 1 : 0;
        // Со зверем бьётся на своей поляне: далеко от неё не уходит
        const hd = dist(this.x, this.y, this.home.x, this.home.y), hn = norm(this.home.x - this.x, this.home.y - this.y);
        const pull = !this.boss && hd > 80 ? Math.min(1.5, (hd - 80) / 40) * 40 : 0;
        if (!this.lifted) { moveBody(this, (n.x * want * 42 - n.y * 18 + hn.x * pull) * dt, (n.y * want * 42 + n.x * 18 + hn.y * pull) * dt); this.moving = want !== 0 || pull > 0; }
        this.throwCd -= dt;
        if (!this.lifted && this.throwCd <= 0) this.lift();
        else if (this.lifted && this.t <= 0) this.throwAt(p);
        break;
      }
      case 'tired':
        if (rnd() < 0.12) FX.puff(this.x + rrange(-3, 3), this.y - 12, '#dde');
        if (this.t <= 0) { this.state = 'recover'; this.t = 0.3; }
        break;
      case 'recover':
        if (this.t <= 0) this.shockwave();
        break;
    }
  }
  // Поднять силой ближайший лежащий камень. Рядом нет — идёт к дальнему, ничего не создавая
  lift() {
    let best = null, bd = 130, far = null, fd = 1e9;
    for (const o of Game.objects) {
      if (o.state !== 'rest' || o.mass !== 'light') continue;
      const d = dist(o.x, o.y, this.x, this.y);
      if (d < bd) { bd = d; best = o; }
      if (d < fd) { fd = d; far = o; }
    }
    if (!best) {
      this.throwCd = 0.6;
      if (far) this.goal = { x: far.x + rrange(-14, 14), y: far.y + 12, done: () => { this.throwCd = 0; } };
      return;
    }
    best.state = 'held'; best.owner = this; this.lifted = best; this.t = 0.38; Sfx.grab(); this.pulseForce(0.4);
  }
  throwAt(p) {
    const o = this.lifted; this.lifted = null;
    const lead = p.moving ? 0.22 : 0, pf = p.face || { x: 0, y: 0 };
    const n = norm(p.x + pf.x * 72 * lead - o.x, p.y - 3 + pf.y * 72 * lead - o.y);
    o.launch(n.x, n.y, 215, 240, this, true);
    o.dmg = BEASTS.hunter.rockDamage; o.targets = null;
    Sfx.throw(); this.pulseForce(0.4);
    this.throwCd = rrange(0.55, 0.95);
    if (++this.thrown >= this.tireAfter) {
      this.state = 'tired'; this.t = 2.3; this.thrown = 0; this.hitsInWindow = 0; this.tireAfter = 5 + ((rnd() * 3) | 0);
      if (this.boss) Game.once('hunterTired', () => Game.hint('Он еле стоит на ногах... Сейчас!', 2.5));
    }
  }
  // Пришёл в себя — волна силы отшвыривает всех врагов рядом
  shockwave() {
    this.state = 'fight'; this.throwCd = 0.8; this.pulseForce(0.6); Sfx.push();
    if (dist(Game.player.x, Game.player.y, this.x, this.y) < 200) FX.shake = 5;
    for (let i = 0; i < 24; i++) { const a = rnd() * 7, s = rrange(60, 160); FX.add({ x: this.x, y: this.y - 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, color: FORCE.push.color, size: 1 }); }
    for (const t of Combat.hostilesOf(this)) {
      if (dist(t.x, t.y, this.x, this.y) >= 60) continue;
      const n = norm(t.x - this.x, t.y - this.y); knock(t, n.x * 300, n.y * 300);
    }
    if (this.boss) Game.once('hunterRecover', () => Game.hint('Пришёл в себя и отшвырнул меня. Снова уворачиваться.', 3));
  }
  draw(ctx, cam) {
    if (this.dead) { drawHuman(ctx, cam, this, { lying: true, alpha: this.looted ? Math.max(0, this.fade / 1.2) : 1 }); return; }
    const kneel = this.state === 'tired' || this.state === 'panting' || this.state === 'cut';
    const glow = this.forceGlow();
    if (glow > 0) Aura.sparks(this.x, this.y - 8, glow);
    drawHuman(ctx, cam, this, { kneel, shake: this.state === 'recover', glow });
    const eye = kneel ? 0.3 : 0.6 + 0.4 * Math.sin(Game.time * 6);
    ctx.fillStyle = `rgba(${FORCE.push.rgb},${eye})`;
    ctx.fillRect(Math.round(this.x - cam.x + (this.lr === 'r' ? 4 : -5)), Math.round(this.y - cam.y - 6 + (kneel ? 3 : 0)), 1, 2);
    if (this.lifted) {
      ctx.fillStyle = `rgba(${FORCE.push.rgb},0.8)`;
      for (let i = 1; i < 5; i++) { const t = i / 5; ctx.fillRect(Math.round(lerp(this.x - cam.x, this.lifted.x - cam.x, t)), Math.round(lerp(this.y - cam.y - 6, this.lifted.y - this.lifted.z - cam.y, t)), 1, 1); }
    }
    const p = Game.player;
    if (this.boss && Settings.get('levels') && this.state !== 'panting' && dist(p.x, p.y, this.x, this.y) < 140) Game.labels.push({ x: this.x, y: this.y - 22, text: `ур.${this.lvl}`, color: '#ff9080' });
  }
}
