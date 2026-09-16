'use strict';
// Заказы: гильдия и хутор. Обычные повторяются бесконечно (гринд), особые — один раз.
// Ранги растут от репутации: G- … E+.

const RANKS = ['G-', 'G', 'G+', 'F-', 'F', 'F+', 'E-', 'E', 'E+'];
const RANK_REP = [0, 4, 9, 15, 22, 30, 40, 52, 66];

// type: kill — убить (kind или tag, можно ограничить сценой); item — сдать предметы; find — найти место в мире
const QUEST_DEFS = {
  // ---- Гильдия, повторяемые ----
  rabbits: { giver: 'guild', rank: 'G-', repeat: true, type: 'kill', kind: 'Rabbit', need: 6, coins: 8, rep: 1, xp: 10,
    name: 'Зайцы для кухни', desc: 'Кухня гильдии просит шесть зайцев. Туши разделать не обязательно — главное, чтобы добыча была.' },
  boars: { giver: 'guild', rank: 'G-', repeat: true, type: 'kill', kind: 'Boar', need: 3, coins: 12, rep: 1, xp: 15,
    name: 'Кабанья напасть', desc: 'Три кабана. Роют поля у города и кидаются на телеги.' },
  meat: { giver: 'guild', rank: 'G-', repeat: true, type: 'item', item: 'meatCooked', need: 5, coins: 14, rep: 1, xp: 12,
    name: 'Мясо для таверны', desc: 'Пять кусков жареного мяса. Жарить на костре.' },
  herbs: { giver: 'guild', rank: 'G-', repeat: true, type: 'item', item: 'herbs', need: 4, coins: 12, rep: 1, xp: 12,
    name: 'Травы для лекаря', desc: 'Четыре пучка целебной травы.' },
  spikers: { giver: 'guild', rank: 'G', repeat: true, type: 'kill', kind: 'Spiker', need: 3, coins: 24, rep: 2, xp: 30,
    name: 'Шипогрызы у тракта', desc: 'Три шипогрыза. Купцы жалуются: скотину режут прямо на обочине.' },
  rawmeat: { giver: 'guild', rank: 'G', repeat: true, type: 'item', item: 'meatRaw', need: 8, coins: 18, rep: 2, xp: 16,
    name: 'Сырое мясо для псарни', desc: 'Восемь кусков сырого мяса. Псарня гильдии кормит гончих.' },
  jumpers: { giver: 'guild', rank: 'G+', repeat: true, type: 'kill', kind: 'Jumper', need: 2, coins: 36, rep: 3, xp: 45,
    name: 'Костяные прыгуны', desc: 'Два прыгуна. Опасны: бьют силой при прыжке и приземлении.' },
  throwers: { giver: 'guild', rank: 'G+', repeat: true, type: 'kill', kind: 'Thrower', need: 2, coins: 40, rep: 3, xp: 50,
    name: 'Метатели в угодьях', desc: 'Два метателя. Стреляют шипами, держись сбоку.' },
  crystals: { giver: 'guild', rank: 'G+', repeat: true, type: 'item', item: 'crystals', need: 6, coins: 50, rep: 3, xp: 40,
    name: 'Кристаллы для гильдии', desc: 'Шесть кристаллов зверей. Платят щедро и без вопросов.' },
  groveMix: { giver: 'guild', rank: 'F-', repeat: true, type: 'kill', kinds: ['Jumper', 'Thrower'], scene: 'grove', need: 5, coins: 75, rep: 4, xp: 90,
    name: 'Чистка рощи', desc: 'Пять прыгунов или метателей в Дальней роще. Роща за угодьями, пускают с ранга F-.' },
  crystalsBig: { giver: 'guild', rank: 'F', repeat: true, type: 'item', item: 'crystals', need: 14, coins: 130, rep: 5, xp: 100,
    name: 'Партия кристаллов', desc: 'Четырнадцать кристаллов для городской мастерской.' },
  marshSpikers: { giver: 'guild', rank: 'E-', repeat: true, type: 'kill', kind: 'Spiker', scene: 'marsh', need: 5, coins: 160, rep: 7, xp: 170,
    name: 'Болотные шипогрызы', desc: 'Пять шипогрызов на Гнилых болотах. Там они крупнее и злее.' },

  // ---- Гильдия, особые ----
  letter: { giver: 'guild', rank: 'G', type: 'find', target: 'carter', coins: 15, rep: 2, xp: 20,
    name: 'Письмо для Ждана', desc: 'Отнести письмо извозчику Ждану на стоянку за воротами и вернуться.' },
  wreck: { giver: 'guild', rank: 'G+', type: 'find', target: 'wreck', coins: 45, rep: 4, xp: 50,
    name: 'Пропавший обоз', desc: 'В угодьях пропала телега с грузом. Найти обломки и принести груз.' },
  den: { giver: 'guild', rank: 'F-', type: 'kill', tag: 'den', need: 5, coins: 85, rep: 5, xp: 110,
    name: 'Логово шипогрызов', desc: 'Пятеро шипогрызов устроили логово в глубине угодий. Выжечь гнездо.',
    spawn: { scene: 'hunt', list: [[76, 26], [78, 30], [74, 32], [80, 27], [77, 34]], kind: 'spiker', lvl: 5 } },
  alphaJumper: { giver: 'guild', rank: 'F', type: 'kill', tag: 'alphaJumper', need: 1, coins: 150, rep: 7, xp: 180,
    name: 'Вожак прыгунов', desc: 'Огромный прыгун водит стаю в Дальней роще. Голова вожака — гильдии.',
    spawn: { scene: 'grove', list: [[62, 12]], kind: 'bigJumper', lvl: 8 } },
  alphaThrower: { giver: 'guild', rank: 'F+', type: 'kill', tag: 'alphaThrower', need: 1, coins: 170, rep: 7, xp: 190,
    name: 'Вожак метателей', desc: 'Старый метатель с иглами в палец толщиной. Держит южную опушку рощи.',
    spawn: { scene: 'grove', list: [[40, 32]], kind: 'thrower', lvl: 10 } },
  ironhide: { giver: 'guild', rank: 'E-', type: 'kill', tag: 'ironhide', need: 1, coins: 260, rep: 10, xp: 260,
    name: 'Железношкур', desc: 'Шипогрыз с бронёй как у кабана-старца. На болотах разорвал троих охотников.',
    spawn: { scene: 'marsh', list: [[60, 22]], kind: 'spiker', lvl: 12 } },
  ambush: { giver: 'guild', rank: 'E', type: 'kill', tag: 'ambush', need: 6, coins: 320, rep: 12, xp: 300,
    name: 'Засада на тракте', desc: 'Стая зверей силы подстерегает обозы на тракте. Шесть голов.',
    spawn: { scene: 'road', list: [[60, 22], [64, 26], [70, 25], [74, 22], [66, 20], [58, 26]], kind: 'mixed', lvl: 9 } },
  marshQueen: { giver: 'guild', rank: 'E+', type: 'kill', tag: 'marshQueen', need: 1, coins: 480, rep: 15, xp: 420,
    name: 'Хозяйка болот', desc: 'Самый большой прыгун, которого видели в этих краях. Вожаки рощи — её выводок.',
    spawn: { scene: 'marsh', list: [[36, 14]], kind: 'bigJumper', lvl: 14 } },

  // ---- Хутор ----
  field: { giver: 'village', rank: 'G-', repeat: true, type: 'kill', kind: 'Boar', scene: 'village', need: 4, coins: 10, rep: 1, xp: 15,
    name: 'Кабаны в поле', desc: 'Кабаны снова роют поле за хутором. Четыре головы.' },
  well: { giver: 'village', rank: 'G', type: 'item', item: 'herbs', need: 5, coins: 22, rep: 2, xp: 25,
    name: 'Отравленный колодец', desc: 'Вода в колодце горчит. Знахарка просит пять пучков целебной травы на отвар.' },
  goat: { giver: 'village', rank: 'G-', type: 'find', target: 'goat', coins: 12, rep: 1, xp: 15,
    name: 'Пропавшая коза', desc: 'Коза сбежала к тракту. Найти и привести назад.' },
};

const Quests = {
  all() { return Game.flags.quests || (Game.flags.quests = {}); },
  state(id) { const q = this.all(); return q[id] || (q[id] = { count: 0, times: 0 }); },
  taken(id) { return !!this.state(id).taken; },
  done(id) { return !!this.state(id).done; },
  active(giver) { return Object.keys(this.all()).filter(id => this.taken(id) && (!giver || QUEST_DEFS[id].giver === giver)); },
  rep() { return Game.flags.rep || 0; },
  rankIndex() { return Math.max(0, RANKS.indexOf(Game.flags.rank || 'G-')); },
  rank() { return RANKS[this.rankIndex()]; },
  totalDone() { return Game.flags.questsDone || 0; },
  // Заказ видно на доске, если ранг позволяет, он не взят и (повторяемый или ещё не выполнен)
  available(id) {
    const d = QUEST_DEFS[id], st = this.state(id);
    return RANKS.indexOf(d.rank) <= this.rankIndex() && !st.taken && (d.repeat || !st.done);
  },
  offers(giver) {
    return Object.keys(QUEST_DEFS).filter(id => QUEST_DEFS[id].giver === giver && this.available(id))
      .sort((a, b) => RANKS.indexOf(QUEST_DEFS[b].rank) - RANKS.indexOf(QUEST_DEFS[a].rank));
  },
  take(id) {
    const d = QUEST_DEFS[id], st = this.state(id);
    st.taken = true; st.count = 0; st.found = false;
    const q = Game.player.inv.quest;
    if (id === 'letter') q.letter = 1;
    Sfx.pick(); Game.hint(`Заказ взят: ${d.name}`, 3);
    if (d.spawn && World.name === d.spawn.scene) this.spawnFor(id);
    if (d.type === 'find') this.spawnFinds();
  },
  progress(id) {
    const d = QUEST_DEFS[id], st = this.state(id);
    if (d.type === 'item') return Math.min(this.itemCount(d.item), d.need);
    if (d.type === 'find') return st.found ? 1 : 0;
    return Math.min(st.count, d.need);
  },
  needOf(id) { const d = QUEST_DEFS[id]; return d.type === 'find' ? 1 : d.need; },
  itemCount(item) { const v = Game.player.inv; return v[item] || 0; },
  ready(id) { return this.taken(id) && this.progress(id) >= this.needOf(id); },

  onKill(e) {
    const kind = e.constructor.name;
    for (const id of this.active()) {
      const d = QUEST_DEFS[id], st = this.state(id);
      if (d.type !== 'kill' || st.count >= d.need) continue;
      if (d.scene && World.name !== d.scene) continue;
      const match = d.tag ? e.questTag === d.tag : d.kinds ? d.kinds.includes(kind) : d.kind === kind;
      if (!match) continue;
      st.count++;
      Game.floaters.push({ x: e.x, y: e.y - 28, text: `${d.name}: ${st.count}/${d.need}`, color: '#ffe080', ttl: 1.8 });
      if (st.count >= d.need) Game.hint(`${d.name}: выполнено. Вернуться за наградой.`, 3);
    }
  },

  complete(id) {
    const d = QUEST_DEFS[id], st = this.state(id), v = Game.player.inv;
    if (d.type === 'item') v[d.item] -= d.need;
    if (id === 'wreck') v.quest.cargo = 0;
    st.taken = false; st.done = true; st.times = (st.times || 0) + 1; st.count = 0; st.found = false;
    v.coins += d.coins;
    Game.flags.rep = this.rep() + d.rep;
    Game.flags.questsDone = this.totalDone() + 1;
    Game.player.gainXp(d.xp);
    Sfx.coin(); Game.showBanner('ЗАКАЗ СДАН', `+${d.coins} медяков · репутация +${d.rep}`, 2.6, '#ffe080');
    this.checkRank();
  },
  checkRank() {
    let idx = 0;
    RANK_REP.forEach((need, i) => { if (this.rep() >= need) idx = i; });
    if (idx > this.rankIndex()) {
      Game.flags.rank = RANKS[idx];
      const unlocks = { 3: 'открыта Дальняя роща за угодьями', 6: 'открыты Гнилые болота за рощей' };
      Game.after(2.8, () => Game.showBanner(`РАНГ ${RANKS[idx]}`, unlocks[idx] || 'открыты заказы посложнее', 3.2, '#bff8ff'));
    }
  },
  nextRankRep() { const i = this.rankIndex() + 1; return i < RANKS.length ? RANK_REP[i] : null; },
  line(id) { const d = QUEST_DEFS[id]; return `${d.name} — ${this.progress(id)}/${this.needOf(id)}`; },

  // Особые враги появляются, только пока заказ взят
  spawnFor(id) {
    const d = QUEST_DEFS[id], sp = d.spawn, st = this.state(id);
    if (!sp || World.name !== sp.scene || !st.taken || st.count >= d.need) return;
    const kinds = ['spiker', 'jumper', 'thrower'];
    sp.list.forEach(([tx, ty], i) => {
      const kind = sp.kind === 'mixed' ? kinds[i % 3] : sp.kind;
      const s = [kind, tx, ty, { lvl: sp.lvl }];
      s.id = `quest:${id}:${i}:${st.times || 0}`;
      if (Game.removed.has(s.id)) return;
      const e = Game.spawn(s);
      if (e) { e.questTag = d.tag; e.elite = sp.list.length === 1; if (e.elite) e.hideLevel = false; }
    });
  },
  // Места для заказов «найти»
  spawnFinds() {
    const v = Game.player.inv;
    if (World.name === 'hunt' && this.taken('wreck') && !this.state('wreck').found) {
      Game.addSpot(30 * TS + 8, 31 * TS + 10, { r: 22, hold: 1.2, sprite: 'cart', label: 'Держи Space: разобрать обломки телеги',
        fn: (s) => { s.used = true; v.quest.cargo = 1; this.state('wreck').found = true; Sfx.pick(); Game.hint('Груз цел: мешок с кристаллами и бумагами. Вернуть в гильдию.', 4); } });
    }
    if (World.name === 'road' && this.taken('goat') && !this.state('goat').found) {
      Game.addSpot(74 * TS + 8, 33 * TS + 10, { r: 22, hold: 0.8, label: 'Держи Space: выпутать козу из кустов',
        fn: (s) => { s.used = true; this.state('goat').found = true; Sfx.pick(); Game.hint('Коза блеет и идёт следом. Отвести на хутор.', 3.5); } });
    }
  },
  onSceneLoad() {
    for (const id of this.active()) this.spawnFor(id);
    this.spawnFinds();
  },
};
