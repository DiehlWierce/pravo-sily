'use strict';
// Глава 0. Трущобы: хлеб → лекарство → нож → подвеска → погоня → сумерки → разрушенный дом → бегство.

const CH0_BUSY = ['chase1', 'sneak', 'ruin', 'flee'];

// Фонарщики торговца: ищут героя по всему городу в сумерках, а в финальной погоне сбегаются на крик.
// route — патруль по точкам, look — стоит и водит фонарём из стороны в сторону (за спину не смотрит)
const SEARCHERS = [
  { at: [20, 42], route: [[20, 42], [40, 42]] },                 // низ города
  { at: [30, 37], angle: -Math.PI / 2, look: true },
  { at: [10, 30], route: [[10, 30], [10, 36]] },
  { at: [46, 34], angle: Math.PI / 2, look: true },
  { at: [15, 39], route: [[15, 39], [22, 39]] },
  { at: [13, 33], angle: Math.PI, look: true },                  // у самого дома
  { at: [43, 41], route: [[43, 41], [43, 36]] },                 // поперёк нижнего проулка
  { at: [24, 29], route: [[24, 29], [36, 29]] },                 // середина
  { at: [40, 30], route: [[40, 30], [52, 30]] },
  { at: [6, 25], route: [[6, 25], [6, 32]] },
  { at: [35, 25], angle: Math.PI / 2, look: true },              // мостки через канаву
  { at: [20, 20], route: [[20, 20], [30, 20]] },                 // за канавой и к рынку
  { at: [40, 19], route: [[40, 19], [52, 19]] },
  { at: [25, 11], route: [[25, 11], [36, 11]] },
  { at: [56, 12], angle: Math.PI / 2, look: true },              // у заколоченных ворот
  { at: [50, 26], route: [[50, 26], [57, 26], [57, 22]] },
];

const Chapter0 = {
  id: 0,
  get step() { return Game.flags.step; },
  set step(v) { Game.flags.step = v; },
  get p() { return Game.player; },
  busy() { return CH0_BUSY.includes(this.step); },

  init() {
    Events.on('npc:talk', n => {
      if (n.role === 'mother') { this.talkMother(); return true; }
      if (n.role === 'father') { this.talkFather(); return true; }
      return false;
    });
    Events.on('can:talk', () => !this.busy());
    Events.on('can:loot', () => !this.busy());
    Events.on('can:enter', () => { if (this.busy()) { Game.hint('Не сейчас!', 1.2); return false; } });
    Events.on('container', c => { if (c.loot.pendant) this.pendantTheft(); else this.objective(); });
    for (const ev of ['junk', 'shop:bought', 'coins:changed']) Events.on(ev, () => this.objective());
    Events.on('chase:talked', () => Game.hint('Он узнал меня!', 2));
    Events.on('chase:spotted', c => this.onSpotted(c));
    Events.on('chase:caught', c => this.onCaught(c));
    Events.on('scene:load', name => this.onSceneLoad(name));
    Events.on('tick', dt => { if (World.name === 'slums') this.update(dt); });
    Events.on('respawn', () => this.onRespawn());
    Events.on('game:loaded', () => this.objective());
  },

  start() {
    this.step = 'slums'; Game.flags.chapter = 0;
    Game.showBanner('ГЛАВА 0', 'Трущобы', 3, '#e0c080');
    Game.after(0.6, () => Game.say([
      { who: 'Мать', text: 'Кх-кх... Вернулся? Ты поел хоть что-нибудь?' },
      { who: 'Отец', text: '(хрипло) Не суетись, мать. Хлеба нет третий день, вот и весь разговор.' },
      { who: 'Отец', text: 'Сходи на рынок. Наскреби на три буханки — тебе, ей и мне.' },
      { who: 'Я', text: 'Наскребу.' },
    ], () => {
      this.objective();
      Game.hint('WASD — идти · Space — действие · Shift — рывок · J — нож · Enter — вещи', 6);
    }));
  },

  objective() {
    if (Game.flags.chapter !== 0) return;
    if (this.busy()) { if (this.step === 'flee' && World.name === 'slums') Game.objective = 'Бежать из города — к восточным воротам'; return; }
    const F = Game.flags, home = Game.tags.homeFront;
    const toHome = () => { if (home) Game.waypoint = { x: home.x, y: home.y, label: 'дом' }; };
    const coins = Inv.count('coins'), bread = Inv.count('bread');
    Game.waypoint = null;
    if (!F.breadDone) {
      if (bread >= 3) { Game.objective = 'Отнести хлеб домой'; toHome(); }
      else Game.objective = `Купить три буханки у торговки: ${bread}/3 · медяков ${coins}/15`;
      return;
    }
    if (!F.medDone) {
      if (Inv.count('medicine')) { Game.objective = 'Отнести лекарство матери'; toHome(); }
      else Game.objective = `Накопить на лекарство: ${coins}/20 медяков`;
      return;
    }
    if (!F.coinsGiven) { Game.objective = `Отдать отцу 5 медяков на хлеб (есть ${coins})`; toHome(); return; }
    Game.objective = 'На рынок: у богатого торговца на виду блестит вещица';
    const m = Game.tags.market; if (m) Game.waypoint = { x: m.x, y: m.y, label: 'рынок' };
  },

  // ---------- Семья ----------
  talkMother() {
    const F = Game.flags;
    if (Inv.count('medicine') && F.breadDone && !F.medDone) {
      Inv.clear('medicine'); F.medDone = true; Sfx.pick();
      Game.say([
        { who: 'Я', text: 'Мам. Вот, выпей.' },
        { who: 'Мать', text: 'Кх... горько-то как... Откуда, сынок?' },
        { who: 'Я', text: 'Заработал.' },
        { who: 'Мать', text: 'Ты у меня хороший... Полежу немного...' },
        { who: '', text: 'Кашель стал тише. Мать закрыла глаза и впервые за неделю уснула.' },
        { who: 'Отец', text: 'Спит. Ты слышишь? Спит.' },
        { who: 'Отец', text: 'Сынок... откуда деньги?' },
        { who: 'Я', text: 'Нашёл работу.' },
        { who: 'Отец', text: 'Врёшь. Но сегодня я не буду спрашивать.' },
      ], () => { this.objective(); Game.save(); });
      return;
    }
    if (!F.breadDone) { Game.say([{ who: 'Мать', text: 'Не смотри ты так. Кх-кх... Само пройдёт.' }]); return; }
    Game.say([{ who: 'Мать', text: F.medDone ? '(спит, дышит ровно)' : 'Мне бы полегчало, да настойка дорогая...' }]);
  },

  talkFather() {
    const F = Game.flags;
    if (!F.breadDone) {
      if (Inv.count('bread') < 3) { Game.say([{ who: 'Отец', text: 'Три буханки, сынок. Больше нам и не съесть.' }]); return; }
      Inv.take('bread', 3); F.breadDone = true; Sfx.pick();
      Game.say([
        { who: 'Я', text: 'Держи. Три буханки.' },
        { who: 'Отец', text: 'Три?.. Откуда?' },
        { who: 'Я', text: 'Работал.' },
        { who: 'Отец', text: '...Молодец. Правда молодец.' },
        { who: 'Отец', text: 'Завтра сам выйду. Спина потерпит. Наскребу матери на лекарство.' },
        { who: 'Мать', text: 'Куда ты с такой спиной! Лежи уж...' },
        { who: 'Отец', text: 'Лежу, лежу.' },
        { who: 'Я', text: '(про себя) Лекарство. Двадцать медяков. Он не встанет. Значит, я.' },
      ], () => { this.objective(); Game.save(); });
      return;
    }
    if (F.medDone && !F.coinsGiven) {
      if (!Inv.take('coins', 5)) { Game.say([{ who: 'Отец', text: 'Хлеба бы ещё. Пять медяков — и мы живём.' }]); return; }
      F.coinsGiven = true; this.p.hasKnife = true; Sfx.coin();
      Game.say([
        { who: 'Я', text: 'Вот пять медяков. На хлеб.' },
        { who: 'Отец', text: 'Пять... Хватит на три дня.' },
        { who: 'Отец', text: 'Ты вырос, пока я лежал. Я и не заметил, когда.' },
        { who: '', text: 'Он долго шарил под лежанкой и вытащил нож в потёртых ножнах.' },
        { who: 'Отец', text: 'Мой старый. Держи крепко, доставай редко.' },
        { who: 'Я', text: '...Спасибо, пап.' },
      ], () => {
        Game.showBanner('НОЖ', 'теперь есть чем бить · J', 2.5, '#e8e0d0');
        Game.say([{ who: 'Я', text: '(про себя) С ножом я уже не пустое место.' },
                  { who: 'Я', text: '(про себя) А у богатого торговца на рынке лежит на виду блестящая вещица. Прямо просится в руку.' }],
          () => { this.objective(); Game.save(); });
      });
      return;
    }
    if (!F.medDone) { Game.say([{ who: 'Отец', text: 'Двадцать медяков за настойку. Двадцать! Где их взять...' }]); return; }
    Game.say([{ who: 'Отец', text: 'Иди, сынок. Только к богатым не лезь — они не прощают.' }]);
  },

  // ---------- Подвеска и первая погоня ----------
  pendantTheft() {
    Game.say([
      { who: '', text: 'Пальцы сомкнулись на тёплой цепочке. Есть!' },
      { who: '', text: 'И тут жёсткая ладонь схватила меня за запястье.' },
      { who: 'Торговец', text: 'Попался, крысёныш! Эй, вы двое — держите вора!' },
      { who: '', text: 'Я вывернулся, оставив в его пальцах клок рубахи, и рванул.' },
    ], () => this.startChase1());
  },
  startChase1() {
    this.step = 'chase1'; Sfx.alarm(); FX.shake = 4;
    this.spawnChase1();
    Game.waypoint = null; Game.flags.lostThem = false;
    Game.objective = 'Оторваться от громил: скрыться из виду';
    Game.save();
    Game.hint('Пока они тебя видят, прятаться бесполезно. Петляй за домами и заборами. Shift — рывок.', 5.5);
  },
  // Громилы с рынка бросаются за вором
  spawnChase1() {
    const c = CONFIG.chase.marketThug;
    for (const role of ['guardA', 'guardB']) {
      const g = Game.roles[role]; if (!g) continue;
      g.hidden = true;
      const ch = new Chaser(g.x, g.y, { who: 'thug', role: role + 'C', speed: c.speed, range: c.range, half: c.half, group: 'chase1' });
      Game.npcs.push(ch); ch.startChase(); ch.alertT = 0.6;
    }
  },
  // В сумерках торговцы и прохожие расходятся по домам
  hideLocals() {
    for (const n of Game.npcs) if ((n.role && n.role !== 'drunk' && !(n instanceof Chaser)) || n instanceof Walker) n.hidden = true;
  },
  spawnSearchers() {
    const c = CONFIG.chase.lantern;
    for (const w of SEARCHERS) Game.addChaser(w.at[0], w.at[1], {
      who: 'thug', group: 'sneak', lantern: true, speed: c.speed, patrolSpeed: c.patrolSpeed, range: c.range, half: c.half,
      angle: w.angle || 0, look: w.look, route: w.route && w.route.map(([x, y]) => tc(x, y)),
    });
  },
  // Пока громилы видят героя, укрытие не поможет; оторвался — появляется стрелка к щели
  chaseUpdate(p) {
    const cs = Game.npcs.filter(c => c.group === 'chase1' && c.active && !c.hidden);
    const hot = cs.some(c => c.state === 'chase' || c.state === 'alert');
    if (hot) {
      if (Game.flags.lostThem) { Game.flags.lostThem = false; Game.objective = 'Снова заметили! Оторваться от громил'; }
      Game.waypoint = null;
      return;
    }
    const h = Game.tags.hideout;
    if (!Game.flags.lostThem) {
      Game.flags.lostThem = true;
      Game.objective = 'Оторвался. Спрятаться в щели за сараем';
      Game.hint('Они потеряли след. Теперь — в укрытие, пока не нашли.', 4);
    }
    Game.waypoint = { x: h.x, y: h.y, label: 'укрытие' };
    if (dist(p.x, p.y, h.x, h.y) < 26) this.endChase1();
  },
  endChase1() {
    this.step = 'sneak'; Game.waypoint = null;
    for (const c of Game.npcs) if (c.group === 'chase1') { c.hidden = true; c.active = false; }
    this.hideLocals();
    Game.say([
      { who: '', text: 'Я забился в щель между сараями и сидел там, пока небо не стало серым.' },
      { who: 'Я', text: 'Подвеска... тёплая. Будто живая. Сколько же она стоит?' },
      { who: '', text: 'На улицах загремели голоса. Люди торговца ходили с фонарями и искали меня.' },
    ], () => {
      World.tint = DUSK; Game.flags.dusk = true;
      this.spawnSearchers();
      Game.flags.sneakCp = { x: Game.tags.hideout.x, y: Game.tags.hideout.y };
      Game.waypoint = { x: Game.tags.homeFront.x, y: Game.tags.homeFront.y, label: 'дом' };
      Game.objective = 'Вернуться домой незаметно'; Game.save();
      Game.hint('Фонарщики по всему городу. Не попадайся в свет: конус показывает, куда смотрят.', 4.5);
    });
  },

  onSpotted(c) {
    if (this.step === 'sneak') Game.hint('Заметили!', 1.5);
    if (this.step === 'flee' && c.group === 'sneak') Game.hint('Фонарщик: «Вон он! Сюда, сюда!»', 1.5);
  },
  onCaught(c) {
    const p = this.p, n = norm(p.x - c.x, p.y - c.y);
    if (this.step === 'chase1' || this.step === 'flee') {
      if (p.invul > 0) return;   // только что вырвался — не добивают по цепочке
      const dmg = this.step === 'flee' ? 2 : 1;
      if (p.hp - dmg < 2) p.hp = 2 + dmg;
      p.invul = 0; p.hurt(dmg, n.x, n.y); knock(p, n.x * 240, n.y * 240); p.invul = 1.3;
      c.state = 'alert'; c.alertT = 1.1;
      Game.hint(c.who === 'collector' ? 'Сборщик: «Далеко не уйдёшь!»'
        : c.group === 'sneak' ? 'Фонарщик: «Держи его!» — я вывернулся из рук.'
        : this.step === 'flee' ? 'Громила: «Режь его!» — крюк свистнул у самого уха.'
        : 'Громила: «Попался!» — удар под дых. Я вывернулся и рванул дальше.', 2.5);
      return;
    }
    if (this.step === 'sneak') {
      Game.say([{ who: 'Фонарщик', text: 'Вот он! Держи!..' }, { who: '', text: 'Меня швырнули в грязь. Я вывернулся, нырнул под забор и снова затаился.' }], () => {
        const cp = Game.flags.sneakCp; p.x = cp.x; p.y = cp.y; p.kvx = p.kvy = 0;
        for (const w of Game.npcs) if (w.group === 'sneak') w.reset();
      });
    }
  },

  // ---------- Разрушенный дом и бегство ----------
  ruinScene() {
    this.step = 'ruin'; Game.flags.ruined = true; Game.waypoint = null;
    for (const c of Game.npcs) if (c.group === 'sneak') c.active = false;
    this.applyRuin();
    const lines = [
      { who: '', text: 'Дверь сорвана с петель. Стена проломлена насквозь.' },
      { who: 'Я', text: 'Мама?.. Отец?..' },
      { who: '', text: 'Внутри всё перевёрнуто. Пусто. Только тёмные пятна на полу.' },
    ];
    // Нож: если отец не успел подарить, герой находит его под лежанкой
    if (!this.p.hasKnife) {
      this.p.hasKnife = true;
      lines.push({ who: '', text: 'Под перевёрнутой лежанкой блеснуло железо. Отцовский нож в потёртых ножнах.' });
      lines.push({ who: 'Я', text: 'Он его прятал. Всю жизнь прятал — а достать не успел.' });
      Game.after(0.1, () => Game.showBanner('НОЖ', 'отцовский · J', 2.5, '#e8e0d0'));
    }
    Game.say(lines, () => {
      const col = this.collectorFromRuin();
      col.goalSpeed = 28;
      col.goal = {
        ...tc(4, 37), done: () => Game.say([
          { who: 'Сборщик', text: 'Вот и крысёныш. Долго же ты гулял.' },
          { who: 'Сборщик', text: 'Твоя мать не знала, где вещь господина. Она долго не знала.' },
          { who: 'Сборщик', text: 'Отдашь подвеску — умрёшь быстро. Побежишь — будем резать долго.' },
          { who: '', text: 'За спиной захлюпала грязь. Ещё двое. У одного в руке крюк.' },
          { who: 'Я', text: '(в голове только одно) БЕЖАТЬ! БЕЖАТЬ ПРОЧЬ!' },
        ], () => this.startFlee()),
      };
      Game.focus(col);
    });
  },
  applyRuin() {
    for (let y = 33; y <= 34; y++) for (let x = 3; x <= 6; x++) World.set(x, y, 'R');
    for (let x = 3; x <= 6; x++) World.set(x, 35, 'W');
    World.set(4, 35, 'h');
  },
  collectorOpts() { return { who: 'collector', group: 'flee', relentless: true, speed: CONFIG.chase.collector.speed, showCone: false, active: false }; },
  spawnCollector(tx, ty) { return Game.addChaser(tx, ty, this.collectorOpts()); },
  // Сборщик выходит из пролома в стене — ставим точно в пролом, мимо поиска свободного места
  collectorFromRuin() { const col = new Chaser(4 * TS + 8, 35 * TS + 10, this.collectorOpts()); Game.npcs.push(col); return col; },
  // Банда из дома: Сборщик и двое с крюками. Бегут наравне с героем и не отстают
  unleashGang(delay) {
    const col = Game.npcs.find(n => n.who === 'collector');
    col.home = tc(4, 37); col.active = true; col.startChase(); col.alertT = delay;
    for (const [x, y] of [[1, 41], [16, 37]]) {
      const t = Game.addChaser(x, y, { who: 'thug', group: 'flee', relentless: true, speed: CONFIG.chase.gangThug.speed, showCone: false });
      t.startChase(); t.alertT = delay + 0.3;
    }
  },
  // Фонарщики слышат крик и сбегаются со всего города: сначала идут на шум, увидев — гонятся
  rouseSearchers(delay) {
    const p = this.p, c = CONFIG.chase.lanternHunt;
    for (const s of Game.npcs) if (s.group === 'sneak') {
      Object.assign(s, { hidden: false, active: true, hunt: true, route: null, speed: c.speed, huntSpeed: c.huntSpeed, range: c.range, half: c.half, nav: null, huntAt: null });
      s.state = 'hunt'; s.huntDelay = delay + dist(s.x, s.y, p.x, p.y) / 160;
    }
  },
  openCityGate() { for (let y = 6; y <= 8; y++) World.set(59, y, '.'); },
  startFlee() {
    this.step = 'flee'; Game.focus(null);
    this.openCityGate();
    this.unleashGang(1.2);
    this.rouseSearchers(0.8);
    Game.setCheckpoint(tc(4, 37).x, tc(4, 37).y);
    Game.waypoint = { x: Game.tags.gate.x, y: Game.tags.gate.y, label: 'ворота' };
    Game.objective = 'Бежать из города — к восточным воротам'; Game.save();
    Game.hint('Бегом! На крик сбегаются фонарщики со всего квартала. Стрелка — к воротам, Shift — рывок.', 5);
  },

  // ---------- Загрузка, смерть, покадровые триггеры ----------
  onSceneLoad(name) {
    if (name !== 'slums') return;
    if (Game.flags.ruined) this.applyRuin();
    if (Game.flags.dusk) World.tint = DUSK;
    // Загрузка посреди погони: расставить всех заново
    const step = this.step;
    if (step === 'chase1') this.spawnChase1();
    if (step === 'sneak') {
      this.hideLocals(); this.spawnSearchers();
      const h = Game.tags.homeFront; Game.waypoint = { x: h.x, y: h.y, label: 'дом' };
    }
    if (step === 'ruin' || step === 'flee') {
      this.step = 'flee';
      this.hideLocals(); this.spawnSearchers(); this.spawnCollector(9, 37);
      this.openCityGate();
      this.unleashGang(2);
      this.rouseSearchers(1.5);
      Game.waypoint = { x: Game.tags.gate.x, y: Game.tags.gate.y, label: 'ворота' };
      Game.objective = 'Бежать из города — к восточным воротам';
    }
  },
  onRespawn() {
    if (World.name === 'slums' && this.step === 'flee')
      for (const c of Game.npcs) if (c.group === 'flee') { c.reset(); c.state = 'idle'; Game.after(1.2, () => c.startChase()); }
    return false;
  },
  update() {
    const p = this.p;
    if (this.step === 'chase1') this.chaseUpdate(p);
    if (this.step === 'sneak' && dist(p.x, p.y, Game.tags.homeFront.x, Game.tags.homeFront.y) < 22) this.ruinScene();
    if (this.step === 'flee' && p.x > 58.2 * TS) Chapter1.enterForest();
    if (Game.flags.ruined && rnd() < 0.25) FX.add({ x: rrange(3, 7) * TS, y: rrange(33, 35) * TS, vx: rrange(-5, 5), vy: -rrange(10, 25), life: 1.2, max: 1.2, color: rnd() < 0.5 ? '#ff8030' : '#555', size: 1 });
  },
};
Story.register(Chapter0);
