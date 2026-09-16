'use strict';
// Глава 2: дорога в город, извозчик, ворота, гильдия и первые заказы.
// Почти каждую задачу можно решить деньгами, работой или хитростью.

const C2_PERSONAS = {
  roadHunter: { name: 'Раненый охотник', talk: [
    ['Раненый охотник', 'Не подходи... а, это мальчишка. Тьфу.'],
    ['Раненый охотник', 'Метатель достал. Шип в бедре, до города не дойду.'],
    ['Раненый охотник', 'Слушай. Дальше по тракту стоит Ждан-извозчик. Он за деньги или за работу довезёт до города.'],
    ['Раненый охотник', 'В городе иди в гильдию. Без гильдии ты никто: ни заказов, ни защиты.'],
  ], gives: 0 },
  pilgrim: { name: 'Странник', talk: [
    ['Странник', 'Мир тебе. Ты тоже к городу?'],
    ['Странник', 'Говорят, в городе есть люди, что двигают камни, не касаясь. Гильдейские зовут их интегрированными.'],
    ['Странник', 'Я бы на такое не решился. Говорят, половина умирает в первую же ночь.'],
  ] },
  campGuest: { name: 'Попутчик', talk: [
    ['Попутчик', 'Ждан торгуется, но человек честный. Меня третий раз везёт.'],
    ['Попутчик', 'Если денег нет — предложи работу. Он вечно ноет про тварей вокруг стоянки.'],
  ] },
  queueA: { name: 'Горожанин', talk: [['Горожанин', 'Пошлина пять медяков. Стража с утра злая, не зли их.']] },
  queueB: { name: 'Женщина с корзиной', talk: [
    ['Женщина с корзиной', 'У стены за поленницей есть щель. Мальчишки через неё лазают.'],
    ['Женщина с корзиной', 'Только стража поймает — выпорет и выкинет обратно.'],
  ] },
  cityDealer: { name: 'Скупщик', buys: true, talk: [['Скупщик', 'Хлам, шкуры, краденое — беру. Кристаллы тоже, но по своей цене.']] },
  crier: { name: 'Глашатай', talk: [
    ['Глашатай', 'Гильдия принимает новичков! Рейтинг G, заказы на тварей, оплата в тот же день!'],
    ['Глашатай', 'Регистрация — десять медяков. Или рекомендация от честного человека.'],
  ] },
  cityGossip: { name: 'Сплетница', talk: [
    ['Сплетница', 'Слыхал? У южных ворот интегрированный разгрузил телегу, не притронувшись к мешкам.'],
    ['Сплетница', 'А потом упал и харкал чёрным. Говорят, кристалл у него истощился.'],
  ] },
  cityBoy: { name: 'Мальчишка', talk: [['Мальчишка', 'Дядьки из гильдии ходят с бляхами. У кого бляха выше — тому заказы жирнее.']] },
  cityHunter: { name: 'Охотник', talk: [
    ['Охотник', 'Новичок? Бери заказы на зайцев и травы, пока не подрастёшь.'],
    ['Охотник', 'На прыгуна с одним ножом не лезь. Я видел, как таких хоронили. Точнее, не хоронили — нечего было.'],
  ] },
  guildVeteran: { name: 'Ветеран гильдии', talk: [
    ['Ветеран гильдии', 'Рейтинг растёт от выполненных заказов. Репутация — это всё, что у нас есть.'],
    ['Ветеран гильдии', 'И да: гильдия не спрашивает, откуда у тебя кристаллы. Но и не защитит, если спросит кто посерьёзнее.'],
  ] },
  guildHunter: { name: 'Охотница', talk: [
    ['Охотница', 'Доска слева. Берёшь заказ, выполняешь, возвращаешься к стойке.'],
    ['Охотница', 'Мясо и травы — самое скучное. Зато живой.'],
  ] },
  tavernHunter: { name: 'Охотник у очага', talk: [
    ['Охотник у очага', 'Интегрированные? Есть такие. Кристалл в теле, сила в руке.'],
    ['Охотник у очага', 'Только сперва камень чистят. Сырой в себя сунешь — и всё, либо труп, либо безумец.'],
    ['Охотник у очага', 'Чистят противоядием и мазью первой ступени. Мазь дорогая, у лекарей бывает редко.'],
  ] },
  tavernDrunk: { name: 'Пьяный', talk: [['Пьяный', 'За т-твоё здоровье... и за тех, кто не вернулся из леса.']] },
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
      { who: 'Я', text: 'Пойду по колее. Кто-нибудь да подвезёт.' },
    ], () => { Game.objective = 'Идти по тракту на восток, к стоянке извозчика'; Game.save(); }));
  },

  onSceneLoad(name) {
    if (name === 'camp' && this.step === 'road') { this.step = 'carter'; Game.objective = 'Договориться с извозчиком о проезде'; }
    if (name === 'gate' && ['carter', 'ride'].includes(this.step)) { this.step = 'gate'; Game.objective = 'Попасть в город'; }
    if (name === 'city' && this.step === 'gate') {
      this.step = 'guild';
      Game.showBanner('ГОРОД', 'наконец-то стены, а не деревья', 3, '#bff8ff');
      Game.objective = 'Найти гильдию и записаться (десять медяков или рекомендация)';
      Game.save();
    }
  },

  // ---------- Разговоры главы 2 ----------
  talk(n) {
    const v = this.p.inv, F = Game.flags;
    switch (n.role) {
      case 'carter': return this.carterTalk(n), true;
      case 'gateGuardA': case 'gateGuardB': return this.guardTalk(n), true;
      case 'guildClerk': return this.clerkTalk(n), true;
      case 'barkeep': return this.barkeepTalk(n), true;
      default: return false;
    }
  },

  carterTalk() {
    const v = this.p.inv, F = Game.flags;
    if (F.ridePaid) { Game.say([{ who: 'Ждан', text: 'Садись в телегу, довезу до ворот. Только мешки не пинай.' }]); return; }
    const choices = [];
    choices.push({ label: 'Поговорить', fn: () => Game.say([
      { who: 'Ждан', text: 'Мальчишка? Один? Из леса?' },
      { who: 'Я', text: 'Мне в город.' },
      { who: 'Ждан', text: 'Всем в город. Плата — три кристалла или работа. Или иди пешком, дело твоё.' },
    ]) });
    choices.push({ label: 'Заплатить три кристалла', fn: () => {
      if (v.crystals < 3) { Game.say([{ who: 'Ждан', text: 'Три. Не два, не «потом». Иди добудь.' }]); return; }
      v.crystals -= 3; F.ridePaid = true; Sfx.coin();
      Game.say([{ who: 'Ждан', text: 'Вот это разговор. Тёплые, хорошие камни.' },
                { who: 'Ждан', text: 'Залезай. К воротам доедем засветло.' }], () => this.rideReady());
    } });
    choices.push({ label: 'Предложить работу: отогнать тварей', fn: () => {
      if (F.campCleared) {
        F.ridePaid = true; F.carterFriend = true;
        Game.say([{ who: 'Ждан', text: 'Слышал визг. Ты их... сам?' }, { who: 'Я', text: 'Сам.' },
                  { who: 'Ждан', text: 'Ну, малец. Везу бесплатно. И слово за тебя замолвлю у ворот.' }], () => this.rideReady());
        return;
      }
      F.campTask = true;
      Game.say([{ who: 'Ждан', text: 'Вокруг стоянки шипогрызы кружат. Двое. Лошадь ночами трясётся.' },
                { who: 'Ждан', text: 'Отвадишь — довезу даром. И словечко за тебя замолвлю.' }],
        () => { Game.objective = 'Убить двух шипогрызов у стоянки'; });
    } });
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose('Ждан', F.campTask ? 'Ну что, разобрался с тварями?' : 'Чего тебе, малец?', choices);
  },
  rideReady() {
    this.step = 'ride';
    Game.objective = 'Доехать до города: идти на восток';
    Game.hint('Телега трясётся, но идти самому было бы дольше.', 3.5);
    Game.save();
  },

  guardTalk() {
    const v = this.p.inv, F = Game.flags;
    if (F.inCity) { Game.say([{ who: 'Стражник', text: 'Проходи, не задерживай.' }]); return; }
    const choices = [];
    choices.push({ label: 'Поговорить', fn: () => Game.say([
      { who: 'Стражник', text: 'Пошлина — пять медяков. Оружие в ножнах, руки на виду.' },
      { who: 'Стражник', text: 'Нет денег — нет города. Правила не я придумал.' },
    ]) });
    choices.push({ label: 'Заплатить пошлину (5 медяков)', fn: () => {
      if (v.coins < 5) { Game.say([{ who: 'Стражник', text: 'Пять медяков. Считать умеешь?' }]); return; }
      v.coins -= 5; Sfx.coin(); this.enterCity('Стражник', 'Проходи. И не шали в городе.');
    } });
    if (F.carterFriend) choices.push({ label: 'Сказать, что я от Ждана', fn: () => {
      this.enterCity('Стражник', 'Ждан за тебя поручился? Ладно. Проходи, малец.');
    } });
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose('Стражник', 'Куда прёшь?', choices);
  },
  enterCity(who, text) {
    Game.flags.inCity = true;
    for (let y = 12; y <= 14; y++) World.set(33, y, ':');
    Game.say([{ who, text }], () => { Game.objective = 'Войти в город'; Game.hint('Шлагбаум поднят. Ворота на востоке.', 3); });
  },

  clerkTalk() {
    const v = this.p.inv, F = Game.flags;
    if (!F.guildMember) {
      const choices = [];
      choices.push({ label: 'Поговорить', fn: () => Game.say([
        { who: 'Клерк', text: 'Гильдия охотников. Регистрация — десять медяков.' },
        { who: 'Клерк', text: 'Получишь рейтинг G-минус. Заказы на доске, оплата после сдачи.' },
      ]) });
      choices.push({ label: 'Записаться (10 медяков)', fn: () => {
        if (v.coins < 10) { Game.say([{ who: 'Клерк', text: 'Десять. Приходи, когда будут.' }]); return; }
        v.coins -= 10; this.register();
      } });
      if (F.carterFriend) choices.push({ label: 'Сослаться на Ждана', fn: () => this.register(true) });
      choices.push({ label: 'Уйти', fn: () => { } });
      Game.choose('Клерк', 'Записываться будешь?', choices);
      return;
    }
    // Сдача заказов
    const ready = Quests.active().filter(id => Quests.ready(id));
    const choices = ready.map(id => ({ label: `Сдать: ${QUEST_DEFS[id].name}`, fn: () => {
      Quests.complete(id);
      Game.say([{ who: 'Клерк', text: 'Принято. Отметил в книге. Держи плату.' }], () => this.afterQuest());
    } }));
    choices.push({ label: 'Спросить про рейтинг', fn: () => Game.say([
      { who: 'Клерк', text: `Твой рейтинг — ${Quests.rank()}. Репутация — ${Quests.rep()}.` },
      { who: 'Клерк', text: 'Пять единиц репутации — и откроются заказы рангом выше.' },
    ]) });
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose('Клерк', ready.length ? 'Сдаёшь заказ?' : 'Чего тебе?', choices);
  },
  register(byFriend) {
    Game.flags.guildMember = true; Game.flags.rank = 'G-'; Game.flags.rep = 0;
    this.step = 'orders';
    Sfx.crystal();
    Game.say([
      { who: 'Клерк', text: byFriend ? 'Ждан ручается? Ладно, запишу без взноса.' : 'Записал. Имя внесено в книгу.' },
      { who: 'Клерк', text: 'Рейтинг G-минус. Доска слева. Возьмёшь заказ — выполняй, иначе спишем репутацию.' },
      { who: 'Я', text: '(про себя) Впервые в жизни меня куда-то записали.' },
    ], () => {
      Game.showBanner('РАНГ G-', 'гильдия охотников', 3, '#bff8ff');
      Game.objective = 'Взять заказ на доске и выполнить его';
      Game.save();
    });
  },
  afterQuest() {
    const done = Object.values(Quests.all()).filter(q => q.done).length;
    if (done >= 3 && this.step === 'orders') {
      this.step = 'rumor';
      Game.objective = 'Расспросить в таверне об интегрированных';
      Game.hint('Три заказа сданы. В таверне за кружкой языки развязываются.', 4.5);
    } else Game.objective = `Заказы гильдии: сдано ${done}/3`;
  },

  barkeepTalk() {
    const F = Game.flags;
    const choices = [];
    choices.push({ label: 'Поговорить', fn: () => Game.say([
      { who: 'Трактирщик', text: 'Комната — три медяка, похлёбка — один. Драки на улице.' },
    ]) });
    choices.push({ label: 'Расспросить об интегрированных', fn: () => {
      if (this.step !== 'rumor') { Game.say([{ who: 'Трактирщик', text: 'Мало ли кто чего болтает. Ты сперва себя покажи, новичок.' }]); return; }
      Game.say([
        { who: 'Трактирщик', text: 'Интегрированные? Есть один. Ходит к лекарю за мазью первой ступени.' },
        { who: 'Трактирщик', text: 'Молчаливый, в перчатке на левой руке. Живёт за старой мельницей, к северу.' },
        { who: 'Трактирщик', text: 'Он берёт учеников. Правда, ученики у него долго не живут.' },
        { who: 'Я', text: '(про себя) Мазь. Противоядие. Человек, который умеет.' },
        { who: 'Я', text: '(про себя) Значит, туда.' },
      ], () => this.finish());
    } });
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose('Трактирщик', 'Чего налить?', choices);
  },
  finish() {
    Game.flags.c2done = true;
    Game.showBanner('КОНЕЦ ГЛАВЫ 2', 'дальше — Глава 3: первая интеграция', 4, '#bff8ff');
    Game.objective = 'Глава 2 пройдена. Заказы гильдии и угодья остаются открытыми.';
    Game.save();
  },

  // ---------- Доска заказов ----------
  board() {
    if (!Game.flags.guildMember) { Game.say([{ who: '', text: 'Доска с заказами. Сначала надо записаться у клерка.' }]); return; }
    const choices = [];
    for (const id of Object.keys(QUEST_DEFS)) {
      if (!Quests.available(id) || Quests.done(id)) continue;
      const d = QUEST_DEFS[id];
      choices.push({ label: `[${d.rank}] ${d.name} — ${d.coins} медяков`, fn: () => {
        Quests.take(id);
        Game.say([{ who: '', text: d.desc }], () => { Game.objective = Quests.line(id); });
      } });
    }
    const act = Quests.active();
    if (act.length) choices.push({ label: 'Мои заказы', fn: () => Game.say(
      act.map(id => ({ who: '', text: `${Quests.line(id)} — ${QUEST_DEFS[id].desc}` })),
      () => { Game.objective = Quests.line(act[0]); }) });
    choices.push({ label: 'Отойти', fn: () => { } });
    Game.choose('', `Доска заказов. Рейтинг ${Quests.rank()}, репутация ${Quests.rep()}.`, choices);
  },

  onKill(e) {
    Quests.onKill(e);
    const F = Game.flags;
    if (F.campTask && !F.campCleared && World.name === 'camp') {
      const left = Game.enemies.filter(x => x.alive && x instanceof Spiker).length;
      if (!left) { F.campCleared = true; Game.objective = 'Вернуться к Ждану'; Game.hint('Стоянка чистая. Ждан обещал бесплатный проезд.', 4); }
    }
  },

  update() {
    const act = Quests.active();
    if (act.length && Quests.ready(act[0]) && Game.objective.startsWith(QUEST_DEFS[act[0]].name))
      Game.objective = `${QUEST_DEFS[act[0]].name} — готово, сдать клерку`;
  },
};
