'use strict';
// Заказы гильдии и хутора (данные — data/quests.js). Состояние живёт в Game.flags.quests и сохраняется.

const Quests = {
  init() {
    Events.on('kill', e => this.onKill(e));
    Events.on('scene:load', () => this.onSceneLoad());
  },
  all() { return Game.flags.quests || (Game.flags.quests = {}); },
  state(id) { const q = this.all(); return q[id] || (q[id] = { count: 0, times: 0 }); },
  taken(id) { return !!this.state(id).taken; },
  done(id) { return !!this.state(id).done; },
  active(giver) { return Object.keys(this.all()).filter(id => QUEST_DEFS[id] && this.taken(id) && (!giver || QUEST_DEFS[id].giver === giver)); },
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
    if (id === 'letter') Inv.add('letter');
    Sfx.pick(); Game.hint(`Заказ взят: ${d.name}`, 3);
    if (d.spawn && World.name === d.spawn.scene) this.spawnFor(id);
    if (d.type === 'find') this.spawnFinds();
  },
  progress(id) {
    const d = QUEST_DEFS[id], st = this.state(id);
    if (d.type === 'item') return Math.min(Inv.count(d.item), d.need);
    if (d.type === 'find') return st.found ? 1 : 0;
    return Math.min(st.count, d.need);
  },
  needOf(id) { const d = QUEST_DEFS[id]; return d.type === 'find' ? 1 : d.need; },
  ready(id) { return this.taken(id) && this.progress(id) >= this.needOf(id); },

  // Засчитываются только звери, убитые героем
  onKill(e) {
    if (!e.killedByPlayer) return;
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
    const d = QUEST_DEFS[id], st = this.state(id);
    if (d.type === 'item') Inv.take(d.item, d.need);
    if (id === 'wreck') Inv.clear('cargo');
    st.taken = false; st.done = true; st.times = (st.times || 0) + 1; st.count = 0; st.found = false;
    Inv.add('coins', d.coins);
    Game.flags.rep = this.rep() + d.rep;
    Game.flags.questsDone = this.totalDone() + 1;
    Game.player.gainXp(d.xp);
    Sfx.coin(); Game.showBanner('ЗАКАЗ СДАН', `+${d.coins} медяков · репутация +${d.rep}`, 2.6, '#ffe080');
    this.checkRank();
    Events.emit('quest:done', id);
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
      const e = Spawn.one(s);
      if (e) { e.questTag = d.tag; e.elite = sp.list.length === 1; if (e.elite) e.hideLevel = false; }
    });
  },
  // Места для заказов «найти»
  spawnFinds() {
    if (World.name === 'hunt' && this.taken('wreck') && !this.state('wreck').found) {
      Game.addSpot(30 * TS + 8, 31 * TS + 10, { r: 22, hold: 1.2, sprite: 'cart', label: 'Держи Space: разобрать обломки телеги',
        fn: (s) => { s.used = true; Inv.add('cargo'); this.state('wreck').found = true; Sfx.pick(); Game.hint('Груз цел: мешок с кристаллами и бумагами. Вернуть в гильдию.', 4); } });
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
