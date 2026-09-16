'use strict';
// Поручения горожан (данные — data/errands.js). Состояние — Game.flags.errands[id] = { taken, done, found }.

const Errands = {
  init() { Events.on('scene:load', () => this.onSceneLoad()); },
  all() { return Game.flags.errands || (Game.flags.errands = {}); },
  state(id) { const a = this.all(); return a[id] || (a[id] = {}); },
  active() { return Object.keys(this.all()).filter(id => ERRANDS[id] && this.state(id).taken); },
  available(id) {
    const d = ERRANDS[id], st = this.state(id);
    return !st.taken && !st.done && (Game.flags.chapter || 0) >= (d.chapter || 0) && (!d.after || this.state(d.after).done);
  },
  ready(id) {
    const d = ERRANDS[id], st = this.state(id);
    if (!st.taken) return false;
    if (d.escort) return !!st.found;
    for (const item in d.need || {}) if (!Inv.has(item, d.need[item])) return false;
    return true;
  },
  // Строки меню разговора: взять, сдать, вручить
  choices(npc) {
    const out = [], role = npc.role;
    for (const id in ERRANDS) {
      const d = ERRANDS[id], st = this.state(id);
      if (d.giver === role && this.available(id)) out.push({ label: `Поручение: ${d.name}`, fn: () => this.offer(id, npc) });
      if (d.giver === role && st.taken && !d.deliver && this.ready(id)) out.push({ label: `Отдать: ${d.name}`, fn: () => this.complete(id, npc) });
      if (d.deliver === role && st.taken && Inv.has(Object.keys(d.give)[0])) out.push({ label: `Вручить: ${Inv.name(Object.keys(d.give)[0])}`, fn: () => this.complete(id, npc) });
      if (d.escort && d.escort.role === role && st.taken && !st.found) out.push({ label: 'Позвать домой', fn: () => this.findBoy(id, npc) });
    }
    return out;
  },
  offer(id, npc) {
    const d = ERRANDS[id], P = PERSONAS[npc.role] || { name: 'Житель' };
    Game.choose(P.name, d.offer, [
      { label: 'Сделаю', fn: () => this.take(id) },
      { label: 'Не сейчас', fn: () => { } },
    ]);
  },
  take(id) {
    const d = ERRANDS[id], st = this.state(id);
    st.taken = true; st.found = false;
    for (const item in d.give || {}) Inv.add(item, d.give[item]);
    Sfx.pick(); Game.hint(`Поручение: ${d.name}`, 3);
    this.onSceneLoad();
  },
  complete(id, npc) {
    const d = ERRANDS[id], st = this.state(id);
    for (const item in d.need || {}) Inv.take(item, d.need[item]);
    for (const item in d.give || {}) Inv.clear(item);
    st.taken = false; st.done = true;
    Inv.add('coins', d.reward.coins); Sfx.coin();
    const who = d.thanksWho || (PERSONAS[d.giver] || {}).name || 'Житель';
    Game.say([{ who, text: d.thanks }], () => {
      Game.player.gainXp(d.reward.xp);
      Game.showBanner('ПОРУЧЕНИЕ ВЫПОЛНЕНО', `+${d.reward.coins} медяков · +${d.reward.xp} опыта`, 2.6, '#ffe080');
      Events.emit('errand:done', id);
      Game.save();
    });
  },
  findBoy(id, npc) {
    const d = ERRANDS[id], st = this.state(id);
    Game.say(Talk.lines(d.found), () => {
      st.found = true;
      npc.goal = { x: npc.x - 60, y: npc.y, done: () => { npc.remove = true; } };
      npc.hidden = false; npc.goalSpeed = 70;
      Game.hint('Вернуться к матери Васятки.', 3);
    });
  },
  line(id) {
    const d = ERRANDS[id];
    if (d.escort) return `${d.name} — ${this.state(id).found ? 'найден, вернуться' : 'найти'}`;
    if (d.deliver) return `${d.name} — отнести`;
    const parts = Object.keys(d.need).map(item => `${Inv.name(item).toLowerCase()} ${Math.min(Inv.count(item), d.need[item])}/${d.need[item]}`);
    return `${d.name} — ${parts.join(', ')}`;
  },
  // Спрятанные вещи и потерявшиеся люди появляются, только пока поручение взято
  onSceneLoad() {
    for (const id of this.active()) {
      const d = ERRANDS[id], st = this.state(id);
      if (d.find && d.find.scene === World.name && !Inv.has(Object.keys(d.need)[0]) && !Game.props.some(p => p.errand === id)) {
        const pile = Spawn.one(['junk', d.find.at[0], d.find.at[1], { item: 'Мусор', gives: Object.keys(d.need)[0] }]);
        if (pile) pile.errand = id;
      }
      if (d.escort && d.escort.scene === World.name && !st.found && !Game.npcs.some(n => n.role === d.escort.role)) {
        Spawn.one(['npc', d.escort.at[0], d.escort.at[1], { who: d.escort.who, role: d.escort.role, face: 'l' }]);
      }
    }
  },
};
