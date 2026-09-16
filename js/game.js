'use strict';
// Игра: состояние, сцены и переходы, списки сущностей, камера, взаимодействие, опыт, костры, смерть, отрисовка.
// Сюжет сюда не пишется — движок сообщает о событиях через Events, главы решают сами (story/*).

const Game = {
  state: 'title', time: 0, locked: false, cutscene: false, flags: {}, stats: null,
  objects: [], enemies: [], npcs: [], critters: [], pickups: [], props: [], projectiles: [], player: null,
  tags: {}, roles: {}, removed: new Set(), trail: [], timers: [], labels: [], floaters: [], bubbles: [],
  dialog: null, menu: null, reader: null, banner: null, hintText: '', hintT: 0, objective: '', prompt: null,
  cam: { x: 0, y: 0 }, camFocus: null, checkpoint: null, deadT: 0, bossBar: null, titleSel: 0,
  waypoint: null, returnTo: null, transition: null, fade: 0, enterCd: 0, painT: 0, painMax: 1,

  freshStats() { return { kills: 0, steals: 0, crystals: 0, deaths: 0, caught: 0, time: 0 }; },

  // ---------- Сервисные ----------
  hint(t, d = 3) { this.hintText = t; this.hintT = d; },
  once(flag, fn) { if (!this.flags['once:' + flag]) { this.flags['once:' + flag] = true; fn(); } },
  after(t, fn) { this.timers.push({ t, fn }); },
  say(lines, onDone) { this.dialog = { lines: lines.map(l => typeof l === 'string' ? { who: '', text: l } : l), i: 0, chars: 0, sel: 0, onDone }; },
  choose(who, question, choices) { this.say([{ who, text: question, choices }]); },
  showBanner(title, sub, d = 3, color) { this.banner = { title, sub, t: d, max: d, color }; },
  setCheckpoint(x, y) { this.checkpoint = { scene: World.name, x, y }; },
  focus(target) { this.camFocus = target; },
  pain(t) { this.painT = t; this.painMax = t; },
  add(list, e) { this[list].push(e); return e; },

  // ---------- Новая игра и сцены ----------
  newGame() {
    this.flags = {}; this.removed = new Set(); this.stats = this.freshStats(); this.returnTo = null;
    this.dialog = null; this.menu = null; this.reader = null; this.timers = []; this.transition = null; this.fade = 0;
    this.objective = ''; this.bossBar = null; this.checkpoint = null; this.deadT = 0;
    this.player = new Player(0, 0);
    this.loadScene('home');
    this.state = 'play';
    Story.start();
    this.save();
  },
  loadScene(name, pos) {
    const def = SCENES[name];
    // В охотничьих местах звери и травы возвращаются при каждом заходе — есть где гриндить
    if (def.respawn) for (const id of [...this.removed])
      if (id.startsWith(name + ':') && /:(rabbit|boar|spiker|jumper|thrower|herb|berries):/.test(id)) this.removed.delete(id);
    World.load(def);
    Object.assign(this, { objects: [], enemies: [], npcs: [], critters: [], pickups: [], props: [], projectiles: [], tags: {}, roles: {}, trail: [], bubbles: [], camFocus: null, bossBar: null, waypoint: null });
    let exitPos = null;
    for (const s of World.spawns) {
      if (s[0] === 'exit') exitPos = { x: s[1] * TS + 8, y: (s[2] - 1) * TS + 8 };
      if (s[0] === 'player' && !pos) pos = tc(s[1], s[2]);
      Spawn.one(s);
    }
    pos = pos || exitPos || { x: World.pxW / 2, y: World.pxH / 2 };
    Object.assign(this.player, { x: pos.x, y: pos.y, kvx: 0, kvy: 0, dashT: 0 });
    if (!this.checkpoint || this.checkpoint.scene !== name) this.setCheckpoint(pos.x, pos.y);
    this.enterCd = 0.5;
    Events.emit('scene:load', name);
    this.updateCamera(true);
  },
  // Плавный переход в другую сцену
  enterScene(name, pos) {
    if (this.transition) return;
    this.transition = { t: 0, name, pos }; Sfx.blip();
  },
  // Свободное место рядом: иначе зверь или прохожий окажется внутри дерева или дома
  freeSpot(x, y) {
    if (!World.boxHits(x, y, 6, 5, false)) return { x, y };
    for (let r = 1; r <= 4; r++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = x + dx * r * TS, ny = y + dy * r * TS;
      if (!World.boxHits(nx, ny, 6, 5, false)) return { x: nx, y: ny };
    }
    return { x, y };
  },
  addChaser(tx, ty, o) {
    const f = this.freeSpot(tx * TS + 8, ty * TS + 10);
    const c = new Chaser(f.x, f.y, o); this.npcs.push(c); if (o.role) this.roles[o.role] = c; return c;
  },
  addSpot(x, y, o) { return this.add('props', new Spot(x, y, o)); },
  exitInterior() {
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

  // ---------- События мира ----------
  onKill(e) {
    this.stats.kills++;
    const b = this.flags.bestiary || (this.flags.bestiary = {});   // бестиарий: сколько каких зверей повержено
    if (e.killedByPlayer) (b[e.kind] || (b[e.kind] = { seen: true, kills: 0 })).kills++;
    if (!e.loot.crystals && !e.loot.meat && !e.keepBody) { e.looted = true; this.removed.add(e.sid); }
    if (e.killedByPlayer) {
      this.player.gainXp(e.xp);
      if (e.xp) this.floaters.push({ x: e.x, y: e.y - 20, text: `+${e.xp} опыта`, color: '#c8b0ff', ttl: 1.4 });
    }
    Events.emit('kill', e);
  },
  onLoot(e) {
    const got = [];
    if (e.loot.meat) { Inv.add('meatRaw', e.loot.meat); got.push(`сырое мясо +${e.loot.meat}`); }
    if (e.loot.crystals) {
      Inv.add('crystals', e.loot.crystals); this.stats.crystals += e.loot.crystals; got.push(`кристалл +${e.loot.crystals}`);
      Sfx.crystal(); FX.burst(e.x, e.y - 6, '#7cf0ff', 14, 60);
    } else Sfx.pick();
    this.removed.add(e.sid);
    if (got.length) this.hint(got.join(' · '), 2);
    Events.emit('loot', e);
  },
  onLevelUp(ups) {
    const p = this.player;
    Sfx.crystal(); FX.burst(p.x, p.y - 8, '#c8b0ff', 20, 60, 0.8);
    this.showBanner(`УРОВЕНЬ ${p.level}`, ups.map(s => `${STAT_NAMES[s]} +1`).join(' · '), 2.8, '#d8c0ff');
  },
  onJunk(j) { this.removed.add(j.sid); Events.emit('junk', j); },
  onContainer(c) {
    const got = Inv.grant(c.loot);
    if (c.loot.coins) Sfx.coin();
    if (c.stealing) this.stats.steals++;
    this.removed.add(c.sid);
    if (got.length && !c.loot.pendant) { this.hint((c.stealing ? 'Стащил: ' : 'Нашёл: ') + got.join(', '), 2.2); Sfx.pick(); }
    else if (!got.length) this.hint('Пусто.', 1.5);
    Events.emit('container', c);
  },

  useCampfire(c) {
    const p = this.player;
    const rest = () => {
      if (!Events.allow('can:rest', c)) return;
      p.hp = p.maxHp; p.stamina = p.maxStamina;
      this.setCheckpoint(c.x, c.y + 14);
      Events.emit('rest', c);
      this.save(); this.showBanner('Отдых', 'здоровье восстановлено · сохранено', 2.2, '#ffd080');
    };
    const justLit = !c.lit;
    if (justLit) {
      c.lit = true; this.flags['lit:' + c.sid] = true; Sfx.crystal(); FX.burst(c.x, c.y - 4, '#ffb040', 16, 50);
      this.setCheckpoint(c.x, c.y + 14); this.save();
    }
    if (Events.handle('campfire', c, justLit)) return;
    const choices = [];
    const raw = Inv.count('meatRaw');
    if (raw) choices.push({ label: `Пожарить мясо (${raw})`, fn: () => { Inv.add('meatCooked', raw); Inv.clear('meatRaw'); Sfx.pick(); FX.burst(c.x, c.y - 8, '#ffb040', 12, 40); this.hint('Мясо шипит на углях. Готово. (E — съесть)', 2.5); } });
    choices.push({ label: 'Отдохнуть у огня', fn: rest });
    choices.push({ label: 'Уйти', fn: () => { } });
    this.choose('', 'Костёр трещит. Здесь можно перевести дух.', choices);
  },

  toTitle() { this.save(); this.state = 'title'; this.titleSel = 0; this.menu = null; this.dialog = null; this.reader = null; },
  onPlayerDeath() { this.deadT = 2; this.stats.deaths++; },
  // Смерть откатывает к последнему сохранению: добыча и убийства после него не засчитываются
  respawn() {
    const p = this.player;
    if (Events.handle('respawn')) return;
    if (Save.has()) { this.loadGame(); this.hint('Всё сначала — с последнего сохранения.', 3); return; }
    const c = this.checkpoint;
    Object.assign(p, { x: c.x, y: c.y, hp: p.maxHp, stamina: p.maxStamina, alive: true, invul: 1.5, kvx: 0, kvy: 0, dashT: 0 });
    this.objects = this.objects.filter(o => !o.temp);
    this.projectiles = [];
    for (const o of this.objects) if (o.state !== 'rest') { o.state = 'rest'; o.x = o.home.x; o.y = o.home.y; o.z = 0; }
    for (const e of this.enemies) if (e.alive && !(e instanceof Hunter)) Object.assign(e, { x: e.home.x, y: e.home.y, hp: e.maxHp, state: 'idle', t: 1, stun: 0, kvx: 0, kvy: 0, z: 0, jumps: 0, chain: 0 });
    this.hint('Ещё раз.', 1.5);
  },

  // ---------- Сохранение ----------
  hasSave() { return Save.has(); },
  save() { Save.write(); },
  loadGame() {
    const d = Save.read();
    if (!d) { this.newGame(); return; }
    this.flags = d.flags; this.removed = new Set(d.removed); this.stats = d.stats; this.returnTo = d.returnTo;
    this.dialog = null; this.menu = null; this.reader = null; this.timers = []; this.transition = null; this.fade = 0; this.deadT = 0;
    this.player = new Player(d.x, d.y); Object.assign(this.player, d.player);
    this.checkpoint = null;
    this.loadScene(d.scene, { x: d.x, y: d.y });
    this.objective = d.objective || ''; this.state = 'play';
    Events.emit('game:loaded');
    this.hint('Продолжаем.', 2);
  },

  // ---------- Обновление ----------
  update(dt) {
    Input.update();
    this.time += dt;
    if (this.state === 'title') { if (this.menu) UI.updateMenu(); else UI.updateTitle(); return; }

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
    if (Input.pressed('start') && !this.cutscene) { UI.openMenu(); return; }

    for (const t of this.timers) { t.t -= dt; if (t.t <= 0) { t.done = true; t.fn(); } }
    this.timers = this.timers.filter(t => !t.done);
    if (this.dialog || this.reader || this.transition) return;

    this.stats.time += dt;
    this.locked = this.cutscene;
    this.enterCd = Math.max(0, this.enterCd - dt);

    if (this.deadT > 0) { this.deadT -= dt; if (this.deadT <= 0) this.respawn(); this.updateCamera(); return; }

    const p = this.player;
    p.update(dt);
    for (const list of [this.objects, this.enemies, this.npcs, this.critters, this.pickups, this.props, this.projectiles]) for (const e of list) e.update(dt);
    this.objects = this.objects.filter(o => !o.remove);
    this.projectiles = this.projectiles.filter(o => !o.remove);
    this.enemies = this.enemies.filter(e => { if (e.remove) this.removed.add(e.sid); return !e.remove; });
    this.pickups = this.pickups.filter(k => { if (k.remove) this.removed.add(k.sid); return !k.remove; });
    this.npcs = this.npcs.filter(n => !n.remove);
    this.props = this.props.filter(k => !k.remove);

    for (const f of this.floaters) { f.ttl -= dt; f.y -= dt * 12; }
    this.floaters = this.floaters.filter(f => f.ttl > 0);
    for (const b of this.bubbles) b.ttl -= dt;
    this.bubbles = this.bubbles.filter(b => b.ttl > 0 && !b.e.hidden && !b.e.remove);

    const last = this.trail[this.trail.length - 1];
    if (!last || dist(last.x, last.y, p.x, p.y) > 8) { this.trail.push({ x: p.x, y: p.y }); if (this.trail.length > 400) this.trail.shift(); }

    this.emitSmoke();
    this.noteSeenBeasts();

    // Встал на коврик у выхода — выходим на улицу
    if (World.theme === 'interior' && this.enterCd <= 0 && !this.locked &&
      (World.atPx(p.x, p.y) === 'E' || World.atPx(p.x, p.y + 3) === 'E')) this.exitInterior();

    Events.emit('tick', dt);
    this.updateCamera();
  },
  // Бестиарий: зверь попадает в записи, когда герой его увидел
  noteSeenBeasts() {
    if ((this.seenT = (this.seenT || 0) - 1) > 0) return;
    this.seenT = 20;
    const b = this.flags.bestiary || (this.flags.bestiary = {}), p = this.player;
    for (const e of this.enemies) {
      if (!e.alive || e.dormant || e.disguised || (b[e.kind] && b[e.kind].seen)) continue;
      if (dist(e.x, e.y, p.x, p.y) < 130 && World.sight(p.x, p.y - 6, e.x, e.y - 6)) b[e.kind] = { seen: true, kills: 0 };
    }
  },
  // Дым из труб по списку сцены
  emitSmoke() {
    const smoke = World.def && World.def.smoke;
    if (!smoke || World.tint) return;
    for (const [tx, ty] of smoke) {
      if (rnd() > 0.06) continue;
      const x = tx * TS + 8, y = ty * TS + 2;
      if (onScreen(x, y, this.cam)) FX.add({ x: x + rrange(-2, 2), y, vx: rrange(2, 8), vy: -rrange(8, 16), life: 1.6, max: 1.6, color: rnd() < 0.5 ? '#8a8680' : '#6a6660', size: 2 });
    }
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
      const sh = FX.shake && Settings.get('shake') ? rrange(-FX.shake, FX.shake) * 0.5 : 0;
      const cam = { x: this.cam.x + sh, y: this.cam.y + sh };
      World.draw(bctx, cam, this.time);
      // Рисуем только то, что в кадре, по глубине (ниже на экране — ближе)
      const list = [];
      for (const l of [this.props, this.pickups, this.objects, this.enemies, this.npcs, this.critters]) for (const e of l) if (onScreen(e.x, e.y, cam, 60)) list.push(e);
      list.push(this.player);
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

    if (this.state === 'title') { UI.titleText(); if (this.menu) UI.menuText(); return; }
    if (this.state === 'play') UI.hudText();
    if (this.dialog) UI.dialogText();
    if (this.menu) UI.menuText();
    if (this.reader) UI.readerText();
    if (this.deadT > 0 && this.deadT < 1.6) text(this.deathText || 'Темнота...', W / 2, H / 2 - 6, { size: 8, align: 'center', color: '#e08080' });
  },
  drawOverlays() {
    if (this.painT > 0) {
      this.painT -= 1 / 60;
      bctx.strokeStyle = `rgba(255,30,30,${0.5 * this.painT / (this.painMax || 1)})`; bctx.lineWidth = 12; bctx.strokeRect(0, 0, W, H); bctx.lineWidth = 1;
    }
    if (FX.flash > 0) { bctx.globalAlpha = Math.min(1, FX.flash); bctx.fillStyle = FX.flashColor; bctx.fillRect(0, 0, W, H); bctx.globalAlpha = 1; }
    if (this.fade > 0) { bctx.fillStyle = `rgba(0,0,0,${clamp(this.fade, 0, 1)})`; bctx.fillRect(0, 0, W, H); }
    if (this.deadT > 0) { bctx.fillStyle = `rgba(20,0,0,${clamp(1 - (this.deadT - 0.5) / 1.5, 0, 0.85)})`; bctx.fillRect(0, 0, W, H); }
  },
};
