'use strict';
// Глава 1. Чёрный лес. Лес поделён завалами на этапы: дальше герой идёт, только пережив предыдущий.
//   night1..4  — ночь: зайцы, костёр, еда, сон        → завал g1
//   hunt/fourth — охота, «четвёртый кабан» — шипогрыз  → привал → завал g2
//   toJumper    — костяной прыгун                      → завал g3
//   toHunter    — охотник дерётся с большим прыгуном (обычный бой), потом замечает героя → бой один на один
//   hunterLoot/restHunter/sleepHunter → завал g4 → deepForest → хижина (конец главы)

const Chapter1 = {
  id: 1,
  // Столбцы завалов: перекрывают карту по всей высоте, обойти нельзя
  gates: { g1: 17, g2: 46, g3: 70, g4: 88 },
  arenaX: 71,

  get step() { return Game.flags.step; },
  set step(v) { Game.flags.step = v; },
  get p() { return Game.player; },

  init() {
    Events.on('scene:load', name => this.onSceneLoad(name));
    Events.on('tick', () => { if (World.name === 'forest') this.update(); });
    Events.on('kill', e => { if (World.name === 'forest') this.onKill(e); });
    Events.on('loot', e => this.onLoot(e));
    Events.on('spiker:reveal', () => this.onSpikerReveal());
    Events.on('can:rest', () => this.canRest());
    Events.on('campfire', (fire, justLit) => this.onCampfire(fire, justLit));
    Events.on('ate', () => this.onAte());
    Events.on('rest', () => this.onRest());
    Events.on('can:enter', to => { if (to === 'road' && !Game.flags.chapterEnd) { Game.hint('Сначала надо добраться до хижины и перевести дух.', 3); return false; } });
    Events.on('hunter:provoked', h => this.onProvoked(h));
    Events.on('hunter:down', () => this.onHunterDown());
    Events.on('hunter:looted', () => this.lootHunter());
    Events.on('respawn', () => this.onRespawn());
    Events.on('game:loaded', () => this.objective());
  },

  objective() {
    if (Game.flags.chapter !== 1) return;
    if (this.step === 'hunt') this.huntObjective();
  },

  // ---------- Завалы ----------
  applyGates() {
    if (World.name !== 'forest') return;
    for (const k in this.gates) World.barrier(this.gates[k], !Game.flags['open:' + k]);
    World.barrier(this.arenaX, !!Game.flags.arenaLock);   // на время боя с охотником поляна закрыта
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
    const F = Game.flags;
    if (name === 'forest') {
      this.applyGates();
      if (F.morning) World.tint = null;
      this.restoreHunter();
      if (!F.forestIntro) {
        F.forestIntro = true;
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
    if (name === 'hut' && !F.chapterEnd) {
      F.chapterEnd = true;
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
  onCampfire(fire, justLit) {
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
    if (World.name !== 'forest') return;
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
        { who: 'Я', text: 'Живность вернулась к ручью. Значит, голодным не останусь. Завал дальше по тропе я разобрал.' },
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
    const F = Game.flags;
    if (e instanceof Rabbit || e instanceof Boar) Game.once('firstAnimal', () => Game.hint('Держи Space у туши — разделать.', 2.5));
    if (e instanceof Rabbit) {
      F.rabbits = (F.rabbits || 0) + 1;
      if (this.step === 'night1') {
        if (F.rabbits >= 2) { this.step = 'night2'; Game.objective = 'Разжечь костёр на опушке'; Game.hint('Мясо есть. Теперь костёр: Space у кострища.', 4); }
        else Game.objective = `Поймать двух зайцев: ${F.rabbits}/2`;
      } else if (this.step === 'hunt') this.checkHunt();
    }
    if (e instanceof Boar) {
      F.boars = (F.boars || 0) + 1;
      if (this.step === 'hunt') this.checkHunt();
    }
    if (e.tag === 'firstSpiker') {
      this.step = 'restSpiker';
      Game.objective = 'Вернуться к костру: пожарить мясо и поспать';
      Game.hint('Сердце колотится. Надо к огню.', 3.5);
    }
    if (e.tag === 'firstJumper') {
      this.step = 'toHunter'; this.openGate('g3');
      Game.objective = 'Идти дальше на восток';
      Game.hint('Тварь размером с телёнка — и я её свалил. Дальше тропа свободна.', 4);
    }
    if (e.tag === 'bigJumper') this.onDuelOver(e);
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

  // ---------- Охотник и большой прыгун: обычный бой двух бойцов ----------
  // Пока герой не подошёл, оба спят. Потом дерутся по-настоящему; охотник побеждает и режет кристаллы,
  // а затем замечает героя. Ударишь охотника раньше — он сразу бросится на тебя.
  restoreHunter() {
    const F = Game.flags, h = Game.tags.hunter, j = Game.tags.bigJumper;
    F.duelStarted = false;
    if (F.duelDone && j) { j.remove = true; Game.removed.add(j.sid); }
    if (!h) return;
    if (F.hunterDown) { Object.assign(h, { alive: false, dead: true, dormant: false, state: 'down', looted: !!F.hunterLooted }); return; }
    if (F.hunterMet) { h.startFight(true); Game.bossBar = h; return; }
    if (F.duelDone) { Object.assign(h, { dormant: false, state: 'panting' }); }
  },
  startDuel() {
    const F = Game.flags, h = Game.tags.hunter, j = Game.tags.bigJumper;
    F.duelStarted = true;
    if (h) h.startFight(false);
    if (j) { j.dormant = false; j.target = h; j.sticky = true; }
    Game.showBanner('ОХОТНИК', 'бьётся с большим прыгуном', 2.5, '#ff9080');
    Game.hint('Впереди грохот и хруст костей. Там кто-то дерётся. Лучше подкрасться через кусты.', 5);
  },
  onDuelOver(j) {
    const F = Game.flags, h = Game.tags.hunter;
    F.duelDone = true; Game.removed.add(j.sid);
    if (!h || !h.alive || F.hunterMet) return;
    h.lootCorpse(j);
    if (j.killedByPlayer) Game.hint('Я добил тварь. Охотник медленно обернулся ко мне.', 3.5);
  },
  hunterTalk() {
    const F = Game.flags, p = this.p;
    F.hunterMet = true;
    Game.say([
      { who: 'Охотник', text: '(тяжело дыша) Хватит прятаться. Я слышу, как ты сопишь в кустах.' },
      { who: '', text: 'Я вышел.' },
    ], () => {
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
  onProvoked(h) {
    const F = Game.flags;
    if (F.hunterMet) return;
    F.hunterMet = true;
    Game.say([
      { who: 'Охотник', text: 'Ах ты, крысёныш! Со спины — ножом?!' },
      { who: 'Охотник', text: 'Ну, держись.' },
    ], () => this.startHunterFight());
  },
  startHunterFight() {
    const F = Game.flags, h = Game.tags.hunter, p = this.p;
    this.step = 'hunterFight'; F.hunterMet = true;
    // Поляна закрывается: герой должен оказаться внутри, иначе бой некому вести
    if (p.x < (this.arenaX + 1) * TS + 4) { p.x = (this.arenaX + 2) * TS; p.y = clamp(p.y, 14 * TS, 24 * TS); p.lr = 'r'; p.face = { x: 1, y: 0 }; }
    F.arenaLock = true; this.applyGates();
    const rock = new Obj('rock', h.x + 6, h.y - 2), n = norm(p.x - rock.x, p.y - 18 - rock.y);
    rock.temp = true; rock.launch(n.x, n.y, 260, 220, h, true); rock.targets = [];
    Game.objects.push(rock); Sfx.throw(); FX.shake = 3;
    h.hp = h.maxHp; h.startFight(true); h.throwCd = 1.6;
    Game.bossBar = h;
    Game.objective = 'Выстоять против охотника';
    Game.hint('Камень просвистел у виска! Такой снесёт половину меня. Уворачивайся (Shift).', 4.5);
  },
  onHunterDown() {
    const F = Game.flags;
    Game.bossBar = null; F.hunterDown = true; this.step = 'hunterLoot';
    F.arenaLock = false; this.applyGates();
    Game.after(0.8, () => Game.say([
      { who: 'Охотник', text: 'Кх... непользователь... меня?..' },
      { who: '', text: 'Он попытался подняться — и рухнул лицом в траву. Без сознания.' },
    ], () => { Game.objective = 'Обыскать сумку охотника (держи Space)'; }));
  },
  lootHunter() {
    Inv.add('scroll'); Inv.add('crystals', 2); Game.stats.crystals += 2; Game.flags.hunterLooted = true; Sfx.pick();
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

  // ---------- Смерть и покадровые триггеры ----------
  onRespawn() {
    const h = Game.tags.hunter;
    if (World.name === 'forest' && this.step === 'hunterFight' && h && h.alive) {
      h.dropLifted(); Object.assign(h, { x: h.home.x, y: h.home.y, hp: h.maxHp, kvx: 0, kvy: 0, state: 'wait' });
      Game.after(1.2, () => h.startFight(true));
      Game.after(0.1, () => Game.hint('Охотник: «Ещё хочешь?»', 2));
    }
    return false;
  },
  update() {
    const p = this.p, F = Game.flags, h = Game.tags.hunter, j = Game.tags.bigJumper;
    if (!F.morning && p.x > 14.5 * TS) Game.once('blockHint', () => Game.hint('Дальше завал и темень. Ночью в чащу лезть нельзя: сначала еда, костёр и сон.', 4.5));
    if (this.step === 'fourth' && p.x > 28 * TS) Game.once('fourthHint', () => Game.hint('Где-то здесь бродит четвёртый. Кабан как кабан... наверное.', 4));
    if (p.x > 58 * TS && Game.tags.firstJumper && Game.tags.firstJumper.alive)
      Game.once('jumperBanner', () => { Game.showBanner('КОСТЯНОЙ ПРЫГУН', 'зверь силы', 2.5, '#ff8070'); Game.hint('Бьёт силой вокруг себя в прыжке и при приземлении. Круги показывают куда.', 5); });
    // Бой охотника с большим прыгуном начинается, когда герой подошёл к завалу перед поляной
    if (!F.duelStarted && !F.duelDone && !F.hunterMet && F['open:g3'] && p.x > 66 * TS && h && j && j.alive) this.startDuel();
    // Охотник закончил с тушей и замечает героя
    if (F.duelDone && !F.hunterMet && h && h.alive && h.state === 'panting' && p.x > 71.5 * TS && !Game.dialog) this.hunterTalk();
    if (this.step === 'deepForest' && p.x > 103 * TS) Game.once('hutSeen', () => {
      Game.objective = 'Зайти в хижину';
      Game.hint('Между деревьями — скат крыши. Заброшенная хижина.', 4);
      const d = Game.props.find(o => o.to === 'hut');
      if (d) Game.waypoint = { x: d.x, y: d.y, label: 'хижина' };
    });
  },
};
Story.register(Chapter1);
