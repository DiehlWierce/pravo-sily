'use strict';
// Вещи героя: словарь «ключ ITEMS → количество». Всё, что лежит в сумке, проходит через Inv.

const Inv = {
  empty() { const o = {}; for (const k in ITEMS) o[k] = 0; return o; },
  get bag() { return Game.player.inv; },
  count(id) { return this.bag[id] || 0; },
  has(id, n = 1) { return this.count(id) >= n; },
  add(id, n = 1) { this.bag[id] = this.count(id) + n; },
  take(id, n = 1) { if (!this.has(id, n)) return false; this.bag[id] -= n; return true; },
  clear(id) { this.bag[id] = 0; },
  use(id) {
    const def = ITEMS[id];
    if (!def || !def.use || !this.has(id)) return false;
    def.use(Game.player); return true;
  },
  name(id) { return ITEMS[id] ? ITEMS[id].name : id; },
  desc(id) { const d = ITEMS[id].desc; return typeof d === 'function' ? d() : d; },
  // Всё, что берёт скупщик
  sellable() { return Object.keys(ITEMS).filter(id => ITEMS[id].sell && this.count(id)); },
  sellAll() {
    let total = 0;
    for (const id of this.sellable()) { total += ITEMS[id].sell * this.count(id); this.clear(id); }
    this.add('coins', total);
    return total;
  },
  // Добыча из тайника / с прилавка: { coins: 2, bread: 1 } → строка для подсказки
  grant(loot) {
    const got = [];
    for (const id in loot) {
      if (!ITEMS[id] || !loot[id]) continue;
      this.add(id, loot[id]);
      got.push(id === 'coins' ? `${loot[id]} ${plural(loot[id], 'медяк', 'медяка', 'медяков')}` : `${this.name(id).toLowerCase()}${loot[id] > 1 ? ' ×' + loot[id] : ''}`);
    }
    return got;
  },

  // Старые сохранения (до v4): массивы хлама и товаров, флаги свитка и подвески, ножи отдельно
  migrate(old, player) {
    const inv = this.empty();
    const goodsIds = { 'Яблоки': 'apples', 'Отрез ткани': 'cloth', 'Склянка с настойкой': 'vial' };
    for (const k in old) {
      const v = old[k];
      if (k === 'junk') inv.junk = Array.isArray(v) ? v.length : v;
      else if (k === 'goods') for (const g of v || []) { const id = goodsIds[g.name]; if (id) inv[id]++; }
      else if (k === 'quest') { inv.letter = (v && v.letter) || 0; inv.cargo = (v && v.cargo) || 0; }
      else if (typeof v === 'boolean') inv[k] = v ? 1 : 0;
      else if (typeof v === 'number') inv[k] = v;
    }
    if (player && player.knives) inv.knives += player.knives;
    return inv;
  },
};
