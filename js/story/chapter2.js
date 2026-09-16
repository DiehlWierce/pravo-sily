'use strict';
// Глава 2: дорога в город, испытание у извозчика, ворота, гильдия, хутор, город с поручениями и гринд рангов до E+.
// Сюжет идёт дальше в любой момент после трёх сданных заказов, а можно сидеть в угодьях, копить деньги и ранги.
// Шаги (Game.flags.c2step): road → carter → ride → gate → guild → orders → rumor → (c2done)

const Chapter2 = {
  id: 2,
  get p() { return Game.player; },
  get step() { return Game.flags.c2step; },
  set step(v) { Game.flags.c2step = v; },

  // Звери у телеги извозчика
  campBeasts: [['spiker', 30, 9], ['spiker', 34, 19], ['spiker', 9, 20], ['jumper', 27, 6], ['thrower', 38, 14]],

  init() {
    Events.on('scene:load', name => this.onSceneLoad(name));
    Events.on('game:beforeSave', () => this.beforeSave());
    Events.on('rest', () => this.onRest());
    Events.on('kill', e => this.onKill(e));
    Events.on('npc:talk', n => this.talk(n));
    Events.on('can:enter', to => this.canEnter(to));
    Events.on('tick', () => { if (Game.flags.chapter === 2) this.update(); });
  },

  start() {
    Game.flags.chapter = 2; this.step = 'road';
    Game.showBanner('ГЛАВА 2', 'Дорога в город', 3.5, '#e0c080');
    Game.after(0.8, () => Game.say([
      { who: '', text: 'Тракт нашёлся к полудню: две колеи, разбитые телегами.' },
      { who: 'Я', text: 'Город. Там гильдии, лекари, мази. И люди, которые знают про кристаллы.' },
    ], () => { Game.objective = 'Идти по тракту на восток'; Game.save(); }));
  },

  canEnter(to) {
    const F = Game.flags;
    if (to === 'city' && !F.inCity) { Game.hint('Стража не пускает. Сначала договорись у ворот.', 3); return false; }
    if (to === 'gate' && !F.ridePaid) { Game.hint('Пешком до ворот далеко и опасно. Сначала — извозчик.', 3); return false; }
    if (to === 'grove' && Quests.rankIndex() < 3) { Game.hint('Егерь не пускает: в Дальнюю рощу — с ранга F- и выше.', 3); return false; }
    if (to === 'marsh' && Quests.rankIndex() < 6) { Game.hint('На Гнилые болота гильдия пускает только с ранга E-.', 3); return false; }
  },

  onSceneLoad(name) {
    const F = Game.flags;
    if (name === 'road' && !F.chapter2Started) { F.chapter2Started = true; this.start(); }
    if (name === 'camp') this.campLoad();
    if (name === 'gate') {
      if (F.inCity) this.liftBarrier();
      if (['carter', 'ride'].includes(this.step)) { this.step = 'gate'; Game.objective = 'Попасть в город'; }
    }
    if (name === 'city' && this.step === 'gate') {
      this.step = 'guild';
      Game.showBanner('ГОРОД', 'стены, а не деревья', 3, '#bff8ff');
      Game.objective = 'Найти гильдию и записаться';
      Game.save();
    }
    if (name === 'city' && this.step === 'guild') { const d = Game.tags.guildDoor; if (d) Game.waypoint = { x: d.x, y: d.y, label: 'гильдия' }; }
    if (name === 'city' && this.step === 'rumor') { const d = Game.tags.tavernDoor; if (d) Game.waypoint = { x: d.x, y: d.y, label: 'таверна' }; }
    if (name === 'city') Game.once('cityErrands', () => Game.after(3.5, () => Game.hint('В городе полно работы и без гильдии: жители просят сходить, купить, отнести.', 4.5)));
    if (name === 'guild') {
      const b = Game.tags.board;
      if (b) Game.addSpot(b.x, b.y + 12, { r: 20, label: 'Space: доска заказов', fn: () => this.board() });
    }
    if (name === 'grove') Game.once('groveIntro', () => Game.showBanner('ДАЛЬНЯЯ РОЩА', 'звери силы 5–7 уровня', 3, '#ff9080'));
    if (name === 'marsh') Game.once('marshIntro', () => Game.showBanner('ГНИЛЫЕ БОЛОТА', 'звери силы 8–11 уровня', 3, '#ff9080'));
    if (name === 'village') Game.once('villageIntro', () => Game.showBanner('ХУТОР', 'у хуторян свои заботы', 2.5, '#e0c080'));
  },

  // =====================================================================
  //   Стоянка извозчика: помочь можно только до следующего сохранения
  // =====================================================================
  campLoad() {
    const F = Game.flags;
    if (!F.campCleared && !F.carterMissed && !F.ridePaid) {
      this.campBeasts.forEach(([kind, tx, ty], i) => {
        const s = [kind, tx, ty, { lvl: 3 }]; s.id = `camp:beast:${i}`;
        if (Game.removed.has(s.id)) return;
        const e = Spawn.one(s); if (e) e.campBeast = true;
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
  onKill(e) {
    const F = Game.flags;
    if (!e.campBeast || F.campCleared) return;
    const left = Game.enemies.filter(x => x.alive && x.campBeast).length;
    if (left) { Game.hint(`Тварей у телеги осталось: ${left}`, 2); return; }
    F.campCleared = true; F.ridePaid = true; F.carterFriend = true;
    Game.after(1, () => Game.say([
      { who: 'Ждан', text: 'Ты... пятерых? С одним ножом?' },
      { who: 'Я', text: 'Лошадь цела?' },
      { who: 'Ждан', text: 'Цела. Садись, довезу даром. И у ворот за тебя поручусь, и в гильдии.' },
    ], () => this.rideReady('Залезай. К воротам доедем засветло.')));
  },
  carterTalk() {
    const F = Game.flags;
    if (Inv.count('letter') && Quests.taken('letter')) {
      Inv.clear('letter'); Quests.state('letter').found = true; Sfx.pick();
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
          if (!Inv.take('crystals', 3)) { Game.say([{ who: 'Ждан', text: 'Нет кристаллов — нет дороги.' }]); return; }
          F.ridePaid = true; Sfx.coin(); this.rideReady('Ладно. Садись.');
        } },
        { label: 'Отдать двадцать пять медяков', fn: () => {
          if (!Inv.take('coins', 25)) { Game.say([{ who: 'Ждан', text: 'Двадцать пять. Считать умеешь?' }]); return; }
          F.ridePaid = true; Sfx.coin(); this.rideReady('Ладно. Садись.');
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
  //   Ворота, гильдия, таверна, хутор
  // =====================================================================
  talk(n) {
    switch (n.role) {
      case 'carter': this.carterTalk(); return true;
      case 'gateGuardA': case 'gateGuardB': this.guardTalk(); return true;
      case 'guildClerk': this.clerkTalk(); return true;
      case 'barkeep': this.barkeepTalk(n); return true;
      case 'farmer': this.farmerTalk(); return true;
      default: return false;
    }
  },

  guardTalk() {
    const F = Game.flags;
    if (F.inCity) { Game.say([{ who: 'Стражник', text: 'Проходи, не задерживай.' }]); return; }
    const choices = [
      { label: 'Заплатить пошлину (5 медяков)', fn: () => {
        if (!Inv.take('coins', 5)) { Game.say([{ who: 'Стражник', text: 'Пять медяков. Считать умеешь?' }]); return; }
        Sfx.coin(); this.enterCity('Проходи. И не шали в городе.');
      } },
    ];
    if (F.carterFriend) choices.push({ label: 'Сказать, что я от Ждана', fn: () => this.enterCity('Ждан за тебя поручился? Ладно. Проходи, малец.') });
    choices.push({ label: 'Уйти', fn: () => { } });
    Game.choose('Стражник', 'Пошлина пять медяков. Оружие в ножнах.', choices);
  },
  liftBarrier() { for (let y = 12; y <= 14; y++) World.set(33, y, ':'); },
  enterCity(text) {
    Game.flags.inCity = true;
    this.liftBarrier();
    Game.say([{ who: 'Стражник', text }], () => { Game.objective = 'Войти в город'; });
  },

  clerkTalk() {
    const F = Game.flags;
    if (!F.guildMember) {
      const choices = [{ label: 'Записаться (10 медяков)', fn: () => {
        if (!Inv.take('coins', 10)) { Game.say([{ who: 'Клерк', text: 'Десять. Приходи, когда будут.' }]); return; }
        this.register();
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

  barkeepTalk(n) {
    const choices = [{ label: 'Расспросить об интегрированных', fn: () => {
      if (this.step !== 'rumor' && !Game.flags.c2done) { Game.say([{ who: 'Трактирщик', text: 'Ты сперва себя покажи, новичок. Сдай пару заказов гильдии — тогда и поговорим.' }]); return; }
      Game.say([
        { who: 'Трактирщик', text: 'Интегрированные? Есть один. Ходит к лекарю за мазью первой ступени.' },
        { who: 'Трактирщик', text: 'Молчаливый, в перчатке на левой руке. Живёт за старой мельницей, к северу.' },
        { who: 'Трактирщик', text: 'Берёт учеников. Правда, ученики у него долго не живут.' },
        { who: 'Я', text: '(про себя) Мазь. Противоядие. Человек, который умеет. Значит, туда.' },
      ], () => this.finish());
    } }, ...Errands.choices(n), ...Shop.choices('tavern', 'Трактирщик'), { label: 'Уйти', fn: () => { } }];
    Game.choose('Трактирщик', 'Комната — у очага, отдых бесплатно для гильдейских. Чего налить?', choices);
  },
  finish() {
    if (Game.flags.c2done) return;
    Game.flags.c2done = true;
    Game.showBanner('КОНЕЦ ГЛАВЫ 2', 'дальше — Глава 3: первая интеграция', 4, '#bff8ff');
    Game.objective = 'Глава 2 пройдена. Заказы, поручения, угодья, роща и болота остаются открытыми.';
    Game.save();
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
Story.register(Chapter2);
