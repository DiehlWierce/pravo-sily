'use strict';
// Сценарий: Глава 0 «Трущобы» и Глава 1 «Чёрный лес». Состояние сюжета живёт в Game.flags и сохраняется вместе с игрой.

const tc = (tx, ty) => ({ x: tx * TS + 8, y: ty * TS + 10 });
const DUSK = 'rgba(18,22,58,0.5)';
const BUSY = ['chase1', 'sneak', 'ruin', 'flee'];

// Характеры жителей: кто прогонит, кто расскажет, кто подаст, кто купит хлам
const PERSONAS = {
  beggar: {
    name: 'Старик', begs: true,
    talk: [
      ['Старик', 'А, крысёныш. Опять роешься в чужом мусоре?'],
      ['Я', 'Лучше в мусоре, чем в канаве.'],
      ['Старик', 'Видал у богатого торговца подвеску? Кристалл. Такие носит всякий, у кого водятся деньги: дворяне, купцы, крестьяне побогаче.'],
      ['Старик', 'Говорят, их вырезают из диких тварей в Чёрном лесу. Да только тварь такая сама кого хочешь вырежет.'],
    ],
    more: [['Старик', 'Охотники в лес ходят и обратно не всегда возвращаются. Зато если вернутся — сразу при деньгах.']],
  },
  washer: { name: 'Прачка', rude: true, greet: 'Проваливай, воришка! Бельё мне попачкаешь.' },
  boy: {
    name: 'Тимка',
    talk: [['Тимка', 'Эй! Слыхал? У ворчуна за канавой в сундуке медяки лежат.'], ['Тимка', 'Он днём дремлет за столом. Правда, просыпается быстро.'], ['Я', 'Спасибо, Тимка.']],
    more: [['Тимка', 'На рынке зазеваешься — громилы руку сломают. Они у торговца с подвеской вечно трутся.']],
  },
  kindwoman: {
    name: 'Женщина', gives: 1,
    talk: [['Женщина', 'Как мать твоя? Всё кашляет?'], ['Я', 'Кашляет.'], ['Женщина', 'Тяжело вам. Держись, малец.']],
  },
  dealer: { name: 'Скупщик', buys: true, talk: [['Скупщик', 'Хлам, краденое — беру всё. Только не говори никому, у кого взял.']] },
  junkwoman: { name: 'Старьёвщица', buys: true, talk: [['Старьёвщица', 'Тряпьё, железки — тащи, дам по медяку.'], ['Старьёвщица', 'Сама так и живу. Всю жизнь чужое старьё перебираю.']] },
  smith: {
    name: 'Кузнец', shop: 'knife',
    talk: [['Кузнец', 'Нож — пятнадцать медяков. Не торгуйся, я и так режу себе в убыток.'],
           ['Кузнец', 'В лес собрался? Там без железа делать нечего. Да и с железом, честно говоря, тоже.']],
  },
  baker: { name: 'Торговка', shop: 'bread', talk: [['Торговка', 'Хлеб — пять медяков. Нет денег — не дыши на товар.']] },
  apothecary: {
    name: 'Аптекарь', shop: 'medicine',
    talk: [
      ['Аптекарь', 'Настойка от кашля — двадцать медяков. Дешевле не будет.'],
      ['Аптекарь', 'Мази? Нулевой ступени, царапины мазать. Первую ступень — ту, что глубокие порезы тянет, — я и в глаза не видел.'],
      ['Аптекарь', 'Такое возят охотникам. И тем, кто с кристаллами возится.'],
    ],
  },
  widow: {
    name: 'Вдова',
    talk: [
      ['Вдова', 'Мой тоже так начинал. Сперва хлам, потом чужие карманы.'],
      ['Вдова', 'Потом ушёл в лес за кристаллами. Говорил: один камешек — и заживём.'],
      ['Вдова', 'Третий год жду. Не ходи в лес, мальчик.'],
    ],
  },
  soldier: {
    name: 'Старый солдат', gives: 2,
    talk: [
      ['Старый солдат', 'Держись прямо, когда со мной говоришь.'],
      ['Старый солдат', 'Видел я зверей силы. Шипогрыз — кабан кабаном, пока не разгонится. Нож его шкуру не берёт.'],
      ['Старый солдат', 'Бить надо, когда он выдохнется или в дерево врежется. Запомни, пригодится.'],
    ],
  },
  grumpy: { name: 'Ворчун', rude: true, greet: 'Вон из моего дома, пока метлой не огрел!' },
  fruiter: { name: 'Зеленщик', rude: true, greet: 'Руками не лапай. Купить — покупай, нет — иди.' },
  clother: { name: 'Торговка тканью', rude: true, greet: 'Оборванцам ткань не по карману. Отойди.' },
  merchant: { name: 'Торговец', rude: true, greet: 'Отойди от прилавка, оборванец. От тебя несёт канавой.' },
  guardA: { name: 'Громила', rude: true, greet: 'Шагай мимо, крысёныш. Ещё раз увижу у прилавка — пальцы переломаю.' },
  guardB: { name: 'Громила', rude: true, greet: 'Чего встал? Проваливай.' },
  drunk: { name: 'Пьяница', rude: true, greet: 'Хрр... а? Чего надо?.. Иди отсюда...' },
  mother: { name: 'Мать' }, father: { name: 'Отец' },
};

const Story = {
  get step() { return Game.flags.step; },
  set step(v) { Game.flags.step = v; },
  get p() { return Game.player; },
  busy() { return BUSY.includes(this.step); },

  // =====================================================================
  //                        ГЛАВА 0. ТРУЩОБЫ
  // =====================================================================
  start() {
    this.step = 'slums'; Game.flags.chapter = 0;
    Game.showBanner('ГЛАВА 0', 'Трущобы', 3, '#e0c080');
    Game.after(0.6, () => Game.say([
      { who: 'Мать', text: 'Кх-кх... Вернулся? Не ходи никуда, на улице сыро...' },
      { who: 'Отец', text: 'Хлеба нет третий день. А у матери жар.' },
      { who: 'Отец', text: 'Аптекарь просит двадцать медяков за настойку. Двадцать! У нас нет и двух.' },
      { who: 'Я', text: 'Я достану.' },
      { who: 'Отец', text: 'И нож себе купи у кузнеца. Без ножа ты в этом городе пустое место.' },
      { who: 'Отец', text: 'Только не лезь к богатым, слышишь? Они не прощают.' },
    ], () => {
      this.objectives();
      Game.hint('WASD — идти · Space — действие · Shift — рывок · J — нож · Enter — вещи', 6);
    }));
  },

  objectives() {
    if (this.busy() || Game.flags.chapter !== 0) return;
    const v = this.p.inv, parts = [];
    if (!Game.flags.breadDone) parts.push(v.bread ? 'отнести хлеб домой' : 'хлеб (5)');
    if (!this.p.hasKnife) parts.push('нож у кузнеца (15)');
    if (!Game.flags.medDone) parts.push(v.medicine ? 'отнести лекарство домой' : 'лекарство у аптекаря (20)');
    Game.objective = parts.length ? `Медяков: ${v.coins} · ` + parts.join(' · ') : 'Дома тихо. А на рынке у торговца что-то блестит...';
  },

  // ---------- Разговоры ----------
  canTalk(n) { return !n.hidden && !this.busy(); },
  canEnter() { if (this.busy()) { Game.hint('Не сейчас!', 1.2); return false; } return true; },
  canExit() { return true; },
  canLoot() { return !this.busy(); },
  showCone(w) { return Game.props.some(c => c instanceof Container && !c.used && c.owners && c.owners.includes(w.role)); },
  onTalkEnemy() { Game.hint('Он узнал меня!', 2); },

  talk(n) {
    const P = PERSONAS[n.role] || { name: 'Житель', rude: true, greet: 'Чего тебе?' };
    const v = this.p.inv;
    if (n.role === 'mother') return this.talkMother();
    if (n.role === 'father') return this.talkFather();
    if (P.rude) { Game.say([{ who: P.name, text: P.greet }]); return; }

    const lines = (arr) => arr.map(([who, text]) => ({ who, text }));
    const choices = [];
    choices.push({ label: 'Поговорить', fn: () => {
      const first = !Game.flags['met:' + n.role];
      Game.flags['met:' + n.role] = true;
      if (n.role === 'beggar' && first) Game.flags.knowsCrystals = true;
      Game.say(lines(first || !P.more ? P.talk : P.more));
    } });
    if (P.shop === 'bread') choices.push({ label: 'Купить хлеб (5 медяков)', fn: () => {
      if (v.coins < 5) { Game.say([{ who: P.name, text: 'Пять медяков. Ни медяком меньше. Иди зарабатывай.' }]); return; }
      v.coins -= 5; v.bread++; Sfx.coin(); this.objectives();
      Game.say([{ who: P.name, text: 'Держи. И не крутись тут больше.' }]);
    } });
    if (P.shop === 'medicine') choices.push({ label: 'Купить лекарство (20 медяков)', fn: () => {
      if (v.coins < 20) { Game.say([{ who: P.name, text: `Двадцать медяков. У тебя ${v.coins}. Приходи, когда наберёшь.` }]); return; }
      v.coins -= 20; v.medicine++; Sfx.coin(); this.objectives();
      Game.say([{ who: P.name, text: 'Вот склянка. По ложке утром и вечером. И не тряси — осадок.' }]);
    } });
    if (P.shop === 'knife') choices.push({ label: 'Купить нож (15 медяков)', fn: () => {
      if (this.p.hasKnife) { Game.say([{ who: P.name, text: 'Нож у тебя уже есть. Второй тебе не удержать.' }]); return; }
      if (v.coins < 15) { Game.say([{ who: P.name, text: `Пятнадцать медяков. У тебя ${v.coins}. Иди работай.` }]); return; }
      v.coins -= 15; this.p.hasKnife = true; Sfx.coin(); Game.flags.knifeDone = true; this.objectives();
      Game.say([{ who: P.name, text: 'Держи. Рукоять перемотай тряпкой, иначе руку собьёшь.' },
                { who: 'Я', text: 'Теперь я хотя бы не пустой.' }]);
    } });
    if (P.buys) choices.push({ label: 'Продать хлам и краденое', fn: () => this.sell(n, P) });
    if (!P.buys && !P.shop) choices.push({ label: 'Предложить хлам', fn: () => Game.say([{ who: P.name, text: v.junk.length ? 'Мне твой мусор ни к чему. Скупщик на рынке берёт.' : 'У тебя и хлама-то нет.' }]) });
    choices.push({ label: 'Попросить денег', fn: () => {
      if (!P.gives) { Game.say([{ who: P.name, text: 'Самому бы кто подал.' }]); return; }
      if (Game.flags['gave:' + n.role]) { Game.say([{ who: P.name, text: 'Я уже давал. Больше нет.' }]); return; }
      Game.flags['gave:' + n.role] = true; v.coins += P.gives; Sfx.coin(); this.objectives();
      Game.say([{ who: P.name, text: n.role === 'soldier' ? `Держи ${P.gives} медяка. Не на сладости, понял?` : `Держи медяк. Матери отнеси.` }]);
    } });
    if (P.begs) choices.push({ label: 'Подать медяк', fn: () => {
      if (v.coins < 1) { Game.say([{ who: 'Я', text: 'У меня самого пусто.' }]); return; }
      v.coins--; Sfx.coin(); Game.flags.gaveBeggar = true; this.objectives();
      Game.say([{ who: 'Старик', text: 'Вот это дело. Слушай тогда: в лесу у охотников бывают мази первой ступени. Дорогая вещь. Дороже еды.' }]);
    } });
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose(P.name, Game.flags['met:' + n.role] ? 'Опять ты?' : 'Чего тебе, малец?', choices);
  },

  sell(n, P) {
    const v = this.p.inv, jn = v.junk.length, gv = v.goods.reduce((a, g) => a + g.value, 0);
    if (!jn && !gv) { Game.say([{ who: P.name, text: 'Нечего продать — нечего и болтать.' }]); return; }
    const total = jn + gv;
    v.coins += total; v.junk = []; v.goods = []; Sfx.coin(); this.objectives();
    Game.say([{ who: P.name, text: `Тьфу, мусор... Держи ${total} медяк${total === 1 ? '' : total < 5 ? 'а' : 'ов'}.` }],
      () => { if (gv) Game.hint('Краденое ушло без вопросов.', 2); });
  },

  talkMother() {
    const v = this.p.inv;
    if (v.medicine && !Game.flags.medDone) {
      v.medicine = 0; Game.flags.medDone = true; Sfx.pick();
      Game.say([
        { who: 'Я', text: 'Мам. Вот, выпей.' },
        { who: 'Мать', text: 'Кх... горько-то как... Откуда, сынок?' },
        { who: 'Я', text: 'Работал.' },
        { who: 'Мать', text: 'Ты у меня хороший. Кх-кх... Полежу немного.' },
        { who: '', text: 'Кашель стал тише. Может, обойдётся.' },
      ], () => this.objectives());
      return;
    }
    Game.say([{ who: 'Мать', text: Game.flags.medDone ? 'Мне полегче. Ты поел ли?' : 'Не смотри ты так. Кх-кх... Само пройдёт.' }]);
  },
  talkFather() {
    const v = this.p.inv;
    if (v.bread && !Game.flags.breadDone) {
      v.bread = 0; Game.flags.breadDone = true; Sfx.pick();
      Game.say([
        { who: 'Я', text: 'Хлеб.' },
        { who: 'Отец', text: 'Откуда?' },
        { who: 'Я', text: 'Хлам продал.' },
        { who: 'Отец', text: '...Ладно. Матери оставим больше.' },
      ], () => this.objectives());
      return;
    }
    if (Game.flags.medDone && Game.flags.breadDone) { Game.say([{ who: 'Отец', text: 'Ты своё сделал. Посиди дома хоть вечер.' }]); return; }
    Game.say([{ who: 'Отец', text: 'Двадцать медяков, сынок. И хлеба бы. Только к богатым не лезь.' }]);
  },

  // ---------- Кражи ----------
  caughtStealing(w, c) {
    const p = this.p, n = norm(p.x - w.x, p.y - w.y), P = PERSONAS[w.role] || { name: 'Хозяин' };
    p.kvx = n.x * 200; p.kvy = n.y * 200; Sfx.hurt();
    const inside = World.theme === 'interior';
    Game.hint(`${P.name}: «${inside ? 'Пошёл вон из моего дома!' : 'А ну руки убрал!'}»`, 2.5);
    if (inside) Game.after(0.7, () => Game.exitInterior());
  },
  onContainer(c) {
    if (c.loot.pendant) { this.pendantTheft(); return; }
    this.objectives();
  },
  onJunk() { this.objectives(); },

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
    for (const role of ['guardA', 'guardB']) {
      const g = Game.roles[role]; if (!g) continue;
      g.hidden = true;
      const c = new Chaser(g.x, g.y, { who: 'thug', role: role + 'C', speed: 66, range: 96, half: 0.8, group: 'chase1' });
      Game.npcs.push(c); c.startChase(); c.alertT = 0.6;
    }
    Game.waypoint = { x: Game.tags.hideout.x, y: Game.tags.hideout.y, label: 'укрытие' };
    Game.objective = 'Оторваться от громил: добежать до щели за сараем';
    Game.hint('Стрелка ведёт к укрытию. Shift — рывок, за углами они теряют след.', 5);
  },
  endChase1() {
    this.step = 'sneak'; Game.waypoint = null;
    for (const c of Game.npcs) if (c.group === 'chase1') { c.hidden = true; c.active = false; }
    for (const n of Game.npcs) if (n.role && !['drunk'].includes(n.role)) n.hidden = true;
    Game.say([
      { who: '', text: 'Я забился в щель между сараями и сидел там, пока небо не стало серым.' },
      { who: 'Я', text: 'Подвеска... тёплая. Будто живая. Сколько же она стоит?' },
      { who: '', text: 'На улицах загремели голоса. Люди торговца ходили с фонарями и искали меня.' },
    ], () => {
      World.tint = DUSK; Game.flags.dusk = true;
      const watchers = [
        { at: [20, 42], route: [[20, 42], [40, 42]] },
        { at: [30, 37], angle: -Math.PI / 2, look: true },
        { at: [10, 30], route: [[10, 30], [10, 36]] },
        { at: [45, 33], route: [[45, 33], [53, 39]] },
      ];
      for (const w of watchers) Game.addChaser(w.at[0], w.at[1], {
        who: 'thug', group: 'sneak', lantern: true, speed: 58, patrolSpeed: 24, range: 72, half: 0.7,
        angle: w.angle || 0, look: w.look, route: w.route && w.route.map(([x, y]) => tc(x, y)),
      });
      Game.flags.sneakCp = { x: Game.tags.hideout.x, y: Game.tags.hideout.y };
      Game.waypoint = { x: Game.tags.homeFront.x, y: Game.tags.homeFront.y, label: 'дом' };
      Game.objective = 'Вернуться домой незаметно';
      Game.hint('Не попадайся в свет фонарей. Конус показывает, куда смотрят.', 4.5);
    });
  },

  onSpotted() { if (this.step === 'sneak') Game.hint('Заметили!', 1.5); },
  onLost() { },
  onCaught(c) {
    const p = this.p, n = norm(p.x - c.x, p.y - c.y);
    if (this.step === 'chase1' || this.step === 'flee') {
      const dmg = this.step === 'flee' ? 2 : 1;
      if (p.hp - dmg < 2) p.hp = 2 + dmg;
      p.invul = 0; p.hurt(dmg, n.x, n.y); p.kvx = n.x * 240; p.kvy = n.y * 240; p.invul = 1.3;
      c.state = 'alert'; c.alertT = 1.1;
      Game.hint(this.step === 'flee' ? 'Сборщик: «Далеко не уйдёшь!»' : 'Громила: «Попался!» — удар под дых. Я вывернулся и рванул дальше.', 2.5);
      return;
    }
    if (this.step === 'sneak') {
      Game.say([{ who: 'Фонарщик', text: 'Вот он! Держи!..' }, { who: '', text: 'Меня швырнули в грязь. Я вывернулся, нырнул под забор и снова затаился.' }], () => {
        const cp = Game.flags.sneakCp; p.x = cp.x; p.y = cp.y; p.kvx = p.kvy = 0;
        for (const w of Game.npcs) if (w.group === 'sneak') w.reset();
      });
    }
  },

  ruinScene() {
    this.step = 'ruin'; Game.flags.ruined = true; Game.waypoint = null;
    for (const c of Game.npcs) if (c.group === 'sneak') { c.active = false; c.hidden = true; }
    this.applyRuin();
    Game.say([
      { who: '', text: 'Дверь сорвана с петель. Стена проломлена насквозь.' },
      { who: 'Я', text: 'Мама?.. Отец?..' },
      { who: '', text: 'Внутри всё перевёрнуто. Пусто. Только тёмные пятна на полу.' },
    ], () => {
      const col = Game.addChaser(4, 35, { who: 'collector', group: 'flee', relentless: true, speed: 70, showCone: false, active: false });
      col.goalSpeed = 28;
      col.goal = {
        ...tc(4, 37), done: () => Game.say([
          { who: 'Сборщик', text: 'Вот и крысёныш. Долго же ты гулял.' },
          { who: 'Сборщик', text: 'Твоя мать не знала, где вещь господина. А ты — знаешь.' },
          { who: '', text: 'За спиной захлюпала грязь. Ещё двое.' },
          { who: '', text: 'Беги.' },
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
  startFlee() {
    this.step = 'flee'; Game.focus(null);
    for (let y = 6; y <= 8; y++) World.set(59, y, '.');
    const col = Game.npcs.find(n => n.who === 'collector');
    col.home = tc(4, 37); col.active = true; col.startChase(); col.alertT = 1.2;
    for (const [x, y] of [[1, 40], [14, 38]]) {
      const t = Game.addChaser(x, y, { who: 'thug', group: 'flee', relentless: true, speed: 63, showCone: false });
      t.startChase(); t.alertT = 1.5;
    }
    Game.setCheckpoint(tc(4, 37).x, tc(4, 37).y);
    Game.waypoint = { x: Game.tags.gate.x, y: Game.tags.gate.y, label: 'ворота' };
    Game.objective = 'Бежать из города — к восточным воротам';
    Game.hint('Бегом! Стрелка ведёт к воротам. Shift — рывок.', 4);
  },

  // =====================================================================
  //                        ГЛАВА 1. ЧЁРНЫЙ ЛЕС
  // =====================================================================
  enterForest() {
    this.step = 'night1'; Game.flags.chapter = 1; Game.waypoint = null;
    const p = this.p; p.hp = Math.max(2, Math.ceil(p.maxHp / 2)); p.stamina = p.maxStamina * 0.3;
    Game.enterScene('forest', null);
  },
  // Завал на тропе: ночью герой дальше не идёт
  openForestPath() {
    for (let y = 27; y <= 33; y++) World.set(17, y, '.');
    Game.flags.pathOpen = true;
  },

  onSceneLoad(name) {
    if (name === 'slums') {
      if (Game.flags.ruined) this.applyRuin();
      if (Game.flags.dusk) World.tint = DUSK;
      if (this.step === 'flee') for (let y = 6; y <= 8; y++) World.set(59, y, '.');
    }
    if (name === 'forest') {
      if (Game.flags.morning) World.tint = null;
      if (Game.flags.pathOpen) this.openForestPath();
      if (!Game.flags.forestIntro) {
        Game.flags.forestIntro = true;
        Game.showBanner('ГЛАВА 1', 'Чёрный лес', 3, '#bff8ff');
        Game.after(0.8, () => Game.say([
          { who: '', text: 'Я бежал, пока крики за спиной не утонули в шуме деревьев.' },
          { who: '', text: 'Чёрный лес. Сюда не суются даже громилы. Здесь живут твари.' },
          { who: 'Я', text: 'У меня только нож. И ночь впереди.' },
        ], () => {
          Game.objective = 'Поймать двух зайцев: 0/2';
          Game.hint('Сначала еда. Зайцы удирают быстрее меня — загоняй их в угол или к камням.', 5);
          Game.save();
        }));
      }
    }
    if (name === 'hut' && !Game.flags.chapterEnd) {
      Game.flags.chapterEnd = true;
      Game.after(0.6, () => Game.say([
        { who: '', text: 'Заброшенная хижина. Пыль, старая лежанка, холодный очаг.' },
        { who: 'Я', text: 'Дверь запирается. Крыша есть. Можно жить.' },
        { who: '', text: 'В сумке звенели кристаллы мёртвых тварей, за поясом — чужой свиток.' },
        { who: 'Я', text: 'Я вернусь в город. Но уже не крысёнышем.' },
      ], () => { Game.objective = 'Глава 1 пройдена. Хижина — твоя. Дальше будет Глава 2.'; Game.save(); Game.state = 'end'; }));
    }
  },

  // Костёр: шаги ночного обучения
  onCampfire(c, justLit) {
    if (justLit && this.step === 'night2') {
      this.step = 'night3';
      Game.objective = 'Пожарить мясо на костре и поесть';
      Game.hint('Space у костра — пожарить. Потом съесть: через вещи (Enter) или быструю кнопку E.', 5);
      return false;
    }
    return false;
  },

  onRest() {
    if (World.name !== 'forest') return;
    if (Game.flags.morning) return;
    if (this.step !== 'night4') { Game.hint('Спать на пустой желудок — не уснёшь. Сначала поесть.', 3); return; }
    Game.flags.morning = true; World.tint = null;
    this.openForestPath();
    Game.say([
      { who: '', text: 'Я подбрасывал ветки до рассвета и вздрагивал от каждого хруста.' },
      { who: '', text: 'Утро. Раны затянулись, в животе тепло. Жить можно.' },
      { who: 'Я', text: 'Мяса надо впрок. И шкуры. Иначе дальше не уйти.' },
    ], () => { this.step = 'hunt'; this.huntObjective(); Game.hint('Завал на тропе обошёл — дальше в лес дорога открыта.', 4); });
  },
  huntObjective() {
    const r = Game.flags.rabbits || 0, b = Game.flags.boars || 0;
    Game.objective = `Охота: зайцы ${Math.min(r, 5)}/5 · кабаны ${Math.min(b, 3)}/3`;
  },
  onAte() {
    if (this.step === 'night3') { this.step = 'night4'; Game.objective = 'Поспать у костра (Отдохнуть)'; Game.hint('Теперь можно и поспать. Space у костра — Отдохнуть.', 4); }
  },

  onKill(e) {
    if (e instanceof Rabbit || e instanceof Boar) Game.once('firstAnimal', () => Game.hint('Держи Space у туши — разделать.', 2.5));
    if (e instanceof Rabbit) {
      Game.flags.rabbits = (Game.flags.rabbits || 0) + 1;
      if (this.step === 'night1') {
        if (Game.flags.rabbits >= 2) { this.step = 'night2'; Game.objective = 'Разжечь костёр на опушке'; Game.hint('Мясо есть. Теперь костёр: Space у кострища.', 4); }
        else Game.objective = `Поймать двух зайцев: ${Game.flags.rabbits}/2`;
      } else if (this.step === 'hunt') this.huntObjective();
    }
    if (e instanceof Boar || (e instanceof Spiker && e.tag === 'firstSpiker')) {
      Game.flags.boars = (Game.flags.boars || 0) + 1;
      if (this.step === 'hunt') {
        this.huntObjective();
        if ((Game.flags.rabbits || 0) >= 5 && Game.flags.boars >= 3) {
          this.step = 'deeper'; Game.objective = 'Идти глубже в лес, на восток';
          Game.hint('Мяса хватит. Пора вглубь.', 3);
        }
      }
    }
    if (e instanceof Spiker && !e.tag && e.x < 70 * TS && ['hunt', 'spiker1', 'spikers'].includes(this.step)) {
      Game.flags.spikers = (Game.flags.spikers || 0) + 1;
      if (Game.flags.spikers >= 2) { this.step = 'jumper'; Game.objective = 'Идти глубже в лес, на восток'; }
      else Game.objective = `Шипогрызы в чаще: ${Game.flags.spikers}/2`;
    }
    if (e.tag === 'firstJumper') { this.step = 'toHunter'; Game.objective = 'Идти дальше на восток'; Game.hint('Еле справился. Эти твари с каждым разом страшнее.', 3); }
    if (e instanceof BigJumper && Game.cutscene) this.afterBigJumper(e);
  },
  onLoot(e) {
    if (e.loot.meat && !e.loot.crystals) Game.once('firstMeat', () => Game.hint('Сырое мясо. Пожарить на костре (Space у костра), потом E — съесть.', 4));
    if (e.loot.crystals) Game.once('firstCrystal', () => {
      Game.say([
        { who: '', text: 'Под рёбрами твари — кристалл. Тёплый. Пульсирует, будто ещё живой.' },
        { who: 'Я', text: 'На рынке говорили: такие носят дворяне и купцы. Один такой — и лекарство, и еда на год...' },
        { who: 'Я', text: '...если там ещё есть кого лечить.' },
      ], () => { if (['hunt', 'forest', 'spiker1'].includes(this.step)) { this.step = 'spikers'; Game.objective = `Шипогрызы в чаще: ${Game.flags.spikers || 0}/2`; } });
    });
  },
  onSpikerReveal() {
    Game.showBanner('ШИПОГРЫЗ', 'зверь силы', 2.5, '#ff8070');
    Game.once('spikerRevealHint', () => Game.hint('Это не кабан! Нож не берёт шкуру. Уворачивайся (Shift) и бей на передышке — или пусть врежется в дерево.', 5));
    if (['forest', 'hunt'].includes(this.step)) this.step = 'spiker1';
  },

  // ---------- Охотник ----------
  watchHunter() {
    Game.flags.hunterScene = true;
    const h = Game.tags.hunter, j = Game.tags.bigJumper, p = this.p;
    p.kvx = p.kvy = 0; p.moving = false;
    Game.cutscene = true; Game.focus({ x: 81 * TS, y: 17 * TS });
    Game.say([{ who: '', text: 'Впереди грохот и хруст костей. Я нырнул в кусты и замер.' }], () => {
      h.state = 'cutscene'; h.target = j; h.throwCd = 0.4;
      j.target = h; j.sight = 340;
      this.cutT = 0;
    });
  },
  afterBigJumper(j) {
    const h = Game.tags.hunter;
    h.dropLifted(); h.state = 'panting'; h.target = null;
    Game.after(1, () => {
      h.goal = {
        x: j.x - 12, y: j.y, done: () => {
          h.state = 'panting';
          Game.after(1.2, () => {
            j.looted = true; j.loot.crystals = 0; Sfx.crystal(); FX.burst(j.x, j.y - 8, '#7cf0ff', 14, 60);
            Game.after(1, () => this.hunterTalk());
          });
        },
      };
    });
  },
  hunterTalk() {
    const p = this.p;
    Game.say([
      { who: 'Охотник', text: '(тяжело дыша) Хватит прятаться. Я слышу, как ты сопишь в кустах.' },
      { who: '', text: 'Я вышел.' },
    ], () => {
      p.x = 75 * TS; p.y = 17 * TS + 10; p.lr = 'r'; p.face = { x: 1, y: 0 };
      Game.focus({ x: 77 * TS, y: 16 * TS });
      Game.choose('Охотник', 'Ну? Кто такой?', [
        { label: 'Я просто собираю ягоды.', fn: () => Game.say([
          { who: 'Охотник', text: 'Ягоды? В Чёрном лесу? С ножом и в крови по локоть?' },
          { who: 'Охотник', text: '(смеётся) Ты врёшь хуже, чем прячешься.' },
          { who: 'Охотник', text: '...А я не люблю, когда мне врут.' },
        ], () => this.startHunterFight()) },
        { label: 'Никто.', fn: () => Game.say([
          { who: 'Охотник', text: '«Никто» не шляется там, где охотятся на зверей силы.' },
          { who: 'Охотник', text: '(смеётся) Беглый? Вор? Сейчас узнаем, кто ты.' },
        ], () => this.startHunterFight()) },
      ]);
    });
  },
  startHunterFight() {
    const h = Game.tags.hunter, p = this.p;
    Game.cutscene = false; Game.focus(null);
    this.step = 'hunterFight'; Game.flags.hunterMet = true;
    const rock = new Obj('rock', h.x + 6, h.y - 2), n = norm(p.x - rock.x, p.y - 18 - rock.y);
    rock.temp = true; rock.launch(n.x, n.y, 260, 220, 'hunter', true); rock.targets = [];
    Game.objects.push(rock); Sfx.throw(); FX.shake = 3;
    h.startFight(); h.throwCd = 1.6;
    Game.bossBar = h;
    Game.setCheckpoint(p.x, p.y);
    Game.objective = 'Выстоять против охотника';
    Game.hint('Камень просвистел у виска! Уворачивайся (Shift).', 3);
  },
  onHunterDown() {
    Game.bossBar = null; Game.flags.hunterDown = true; this.step = 'hunterLoot';
    Game.after(0.8, () => Game.say([
      { who: 'Охотник', text: 'Кх... непользователь... меня?..' },
      { who: '', text: 'Он попытался подняться — и рухнул лицом в траву. Без сознания.' },
    ], () => { Game.objective = 'Обыскать сумку охотника (держи Space)'; }));
  },
  lootHunter() {
    const v = this.p.inv;
    v.scroll = true; v.crystals += 2; Game.stats.crystals += 2; Game.flags.hunterLooted = true; Sfx.pick();
    Game.say([
      { who: '', text: 'В сумке: два кристалла — видно, с прошлых охот — и обрывок свитка в пятнах копоти.' },
      { who: 'Я', text: 'Буквы... Половина смазана. Читать буду потом, при свете.' },
    ], () => {
      this.step = 'afterHunter';
      Game.objective = 'Идти дальше на восток';
      Game.hint('Свиток лежит в вещах (Enter). Открыть его можно когда угодно.', 4.5);
    });
  },
  readScroll() {
    Game.reader = {
      title: 'обрывок', page: 0,
      pages: [
        '…кристалл ███ не всякий. Сырой ~помнит~ прежнего ~хозяина~ и ~держится~ за него. ██████ вложишь такой в себя — ~ударит~ силой, ~либо~ ███████ и отравит нутро, ~либо~ ██ рассудок. Чем крупнее камень ██████ тем вернее.',
        '…сперва ~очистить~. ██ выдержать в ~противояд~██ …после ~смазать~ ~мазью~ ██ первой ступени. Без ~мази~ ████ почти нет ██████████',
        '…разрез ███ и держать, пока не ~срастётся~ с ~жилами~. ~Боль~ — верный знак. Если ~боли~ нет — ████ не принял тебя, ~резать~ снова, в другом ~месте~ ██████',
        '…питать. ~Всегда~ питать. Приложить ~источник~ и ██████ потянуть в себя. Иначе ~камень~ ████ и заберёт ~руку~, а с ней и ██████',
        '…первым даётся ~выброс~. ███████ прочее — после, у тех, кто ~выжил~. ██████████',
      ],
      onClose: () => Game.once('scrollRead', () => Game.say([
        { who: 'Я', text: 'Половина слов смазана... Но ясно одно: кристалл можно вложить в себя. И половина тех, кто пробовал, сдохла.' },
        { who: 'Я', text: 'Нужны мази, противоядие и кто-то, кто это уже делал. В лесу я такого не найду.' },
      ])),
    };
  },

  // ---------- Смерть, загрузка, покадровые триггеры ----------
  onRespawn() {
    const h = Game.tags.hunter;
    if (World.name === 'forest' && this.step === 'hunterFight' && h && h.alive) {
      h.dropLifted(); Object.assign(h, { x: h.home.x, y: h.home.y, hp: h.maxHp, kvx: 0, kvy: 0, state: 'wait' });
      Game.after(1.2, () => h.startFight());
      Game.after(0.1, () => Game.hint('Охотник: «Ещё хочешь?»', 2));
    }
    if (World.name === 'slums' && this.step === 'flee') {
      for (const c of Game.npcs) if (c.group === 'flee') { c.reset(); c.state = 'idle'; Game.after(1.2, () => c.startChase()); }
    }
    return false;
  },
  onLoad() {
    if (Game.flags.chapterEnd) Game.objective = 'Глава 1 пройдена. Хижина — твоя. Дальше будет Глава 2.';
    if (World.name === 'forest') {
      const h = Game.tags.hunter, j = Game.tags.bigJumper;
      if (Game.flags.hunterScene && j) { Game.enemies = Game.enemies.filter(e => e !== j); }
      if (h) {
        if (Game.flags.hunterDown) { h.alive = false; h.dead = true; h.state = 'down'; h.looted = !!Game.flags.hunterLooted; }
        else if (Game.flags.hunterMet) { h.startFight(); Game.bossBar = h; }
      }
    }
    this.objectives();
  },

  update(dt) {
    const p = this.p;
    if (World.name === 'slums') {
      if (this.step === 'chase1') {
        const hide = Game.tags.hideout;
        const near = Game.npcs.some(c => c.group === 'chase1' && c.active && dist(c.x, c.y, p.x, p.y) < 70);
        if (dist(p.x, p.y, hide.x, hide.y) < 26 && !near) this.endChase1();
      }
      if (this.step === 'sneak' && dist(p.x, p.y, Game.tags.homeFront.x, Game.tags.homeFront.y) < 22) this.ruinScene();
      if (this.step === 'flee' && p.x > 58.2 * TS) this.enterForest();
      if (Game.flags.ruined && rnd() < 0.25) FX.parts.push({ x: rrange(3, 7) * TS, y: rrange(33, 35) * TS, vx: rrange(-5, 5), vy: -rrange(10, 25), life: 1.2, max: 1.2, color: rnd() < 0.5 ? '#ff8030' : '#555', size: 1 });
      return;
    }
    if (World.name !== 'forest') return;
    if (p.x > 58 * TS && Game.tags.firstJumper && Game.tags.firstJumper.alive)
      Game.once('jumperBanner', () => { Game.showBanner('КОСТЯНОЙ ПРЫГУН', 'зверь силы', 2.5, '#ff8070'); Game.hint('Бьёт силой вокруг себя в прыжке и при приземлении. Круги показывают куда.', 5); });
    if (p.x > 71.5 * TS && !Game.flags.hunterScene && Game.tags.hunter) this.watchHunter();
    if (this.cutT !== undefined && Game.cutscene && Game.tags.bigJumper && Game.tags.bigJumper.alive) {
      this.cutT += dt;
      if (this.cutT > 18) Game.tags.bigJumper.takeHit(99, 'object', 0, 0);
    }
    if (!Game.flags.morning && p.x > 14.5 * TS) Game.once('blockHint', () => Game.hint('Дальше — завал и темень. Ночью в чащу лезть нельзя: сначала еда, костёр и сон.', 4));
    if (this.step === 'afterHunter' && p.x > 100 * TS) Game.once('hutHint', () => { Game.objective = 'Дойти до заброшенной хижины'; Game.hint('Впереди просвет между деревьями.', 3); });
  },
};
