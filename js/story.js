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
    name: 'Кузнец',
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
      { who: 'Мать', text: 'Кх-кх... Вернулся? Ты поел хоть что-нибудь?' },
      { who: 'Отец', text: '(хрипло) Не суетись, мать. Хлеба нет третий день, вот и весь разговор.' },
      { who: 'Отец', text: 'Сходи на рынок. Наскреби на три буханки — тебе, ей и мне.' },
      { who: 'Я', text: 'Наскребу.' },
    ], () => {
      this.objectives();
      Game.hint('WASD — идти · Space — действие · Shift — рывок · J — нож · Enter — вещи', 6);
    }));
  },

  objectives() {
    if (this.busy() || Game.flags.chapter !== 0) return;
    const v = this.p.inv, F = Game.flags, home = Game.tags.homeFront;
    const toHome = () => { if (home) Game.waypoint = { x: home.x, y: home.y, label: 'дом' }; };
    Game.waypoint = null;
    if (!F.breadDone) {
      if (v.bread >= 3) { Game.objective = 'Отнести хлеб домой'; toHome(); }
      else Game.objective = `Купить три буханки у торговки: ${v.bread}/3 · медяков ${v.coins}/15`;
      return;
    }
    if (!F.medDone) {
      if (v.medicine) { Game.objective = 'Отнести лекарство матери'; toHome(); }
      else Game.objective = `Накопить на лекарство: ${v.coins}/20 медяков`;
      return;
    }
    if (!F.coinsGiven) { Game.objective = `Отдать отцу 5 медяков на хлеб (есть ${v.coins})`; toHome(); return; }
    Game.objective = 'На рынок: у богатого торговца на виду блестит вещица';
    const m = Game.tags.market; if (m) Game.waypoint = { x: m.x, y: m.y, label: 'рынок' };
  },

  // ---------- Разговоры ----------
  canTalk(n) { return !n.hidden && !this.busy(); },
  canEnter(to) {
    if (this.busy()) { Game.hint('Не сейчас!', 1.2); return false; }
    if (to === 'road' && !Game.flags.chapterEnd) { Game.hint('Сначала надо добраться до хижины и перевести дух.', 3); return false; }
    if (to === 'city' && !Game.flags.inCity) { Game.hint('Стража не пускает. Сначала договорись у ворот.', 3); return false; }
    if (to === 'gate' && !Game.flags.ridePaid) { Game.hint('Пешком до ворот далеко и опасно. Сначала — извозчик.', 3); return false; }
    if (to === 'grove' && Quests.rankIndex() < 3) { Game.hint('Егерь не пускает: в Дальнюю рощу — с ранга F- и выше.', 3); return false; }
    if (to === 'marsh' && Quests.rankIndex() < 6) { Game.hint('На Гнилые болота гильдия пускает только с ранга E-.', 3); return false; }
    return true;
  },
  canExit() { return true; },
  beforeSave() { C2.beforeSave(); },
  canLoot() { return !this.busy(); },
  showCone(w) { return Game.props.some(c => c instanceof Container && !c.used && c.owners && c.owners.includes(w.role)); },
  onTalkEnemy() { Game.hint('Он узнал меня!', 2); },

  talk(n) {
    if (C2.talk(n)) return;
    const P = PERSONAS[n.role] || C2_PERSONAS[n.role] || { name: 'Житель', rude: true, greet: 'Чего тебе?' };
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
    const v = this.p.inv, F = Game.flags;
    if (v.medicine && F.breadDone && !F.medDone) {
      v.medicine = 0; F.medDone = true; Sfx.pick();
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
      ], () => { this.objectives(); Game.save(); });
      return;
    }
    if (!F.breadDone) { Game.say([{ who: 'Мать', text: 'Не смотри ты так. Кх-кх... Само пройдёт.' }]); return; }
    Game.say([{ who: 'Мать', text: F.medDone ? '(спит, дышит ровно)' : 'Мне бы полегчало, да настойка дорогая...' }]);
  },

  talkFather() {
    const v = this.p.inv, F = Game.flags;
    // Хлеб домой
    if (!F.breadDone) {
      if (v.bread < 3) { Game.say([{ who: 'Отец', text: 'Три буханки, сынок. Больше нам и не съесть.' }]); return; }
      v.bread = 0; F.breadDone = true; Sfx.pick();
      Game.say([
        { who: 'Я', text: 'Держи. Три буханки.' },
        { who: 'Отец', text: 'Три?.. Откуда?' },
        { who: 'Я', text: 'Работал.' },
        { who: 'Отец', text: '...Молодец. Правда молодец.' },
        { who: 'Отец', text: 'Завтра сам выйду. Спина потерпит. Наскребу матери на лекарство.' },
        { who: 'Мать', text: 'Куда ты с такой спиной! Лежи уж...' },
        { who: 'Отец', text: 'Лежу, лежу.' },
        { who: 'Я', text: '(про себя) Лекарство. Двадцать медяков. Он не встанет. Значит, я.' },
      ], () => { this.objectives(); Game.save(); });
      return;
    }
    // Деньги на хлеб и подарок
    if (F.medDone && !F.coinsGiven) {
      if (v.coins < 5) { Game.say([{ who: 'Отец', text: 'Хлеба бы ещё. Пять медяков — и мы живём.' }]); return; }
      v.coins -= 5; F.coinsGiven = true; this.p.hasKnife = true; Sfx.coin();
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
          () => { this.objectives(); Game.save(); });
      });
      return;
    }
    if (!F.medDone) { Game.say([{ who: 'Отец', text: 'Двадцать медяков за настойку. Двадцать! Где их взять...' }]); return; }
    Game.say([{ who: 'Отец', text: 'Иди, сынок. Только к богатым не лезь — они не прощают.' }]);
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
    Game.waypoint = null; Game.flags.lostThem = false;
    Game.save();
    Game.objective = 'Оторваться от громил: скрыться из виду';
    Game.hint('Пока они тебя видят, прятаться бесполезно. Петляй за домами и заборами. Shift — рывок.', 5.5);
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
      Game.objective = 'Вернуться домой незаметно'; Game.save();
      Game.hint('Не попадайся в свет фонарей. Конус показывает, куда смотрят.', 4.5);
    });
  },

  onSpotted() { if (this.step === 'sneak') Game.hint('Заметили!', 1.5); },
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
    const lines = [
      { who: '', text: 'Дверь сорвана с петель. Стена проломлена насквозь.' },
      { who: 'Я', text: 'Мама?.. Отец?..' },
      { who: '', text: 'Внутри всё перевёрнуто. Пусто. Только тёмные пятна на полу.' },
    ];
    if (!this.p.hasKnife) {
      this.p.hasKnife = true;
      lines.push({ who: '', text: 'Под перевёрнутой лежанкой блеснуло железо. Отцовский нож в потёртых ножнах.' });
      lines.push({ who: 'Я', text: 'Он его прятал. Всю жизнь прятал — а достать не успел.' });
      Game.after(0.1, () => Game.showBanner('НОЖ', 'отцовский · J', 2.5, '#e8e0d0'));
    }
    Game.say(lines, () => {
      const col = Game.addChaser(4, 35, { who: 'collector', group: 'flee', relentless: true, speed: 74, showCone: false, active: false });
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
  startFlee() {
    this.step = 'flee'; Game.focus(null);
    for (let y = 6; y <= 8; y++) World.set(59, y, '.');
    const col = Game.npcs.find(n => n.who === 'collector');
    col.home = tc(4, 37); col.active = true; col.startChase(); col.alertT = 1.2;
    for (const [x, y] of [[1, 40], [14, 38]]) {
      const t = Game.addChaser(x, y, { who: 'thug', group: 'flee', relentless: true, speed: 72, showCone: false });
      t.startChase(); t.alertT = 1.5;
    }
    Game.setCheckpoint(tc(4, 37).x, tc(4, 37).y);
    Game.waypoint = { x: Game.tags.gate.x, y: Game.tags.gate.y, label: 'ворота' };
    Game.objective = 'Бежать из города — к восточным воротам'; Game.save();
    Game.hint('Бегом! Стрелка ведёт к воротам. Shift — рывок.', 4);
  },

  // =====================================================================
  //                        ГЛАВА 1. ЧЁРНЫЙ ЛЕС
  // =====================================================================
  // Завалы делят лес на этапы: дальше герой идёт, только пережив предыдущий
  gates: {
    g1: { x: 17, y0: 25, y1: 32 },
    g2: { x: 46, y0: 10, y1: 18 },
    g3: { x: 70, y0: 22, y1: 30 },
    g4: { x: 88, y0: 11, y1: 19 },
  },
  applyGates() {
    if (World.name !== 'forest') return;
    for (const k in this.gates) {
      const g = this.gates[k], open = !!Game.flags['open:' + k];
      for (let y = g.y0; y <= g.y1; y++) World.set(g.x, y, open ? '.' : 'O');
    }
    // На время боя с охотником поляна закрывается, чтобы звери не лезли в драку
    for (let y = 17; y <= 25; y++) World.set(74, y, Game.flags.arenaLock ? 'O' : '.');
  },
  openGate(k, msg) {
    Game.flags['open:' + k] = true; this.applyGates();
    FX.shake = 4; Sfx.thud();
    if (msg) Game.hint(msg, 4);
  },
  respawnWildlife() {
    for (const id of [...Game.removed]) if (/:(rabbit|boar):/.test(id)) Game.removed.delete(id);
  },

  enterForest() {
    this.step = 'night1'; Game.flags.chapter = 1; Game.waypoint = null;
    const p = this.p; p.hp = Math.max(2, Math.ceil(p.maxHp / 2)); p.stamina = p.maxStamina * 0.3;
    Game.enterScene('forest', null);
  },

  onSceneLoad(name) {
    C2.onSceneLoad(name);
    Quests.onSceneLoad();
    if (name === 'guild') {
      const b = Game.tags.board;
      if (b) Game.addSpot(b.x, b.y + 12, { r: 20, label: 'Space: доска заказов', fn: () => C2.board() });
    }
    if (name === 'road' && !Game.flags.chapter2Started) { Game.flags.chapter2Started = true; C2.start(); }
    if (name === 'slums') {
      if (Game.flags.ruined) this.applyRuin();
      if (Game.flags.dusk) World.tint = DUSK;
      if (this.step === 'flee') for (let y = 6; y <= 8; y++) World.set(59, y, '.');
    }
    if (name === 'forest') {
      this.applyGates();
      if (Game.flags.morning) World.tint = null;
      if (!Game.flags.forestIntro) {
        Game.flags.forestIntro = true;
        Game.showBanner('ГЛАВА 1', 'Чёрный лес', 3, '#bff8ff');
        Game.after(0.8, () => Game.say([
          { who: '', text: 'Я бежал, пока крики за спиной не утонули в шуме деревьев.' },
          { who: '', text: 'Чёрный лес. Сюда не суются даже громилы. Здесь живут твари.' },
          { who: 'Я', text: 'У меня только нож. И ночь впереди.' },
        ], () => {
          Game.objective = 'Поймать двух зайцев: 0/2';
          Game.hint('Сначала еда. Зайцы удирают быстрее меня — загоняй их к камням и деревьям.', 5);
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
      ], () => {
        Game.showBanner('КОНЕЦ ГЛАВЫ 1', 'дальше — Глава 2: дорога в город', 4, '#bff8ff');
        Game.objective = 'Глава 1 пройдена. Осмотрись в хижине, а потом — на восток, к тракту.';
        Game.save();
      }));
    }
  },

  // ---------- Костёр: обучение, привалы и ночёвки ----------
  canRest() {
    if (World.name !== 'forest') return true;
    if (this.step === 'night3') { Game.hint('Спать на пустой желудок — не уснёшь. Сначала поесть.', 3); return false; }
    if (this.step === 'night1' || this.step === 'night2') { Game.hint('Сначала еда и огонь.', 2.5); return false; }
    return true;
  },
  onCampfire(c, justLit) {
    if (justLit && this.step === 'night2') {
      this.step = 'night3';
      Game.objective = 'Пожарить мясо на костре и поесть';
      Game.hint('Space у костра — пожарить. Потом съесть: через вещи (Enter) или быструю кнопку E.', 5);
    }
    return false;
  },
  onAte() {
    if (this.step === 'night3') { this.step = 'night4'; Game.objective = 'Поспать у костра (Отдохнуть)'; Game.hint('Теперь можно и поспать. Space у костра — Отдохнуть.', 4); }
    if (this.step === 'restSpiker') { this.step = 'sleepSpiker'; Game.objective = 'Поспать у костра'; }
    if (this.step === 'restHunter') { this.step = 'sleepHunter'; Game.objective = 'Поспать у костра'; }
  },
  onRest() {
    C2.onRest();
    if (World.name !== 'forest') return;
    const p = this.p;
    if (this.step === 'night4') {
      Game.flags.morning = true; World.tint = null;
      this.openGate('g1');
      Game.say([
        { who: '', text: 'Я подбрасывал ветки до рассвета и вздрагивал от каждого хруста.' },
        { who: '', text: 'Утро. Раны затянулись, в животе тепло. Жить можно.' },
        { who: 'Я', text: 'Мяса надо впрок. Зайцы, кабаны — что попадётся.' },
      ], () => { this.step = 'hunt'; this.huntObjective(); Game.hint('Завал на тропе разобрал — дальше в лес дорога открыта.', 4); });
      return;
    }
    if (this.step === 'sleepSpiker') {
      this.respawnWildlife(); this.openGate('g2');
      Game.say([
        { who: 'Я', text: 'Эта тварь чуть не разорвала меня. Кабан... тоже мне кабан.' },
        { who: '', text: 'Я жарил мясо, грел руки и слушал лес. Под утро стало не так страшно.' },
        { who: 'Я', text: 'Живность вернулась к ручью. Значит, голодным не останусь.' },
      ], () => { this.step = 'toJumper'; Game.objective = 'Идти глубже в лес, на восток'; });
      return;
    }
    if (this.step === 'sleepHunter') {
      this.respawnWildlife(); this.openGate('g4');
      Game.say([
        { who: '', text: 'Я спал у чужого костра, положив нож под руку.' },
        { who: 'Я', text: 'Человек, который двигает камни взглядом. И я его свалил. Ножом.' },
        { who: 'Я', text: 'Значит, и это не предел.' },
      ], () => { this.step = 'deepForest'; Game.objective = 'Идти дальше в лес, на восток'; });
      return;
    }
    Game.say([{ who: '', text: 'Я перевёл дух у огня. Раны затянулись.' }]);
  },
  huntObjective() {
    const r = Math.min(Game.flags.rabbits || 0, 5), b = Math.min(Game.flags.boars || 0, 3);
    Game.objective = `Охота: зайцы ${r}/5 · кабаны ${b}/3`;
  },

  // ---------- Добыча ----------
  onKill(e) {
    C2.onKill(e);
    if (e instanceof Rabbit || e instanceof Boar) Game.once('firstAnimal', () => Game.hint('Держи Space у туши — разделать.', 2.5));
    if (e instanceof Rabbit) {
      Game.flags.rabbits = (Game.flags.rabbits || 0) + 1;
      if (this.step === 'night1') {
        if (Game.flags.rabbits >= 2) { this.step = 'night2'; Game.objective = 'Разжечь костёр на опушке'; Game.hint('Мясо есть. Теперь костёр: Space у кострища.', 4); }
        else Game.objective = `Поймать двух зайцев: ${Game.flags.rabbits}/2`;
      } else if (this.step === 'hunt') this.checkHunt();
    }
    if (e instanceof Boar) {
      Game.flags.boars = (Game.flags.boars || 0) + 1;
      if (this.step === 'hunt') this.checkHunt();
    }
    if (e instanceof Spiker && e.tag === 'firstSpiker') {
      this.step = 'restSpiker';
      Game.objective = 'Вернуться к костру: пожарить мясо и поспать';
      Game.hint('Сердце колотится. Надо к огню.', 3.5);
    }
    if (e.tag === 'firstJumper') {
      this.step = 'toHunter'; this.openGate('g3');
      Game.objective = 'Идти дальше на восток';
      Game.hint('Тварь размером с телёнка — и я её свалил. Дальше тропа свободна.', 4);
    }
  },
  checkHunt() {
    this.huntObjective();
    if ((Game.flags.rabbits || 0) >= 5 && (Game.flags.boars || 0) >= 3) {
      this.step = 'fourth';
      Game.objective = 'Добить четвёртого кабана в чаще';
      Game.hint('Мяса хватит. Говорят, там в чаще ходит ещё один кабан.', 4);
    }
  },
  onLoot(e) {
    if (e.loot.meat && !e.loot.crystals) Game.once('firstMeat', () => Game.hint('Сырое мясо. Пожарить на костре (Space у костра), потом съесть.', 4));
    if (e.loot.crystals) Game.once('firstCrystal', () => Game.say([
      { who: '', text: 'Под рёбрами твари — кристалл. Тёплый. Пульсирует, будто ещё живой.' },
      { who: 'Я', text: 'На рынке говорили: такие носят дворяне и купцы. Один такой — и лекарство, и еда на год...' },
      { who: 'Я', text: '...если там ещё есть кого лечить.' },
    ]));
  },
  onSpikerReveal() {
    Game.showBanner('ШИПОГРЫЗ', 'зверь силы', 2.5, '#ff8070');
    Game.once('spikerRevealHint', () => Game.hint('Это не кабан! Нож не берёт шкуру, а вплотную он отшвыривает. Уворачивайся и бей на передышке.', 5.5));
  },

  // ---------- Охотник: постановочная сцена и бой ----------
  watchHunter() {
    Game.flags.hunterScene = true;
    const h = Game.tags.hunter, j = Game.tags.bigJumper, p = this.p;
    p.kvx = p.kvy = 0; p.moving = false;
    Game.cutscene = true; Game.focus({ x: 81 * TS, y: 17 * TS });
    h.state = 'scene'; j.state = 'scene'; j.scene = true;
    Game.say([{ who: '', text: 'Впереди грохот и хруст костей. Я нырнул в кусты и замер.' }], () => this.hunterScene());
  },
  // Сцена идёт по расписанию: так она не зависит от случайностей боя
  hunterScene() {
    const h = Game.tags.hunter, j = Game.tags.bigJumper;
    const beat = (t, fn) => Game.after(t, fn);
    beat(0.2, () => j.sceneJump(h.x - 34, h.y + 10));
    beat(1.1, () => h.sceneThrow(j));
    beat(2.0, () => j.sceneJump(h.x + 30, h.y - 6));
    beat(2.9, () => h.sceneThrow(j));
    beat(3.8, () => j.sceneJump(h.x - 26, h.y - 12));
    beat(4.7, () => h.sceneThrow(j));
    beat(5.6, () => { j.sceneDie(); h.state = 'panting'; FX.shake = 6; });
    beat(6.6, () => { h.goal = { x: j.x - 12, y: j.y, done: () => { h.state = 'panting'; } }; });
    beat(8.6, () => { j.looted = true; j.loot.crystals = 0; Sfx.crystal(); FX.burst(j.x, j.y - 8, '#7cf0ff', 16, 60); });
    beat(10.0, () => this.hunterTalk());
  },
  hunterTalk() {
    const p = this.p;
    Game.say([
      { who: 'Охотник', text: '(тяжело дыша) Хватит прятаться. Я слышу, как ты сопишь в кустах.' },
      { who: '', text: 'Я вышел.' },
    ], () => {
      p.x = 76 * TS; p.y = 17 * TS + 10; p.lr = 'r'; p.face = { x: 1, y: 0 };
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
    // Поляну закрываем и усыпляем зверей: драка один на один
    Game.flags.arenaLock = true; this.applyGates();
    for (const e of Game.enemies) {
      if (e === h || !e.alive) continue;
      Object.assign(e, { x: e.home.x, y: e.home.y, state: 'idle', t: 3, sightSaved: e.sight, sight: 0 });
    }
    const rock = new Obj('rock', h.x + 6, h.y - 2), n = norm(p.x - rock.x, p.y - 18 - rock.y);
    rock.temp = true; rock.launch(n.x, n.y, 260, 220, 'hunter', true); rock.targets = [];
    Game.objects.push(rock); Sfx.throw(); FX.shake = 3;
    h.startFight(); h.throwCd = 1.6;
    Game.bossBar = h;
    Game.objective = 'Выстоять против охотника';
    Game.hint('Камень просвистел у виска! Такой снесёт половину меня. Уворачивайся (Shift).', 4.5);
  },
  onHunterDown() {
    Game.bossBar = null; Game.flags.hunterDown = true; this.step = 'hunterLoot';
    Game.flags.arenaLock = false; this.applyGates();
    for (const e of Game.enemies) if (e.sightSaved) { e.sight = e.sightSaved; e.sightSaved = 0; }
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
      this.step = 'restHunter';
      Game.objective = 'Развести костёр рядом, поесть и поспать';
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
    if (Game.flags.chapter === 2) C2.update();
    if (World.name === 'slums') {
      if (this.step === 'chase1') this.chaseUpdate(p);
      if (this.step === 'sneak' && dist(p.x, p.y, Game.tags.homeFront.x, Game.tags.homeFront.y) < 22) this.ruinScene();
      if (this.step === 'flee' && p.x > 58.2 * TS) this.enterForest();
      if (Game.flags.ruined && rnd() < 0.25) FX.parts.push({ x: rrange(3, 7) * TS, y: rrange(33, 35) * TS, vx: rrange(-5, 5), vy: -rrange(10, 25), life: 1.2, max: 1.2, color: rnd() < 0.5 ? '#ff8030' : '#555', size: 1 });
      return;
    }
    if (World.name !== 'forest') return;
    if (!Game.flags.morning && p.x > 14.5 * TS) Game.once('blockHint', () => Game.hint('Дальше завал и темень. Ночью в чащу лезть нельзя: сначала еда, костёр и сон.', 4.5));
    if (this.step === 'fourth' && p.x > 28 * TS) Game.once('fourthHint', () => Game.hint('Где-то здесь бродит четвёртый. Кабан как кабан... наверное.', 4));
    if (p.x > 58 * TS && Game.tags.firstJumper && Game.tags.firstJumper.alive)
      Game.once('jumperBanner', () => { Game.showBanner('КОСТЯНОЙ ПРЫГУН', 'зверь силы', 2.5, '#ff8070'); Game.hint('Бьёт силой вокруг себя в прыжке и при приземлении. Круги показывают куда.', 5); });
    if (p.x > 71.5 * TS && !Game.flags.hunterScene && Game.tags.hunter) this.watchHunter();
    if (this.step === 'deepForest' && p.x > 103 * TS) Game.once('hutSeen', () => {
      Game.objective = 'Зайти в хижину';
      Game.hint('Между деревьями — скат крыши. Заброшенная хижина.', 4);
      const d = Game.props.find(o => o.to === 'hut');
      if (d) Game.waypoint = { x: d.x, y: d.y, label: 'хижина' };
    });
  },
};
