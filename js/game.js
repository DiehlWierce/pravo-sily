'use strict';
// Главный цикл: сцены и переходы через двери, спавн, взаимодействия, опыт, костры и сохранения, смерть.

const SAVE_KEY = 'pravo-sily-save-v3';

const Game = {
  state: 'title', time: 0, locked: false, cutscene: false, flags: {}, stats: null,
  objects: [], enemies: [], npcs: [], pickups: [], props: [], projectiles: [], player: null,
  tags: {}, roles: {}, removed: new Set(), trail: [], timers: [], labels: [], floaters: [],
  dialog: null, menu: null, reader: null, banner: null, hintText: '', hintT: 0, objective: '', prompt: null,
  cam: { x: 0, y: 0 }, camFocus: null, checkpoint: null, deadT: 0, bossBar: null, titleSel: 0,
  waypoint: null, returnTo: null, transition: null, fade: 0, enterCd: 0,

  freshStats() { return { kills: 0, steals: 0, crystals: 0, deaths: 0, time: 0 }; },

  // ---------- Сервисные ----------
  hint(t, d = 3) { this.hintText = t; this.hintT = d; },
  once(flag, fn) { if (!this.flags['once:' + flag]) { this.flags['once:' + flag] = true; fn(); } },
  after(t, fn) { this.timers.push({ t, fn }); },
  say(lines, onDone) { this.dialog = { lines: lines.map(l => typeof l === 'string' ? { who: '', text: l } : l), i: 0, chars: 0, sel: 0, onDone }; },
  choose(who, question, choices) { this.say([{ who, text: question, choices }]); },
  showBanner(title, sub, d = 3, color) { this.banner = { title, sub, t: d, max: d, color }; },
  setCheckpoint(x, y) { this.checkpoint = { scene: World.name, x, y }; },
  focus(target) { this.camFocus = target; },

  // ---------- Сцены ----------
  newGame() {
    this.flags = {}; this.removed = new Set(); this.stats = this.freshStats(); this.returnTo = null;
    this.player = new Player(0, 0);
    this.loadScene('home');
    this.state = 'play';
    Story.start();
  },
  loadScene(name, pos) {
    World.load(SCENES[name]);
    Object.assign(this, { objects: [], enemies: [], npcs: [], pickups: [], props: [], projectiles: [], tags: {}, roles: {}, trail: [], camFocus: null, bossBar: null, waypoint: null });
    let exitPos = null;
    for (const s of World.spawns) {
      const e = this.spawn(s);
      if (s[0] === 'exit') exitPos = { x: s[1] * TS + 8, y: (s[2] - 1) * TS + 8 };
      if (s[0] === 'player' && !pos) pos = { x: s[1] * TS + 8, y: s[2] * TS + 10 };
    }
    pos = pos || exitPos || { x: World.pxW / 2, y: World.pxH / 2 };
    Object.assign(this.player, { x: pos.x, y: pos.y, kvx: 0, kvy: 0, dashT: 0 });
    if (!this.checkpoint || this.checkpoint.scene !== name) this.setCheckpoint(pos.x, pos.y);
    this.enterCd = 0.5;
    Story.onSceneLoad(name);
    this.updateCamera(true);
  },
  // Плавный переход в другую сцену
  enterScene(name, pos) {
    if (this.transition) return;
    this.transition = { t: 0, name, pos }; Sfx.blip();
  },
  spawn(s) {
    const [kind, tx, ty, o = {}] = s, x = tx * TS + 8, y = ty * TS + 10, id = s.id;
    const removed = this.removed.has(id);
    let e = null;
    switch (kind) {
      case 'player': case 'exit': case 'mark':
        if (kind === 'exit') e = this.addSpot(x, ty * TS + 4, { r: 16, label: 'Space: выйти', fn: () => this.exitInterior() });
        if (kind === 'mark') { e = { x, y, sid: id }; if (o.tag) this.tags[o.tag] = e; return e; }
        if (!e) return;
        break;
      case 'door':
        e = this.addSpot(x, (ty + 1) * TS + 4, {
          r: 16, to: o.to, locked: o.locked,
          label: () => o.locked ? 'Space: дверь' : 'Space: войти',
          fn: (spot) => {
            if (o.locked) { this.hint(['Заперто.', 'Заперто. Изнутри храпят.', 'Никого нет. Заперто.'][(tx + ty) % 3], 1.5); Sfx.clang(); return; }
            if (!Story.canEnter(o.to)) return;
            this.returnTo = { scene: World.name, x: spot.x, y: spot.y + 10 };
            this.enterScene(o.to, null);
          },
        });
        break;
      case 'rock': case 'crate': case 'barrel': case 'boulder': e = new Obj(kind, x, y); this.objects.push(e); break;
      case 'junk': if (removed) return; e = new JunkPile(x, y, o); this.props.push(e); break;
      case 'container': e = new Container(x, y, o); e.used = removed; this.props.push(e); break;
      case 'campfire': e = new Campfire(x, y + 4, o); e.lit = !!this.flags['lit:' + id]; this.props.push(e); break;
      case 'herb': case 'berries': if (removed) return; e = new Pickup(kind, x, y); this.pickups.push(e); break;
      case 'npc': e = new NPC(x, y, o); this.npcs.push(e); break;
      case 'watcher': e = new Watcher(x, y, o); this.npcs.push(e); break;
      default: {
        if (removed) return;
        const C = { rabbit: Rabbit, boar: Boar, spiker: Spiker, jumper: Jumper, bigJumper: BigJumper, thrower: Thrower, hunter: Hunter }[kind];
        if (!C) return;
        e = new C(x, y, o); this.enemies.push(e);
        if (kind === 'hunter' || kind === 'bigJumper') this.tags[kind] = e;
      }
    }
    e.sid = id;
    if (o.tag) this.tags[o.tag] = e;
    if (o.role) this.roles[o.role] = e;
    return e;
  },
  addChaser(tx, ty, o) { const c = new Chaser(tx * TS + 8, ty * TS + 10, o); this.npcs.push(c); if (o.role) this.roles[o.role] = c; return c; },
  addSpot(x, y, o) { const s = new Spot(x, y, o); this.props.push(s); return s; },
  exitInterior() {
    if (!Story.canExit()) return;
    const r = this.returnTo || { scene: 'slums', x: this.tags.homeFront ? this.tags.homeFront.x : 120, y: 540 };
    this.enterScene(r.scene, { x: r.x, y: r.y });
  },

  // Ближайшее действие. Разговор уступает вещам под рукой: у прилавка сначала предлагают стащить
  findInteraction(p) {
    let best = null, bd = 1e9;
    for (const list of [this.npcs, this.props, this.enemies]) for (const e of list) {
      if (!e.interaction) continue;
      const it = e.interaction(p); if (!it) continue;
      const d = dist(p.x, p.y, e.x, e.y) + (it.hold ? 0 : 12);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  },

  // ---------- События ----------
  onKill(e) {
    this.stats.kills++;
    if (!e.loot.crystals && !e.loot.meat && !e.keepBody) { e.looted = true; this.removed.add(e.sid); }
    this.player.gainXp(e.xp);
    if (e.xp) this.floaters.push({ x: e.x, y: e.y - 20, text: `+${e.xp} опыта`, color: '#c8b0ff', ttl: 1.4 });
    Story.onKill(e);
  },
  onLoot(e) {
    const inv = this.player.inv, got = [];
    if (e.loot.meat) { inv.meatRaw += e.loot.meat; got.push(`сырое мясо +${e.loot.meat}`); }
    if (e.loot.crystals) {
      inv.crystals += e.loot.crystals; this.stats.crystals += e.loot.crystals; got.push(`кристалл +${e.loot.crystals}`);
      Sfx.crystal(); FX.burst(e.x, e.y - 6, '#7cf0ff', 14, 60);
    } else Sfx.pick();
    this.removed.add(e.sid);
    if (got.length) this.hint(got.join(' · '), 2);
    Story.onLoot(e);
  },
  onLevelUp(ups) {
    const p = this.player;
    Sfx.crystal(); FX.burst(p.x, p.y - 8, '#c8b0ff', 20, 60, 0.8);
    this.showBanner(`УРОВЕНЬ ${p.level}`, ups.map(s => `${STAT_NAMES[s]} +1`).join(' · '), 2.8, '#d8c0ff');
  },
  onJunk(j) { this.removed.add(j.sid); Story.onJunk(j); },
  onContainer(c) {
    const v = this.player.inv, L = c.loot, got = [];
    if (L.coins) { v.coins += L.coins; got.push(`${L.coins} медяк${L.coins === 1 ? '' : 'а'}`); Sfx.coin(); }
    if (L.bread) { v.bread += L.bread; got.push('хлеб'); }
    if (L.goods) { v.goods.push({ ...L.goods }); got.push(L.goods.name.toLowerCase()); }
    if (L.meatCooked) { v.meatCooked += L.meatCooked; got.push(`жареное мясо ×${L.meatCooked}`); }
    if (L.herbs) { v.herbs += L.herbs; got.push('целебная трава'); }
    if (L.junk) { for (let i = 0; i < L.junk; i++) v.junk.push('Хлам из ящика'); got.push('хлам'); }
    if (L.pendant) v.pendant = true;
    if (c.owners.length) this.stats.steals++;
    this.removed.add(c.sid);
    if (got.length) { this.hint((c.owners.length ? 'Стащил: ' : 'Нашёл: ') + got.join(', '), 2.2); Sfx.pick(); }
    else if (!L.pendant) this.hint('Пусто.', 1.5);
    Story.onContainer(c);
  },

  useCampfire(c) {
    const p = this.player;
    const rest = () => {
      p.hp = p.maxHp; p.stamina = p.maxStamina;
      this.setCheckpoint(c.x, c.y + 14);
      Story.onRest(c);
      this.save(); this.showBanner('Отдых', 'здоровье восстановлено · сохранено', 2.2, '#ffd080');
    };
    const justLit = !c.lit;
    if (justLit) {
      c.lit = true; this.flags['lit:' + c.sid] = true; Sfx.crystal(); FX.burst(c.x, c.y - 4, '#ffb040', 16, 50);
      this.setCheckpoint(c.x, c.y + 14); this.save();
    }
    if (Story.onCampfire(c, justLit)) return;
    const choices = [];
    if (p.inv.meatRaw) choices.push({ label: `Пожарить мясо (${p.inv.meatRaw})`, fn: () => { p.inv.meatCooked += p.inv.meatRaw; p.inv.meatRaw = 0; Sfx.pick(); FX.burst(c.x, c.y - 8, '#ffb040', 12, 40); this.hint('Мясо шипит на углях. Готово. (E — съесть)', 2.5); } });
    choices.push({ label: 'Отдохнуть у огня', fn: rest });
    choices.push({ label: 'Уйти', fn: () => { } });
    this.choose('', 'Костёр трещит. Здесь можно перевести дух.', choices);
  },

  // Применить предмет, назначенный на кнопку быстрого действия
  useQuickItem(key) {
    const e = UI.invEntries().find(x => x.key === key && x.use);
    if (!e) return false;
    e.use(); return true;
  },
  toTitle() { this.save(); this.state = 'title'; this.titleSel = 0; this.menu = null; this.dialog = null; this.reader = null; },

  onPlayerDeath() { this.deadT = 2; this.stats.deaths++; },
  respawn() {
    const p = this.player;
    if (Story.onRespawn()) return;
    const c = this.checkpoint;
    Object.assign(p, { x: c.x, y: c.y, hp: p.maxHp, stamina: p.maxStamina, alive: true, invul: 1.5, kvx: 0, kvy: 0, dashT: 0 });
    this.objects = this.objects.filter(o => !o.temp);
    this.projectiles = [];
    for (const o of this.objects) if (o.state !== 'rest') { o.state = 'rest'; o.x = o.home.x; o.y = o.home.y; o.z = 0; }
    for (const e of this.enemies) if (e.alive && !(e instanceof Hunter)) Object.assign(e, { x: e.home.x, y: e.home.y, hp: e.maxHp, state: 'idle', t: 1, stun: 0, kvx: 0, kvy: 0, z: 0, jumps: 0, chain: 0 });
    this.hint('Ещё раз.', 1.5);
  },

  // ---------- Сохранение ----------
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  save() {
    const p = this.player;
    const data = {
      scene: World.name, x: p.x, y: p.y, objective: this.objective, returnTo: this.returnTo,
      player: { level: p.level, xp: p.xp, stats: p.stats, maxHp: p.maxHp, hp: p.hp, maxStamina: p.maxStamina, stamina: p.stamina, inv: p.inv, implant: p.implant, abilities: p.abilities, hasKnife: p.hasKnife, quickItem: p.quickItem },
      flags: this.flags, removed: [...this.removed], stats: this.stats,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { }
  },
  loadGame() {
    let d; try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { d = null; }
    if (!d) { this.newGame(); return; }
    this.flags = d.flags; this.removed = new Set(d.removed); this.stats = d.stats; this.returnTo = d.returnTo;
    this.player = new Player(d.x, d.y); Object.assign(this.player, d.player);
    this.checkpoint = null;
    this.loadScene(d.scene, { x: d.x, y: d.y });
    this.objective = d.objective; this.state = 'play';
    Story.onLoad();
    this.hint('Продолжаем.', 2);
  },

  // ---------- Обновление ----------
  update(dt) {
    Input.update();
    this.time += dt;
    if (this.state === 'title') { UI.updateTitle(); return; }
    if (this.state === 'end') { if (Input.pressed('start') || Input.pressed('a')) { this.state = 'title'; this.titleSel = 0; } return; }

    this.hintT = Math.max(0, this.hintT - dt);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    FX.update(dt);

    if (this.transition) {
      const tr = this.transition; tr.t += dt;
      this.fade = tr.t < 0.25 ? tr.t / 0.25 : Math.max(0, 1 - (tr.t - 0.25) / 0.25);
      if (!tr.loaded && tr.t >= 0.25) { tr.loaded = true; this.loadScene(tr.name, tr.pos); }
      if (tr.t >= 0.5) { this.transition = null; this.fade = 0; }
      return;
    }
    if (this.reader) { UI.updateReader(); return; }
    if (this.menu) { UI.updateMenu(); return; }
    if (this.dialog) { UI.updateDialog(dt); this.updateCamera(); return; }
    if (Input.pressed('start') && !this.cutscene) { this.menu = { sel: 0 }; return; }

    for (const t of this.timers) { t.t -= dt; if (t.t <= 0) { t.done = true; t.fn(); } }
    this.timers = this.timers.filter(t => !t.done);
    if (this.dialog || this.reader || this.transition) return;

    this.stats.time += dt;
    this.locked = this.cutscene;
    this.enterCd = Math.max(0, this.enterCd - dt);

    if (this.deadT > 0) { this.deadT -= dt; if (this.deadT <= 0) this.respawn(); this.updateCamera(); return; }

    const p = this.player;
    p.update(dt);
    for (const list of [this.objects, this.enemies, this.npcs, this.pickups, this.props, this.projectiles]) for (const e of list) e.update(dt);
    this.objects = this.objects.filter(o => !o.remove);
    this.projectiles = this.projectiles.filter(o => !o.remove);
    this.enemies = this.enemies.filter(e => { if (e.remove) this.removed.add(e.sid); return !e.remove; });
    this.pickups = this.pickups.filter(k => { if (k.remove) this.removed.add(k.sid); return !k.remove; });
    this.props = this.props.filter(k => !k.remove);

    for (const f of this.floaters) { f.ttl -= dt; f.y -= dt * 12; }
    this.floaters = this.floaters.filter(f => f.ttl > 0);

    const last = this.trail[this.trail.length - 1];
    if (!last || dist(last.x, last.y, p.x, p.y) > 8) { this.trail.push({ x: p.x, y: p.y }); if (this.trail.length > 400) this.trail.shift(); }

    // Встал на коврик у выхода — выходим на улицу
    if (World.theme === 'interior' && this.enterCd <= 0 && !this.locked &&
      (World.atPx(p.x, p.y) === 'E' || World.atPx(p.x, p.y + 3) === 'E')) this.exitInterior();

    Story.update(dt);
    this.updateCamera();
  },

  updateCamera(snap) {
    const t = this.camFocus || this.player;
    const tx = World.pxW <= W ? (World.pxW - W) / 2 : clamp(t.x - W / 2, 0, World.pxW - W);
    const ty = World.pxH <= H - 40 ? (World.pxH - H) / 2 - 10 : clamp(t.y - 8 - H / 2, 0, Math.max(0, World.pxH - H));
    const k = snap || !this.camFocus ? 1 : Math.min(1, 1 / 60 * 4);
    this.cam.x = lerp(this.cam.x, tx, k); this.cam.y = lerp(this.cam.y, ty, k);
  },

  // ---------- Отрисовка ----------
  draw() {
    bctx.imageSmoothingEnabled = false;
    this.labels = [];
    if (this.state === 'title') UI.titleShapes();
    else {
      const sh = FX.shake ? rrange(-FX.shake, FX.shake) * 0.5 : 0;
      const cam = { x: this.cam.x + sh, y: this.cam.y + sh };
      World.draw(bctx, cam, this.time);
      const list = [...this.props, ...this.pickups, ...this.objects, ...this.enemies, ...this.npcs, this.player];
      list.sort((a, b) => (a.y + (a.state === 'held' ? 8 : 0)) - (b.y + (b.state === 'held' ? 8 : 0)));
      for (const e of list) e.draw(bctx, cam);
      for (const pr of this.projectiles) pr.draw(bctx, cam);
      FX.draw(bctx, cam);
      if (World.tint) { bctx.fillStyle = World.tint; bctx.fillRect(0, 0, W, H); }
      bctx.drawImage(vignette, 0, 0);
      this.drawOverlays();
      if (this.state === 'play') UI.hudShapes();
    }
    if (this.dialog) UI.dialogShapes();
    if (this.menu) UI.menuShapes();
    if (this.reader) UI.readerShapes();

    dctx.imageSmoothingEnabled = false;
    dctx.drawImage(buffer, 0, 0, screen.width, screen.height);

    if (this.state === 'title') { UI.titleText(); return; }
    if (this.state === 'play') UI.hudText();
    if (this.dialog) UI.dialogText();
    if (this.menu) UI.menuText();
    if (this.reader) UI.readerText();
    if (this.deadT > 0 && this.deadT < 1.6) text(this.deathText || 'Темнота...', W / 2, H / 2 - 6, { size: 8, align: 'center', color: '#e08080' });
    if (this.state === 'end') UI.endText();
  },
  drawOverlays() {
    if (this.painT > 0) {
      this.painT -= 1 / 60;
      bctx.strokeStyle = `rgba(255,30,30,${0.5 * this.painT / (this.painMax || 2)})`; bctx.lineWidth = 12; bctx.strokeRect(0, 0, W, H); bctx.lineWidth = 1;
    }
    if (FX.flash > 0) { bctx.globalAlpha = Math.min(1, FX.flash); bctx.fillStyle = FX.flashColor; bctx.fillRect(0, 0, W, H); bctx.globalAlpha = 1; }
    if (this.fade > 0) { bctx.fillStyle = `rgba(0,0,0,${clamp(this.fade, 0, 1)})`; bctx.fillRect(0, 0, W, H); }
    if (this.deadT > 0) { bctx.fillStyle = `rgba(20,0,0,${clamp(1 - (this.deadT - 0.5) / 1.5, 0, 0.85)})`; bctx.fillRect(0, 0, W, H); }
  },
};

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - lastT) / 1000); lastT = now;
  Game.update(dt);
  Game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
