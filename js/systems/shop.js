'use strict';
// Лавки: покупка по списку из data/shops.js. Снаряжение продаётся по рангу гильдии.

const Shop = {
  // Разобрать строку товара в единый вид
  entry(it) {
    if (it.weapon) { const d = WEAPONS[it.weapon]; return { kind: 'weapon', id: it.weapon, name: d.name, price: d.price, rank: d.rank, desc: d.desc }; }
    if (it.armor) { const d = ARMORS[it.armor]; return { kind: 'armor', id: it.armor, name: d.name, price: d.price, rank: d.rank, desc: d.desc }; }
    return { kind: 'item', id: it.item, name: it.label || ITEMS[it.item].name, price: it.price, rank: it.rank, count: it.count || 1 };
  },
  owned(e) {
    const p = Game.player;
    return (e.kind === 'weapon' && p.gear.weapon === e.id) || (e.kind === 'armor' && p.gear.armor === e.id);
  },
  locked(e) { return e.rank && RANKS.indexOf(e.rank) > Quests.rankIndex(); },

  choices(shopId, who) {
    return SHOPS[shopId].items.map(it => {
      const e = this.entry(it), owned = this.owned(e), locked = this.locked(e);
      const label = `Купить: ${e.name} — ${e.price}` + (owned ? ' (надето)' : locked ? ` (ранг ${e.rank})` : '');
      return { label, fn: () => this.buy(shopId, e, who) };
    });
  },
  buy(shopId, e, who) {
    const S = SHOPS[shopId], p = Game.player;
    if (this.owned(e)) { Game.say([{ who, text: 'Это уже на тебе.' }]); return; }
    if (this.locked(e)) { Game.say([{ who, text: `Без бляхи ранга ${e.rank} не продам. Гильдия не велит.` }]); return; }
    if (!Inv.take('coins', e.price)) { Game.say([{ who, text: S.poor || `${e.price} медяков. У тебя ${Inv.count('coins')}.` }]); return; }
    Sfx.coin();
    if (e.kind === 'weapon') p.gear.weapon = e.id;
    else if (e.kind === 'armor') p.gear.armor = e.id;
    else Inv.add(e.id, e.count);
    Game.say([{ who, text: e.desc ? `Носи. ${e.desc}` : S.bought || 'Держи.' }], () => Events.emit('shop:bought', e));
    Game.save();
  },
  open(shopId, who) {
    const S = SHOPS[shopId];
    Game.choose(who, `${S.greet} У тебя ${Inv.count('coins')} медяков.`, [...this.choices(shopId, who), { label: 'Уйти', fn: () => { } }]);
  },
};
