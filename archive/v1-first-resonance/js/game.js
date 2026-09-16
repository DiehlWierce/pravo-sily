'use strict';
// Главный цикл, сюжетные триггеры, диалоги, HUD, чекпоинты.

const screen = document.getElementById('screen');
const dctx = screen.getContext('2d');
const buffer = makeCanvas(W, H);
const bctx = buffer.getContext('2d');
let S = 1;

function resize() {
  const scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  const dpr = window.devicePixelRatio || 1;
  screen.style.width = W * scale + 'px'; screen.style.height = H * scale + 'px';
  screen.width = W * scale * dpr; screen.height = H * scale * dpr;
  S = scale * dpr;
}
addEventListener('resize', resize); resize();

const vignette = (() => {
  const c = makeCanvas(W, H), x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 220);
  g.addColorStop(0, 'rgba(5,8,12,0)'); g.addColorStop(1, 'rgba(5,8,12,0.75)');
  x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
})();

// ---------- Текст поверх пиксельного буфера (чёткий при любом масштабе) ----------
function font(size) { return `bold ${Math.round(size * S)}px Menlo, Consolas, "DejaVu Sans Mono", monospace`; }
function text(str, x, y, o = {}) {
  const { color = '#f4ecd8', size = 7, align = 'left', shadow = true } = o;
  dctx.font = font(size); dctx.textAlign = align; dctx.textBaseline = 'top';
  if (shadow) { dctx.fillStyle = 'rgba(0,0,0,0.85)'; dctx.fillText(str, x * S + Math.max(1, S * 0.5), y * S + Math.max(1, S * 0.5)); }
  dctx.fillStyle = color; dctx.fillText(str, x * S, y * S);
}
function wrap(str, maxW, size) {
  dctx.font = font(size);
  const words = str.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (dctx.measureText(t).width > maxW * S && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

const PLATE = { x: 52 * TS + 8, y: 11 * TS + 8 };

const Game = {
  state: 'title', time: 0, locked: false, paused: false,
  objects: [], enemies: [], pickups: [], props: [], player: null, boss: null,
  flags: {}, timers: [], dialog: null, hintText: '', hintT: 0, banner: null, objective: '',
  checkpoint: null, deadT: 0, cam: { x: 0, y: 0 },
  stats: { kills: 0, throws: 0, grabs: 0, catches: 0, reflects: 0, objectHits: 0, integrations: 0, crystals: 0, deaths: 0, time: 0 },

  init() {
    for (const [kind, tx, ty] of World.spawns) {
      const x = tx * TS + 8, y = ty * TS + 10;
      switch (kind) {
        case 'player': this.player = new Player(x, y); this.checkpoint = { x, y }; break;
        case 'rock': case 'crate': case 'boulder': this.objects.push(new Obj(kind, x, y)); break;
        case 'spiker': this.enemies.push(new Spiker(x, y)); break;
        case 'jumper': this.enemies.push(new Jumper(x, y)); break;
        case 'thrower': this.enemies.push(new Thrower(x, y)); break;
        case 'boss': this.boss = new Boss(x, y); this.enemies.push(this.boss); break;
        case 'herb': case 'berries': this.pickups.push(new Pickup(kind, x, y)); break;
        case 'campfire': this.props.push(this.campfire = new Campfire(x, y)); break;
      }
    }
    this.updateCamera();
  },

  // ---------- Сервисные ----------
  hint(t, d = 3) { this.hintText = t; this.hintT = d; },
  once(flag, fn) { if (!this.flags[flag]) { this.flags[flag] = true; fn(); } },
  after(t, fn) { this.timers.push({ t, fn }); },
  say(lines, onDone) { this.dialog = { lines, i: 0, chars: 0, onDone }; },
  showBanner(title, sub, d = 3) { this.banner = { title, sub, t: d, max: d }; },
  setCheckpoint(x, y) { this.checkpoint = { x, y }; },

  // ---------- Сюжет ----------
  startIntro() {
    this.state = 'intro';
    this.say([
      { who: '', text: 'Нижний город. Я родился непользователем: ни источника, ни защиты, ни будущего.' },
      { who: '', text: 'Я украл не у того человека. Ночью они пришли за долгом. Родителей избили, дом сгорел.' },
      { who: '', text: 'Я бежал, пока трущобы не сменились Чёрным лесом.' },
      { who: '', text: 'Здесь живут существа силы. Для такого, как я, встреча с ними — смерть.' },
      { who: '', text: 'Но в груди у каждого из них растёт кристалл. А кристаллы стоят дороже жизни.' },
    ], () => {
      this.state = 'play';
      this.objective = 'Выжить. Добыть кристалл существа силы.';
      this.hint('WASD/стрелки — идти · J — нож · K — рывок · Enter — управление', 6);
    });
  },
  onSeeSpiker() { this.hint('Шипогрыз! Толстая шкура. Пусть на разгоне врежется в дерево или камень.', 4); },
  onEnemyKilled(e) {
    this.once('firstKill', () => this.hint('Держи J рядом с телом — извлечь кристалл.', 4));
  },
  extract(e) {
    const p = this.player;
    e.hasCrystal = false; this.stats.crystals++;
    Sfx.crystal(); FX.burst(e.x, e.y - 6, '#7cf0ff', 16, 60, 0.7);
    if (e.isBoss) { this.startIntegrationScene(); return; }
    p.crystals++;
    if (!this.flags.firstCrystal) {
      this.flags.firstCrystal = true;
      this.say([
        { who: 'Я', text: 'Тёплый. Пульсирует, будто ещё живой.' },
        { who: 'Я', text: 'В гетто шептались: чужой кристалл можно связать с нервами человека. Бред... наверное.' },
      ], () => { this.objective = 'Идти вглубь леса, на восток.'; });
    } else if (p.tk) this.hint('Кристалл +1. Когда имплант истощится — Q, интеграция.', 3);
    else this.hint('Кристалл +1.', 2);
  },
  meetBoss() {
    const b = this.boss;
    this.setCheckpoint(25 * TS + 8, 11 * TS + 10);
    if (this.flags.bossMet) { b.active = true; this.hint('Кейл ждёт. Измотай его.', 2.5); return; }
    this.flags.bossMet = true;
    this.say([
      { who: 'Кейл', text: 'Гляди-ка. Крысёныш из Нижнего города забрёл в мой лес.' },
      { who: 'Кейл', text: this.player.crystals > 0 ? 'И кристалл шипогрыза при себе? Отдай — может, уйдёшь на своих ногах.' : 'Заблудился? Ну, лес всё равно заберёт тебя.' },
      { who: 'Я', text: 'Ты двигаешь камни не касаясь... У тебя кристалл в руке. Как?' },
      { who: 'Кейл', text: 'Тебе это знание не пригодится. Такие, как ты, долго не живут.' },
    ], () => {
      b.active = true; b.t = 0.8;
      this.objective = 'Победить Кейла: уклоняйся, пока он не выдохнется, и бей.';
      this.hint('Каждый бросок стоит ему силы — следи за полоской над головой.', 4);
    });
  },
  onBossDefeated() {
    this.after(0.8, () => this.say([
      { who: 'Кейл', text: 'Кх... непользователь... взял меня измором...' },
      { who: 'Я', text: 'Кристалл. Как ты связал его с собой?' },
      { who: 'Кейл', text: 'Разрез... до нерва. Вдавить и держать, пока не прирастёт. Половина умирает сразу.' },
      { who: 'Кейл', text: 'Вторая половина — потом. От распада. Кристалл гниёт внутри и травит кровь...' },
    ], () => {
      this.objective = 'Извлечь кристалл из руки Кейла (держи J).';
    }));
  },
  startIntegrationScene() {
    const p = this.player;
    this.objective = '';
    this.say([
      { who: 'Я', text: 'Я сделал разрез. Вдавил кристалл в руку — прямо в живое.' },
    ], () => {
      Sfx.pain(); FX.flash = 1; FX.flashColor = '#fff'; FX.shake = 12; this.painT = 2.5;
      this.after(1.6, () => this.say([
        { who: 'Я', text: 'Боль. Холод по венам. Рука будто чужая — и одновременно впервые по-настоящему моя.' },
        { who: 'Я', text: 'Передо мной лежал камешек. Я потянулся к нему. Не рукой.' },
      ], () => {
        p.tk = true; p.energy = 100; p.integrity = 100; p.hp = Math.max(p.hp, 8);
        const peb = new Obj('pebble', p.x + p.face.x * 30 || p.x + 30, p.y + p.face.y * 30);
        if (World.boxHits(peb.x, peb.y, 3, 3, false)) { peb.x = p.x + 24; peb.y = p.y; }
        this.objects.push(peb); FX.burst(peb.x, peb.y, '#7cf0ff', 8, 20);
        this.setCheckpoint(p.x, p.y);
        this.objective = 'Сдвинь камешек телекинезом: повернись к нему и нажми L.';
      }));
    });
  },
  onFirstGrab() {
    Sfx.crystal();
    this.showBanner('ПЕРВЫЙ ИМПУЛЬС', 'резонанс установлен', 3.2);
    this.after(2.2, () => this.say([
      { who: 'Я', text: 'Он поднялся. Я поднял его.' },
      { who: '', text: 'Каждое применение крошит кристалл и отравляет кровь. Трава выводит токсины, новые кристаллы — повторная интеграция.' },
    ], () => {
      this.objective = 'Открыть ворота за рекой.';
      this.hint('L — бросить · I — толчок (отбрасывает и отражает) · Q — интеграция · E — антидот', 6);
    }));
  },
  onPlate(o) {
    if (World.gateOpen) return;
    if (o.mass !== 'medium') { this.hint('Слишком лёгкий — плита не опускается.', 2); return; }
    o.x = PLATE.x; o.y = PLATE.y; o.home = { ...PLATE };
    World.plateLit = true;
    this.after(0.4, () => {
      World.gateOpen = true; Sfx.gate(); FX.shake = 6;
      FX.burst(54 * TS + 8, 18 * TS + 8, '#8a6034', 16, 70, 0.6);
      this.hint('Ворота открылись!', 2.5);
      this.setCheckpoint(49 * TS + 8, 18 * TS + 10);
      this.objective = 'Пройти через логово существ к костру.';
    });
  },
  onPlayerDeath() {
    this.deadT = 2; this.stats.deaths++;
    if (this.player.held) this.player.drop();
  },
  respawn() {
    const p = this.player, c = this.checkpoint;
    Object.assign(p, { x: c.x, y: c.y, hp: p.maxHp, alive: true, invul: 1.5, toxin: 0, overload: 0, energy: 100, kvx: 0, kvy: 0, liftT: 0, z: 0, channel: 0, dashT: 0 });
    if (p.tk && p.integrity < 30) p.integrity = 30;
    this.objects = this.objects.filter(o => !(o.temp && o.state !== 'held'));
    for (const o of this.objects) if (o.state !== 'rest') o.land();
    const b = this.boss;
    if (b.alive) {
      b.reset();
      for (let i = 0; i < 4; i++) this.objects.push(new Obj('rock', b.home.x + rrange(-70, 50), b.home.y + rrange(-50, 50)));
      this.objects = this.objects.filter(o => !World.boxHits(o.x, o.y, o.hw, o.hh, false));
    }
    this.hint('Ещё раз.', 1.5);
  },
  finish() {
    this.say([
      { who: 'Я', text: 'Я сел у чужого костра. Рука горела, кровь отравлена, в кармане — кристаллы мёртвых существ.' },
      { who: 'Я', text: 'Но впервые в жизни я был не добычей.' },
    ], () => { this.state = 'end'; });
  },

  // ---------- Обновление ----------
  update(dt) {
    Input.update();
    if (this.state === 'title') {
      this.time += dt; FX.update(dt);
      if (Input.pressed('a') || Input.pressed('start')) this.startIntro();
      return;
    }
    if (this.state === 'end') { if (Input.pressed('start') || Input.pressed('a')) location.reload(); return; }
    if (this.state === 'intro') { this.time += dt; this.updateDialog(dt); return; }

    if (Input.pressed('start') && !this.dialog) this.paused = !this.paused;
    if (this.paused) return;

    this.time += dt; this.stats.time += dt;
    this.hintT = Math.max(0, this.hintT - dt);
    this.painT = Math.max(0, (this.painT || 0) - dt);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    for (const t of this.timers) { t.t -= dt; if (t.t <= 0) { t.done = true; t.fn(); } }
    this.timers = this.timers.filter(t => !t.done);
    FX.update(dt);

    this.locked = !!this.dialog;
    if (this.dialog) { this.updateDialog(dt); this.updateCamera(); return; }

    if (this.deadT > 0) {
      this.deadT -= dt;
      if (this.deadT <= 0) this.respawn();
      return;
    }

    const p = this.player;
    p.update(dt);
    for (const o of this.objects) o.update(dt);
    for (const e of this.enemies) e.update(dt);
    for (const k of this.pickups) k.update(dt);
    for (const k of this.props) k.update(dt);
    this.objects = this.objects.filter(o => !o.remove);
    this.enemies = this.enemies.filter(e => !e.remove);
    this.pickups = this.pickups.filter(k => !k.remove);

    // Триггеры по зонам
    if (p.alive && this.boss.alive && !this.boss.active && p.x > 28 * TS && p.x < 46 * TS) this.meetBoss();
    if (p.x > 47 * TS && p.x < 51 * TS) {
      if (p.tk) this.once('gateHint', () => this.hint('Ворота на запоре. Плита на островке ждёт веса. Возьми ящик (L), встань напротив плиты и брось.', 6));
      else this.once('gateNoTk', () => this.hint('Ворота заперты, плита за водой. Мне нечем её достать.', 3.5));
    }
    if (p.x > 55 * TS) this.once('zone4', () => this.hint('Костяные прыгуны не сворачивают в прыжке — сбей их броском или толчком.', 4.5));
    if (!this.flags.finished && dist(p.x, p.y, this.campfire.x, this.campfire.y) < 24) { this.flags.finished = true; this.finish(); }

    this.updateCamera();
  },

  updateDialog(dt) {
    const d = this.dialog; if (!d) return;
    const line = d.lines[d.i], before = Math.floor(d.chars);
    d.chars = Math.min(line.text.length, d.chars + dt * 45);
    if (Math.floor(d.chars) !== before && Math.floor(d.chars) % 3 === 0) Sfx.blip();
    if (Input.pressed('a') || Input.pressed('start')) {
      if (d.chars < line.text.length) d.chars = line.text.length;
      else if (++d.i >= d.lines.length) { this.dialog = null; if (d.onDone) d.onDone(); }
      else d.chars = 0;
    }
  },

  updateCamera() {
    const p = this.player;
    this.cam.x = clamp(p.x - W / 2, 0, World.pxW - W);
    this.cam.y = clamp(p.y - 8 - H / 2, 0, World.pxH - H);
  },

  // ---------- Отрисовка ----------
  draw() {
    const cam = { x: this.cam.x + (FX.shake ? rrange(-FX.shake, FX.shake) * 0.5 : 0), y: this.cam.y + (FX.shake ? rrange(-FX.shake, FX.shake) * 0.5 : 0) };
    bctx.imageSmoothingEnabled = false;
    if (this.state === 'intro') this.drawIntroBg();
    else {
      if (this.state === 'title') { cam.x = 12 * TS + Math.sin(this.time * 0.1) * 60; cam.y = 4 * TS; }
      World.draw(bctx, cam, this.time);
      const list = [...this.pickups, ...this.props, ...this.objects, ...this.enemies, this.player];
      list.sort((a, b) => (a.y + (a.state === 'held' ? 6 : 0) + (a.z || 0) * 0.01) - (b.y + (b.state === 'held' ? 6 : 0)));
      for (const e of list) if (this.state !== 'title' || e !== this.player) e.draw(bctx, cam);
      FX.draw(bctx, cam);
      bctx.drawImage(vignette, 0, 0);
      this.drawOverlays();
    }
    if (this.state === 'play' || this.state === 'end') this.drawHudShapes();
    if (this.dialog) this.drawDialogBox();

    dctx.imageSmoothingEnabled = false;
    dctx.drawImage(buffer, 0, 0, screen.width, screen.height);

    if (this.state === 'title') return this.drawTitle();
    if (this.state === 'play') this.drawHudText();
    if (this.dialog) this.drawDialogText();
    if (this.state === 'end') this.drawEnd();
    if (this.paused) this.drawPause();
  },

  drawIntroBg() {
    bctx.fillStyle = '#0b0a0f'; bctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      const x = i * 28 - 6, h = 40 + ((i * 37) % 50);
      bctx.fillStyle = '#16121a'; bctx.fillRect(x, 150 - h, 24, h);
      bctx.fillStyle = i === 5 ? `rgba(255,120,40,${0.5 + 0.3 * Math.sin(this.time * 10)})` : '#2a1e20';
      if ((i * 13) % 3 === 0 || i === 5) bctx.fillRect(x + 6, 150 - h + 10, 4, 5);
    }
    const g = bctx.createLinearGradient(0, 60, 0, 150);
    g.addColorStop(0, 'rgba(255,90,30,0)'); g.addColorStop(1, `rgba(255,90,30,${0.25 + 0.05 * Math.sin(this.time * 7)})`);
    bctx.fillStyle = g; bctx.fillRect(0, 60, W, 90);
    if (rnd() < 0.5) FX.parts.push({ x: 150 + rrange(-20, 30), y: 110, vx: rrange(-6, 6), vy: -rrange(15, 35), life: 1.5, max: 1.5, color: rnd() < 0.5 ? '#ffb040' : '#ff5020', size: 1 });
    FX.update(1 / 60); FX.draw(bctx, { x: 0, y: 0 });
    bctx.fillStyle = '#0b0a0f'; bctx.fillRect(0, 150, W, 90);
  },

  drawOverlays() {
    const p = this.player;
    if (p.tk && p.toxin > 40) { bctx.fillStyle = `rgba(90,200,60,${(p.toxin - 40) / 60 * 0.22})`; bctx.fillRect(0, 0, W, H); }
    if (p.overload > 70 || this.painT > 0) {
      const a = this.painT > 0 ? 0.35 * this.painT / 2.5 : (p.overload - 70) / 30 * 0.25;
      bctx.strokeStyle = `rgba(255,40,40,${a + 0.1 * Math.sin(this.time * 20)})`; bctx.lineWidth = 8; bctx.strokeRect(0, 0, W, H); bctx.lineWidth = 1;
    }
    if (FX.flash > 0) { bctx.globalAlpha = Math.min(1, FX.flash); bctx.fillStyle = FX.flashColor; bctx.fillRect(0, 0, W, H); bctx.globalAlpha = 1; }
    if (this.deadT > 0) { bctx.fillStyle = `rgba(20,0,0,${clamp(1 - (this.deadT - 0.5) / 1.5, 0, 0.85)})`; bctx.fillRect(0, 0, W, H); }
  },

  drawHudShapes() {
    const p = this.player, s = Art.spr;
    for (let i = 0; i < p.maxHp / 2; i++) {
      const v = p.hp - i * 2;
      drawSpr(bctx, v >= 2 ? s.heart : v === 1 ? s.heartHalf : s.heartEmpty, 4 + i * 8, 4);
    }
    const bar = (y, v, col) => {
      bctx.fillStyle = '#000a'; bctx.fillRect(18, y, 52, 4);
      bctx.fillStyle = col; bctx.fillRect(19, y + 1, Math.round(50 * clamp(v / 100, 0, 1)), 2);
    };
    if (p.tk) {
      bar(13, p.energy, '#7cf0ff');
      bar(19, p.integrity, p.integrity < 25 ? (Math.sin(this.time * 10) > 0 ? '#ff6060' : '#803030') : '#c8b0ff');
      bar(25, p.toxin, p.toxin > 60 ? '#b0ff50' : '#6aa040');
      bar(31, p.overload, p.overload > 70 ? '#ff4030' : '#b04830');
    }
    drawSpr(bctx, s.crystal, W - 40, 4); drawSpr(bctx, s.herb, W - 21, 4);
    const b = this.boss;
    if (b.active && b.alive) {
      bctx.fillStyle = '#000b'; bctx.fillRect(100, H - 14, 120, 6);
      bctx.fillStyle = '#a02838'; bctx.fillRect(101, H - 13, Math.round(118 * b.hp / b.maxHp), 4);
    }
    if (this.hintT > 0 && this.hintText && !this.dialog) { bctx.fillStyle = 'rgba(8,10,14,0.72)'; bctx.fillRect(10, H - 48, W - 20, 22); }
  },

  drawHudText() {
    const p = this.player;
    if (p.tk) {
      [['ЭН', 12], ['КР', 18], ['ТК', 24], ['ПГ', 30]].forEach(([l, y]) => text(l, 4, y, { size: 5, color: '#9aa' }));
    }
    text(String(p.crystals), W - 33, 4, { size: 7, color: '#bff8ff' });
    text(String(p.herbs), W - 13, 4, { size: 7, color: '#c8f0a0' });
    if (this.objective && !this.dialog) text('▸ ' + this.objective, W - 4, 16, { size: 5.5, align: 'right', color: '#e8d8a8' });
    if (this.boss.active && this.boss.alive) text('КЕЙЛ — пользователь с кристаллом', W / 2, H - 23, { size: 5.5, align: 'center', color: '#e0b0c0' });
    if (this.hintT > 0 && this.hintText && !this.dialog) {
      const lines = wrap(this.hintText, W - 32, 6);
      lines.slice(0, 2).forEach((l, i) => text(l, W / 2, H - 46 + i * 9 + (lines.length === 1 ? 4 : 0), { size: 6, align: 'center', color: '#fff' }));
    }
    if (this.banner) {
      const bn = this.banner, a = clamp(Math.min(bn.t, bn.max - bn.t) * 2, 0, 1);
      dctx.globalAlpha = a;
      text(bn.title, W / 2, 80, { size: 16, align: 'center', color: '#bff8ff' });
      text(bn.sub, W / 2, 100, { size: 7, align: 'center', color: '#9ad' });
      dctx.globalAlpha = 1;
    }
    if (this.deadT > 0 && this.deadT < 1.6) text('Тело непользователя слишком хрупкое...', W / 2, H / 2 - 6, { size: 8, align: 'center', color: '#e08080' });
  },

  drawDialogBox() {
    bctx.fillStyle = 'rgba(10,8,14,0.92)'; bctx.fillRect(8, H - 62, W - 16, 54);
    bctx.strokeStyle = '#5a4a60'; bctx.strokeRect(8.5, H - 61.5, W - 17, 53);
  },
  drawDialogText() {
    const d = this.dialog, line = d.lines[d.i];
    if (line.who) text(line.who, 16, H - 58, { size: 6.5, color: line.who === 'Я' ? '#bff8ff' : '#e0a0b0' });
    const shown = line.text.slice(0, Math.floor(d.chars));
    wrap(shown, W - 36, 7).slice(0, 4).forEach((l, i) => text(l, 16, H - 48 + i * 9, { size: 7, color: line.who ? '#f4ecd8' : '#d8c8a8' }));
    if (d.chars >= line.text.length && Math.floor(this.time * 3) % 2) text('▼', W - 18, H - 17, { size: 6, color: '#bbb' });
  },

  drawTitle() {
    dctx.fillStyle = 'rgba(5,6,10,0.55)'; dctx.fillRect(0, 0, screen.width, screen.height);
    text('ПРАВО СИЛЫ', W / 2, 38, { size: 22, align: 'center', color: '#bff8ff' });
    text('прототип · первый резонанс', W / 2, 64, { size: 7, align: 'center', color: '#a8b8c0' });
    this.drawControls(92);
    if (Math.floor(this.time * 2) % 2) text('J / Space — начать', W / 2, 212, { size: 8, align: 'center', color: '#ffe080' });
  },
  drawControls(y0) {
    const rows = [
      ['WASD / стрелки', 'движение'], ['J / Space', 'нож · извлечь кристалл · далее'], ['K / Shift', 'рывок (неуязвимость)'],
      ['L', 'хватка / бросок'], ['I', 'толчок · отражение снарядов'], ['Q', 'интеграция кристалла'], ['E', 'трава-антидот'], ['Enter', 'пауза'],
    ];
    rows.forEach(([k, v], i) => { text(k, 150, y0 + i * 12, { size: 6.5, align: 'right', color: '#ffe080' }); text(v, 158, y0 + i * 12, { size: 6.5, color: '#e8e0d0' }); });
    text('Геймпад тоже работает', W / 2, y0 + rows.length * 12 + 2, { size: 5.5, align: 'center', color: '#889' });
  },
  drawPause() {
    dctx.fillStyle = 'rgba(5,6,10,0.8)'; dctx.fillRect(0, 0, screen.width, screen.height);
    text('ПАУЗА', W / 2, 40, { size: 14, align: 'center' });
    this.drawControls(76);
    text('Шкалы: ЭН — энергия · КР — целостность кристалла · ТК — токсины · ПГ — перегрузка', W / 2, 200, { size: 5, align: 'center', color: '#aab' });
  },
  drawEnd() {
    dctx.fillStyle = 'rgba(5,6,10,0.85)'; dctx.fillRect(0, 0, screen.width, screen.height);
    const s = this.stats, m = Math.floor(s.time / 60), sec = String(Math.floor(s.time % 60)).padStart(2, '0');
    text('КОНЕЦ ПРОТОТИПА', W / 2, 36, { size: 16, align: 'center', color: '#bff8ff' });
    const rows = [
      ['Время', `${m}:${sec}`], ['Существ побеждено', s.kills + (this.boss.alive ? 0 : 1)], ['Кристаллов добыто', s.crystals],
      ['Телекинетических хваток', s.grabs], ['Бросков', s.throws], ['Попаданий предметами', s.objectHits],
      ['Поймано снарядов', s.catches], ['Отражено толчком', s.reflects], ['Повторных интеграций', s.integrations], ['Смертей', s.deaths],
    ];
    rows.forEach(([k, v], i) => { text(k, 190, 66 + i * 12, { size: 6.5, align: 'right', color: '#d8d0c0' }); text(String(v), 200, 66 + i * 12, { size: 6.5, color: '#ffe080' }); });
    if (Math.floor(this.time * 2) % 2) text('Enter — сыграть снова', W / 2, 200, { size: 7, align: 'center', color: '#ffe080' });
    this.time += 1 / 60;
  },
};

Game.init();
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - lastT) / 1000); lastT = now;
  Game.update(dt);
  Game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
