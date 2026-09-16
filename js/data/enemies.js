'use strict';
// Характеристики зверей на 1-м уровне. Уровень умножает здоровье, урон и опыт (CONFIG.enemyLevel).
//   force    — зверь силы: светится при применении силы, держит удар ножа (см. Enemy.guard)
//   faction  — на кого нападает (см. Factions)
//   crystals, meat — добыча с туши

const BEASTS = {
  rabbit: { name: 'Заяц', sprite: 'rabbit', hp: 1, xp: 2, meat: 1, r: 4, hw: 3, hh: 2, faction: 'animal' },
  boar: { name: 'Кабан', sprite: 'boar', hp: 3, dmg: 2, xp: 5, meat: 2, r: 7, faction: 'animal' },
  spiker: { name: 'Шипогрыз', sprite: 'spiker', hp: 4, dmg: 7, xp: 12, crystals: 1, meat: 1, r: 7, force: true, sight: 130, blood: '#6a3020' },
  jumper: { name: 'Костяной прыгун', sprite: 'jumper', hp: 4, dmg: 9, xp: 16, crystals: 2, r: 7, hw: 5, force: true, sight: 140, blood: '#8a5040', reach: 90, blast: 24 },
  bigJumper: { name: 'Большой костяной прыгун', sprite: 'bigJumper', hp: 5, dmg: 12, xp: 0, crystals: 2, r: 12, hw: 9, hh: 5, force: true, sight: 220, blood: '#8a5040', reach: 110, blast: 34, big: true },
  thrower: { name: 'Метатель', sprite: 'thrower', hp: 3, dmg: 7, xp: 18, crystals: 3, r: 6, hw: 5, force: true, blood: '#6a5040', sight: 170 },
  hunter: { name: 'Охотник', sprite: 'hunter', hp: 8, dmg: 1, xp: 60, r: 6, hw: 4, hh: 3, force: true, blood: '#a02030', faction: 'hunter', lvl: 6, rockDamage: 10 },
};

// Кто на кого нападает. Охотник, встретив героя, добавляет его во враги (Hunter.hates)
const Factions = {
  table: {
    beast: { player: true, hunter: true },
    hunter: { beast: true },
    animal: {},
    player: {},
  },
  hostile(a, b) {
    if (!a || !b || a === b) return false;
    if (a.hates && a.hates.includes(b.faction)) return true;
    return !!(this.table[a.faction] || {})[b.faction];
  },
};

// Бестиарий: что герой узнаёт о звере (показывается в меню после первой встречи)
const BEAST_NOTES = {
  rabbit: 'Пугливый, бегает быстрее героя. Загоняй к деревьям и камням. Мясо — 1 кусок.',
  boar: 'Мирный, пока не ранен. Раненый разгоняется и бьёт клыками — отойди в сторону. Мясо — 2 куска.',
  spiker: 'Зверь силы, похож на кабана. Бьёт сериями из двух рывков. Шкура держит нож — бей в паузе между рывками, когда выдохся или врезался в дерево. Кристалл — 1.',
  jumper: 'Зверь силы с костяными пластинами. Бьёт силой в точке прыжка и приземления — круги показывают куда. Уязвим сразу после приземления и когда выдохся после трёх прыжков. Кристаллы — 2.',
  bigJumper: 'Вожак прыгунов, вдвое крупнее. Удар силы шире, пластины держат даже камни, пока он в воздухе или на ногах. Кристаллы — 2.',
  thrower: 'Зверь силы, похожий на дикобраза. Стреляет веером из трёх шипов и отпрыгивает, если подойти. Рывок сквозь шипы или уходи вбок. Кристаллы — 3.',
  hunter: 'Интегрированный. Поднимает силой камни, что лежат вокруг, и швыряет их. Вплотную отшвыривает. После серии бросков выдыхается — только тогда нож его берёт.',
};

const CHAPTER_NAMES = { 0: 'Глава 0. Трущобы', 1: 'Глава 1. Чёрный лес', 2: 'Глава 2. Дорога в город' };
