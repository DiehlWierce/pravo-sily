'use strict';
// Заказы гильдии: доска, счётчики, репутация и ранги.

const QUEST_DEFS = {
  meat: { name: 'Мясо для таверны', rank: 'G-', type: 'item', item: 'meatCooked', need: 5, coins: 12, rep: 1, xp: 15,
    desc: 'Трактирщику нужно пять кусков жареного мяса. Мясо берут со зверей и жарят на костре.' },
  herbs: { name: 'Травы для лекаря', rank: 'G-', type: 'item', item: 'herbs', need: 4, coins: 10, rep: 1, xp: 12,
    desc: 'Четыре пучка целебной травы. Растёт по всему лесу, рядом с ручьями.' },
  spikers: { name: 'Шипогрызы у тракта', rank: 'G-', type: 'kill', kind: 'Spiker', need: 3, coins: 20, rep: 2, xp: 30,
    desc: 'Три шипогрыза. Купцы жалуются: скотину режут прямо на обочине.' },
  jumpers: { name: 'Костяные прыгуны', rank: 'G', type: 'kill', kind: 'Jumper', need: 2, coins: 34, rep: 3, xp: 45,
    desc: 'Два прыгуна в угодьях. Опасны: бьют силой при прыжке.' },
  throwers: { name: 'Метатели в роще', rank: 'G', type: 'kill', kind: 'Thrower', need: 2, coins: 38, rep: 3, xp: 50,
    desc: 'Два метателя. Стреляют шипами, держись в стороне и лови паузы.' },
  crystals: { name: 'Кристаллы для гильдии', rank: 'G', type: 'item', item: 'crystals', need: 6, coins: 45, rep: 4, xp: 40,
    desc: 'Гильдии нужны шесть кристаллов зверей. Платят щедро и без вопросов.' },
};

const RANKS = ['G-', 'G', 'F'];

const Quests = {
  all() { return Game.flags.quests || (Game.flags.quests = {}); },
  state(id) { const q = this.all(); return q[id] || (q[id] = { count: 0 }); },
  taken(id) { return !!this.state(id).taken; },
  done(id) { return !!this.state(id).done; },
  active() { return Object.keys(this.all()).filter(id => this.taken(id) && !this.done(id)); },
  rank() { return Game.flags.rank || 'G-'; },
  rep() { return Game.flags.rep || 0; },
  // Доступен ли заказ по рангу
  available(id) {
    const d = QUEST_DEFS[id];
    return RANKS.indexOf(d.rank) <= RANKS.indexOf(this.rank()) && !this.taken(id);
  },
  take(id) {
    const st = this.state(id); st.taken = true; st.count = 0;
    Sfx.pick(); Game.hint(`Заказ взят: ${QUEST_DEFS[id].name}`, 3);
  },
  progress(id) {
    const d = QUEST_DEFS[id], st = this.state(id);
    if (d.type === 'item') return Math.min(this.itemCount(d.item), d.need);
    return Math.min(st.count, d.need);
  },
  itemCount(item) {
    const v = Game.player.inv;
    return item === 'meatCooked' ? v.meatCooked : item === 'herbs' ? v.herbs : item === 'crystals' ? v.crystals : 0;
  },
  ready(id) { return this.taken(id) && !this.done(id) && this.progress(id) >= QUEST_DEFS[id].need; },
  // Засчитываем убитого зверя во все подходящие заказы
  onKill(e) {
    const kind = e.constructor.name;
    for (const id of this.active()) {
      const d = QUEST_DEFS[id];
      if (d.type !== 'kill' || d.kind !== kind) continue;
      const st = this.state(id);
      if (st.count < d.need) {
        st.count++;
        Game.floaters.push({ x: e.x, y: e.y - 28, text: `${d.name}: ${st.count}/${d.need}`, color: '#ffe080', ttl: 1.6 });
      }
    }
  },
  complete(id) {
    const d = QUEST_DEFS[id], st = this.state(id), v = Game.player.inv;
    if (d.type === 'item') {
      if (d.item === 'meatCooked') v.meatCooked -= d.need;
      else if (d.item === 'herbs') v.herbs -= d.need;
      else if (d.item === 'crystals') v.crystals -= d.need;
    }
    st.done = true; st.taken = false;
    v.coins += d.coins;
    Game.flags.rep = this.rep() + d.rep;
    Game.player.gainXp(d.xp);
    Sfx.coin(); Game.showBanner('ЗАКАЗ СДАН', `+${d.coins} медяков · репутация +${d.rep}`, 2.6, '#ffe080');
    this.checkRank();
    Game.save();
  },
  checkRank() {
    const rep = this.rep();
    const next = rep >= 12 ? 'F' : rep >= 5 ? 'G' : 'G-';
    if (next !== this.rank()) {
      Game.flags.rank = next;
      Game.after(2.8, () => Game.showBanner(`РАНГ ${next}`, 'открыты заказы посложнее', 3, '#bff8ff'));
    }
  },
  line(id) {
    const d = QUEST_DEFS[id];
    return `${d.name} — ${this.progress(id)}/${d.need}`;
  },
};
