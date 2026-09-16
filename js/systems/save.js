'use strict';
// Сохранение в localStorage. Одна ячейка. Формат версионируется: старые сохранения переводятся в новый вид.

const Save = {
  has() { try { return !!localStorage.getItem(CONFIG.saveKey); } catch (e) { return false; } },
  clear() { try { localStorage.removeItem(CONFIG.saveKey); } catch (e) { } },
  write() {
    Events.emit('game:beforeSave');   // сохранение фиксирует упущенные возможности (например, помощь извозчику)
    const p = Game.player;
    const data = {
      version: CONFIG.saveVersion,
      scene: World.name, x: p.x, y: p.y, objective: Game.objective, returnTo: Game.returnTo,
      player: {
        level: p.level, xp: p.xp, stats: p.stats, maxHp: p.maxHp, hp: p.hp, maxStamina: p.maxStamina, stamina: p.stamina,
        inv: p.inv, implant: p.implant, abilities: p.abilities, hasKnife: p.hasKnife, quickItem: p.quickItem, gear: p.gear,
      },
      flags: Game.flags, removed: [...Game.removed], stats: Game.stats,
    };
    try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(data)); } catch (e) { }
  },
  read() {
    let d;
    try { d = JSON.parse(localStorage.getItem(CONFIG.saveKey)); } catch (e) { d = null; }
    if (!d) return null;
    return this.migrate(d);
  },
  // v3 → v4: вещи в словаре ITEMS, метательные ножи — тоже вещь
  migrate(d) {
    const pl = d.player;
    if (!d.version || d.version < 4) {
      pl.inv = Inv.migrate(pl.inv || {}, pl);
      delete pl.knives;
      d.version = 4;
    }
    pl.inv = Object.assign(Inv.empty(), pl.inv);
    pl.gear = pl.gear || { weapon: 'knife', armor: 'rags' };
    d.stats = Object.assign(Game.freshStats(), d.stats || {});
    return d;
  },
};
