'use strict';
// Глава 2: дорога в город, испытание у извозчика, ворота, гильдия, хутор и гринд рангов до E+.
// Сюжет идёт дальше в любой момент, а можно сидеть в угодьях, копить деньги и ранги.

const C2_PERSONAS = {
  roadHunter: { name: 'Раненый охотник', talk: [
    ['Раненый охотник', 'Не подходи... а, это мальчишка. Тьфу.'],
    ['Раненый охотник', 'Метатель достал. Шип в бедре, до города не дойду.'],
    ['Раненый охотник', 'Дальше по тракту стоит Ждан-извозчик. За деньги или за работу довезёт до города.'],
    ['Раненый охотник', 'В городе иди в гильдию. Без гильдии ты никто: ни заказов, ни защиты.'],
  ] },
  pilgrim: { name: 'Странник', talk: [
    ['Странник', 'Мир тебе. Ты тоже к городу?'],
    ['Странник', 'Говорят, в городе есть люди, что двигают камни, не касаясь. Гильдейские зовут их интегрированными.'],
    ['Странник', 'Я бы на такое не решился. Говорят, половина умирает в первую же ночь.'],
  ] },
  campGuest: { name: 'Попутчик', talk: [['Попутчик', 'Ждан человек честный. Но если его бросить в беде — запомнит.']] },
  queueA: { name: 'Горожанин', talk: [['Горожанин', 'Пошлина пять медяков. Стража с утра злая, не зли их.']] },
  queueB: { name: 'Женщина с корзиной', talk: [['Женщина с корзиной', 'У стены за поленницей есть щель. Мальчишки через неё лазают. Только стража ловит и порет.']] },
  cityDealer: { name: 'Скупщик', buys: true, talk: [['Скупщик', 'Хлам, шкуры, краденое — беру. Кристаллы тоже, но по своей цене.']] },
  crier: { name: 'Глашатай', talk: [
    ['Глашатай', 'Гильдия принимает новичков! Рейтинг, заказы на тварей, оплата в тот же день!'],
    ['Глашатай', 'Регистрация — десять медяков. Или рекомендация от честного человека.'],
  ] },
  cityGossip: { name: 'Сплетница', talk: [
    ['Сплетница', 'Слыхал? У южных ворот интегрированный разгрузил телегу, не притронувшись к мешкам.'],
    ['Сплетница', 'А потом упал и харкал чёрным. Говорят, кристалл у него истощился.'],
  ] },
  cityBoy: { name: 'Мальчишка', talk: [['Мальчишка', 'У кого бляха гильдии выше — тому и заказы жирнее. А с рангом F пускают в Дальнюю рощу.']] },
  cityHunter: { name: 'Охотник', talk: [
    ['Охотник', 'Новичок? Бери заказы на зайцев и травы, пока не подрастёшь.'],
    ['Охотник', 'И купи хоть стёганку. С голой спиной прыгун тебя с первого раза пополам сложит.'],
  ] },
  guildVeteran: { name: 'Ветеран гильдии', talk: [
    ['Ветеран гильдии', 'Ранги идут от G-минус до E-плюс, дальше — уже другие разговоры.'],
    ['Ветеран гильдии', 'С рангом F-минус пускают в Дальнюю рощу. С E-минус — на Гнилые болота. Там и платят иначе.'],
  ] },
  guildHunter: { name: 'Охотница', talk: [['Охотница', 'Доска у стены. Бери до трёх заказов разом, выполняй, сдавай клерку.']] },
  tavernHunter: { name: 'Охотник у очага', talk: [
    ['Охотник у очага', 'Интегрированные? Есть такие. Кристалл в теле, сила в руке.'],
    ['Охотник у очага', 'Только сперва камень чистят. Сырой в себя сунешь — и всё, либо труп, либо безумец.'],
  ] },
  tavernDrunk: { name: 'Пьяный', talk: [['Пьяный', 'За т-твоё здоровье... и за тех, кто не вернулся из леса.']] },
  villageBoy: { name: 'Хуторской мальчишка', talk: [['Хуторской мальчишка', 'Кабаны снова поле роют! Дядька Мирон заплатит, если отгонишь.']] },
  herbwoman: { name: 'Знахарка', talk: [
    ['Знахарка', 'Колодец горчит, люди животами маются. Трава нужна, целебная.'],
    ['Знахарка', 'Принесёшь — отблагодарю. И Мирону скажи, что колодец мой.'],
  ] },
};

// Товары лавок
const SHOP_ITEMS = {
  armorer: [
    { kind: 'weapon', id: 'shortsword' }, { kind: 'weapon', id: 'cleaver' }, { kind: 'weapon', id: 'huntblade' },
    { kind: 'armor', id: 'quilted' }, { kind: 'armor', id: 'leather' }, { kind: 'armor', id: 'mail' },
    { kind: 'knives', name: 'Метательные ножи ×5', price: 20, rank: 'G-' },
  ],
  cityHealer: [
    { kind: 'herbs', name: 'Целебная трава', price: 4, rank: 'G-' },
    { kind: 'salve0', name: 'Мазь нулевой ступени', price: 15, rank: 'G-' },
  ],
};

const C2 = {
  get p() { return Game.player; },
  get step() { return Game.flags.c2step; },
  set step(v) { Game.flags.c2step = v; },

  start() {
    Game.flags.chapter = 2; this.step = 'road';
    Game.showBanner('ГЛАВА 2', 'Дорога в город', 3.5, '#e0c080');
    Game.after(0.8, () => Game.say([
      { who: '', text: 'Тракт нашёлся к полудню: две колеи, разбитые телегами.' },
      { who: 'Я', text: 'Город. Там гильдии, лекари, мази. И люди, которые знают про кристаллы.' },
    ], () => { Game.objective = 'Идти по тракту на восток'; Game.save(); }));
  },

  // =====================================================================
  //   Стоянка извозчика: помочь можно только до следующего сохранения
  // =====================================================================
  campBeasts: [['spiker', 30, 9], ['spiker', 34, 19], ['spiker', 9, 20], ['jumper', 27, 6], ['thrower', 38, 14]],

  onSceneLoad(name) {
    const F = Game.flags;
    if (name === 'camp') {
      if (!F.campCleared && !F.carterMissed && !F.ridePaid) {
        this.campBeasts.forEach(([kind, tx, ty], i) => {
          const s = [kind, tx, ty, { lvl: 3 }]; s.id = `camp:beast:${i}`;
          if (Game.removed.has(s.id)) return;
          const e = Game.spawn(s); if (e) e.campBeast = true;
        });
      }
      if (!F.carterMet) {
        F.carterMet = true; this.step = 'carter';
        Game.after(0.5, () => Game.say([
          { who: 'Ждан', text: 'Эй! Ты! Помоги, Христом богом! Твари у телеги, лошадь рвут!' },
          { who: 'Я', text: '(про себя) Пятеро. Шипогрызы, прыгун и метатель. Один нож против этого...' },
          { who: '', text: 'Можно ввязаться сейчас. А можно отойти к костру на тракте и переждать.' },
        ], () => {
          Game.objective = 'Помочь Ждану отбиться — или уйти к костру на тракте';
          Game.hint('Помочь можно только сейчас. После отдыха у костра будет поздно.', 5);
        }));
      }
      if (F.carterMissed && !F.missedSeen) {
        F.missedSeen = true;
        Game.after(0.5, () => Game.say([
          { who: '', text: 'Стоянка разворочена. Телега на боку, лошадь хромает. Ждан перевязывает руку.' },
          { who: 'Ждан', text: 'А, это ты. Смотрел, как меня жрут, и ушёл греться.' },
          { who: 'Ждан', text: 'Довезу. Но за плату — и ни медяком меньше.' },
        ], () => { Game.objective = 'Заплатить Ждану за проезд'; }));
      }
    }
    if (name === 'gate' && ['carter', 'ride'].includes(this.step)) { this.step = 'gate'; Game.objective = 'Попасть в город'; }
    if (name === 'city' && this.step === 'gate') {
      this.step = 'guild';
      Game.showBanner('ГОРОД', 'стены, а не деревья', 3, '#bff8ff');
      Game.objective = 'Найти гильдию и записаться';
      Game.save();
    }
    if (name === 'grove') Game.once('groveIntro', () => Game.showBanner('ДАЛЬНЯЯ РОЩА', 'звери силы 5–7 уровня', 3, '#ff9080'));
    if (name === 'marsh') Game.once('marshIntro', () => Game.showBanner('ГНИЛЫЕ БОЛОТА', 'звери силы 8–11 уровня', 3, '#ff9080'));
    if (name === 'village') Game.once('villageIntro', () => Game.showBanner('ХУТОР', 'у хуторян свои заботы', 2.5, '#e0c080'));
  },

  // Сохранение закрывает окно помощи: кто ушёл к костру, тот опоздал
  beforeSave() {
    const F = Game.flags;
    if (F.carterMet && !F.campCleared && !F.ridePaid && !F.carterMissed) {
      F.carterMissed = true;
      Game.removed.add('camp:beast:all');
    }
  },
  onRest() {
    const F = Game.flags;
    if (F.carterMissed && !F.missedToldRest) {
      F.missedToldRest = true;
      Game.say([
        { who: '', text: 'Ночью со стороны стоянки долго доносились крики, ржание и хруст.' },
        { who: '', text: 'К утру всё стихло.' },
      ], () => { Game.objective = 'Вернуться на стоянку'; });
    }
  },

  carterTalk() {
    const v = this.p.inv, F = Game.flags;
    if (v.quest.letter && Quests.taken('letter')) {
      v.quest.letter = 0; Quests.state('letter').found = true; Sfx.pick();
      Game.say([{ who: 'Ждан', text: 'Письмо из гильдии? Добро. Скажи клерку, что дошло.' }]);
      return;
    }
    if (F.ridePaid) { Game.say([{ who: 'Ждан', text: F.carterFriend ? 'Спасибо тебе ещё раз, малец. Если что — я за тебя слово скажу.' : 'Садись и не пинай мешки.' }]); return; }
    if (!F.campCleared && !F.carterMissed) {
      const left = Game.enemies.filter(e => e.alive && e.campBeast).length;
      Game.say([{ who: 'Ждан', text: left ? `Не до разговоров! Их ещё ${left}!` : 'Ты... ты их всех?..' }]);
      return;
    }
    if (F.carterMissed) {
      Game.choose('Ждан', 'Три кристалла или двадцать пять медяков. Выбирай.', [
        { label: 'Отдать три кристалла', fn: () => {
          if (v.crystals < 3) { Game.say([{ who: 'Ждан', text: 'Нет кристаллов — нет дороги.' }]); return; }
          v.crystals -= 3; F.ridePaid = true; Sfx.coin(); this.rideReady('Ладно. Садись.');
        } },
        { label: 'Отдать двадцать пять медяков', fn: () => {
          if (v.coins < 25) { Game.say([{ who: 'Ждан', text: 'Двадцать пять. Считать умеешь?' }]); return; }
          v.coins -= 25; F.ridePaid = true; Sfx.coin(); this.rideReady('Ладно. Садись.');
        } },
        { label: 'Уйти', fn: () => { } },
      ]);
    }
  },
  rideReady(text) {
    this.step = 'ride';
    Game.say([{ who: 'Ждан', text }], () => {
      Game.objective = 'Ехать к городским воротам: на восток';
      Game.save();
    });
  },

  // =====================================================================
  //   Ворота, гильдия, таверна
  // =====================================================================
  talk(n) {
    switch (n.role) {
      case 'carter': this.carterTalk(); return true;
      case 'gateGuardA': case 'gateGuardB': this.guardTalk(); return true;
      case 'guildClerk': this.clerkTalk(); return true;
      case 'barkeep': this.barkeepTalk(); return true;
      case 'armorer': this.shop('armorer', 'Оружейник', 'Сталь, кожа, кольчуга. Что по рангу — то и продам.'); return true;
      case 'cityHealer': this.shop('cityHealer', 'Лекарь', 'Трава и мазь нулевой ступени. Первую не держу — дорогая.'); return true;
      case 'farmer': this.farmerTalk(); return true;
      default: return false;
    }
  },

  guardTalk() {
    const v = this.p.inv, F = Game.flags;
    if (F.inCity) { Game.say([{ who: 'Стражник', text: 'Проходи, не задерживай.' }]); return; }
    const choices = [
      { label: 'Заплатить пошлину (5 медяков)', fn: () => {
        if (v.coins < 5) { Game.say([{ who: 'Стражник', text: 'Пять медяков. Считать умеешь?' }]); return; }
        v.coins -= 5; Sfx.coin(); this.enterCity('Проходи. И не шали в городе.');
      } },
    ];
    if (F.carterFriend) choices.push({ label: 'Сказать, что я от Ждана', fn: () => this.enterCity('Ждан за тебя поручился? Ладно. Проходи, малец.') });
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose('Стражник', 'Пошлина пять медяков. Оружие в ножнах.', choices);
  },
  enterCity(text) {
    Game.flags.inCity = true;
    for (let y = 12; y <= 14; y++) World.set(33, y, ':');
    Game.say([{ who: 'Стражник', text }], () => { Game.objective = 'Войти в город'; });
  },

  clerkTalk() {
    const v = this.p.inv, F = Game.flags;
    if (!F.guildMember) {
      const choices = [{ label: 'Записаться (10 медяков)', fn: () => {
        if (v.coins < 10) { Game.say([{ who: 'Клерк', text: 'Десять. Приходи, когда будут.' }]); return; }
        v.coins -= 10; this.register();
      } }];
      if (F.carterFriend) choices.push({ label: 'Сослаться на Ждана', fn: () => this.register(true) });
      choices.push({ label: 'Уйти', fn: () => { } });
      Game.choose('Клерк', 'Гильдия охотников. Запись — десять медяков. Будешь?', choices);
      return;
    }
    const ready = Quests.active('guild').filter(id => Quests.ready(id));
    const choices = ready.map(id => ({ label: `Сдать: ${QUEST_DEFS[id].name} (+${QUEST_DEFS[id].coins})`, fn: () => {
      Quests.complete(id); Game.save();
      Game.say([{ who: 'Клерк', text: 'Принято. Отметил в книге. Держи плату.' }], () => this.afterQuest());
    } }));
    choices.push({ label: 'Спросить про рейтинг', fn: () => {
      const next = Quests.nextRankRep();
      Game.say([{ who: 'Клерк', text: `Рейтинг ${Quests.rank()}, репутация ${Quests.rep()}.` + (next !== null ? ` До следующего ранга — ${next - Quests.rep()}.` : ' Выше в этой гильдии не бывает.') }]);
    } });
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose('Клерк', ready.length ? 'Сдаёшь заказ?' : 'Чего тебе?', choices);
  },
  register(byFriend) {
    Object.assign(Game.flags, { guildMember: true, rank: 'G-', rep: 0 });
    this.step = 'orders'; Sfx.crystal();
    Game.say([
      { who: 'Клерк', text: byFriend ? 'Ждан ручается? Ладно, запишу без взноса.' : 'Записал. Имя внесено в книгу.' },
      { who: 'Клерк', text: 'Рейтинг G-минус. Доска у стены. Больше трёх заказов разом не бери.' },
      { who: 'Я', text: '(про себя) Впервые в жизни меня куда-то записали.' },
    ], () => {
      Game.showBanner('РАНГ G-', 'гильдия охотников', 3, '#bff8ff');
      Game.objective = 'Взять заказ на доске и выполнить его';
      Game.save();
    });
  },
  afterQuest() {
    if (Quests.totalDone() >= 3 && this.step === 'orders') {
      this.step = 'rumor';
      Game.objective = 'Сюжет: расспросить в таверне об интегрированных · или дальше брать заказы';
      Game.hint('Три заказа сданы. В таверне за кружкой языки развязываются.', 4.5);
    } else if (this.step === 'orders') Game.objective = `Сдать заказы гильдии: ${Quests.totalDone()}/3`;
  },

  // ---------- Доска заказов ----------
  board(giver = 'guild') {
    if (giver === 'guild' && !Game.flags.guildMember) { Game.say([{ who: '', text: 'Доска заказов. Сначала надо записаться у клерка.' }]); return; }
    const act = Quests.active(giver), choices = [];
    if (act.length < 3) for (const id of Quests.offers(giver).slice(0, 7)) {
      const d = QUEST_DEFS[id];
      choices.push({ label: `[${d.rank}] ${d.name} — ${d.coins}`, fn: () => {
        Quests.take(id);
        Game.say([{ who: '', text: d.desc }], () => { Game.objective = Quests.line(id); });
      } });
    }
    if (act.length) choices.push({ label: `Мои заказы (${act.length}/3)`, fn: () => Game.say(act.map(id => ({ who: '', text: `${Quests.line(id)}. ${QUEST_DEFS[id].desc}` }))) });
    choices.push({ label: 'Отойти', fn: () => { } });
    const head = giver === 'guild' ? `Рейтинг ${Quests.rank()} · репутация ${Quests.rep()}` : 'Хуторские просьбы';
    Game.choose('', act.length >= 3 ? `${head}. Сначала сдай взятые заказы.` : head, choices);
  },

  farmerTalk() {
    const ready = Quests.active('village').filter(id => Quests.ready(id));
    const choices = ready.map(id => ({ label: `Сдать: ${QUEST_DEFS[id].name} (+${QUEST_DEFS[id].coins})`, fn: () => {
      Quests.complete(id); Game.save();
      Game.say([{ who: 'Мирон', text: 'Вот спасибо! Держи, чем богаты.' }]);
    } }));
    choices.push({ label: 'Спросить, чем помочь', fn: () => this.board('village') });
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose('Мирон', 'Охотник? Работы на хуторе хватает.', choices);
  },

  // ---------- Лавки ----------
  shop(key, who, greet) {
    const p = this.p, v = p.inv, rank = Quests.rankIndex();
    const choices = [];
    for (const it of SHOP_ITEMS[key]) {
      const def = it.kind === 'weapon' ? WEAPONS[it.id] : it.kind === 'armor' ? ARMORS[it.id] : it;
      const owned = (it.kind === 'weapon' && p.gear.weapon === it.id) || (it.kind === 'armor' && p.gear.armor === it.id);
      const locked = RANKS.indexOf(def.rank) > rank;
      const label = `${def.name} — ${def.price}` + (owned ? ' (надето)' : locked ? ` (ранг ${def.rank})` : '');
      choices.push({ label, fn: () => {
        if (owned) { Game.say([{ who, text: 'Это уже на тебе.' }]); return; }
        if (locked) { Game.say([{ who, text: `Без бляхи ранга ${def.rank} не продам. Гильдия не велит.` }]); return; }
        if (v.coins < def.price) { Game.say([{ who, text: `${def.price} медяков. У тебя ${v.coins}.` }]); return; }
        v.coins -= def.price; Sfx.coin();
        if (it.kind === 'weapon') p.gear.weapon = it.id;
        else if (it.kind === 'armor') p.gear.armor = it.id;
        else if (it.kind === 'knives') p.knives += 5;
        else if (it.kind === 'herbs') v.herbs++;
        else if (it.kind === 'salve0') v.salve0++;
        Game.say([{ who, text: it.kind === 'weapon' || it.kind === 'armor' ? `Носи. ${def.desc}` : 'Держи.' }]);
        Game.save();
      } });
    }
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose(who, `${greet} У тебя ${v.coins} медяков.`, choices);
  },

  barkeepTalk() {
    const choices = [{ label: 'Расспросить об интегрированных', fn: () => {
      if (this.step !== 'rumor' && !Game.flags.c2done) { Game.say([{ who: 'Трактирщик', text: 'Ты сперва себя покажи, новичок. Сдай пару заказов гильдии — тогда и поговорим.' }]); return; }
      Game.say([
        { who: 'Трактирщик', text: 'Интегрированные? Есть один. Ходит к лекарю за мазью первой ступени.' },
        { who: 'Трактирщик', text: 'Молчаливый, в перчатке на левой руке. Живёт за старой мельницей, к северу.' },
        { who: 'Трактирщик', text: 'Берёт учеников. Правда, ученики у него долго не живут.' },
        { who: 'Я', text: '(про себя) Мазь. Противоядие. Человек, который умеет. Значит, туда.' },
      ], () => this.finish());
    } }, { label: 'Уйти', fn: () => { } }];
    Game.choose('Трактирщик', 'Комната — у очага, отдых бесплатно для гильдейских. Чего налить?', choices);
  },
  finish() {
    if (Game.flags.c2done) return;
    Game.flags.c2done = true;
    Game.showBanner('КОНЕЦ ГЛАВЫ 2', 'дальше — Глава 3: первая интеграция', 4, '#bff8ff');
    Game.objective = 'Глава 2 пройдена. Заказы, угодья, роща и болота остаются открытыми.';
    Game.save();
  },

  onKill(e) {
    Quests.onKill(e);
    const F = Game.flags;
    if (e.campBeast && !F.campCleared) {
      const left = Game.enemies.filter(x => x.alive && x.campBeast).length;
      if (!left) {
        F.campCleared = true; F.ridePaid = true; F.carterFriend = true;
        Game.after(1, () => Game.say([
          { who: 'Ждан', text: 'Ты... пятерых? С одним ножом?' },
          { who: 'Я', text: 'Лошадь цела?' },
          { who: 'Ждан', text: 'Цела. Садись, довезу даром. И у ворот за тебя поручусь, и в гильдии.' },
        ], () => this.rideReady('Залезай. К воротам доедем засветло.')));
      } else Game.hint(`Тварей у телеги осталось: ${left}`, 2);
    }
  },

  // Строка цели показывает прогресс первого взятого заказа, пока сюжет не просит другого
  update() {
    const act = Quests.active();
    if (!act.length || !Game.flags.guildMember) return;
    const id = act[0], d = QUEST_DEFS[id];
    if (!Game.objective.startsWith(d.name)) return;
    const giver = d.giver === 'guild' ? 'сдать клерку' : 'сдать Мирону';
    Game.objective = Quests.ready(id) ? `${d.name} — готово, ${giver}` : Quests.line(id);
  },
};
