'use strict';
// Вещи, оружие и одежда. Порядок в ITEMS — порядок в меню вещей.
//   icon  — ключ Art.spr         sell — цена у скупщика (если есть — скупщик берёт)
//   use   — действие по Space в меню (true — предмет можно повесить на быструю кнопку E)
//   desc  — строка или функция (если описание зависит от главы)

const ITEMS = {
  coins: { name: 'Медяки', icon: 'coin', desc: () => Game.flags.chapter === 0
    ? 'Хлеб у торговки — 5 медяков. Лекарство у аптекаря — 20.'
    : 'Деньги. Еда, мази, снаряжение, пошлины — всё за медяки.' },
  crystals: { name: 'Кристаллы зверей', icon: 'crystal', desc: 'Тёплые, будто живые. Их носят дворяне и купцы, стоят они целое состояние. Гильдия берёт по заказам.' },
  junk: { name: 'Хлам', icon: 'junkItem', sell: 1, desc: 'Битые бутылки, тряпьё, гнутые железки. Скупщики берут по медяку.' },
  apples: { name: 'Яблоки', icon: 'apple', sell: 2, desc: 'Краснобокие, с рынка. Скупщик даст по 2 медяка.' },
  cloth: { name: 'Отрез ткани', icon: 'cloth', sell: 4, desc: 'Добротное сукно. Скупщик даст 4 медяка, портниха обрадуется больше.' },
  vial: { name: 'Склянка с настойкой', icon: 'vial', sell: 3, desc: 'Чужая настойка. Скупщик даст 3 медяка.' },
  fish: { name: 'Рыба', icon: 'fish', sell: 2, desc: 'Речная, свежая. Пахнет соответственно.' },
  candles: { name: 'Свечи', icon: 'candles', sell: 1, desc: 'Сальные свечи из лавки свечника.' },
  nails: { name: 'Гвозди', icon: 'nails', sell: 1, desc: 'Связка кованых гвоздей.' },
  pot: { name: 'Горшок', icon: 'pot', sell: 2, desc: 'Глиняный, обожжённый. Звенит, если щёлкнуть.' },
  wine: { name: 'Вино', icon: 'wine', sell: 3, desc: 'Бутыль кислого вина из таверны.' },
  bread: { name: 'Хлеб', icon: 'bread', desc: 'Свежая буханка.' },
  medicine: { name: 'Лекарство', icon: 'medicine', desc: 'Горькая настойка от кашля. Для матери.' },
  meatRaw: { name: 'Сырое мясо', icon: 'meatRaw', desc: 'Пожарить на костре.' },
  meatCooked: { name: 'Жареное мясо', icon: 'meatCooked', desc: 'Возвращает выносливость и немного здоровья.',
    use: (p) => { Inv.take('meatCooked'); p.eat(60, 3, 'Жареное мясо. Силы возвращаются.'); } },
  herbs: { name: 'Целебная трава', icon: 'herb', desc: 'Лечит лёгкие раны: +4 здоровья.',
    use: (p) => {
      if (p.hp >= p.maxHp) { Game.hint('Раны и так затянуты.', 1.5); return; }
      Inv.take('herbs'); p.heal(4); Sfx.pick(); Game.hint('Горько. Раны чуть затянулись.', 1.8);
    } },
  salve0: { name: 'Мазь нулевой ступени', icon: 'salve', desc: 'Затягивает царапины и неглубокие раны: +6 здоровья.',
    use: (p) => {
      if (p.hp >= p.maxHp) { Game.hint('Раны и так затянуты.', 1.5); return; }
      Inv.take('salve0'); p.heal(6); Sfx.crystal(); Game.hint('Мазь холодит, раны стягиваются.', 1.8);
    } },
  knives: { name: 'Метательные ножи', icon: 'iconKnives', desc: 'K — метнуть. Пробивают только уязвимого зверя, как и нож.' },
  scroll: { name: 'Обрывок свитка', icon: 'scroll', desc: 'Потрёпанный, в пятнах крови и копоти. Нашёл в сумке охотника.',
    use: () => Chapter1.readScroll() },
  pendant: { name: 'Блестящая подвеска', icon: 'pendant', desc: 'Тёплая на ощупь. Из-за неё всё и случилось.' },
  letter: { name: 'Письмо гильдии', icon: 'letter', desc: 'Для извозчика Ждана на стоянке.' },
  cargo: { name: 'Груз пропавшего обоза', icon: 'sack', desc: 'Вернуть клерку гильдии.' },
  purse: { name: 'Чужой кошель', icon: 'purse', desc: 'Расшитый, тяжёлый. Хозяйка обещала награду.' },
  sealedLetter: { name: 'Запечатанное письмо', icon: 'letter', desc: 'Писарь просил отнести ростовщику в богатый квартал.' },
};

const WEAPONS = {
  knife: { name: 'Отцовский нож', dmg: 1, reach: 11, desc: 'Короткий, потёртый. Режет лучше, чем кажется.' },
  shortsword: { name: 'Короткий меч', dmg: 2, reach: 13, price: 60, rank: 'G', desc: 'Простая сталь. Урон заметно выше ножа.' },
  cleaver: { name: 'Боевой тесак', dmg: 3, reach: 13, price: 150, rank: 'F-', desc: 'Тяжёлый клинок охотников на кабанов.' },
  huntblade: { name: 'Клинок охотника', dmg: 4.5, reach: 15, price: 320, rank: 'E-', desc: 'Гильдейская работа. Длинный, злой, точный.' },
};
const ARMORS = {
  rags: { name: 'Рваная рубаха', def: 0, desc: 'Защищает от холода. От когтей — нет.' },
  quilted: { name: 'Стёганка', def: 1, price: 50, rank: 'G', desc: 'Удар зверя ослабляется на 1.' },
  leather: { name: 'Кожаный доспех', def: 2, price: 140, rank: 'F-', desc: 'Удар зверя ослабляется на 2.' },
  mail: { name: 'Кольчуга', def: 3, price: 360, rank: 'E-', slow: 0.92, desc: 'Удар ослабляется на 3, но чуть медленнее бег.' },
};

// Предметы мира (ящики, камни): размеры тела и масса
const OBJ_KINDS = {
  rock: { mass: 'light', hw: 4, hh: 3, dmg: 1 },
  crate: { mass: 'medium', hw: 6, hh: 5, dmg: 1 },
  barrel: { mass: 'medium', hw: 4, hh: 4, dmg: 1 },
  boulder: { mass: 'heavy', hw: 8, hh: 6, dmg: 2 },
};
