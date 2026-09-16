'use strict';
// Лавки. Строка товара:
//   { item: 'bread', price: 5 }                  — предмет из ITEMS (count — сколько штук за цену)
//   { weapon: 'shortsword' } / { armor: 'mail' } — снаряжение, цена и ранг берутся из WEAPONS / ARMORS
//   rank — с какого ранга гильдии продают (снаряжение и особые товары)

const SHOPS = {
  // Глава 0
  slumsBaker: { greet: 'Хлеб — пять медяков. Нет денег — не дыши на товар.', bought: 'Держи. И не крутись тут больше.', poor: 'Пять медяков. Ни медяком меньше. Иди зарабатывай.',
    items: [{ item: 'bread', price: 5 }] },
  apothecary: { greet: 'Настойка от кашля — двадцать медяков.', bought: 'Вот склянка. По ложке утром и вечером. И не тряси — осадок.',
    poor: 'Двадцать медяков. Приходи, когда наберёшь.', items: [{ item: 'medicine', price: 20 }] },

  // Город
  armorer: { greet: 'Сталь, кожа, кольчуга. Что по рангу — то и продам.', items: [
    { weapon: 'shortsword' }, { weapon: 'cleaver' }, { weapon: 'huntblade' },
    { armor: 'quilted' }, { armor: 'leather' }, { armor: 'mail' },
    { item: 'knives', count: 5, price: 20, rank: 'G-', label: 'Метательные ножи ×5' },
  ] },
  cityHealer: { greet: 'Трава и мазь нулевой ступени. Первую не держу — дорогая.', items: [
    { item: 'herbs', price: 4 }, { item: 'salve0', price: 15 },
  ] },
  cityBaker: { greet: 'Хлеб ржаной, пироги с капустой. Четыре медяка буханка.', items: [{ item: 'bread', price: 4 }] },
  cityFruiter: { greet: 'Яблоки из-за реки, сладкие.', items: [{ item: 'apples', price: 3 }] },
  cityClother: { greet: 'Сукно тонкое, крашеное. Не лапай — покупай.', items: [{ item: 'cloth', price: 7 }] },
  fishmonger: { greet: 'Утренний улов! Три медяка рыбина.', items: [{ item: 'fish', price: 3 }] },
  chandler: { greet: 'Свечи сальные, два медяка штука.', items: [{ item: 'candles', price: 2 }] },
  potter: { greet: 'Горшки, миски, кувшины. Звонкие, без трещин.', items: [{ item: 'pot', price: 5 }] },
  ironmonger: { greet: 'Гвозди, скобы, петли. Связка гвоздей — три медяка.', items: [{ item: 'nails', price: 3 }] },
  butcher: { greet: 'Мясо сырое, на жарку. Четыре медяка кусок.', items: [{ item: 'meatRaw', price: 4 }] },
  cityHerbs: { greet: 'Трава целебная, по пять медяков пучок.', items: [{ item: 'herbs', price: 5 }] },
  cityWine: { greet: 'Вино кислое, но крепкое. Четыре медяка.', items: [{ item: 'wine', price: 4 }] },
  tavern: { greet: 'Вино кислое, зато дешёвое.', items: [{ item: 'wine', price: 5 }] },
};
