'use strict';
// Сцены главы 2: тракт, стоянка извозчика, городские ворота, город (ASCII-карта MAPS.city),
// гильдия, таверна, охотничьи угодья, Дальняя роща, Гнилые болота, хутор.

// Тракт: длинная дорога с колеями, развилками и опасными обочинами
SCENES.road = {
  name: 'road', theme: 'forest', w: 124, h: 36, fill: 'T', respawn: true,
  build(P) {
    const protect = new Set();
    carvePath(P, [[0, 20], [10, 22], [20, 18], [32, 14], [44, 17], [56, 22], [68, 26], [80, 22], [92, 16], [104, 19], [118, 22]], protect, { half: 2, road: true });
    P.circle(20, 26, 5, '.'); P.circle(46, 9, 5, '.'); P.circle(72, 30, 5, '.'); P.circle(96, 10, 5, '.');
    P.circle(112, 28, 4, '.'); P.rect(45, 2, 47, 6, '.');
    const spawns = [
      ['gateway', 1, 20, { to: 'forest', at: [110, 20], label: 'назад в чащу' }],
      ['gateway', 122, 22, { to: 'camp', at: [3, 14], label: 'к дыму костра' }],
      ['npc', 20, 26, { who: 'hunterB', role: 'roadHunter', face: 'r' }],
      ['npc', 72, 30, { who: 'villager', role: 'pilgrim', face: 'l' }],
      ['spiker', 40, 12, { lvl: 3 }], ['spiker', 62, 25, { lvl: 4 }], ['thrower', 88, 13, { lvl: 4 }],
      ['boar', 28, 17, { lvl: 2 }], ['rabbit', 50, 20], ['rabbit', 84, 24], ['boar', 100, 22, { lvl: 2 }],
      ['herb', 24, 27], ['herb', 94, 11], ['berries', 48, 10], ['berries', 76, 29],
      ['campfire', 46, 9, { save: 'road' }],
      ['campfire', 112, 28, { save: 'roadEnd' }],
      ['gateway', 46, 3, { to: 'village', at: [28, 36], label: 'тропа к хутору' }],
      ['crate', 21, 24], ['barrel', 22, 27], ['barrel', 95, 12],
      ['container', 21, 24, { kind: 'crate', name: 'брошенный ящик', loot: { coins: 3 } }],
      ['container', 95, 12, { kind: 'crate', name: 'бочку у обочины', loot: { herbs: 1 } }],
    ];
    protectSpawns(spawns, protect);
    overgrow(P, protect, { trees: 0.06, bushes: 0.08, rocks: 0.03 });
    return spawns;
  },
};

// Стоянка извозчика: костёр, телега, мешки. Звери появляются из story/chapter2.js
SCENES.camp = {
  name: 'camp', theme: 'forest', w: 44, h: 28, fill: 'T',
  build(P) {
    P.circle(20, 14, 10, '.'); P.rect(0, 12, 44, 16, '.');
    for (let x = 0; x < 44; x++) P.set(x, 14, 'y');
    for (let y = 1; y < 27; y++) for (let x = 1; x < 43; x++) {
      if (P.get(x, y) !== '.') continue;
      const r = P.rng();
      if (r < 0.05) P.set(x, y, 'T'); else if (r < 0.12) P.set(x, y, 'b'); else if (r < 0.3) P.set(x, y, ',');
    }
    return [
      ['gateway', 1, 14, { to: 'road', at: [120, 22], label: 'назад на тракт' }],
      ['gateway', 42, 14, { to: 'gate', at: [3, 14], label: 'к городским воротам' }],
      ['npc', 18, 11, { who: 'carter', role: 'carter', face: 'r' }],
      ['npc', 24, 18, { who: 'villager', role: 'campGuest', face: 'l' }],
      ['crate', 15, 12], ['barrel', 26, 12], ['barrel', 14, 17],
      ['container', 15, 12, { kind: 'chest', name: 'мешки в телеге', loot: { coins: 2 }, watched: true, owners: ['carter'] }],
      ['herb', 12, 19], ['berries', 28, 8],
      ['mark', 17, 13, { tag: 'cartSpot' }],
    ];
  },
};

// Городские ворота: стража и очередь
SCENES.gate = {
  name: 'gate', theme: 'slums', w: 40, h: 26, fill: '.',
  build(P) {
    const { set, rect } = P;
    rect(0, 0, 39, 0, 'X'); rect(0, 25, 39, 25, 'X'); rect(0, 0, 0, 25, 'X');
    rect(33, 0, 33, 25, 'X');                       // городская стена
    rect(34, 11, 39, 16, ':');
    rect(33, 12, 33, 14, 'f');                      // шлагбаум (поднимается в story/chapter2.js)
    rect(28, 20, 32, 20, 'f'); rect(28, 21, 28, 24, 'f');
    rect(0, 12, 32, 16, ':');
    return [
      ['gateway', 1, 14, { to: 'camp', at: [41, 14], label: 'назад к стоянке' }],
      ['gateway', 38, 13, { to: 'city', at: [3, 31], label: 'в город' }],
      ['watcher', 31, 12, { who: 'guard', role: 'gateGuardA', look: [1.6, 3], angles: [Math.PI, Math.PI / 2, Math.PI] }],
      ['watcher', 31, 16, { who: 'guard', role: 'gateGuardB', look: [1.8, 3.2], angles: [Math.PI, -Math.PI / 2, Math.PI] }],
      ['npc', 24, 13, { who: 'villager', role: 'queueA', face: 'r' }],
      ['npc', 23, 16, { who: 'kindwoman', role: 'queueB', face: 'r' }],
      ['walker', 16, 14, { who: 'porter', area: [4, 11, 30, 17], barks: 'city', carry: 'sack' }],
      ['walker', 10, 13, { who: 'villager', area: [4, 11, 30, 17], barks: 'city' }],
      ['crate', 30, 21], ['barrel', 31, 23], ['crate', 20, 19],
      ['container', 20, 19, { kind: 'crate', name: 'ящик у стены', loot: { coins: 2 }, watched: true }],
    ];
  },
};

// Город: ASCII-карта. Запад — ворота, север — рынок и ремесленный ряд, центр — площадь гильдии,
// юго-запад — Нижний квартал, восток — богатые дома, северо-восток — часовня
const CITY_STALLS = [
  // [x, y, роль хозяина, вид прилавка, предмет, цвет навеса]
  [20, 11, 'cityBaker', 'baker', 'bread', 0], [24, 11, 'cityFruiter', 'fruiter', 'apples', 2], [28, 11, 'cityClother', 'clother', 'cloth', 1],
  [32, 11, 'fishmonger', 'fishmonger', 'fish', 1], [36, 11, 'chandler', 'scribe', 'candles', 3],
  [20, 16, 'potter', 'villager', 'pot', 3], [24, 16, 'ironmonger', 'smith', 'nails', 0], [28, 16, 'butcher', 'barkeep', 'meatRaw', 0],
  [32, 16, 'cityHerbs', 'apothecary', 'herbs', 2], [36, 16, 'cityWine', 'merchant', 'wine', 1],
];
const ITEM_ICON = { bread: 'bread', apples: 'apple', cloth: 'cloth', fish: 'fish', candles: 'candles', pot: 'pot', nails: 'nails', meatRaw: 'meatRaw', herbs: 'herb', wine: 'wine' };

SCENES.city = {
  name: 'city', theme: 'slums', map: MAPS.city,
  build(P) {
    const stalls = {};
    for (const [x, y, , , , col] of CITY_STALLS) { stalls[x + ',' + y] = col; stalls[(x + 1) + ',' + y] = col; }
    return paintTown(P, { doors: { '62,20': 'guild', '71,20': 'tavern' }, stalls, colors: { '58,14': 1, '68,15': 2, '79,1': 3 } });
  },
  smoke: [[6, 2], [17, 2], [26, 3], [44, 4], [60, 14], [70, 15], [8, 22], [30, 26], [4, 51], [22, 51], [66, 50], [88, 1]],
  spawns: [
    ['gateway', 1, 31, { to: 'gate', at: [37, 13], label: 'к воротам' }],
    ['gateway', 94, 12, { to: 'hunt', at: [3, 20], label: 'в охотничьи угодья' }],
    ['mark', 62, 21, { tag: 'guildDoor' }], ['mark', 71, 21, { tag: 'tavernDoor' }],

    // Привратная площадь
    ['watcher', 4, 29, { who: 'guard', role: 'cityGuard', look: [2, 3.5], angles: [0, Math.PI / 2, -Math.PI / 2] }],
    ['npc', 8, 33, { who: 'clerk', role: 'crier', face: 'r' }],
    ['npc', 14, 28, { who: 'boy', role: 'cityBoy', face: 'l' }],
    ['npc', 2, 36, { who: 'dealer', role: 'cityDealer', face: 'r' }],

    // Рынок: у каждого прилавка хозяин, он оглядывается и замечает воров
    ...CITY_STALLS.flatMap(([x, y, role, who, item]) => [
      ['watcher', x, y - 1, { who, role, look: [1.4, 2.8], angles: [Math.PI / 2, 0, Math.PI / 2, Math.PI, -Math.PI / 2] }],
      ['container', x + 1, y, { kind: 'stall', watched: true, name: ITEMS[item].name.toLowerCase(), icon: ITEM_ICON[item], owners: [role], loot: { [item]: 1 } }],
    ]),
    ['npc', 30, 19, { who: 'villager', role: 'cityGossip', face: 'l' }],
    ['npc', 42, 19, { who: 'tailor', role: 'tailor', face: 'l' }],

    // Ремесленный ряд
    ['npc', 7, 6, { who: 'smith', role: 'armorer', face: 'r' }],
    ['npc', 13, 6, { who: 'apothecary', role: 'cityHealer', face: 'l' }],

    // Площадь гильдии
    ['npc', 68, 24, { who: 'hunterB', role: 'cityHunter', face: 'l' }],
    ['npc', 56, 30, { who: 'scribe', role: 'scribe', face: 'r' }],
    ['watcher', 70, 31, { who: 'guard', role: 'plazaGuard', look: [2, 3.5], angles: [Math.PI, Math.PI / 2, -Math.PI / 2] }],

    // Часовня
    ['npc', 83, 5, { who: 'priest', role: 'priest', face: 'r' }],
    ['npc', 78, 6, { who: 'porter', role: 'carpenter', face: 'r' }],

    // Нижний квартал
    ['npc', 9, 46, { who: 'oldlady', role: 'oldLady', face: 'r' }],
    ['npc', 26, 55, { who: 'washer', role: 'catLady', face: 'l' }],
    ['npc', 16, 49, { who: 'kindwoman', role: 'worriedMother', face: 'r' }],
    ['critter', 27, 56, { kind: 'cat', area: [20, 50, 34, 60] }], ['critter', 24, 53, { kind: 'cat', area: [20, 50, 34, 60] }],
    ['junk', 12, 40, { item: 'Гнилая корзина' }], ['junk', 30, 44, { item: 'Ржавый котелок' }], ['junk', 38, 59, { item: 'Тряпьё' }], ['junk', 4, 40, { item: 'Битый кувшин' }],
    ['crate', 18, 58], ['container', 18, 58, { kind: 'crate', name: 'ящик', loot: { coins: 3 }, watched: true }],
    ['barrel', 35, 40], ['container', 35, 40, { kind: 'crate', name: 'бочку', loot: { junk: 1 }, watched: true }],

    // Богатый квартал
    ['npc', 80, 43, { who: 'lady', role: 'merchantWife', face: 'l' }],
    ['npc', 72, 53, { who: 'noble', role: 'moneylender', face: 'r' }],
    ['watcher', 84, 51, { who: 'guard', role: 'richGuard', look: [2, 3.5], angles: [Math.PI, 0, Math.PI / 2] }],

    // Прохожие
    ...[['villager', 26, 13], ['kindwoman', 34, 18], ['porter', 22, 19], ['girl', 38, 13], ['lady', 30, 9], ['guard', 18, 13]]
      .map(([who, x, y]) => ['walker', x, y, { who, area: [17, 7, 44, 21], barks: 'city', carry: who === 'porter' ? 'sack' : null }]),
    ...[['villager', 6, 31], ['porter', 12, 30], ['hunterB', 9, 28]]
      .map(([who, x, y]) => ['walker', x, y, { who, area: [2, 26, 18, 36], barks: 'city', carry: who === 'porter' ? 'sack' : null }]),
    ...[['hunterB', 60, 24], ['guard', 66, 32], ['villager', 58, 29], ['noble', 70, 27]]
      .map(([who, x, y]) => ['walker', x, y, { who, area: [53, 21, 73, 33], barks: 'city' }]),
    ...[['boy', 20, 46, 46], ['girl', 12, 52, 42], ['drunk', 34, 52, 18], ['oldman', 8, 58, 16], ['washer', 40, 48, 24], ['porter', 28, 38, 26]]
      .map(([who, x, y, speed]) => ['walker', x, y, { who, area: [2, 36, 46, 62], barks: 'slums', speed, carry: who === 'porter' ? 'sack' : null }]),
    ...[['noble', 76, 40], ['lady', 88, 43], ['guard', 80, 59], ['noble', 70, 56]]
      .map(([who, x, y]) => ['walker', x, y, { who, area: [60, 36, 94, 62], barks: 'rich' }]),
    ...[['villager', 60, 7], ['oldlady', 76, 9], ['kindwoman', 86, 12]]
      .map(([who, x, y]) => ['walker', x, y, { who, area: [54, 4, 94, 13], barks: 'city' }]),
    ['critter', 27, 18, { kind: 'pigeon', flock: 5 }], ['critter', 34, 13, { kind: 'pigeon', flock: 4 }], ['critter', 61, 27, { kind: 'pigeon', flock: 5 }],
    ['critter', 81, 7, { kind: 'pigeon', flock: 3 }],
    ['critter', 14, 44, { kind: 'dog', area: [2, 36, 46, 62] }], ['critter', 40, 56, { kind: 'dog', area: [2, 36, 46, 62] }], ['critter', 10, 30, { kind: 'dog', area: [2, 26, 18, 36] }],
  ],
};

SCENES.guild = room('guild', 18, 12, P => {
  P.rect(1, 2, 16, 9, 'Q');
  P.rect(4, 4, 12, 4, 'c');           // стойка
  P.set(7, 1, 'd'); P.set(8, 1, 'd');  // доска заказов
  P.rect(6, 8, 11, 8, 'r');
  P.set(15, 3, 'C'); P.set(2, 3, 'H');
}, [
  ['npc', 8, 3, { who: 'clerk', role: 'guildClerk', face: 'r' }],
  ['npc', 14, 7, { who: 'hunterB', role: 'guildHunter', face: 'l' }],
  ['npc', 3, 7, { who: 'guard', role: 'guildVeteran', face: 'r' }],
  ['mark', 7, 2, { tag: 'board' }],
]);

SCENES.tavern = room('tavern', 16, 11, P => {
  P.rect(2, 3, 5, 3, 'c');
  P.set(9, 4, 't'); P.set(10, 4, 't'); P.set(9, 7, 't'); P.set(10, 7, 't');
  P.set(13, 2, 'B'); P.set(13, 3, 'V');
  P.set(2, 8, 'k'); P.rect(6, 6, 8, 6, 'r');
}, [
  ['npc', 3, 2, { who: 'barkeep', role: 'barkeep', face: 'r' }],
  ['npc', 9, 5, { who: 'hunterB', role: 'tavernHunter', face: 'r' }],
  ['npc', 11, 8, { who: 'villager', role: 'tavernDrunk', face: 'l' }],
  ['campfire', 2, 9, { save: 'tavern', lit: true }],
]);

// Охотничьи угодья: сюда гильдия шлёт новичков
SCENES.hunt = {
  name: 'hunt', theme: 'forest', w: 84, h: 42, fill: 'T', respawn: true,
  build(P) {
    const glades = [[8, 20, 6], [20, 12, 6], [30, 26, 7], [44, 16, 7], [56, 28, 6], [68, 18, 7], [76, 30, 5]];
    for (const [x, y, r] of glades) P.circle(x, y, r, '.');
    const protect = new Set();
    carvePath(P, [[0, 20], [10, 20], [20, 13], [30, 25], [42, 17], [56, 27], [68, 19], [80, 28]], protect);
    const spawns = [
      ['gateway', 1, 20, { to: 'city', at: [92, 12], label: 'назад в город' }],
      ['gateway', 82, 28, { to: 'grove', at: [2, 22], label: 'в Дальнюю рощу' }],
      ['campfire', 10, 22, { save: 'hunt' }],
      ['rabbit', 14, 18], ['rabbit', 22, 10], ['rabbit', 34, 28], ['rabbit', 48, 14], ['rabbit', 60, 30], ['rabbit', 72, 20],
      ['boar', 18, 14, { lvl: 2 }], ['boar', 32, 24, { lvl: 3 }], ['boar', 58, 26, { lvl: 3 }], ['boar', 70, 16, { lvl: 3 }],
      ['spiker', 26, 12, { lvl: 3 }], ['spiker', 44, 18, { lvl: 4 }], ['spiker', 66, 20, { lvl: 4 }],
      ['jumper', 46, 14, { lvl: 4 }], ['jumper', 74, 30, { lvl: 5 }],
      ['thrower', 56, 30, { lvl: 4 }], ['thrower', 78, 28, { lvl: 5 }],
      ['herb', 12, 24], ['herb', 28, 28], ['herb', 43, 12], ['herb', 62, 26], ['herb', 70, 22], ['herb', 20, 9],
      ['berries', 16, 22], ['berries', 50, 18], ['berries', 64, 32],
    ];
    protectSpawns(spawns, protect);
    overgrow(P, protect, { glades, trees: 0.06, bushes: 0.08, rocks: 0.03 });
    return spawns;
  },
};

SCENES.grove = wild({
  name: 'grove', w: 86, h: 44,
  glades: [[8, 22, 6], [22, 12, 7], [30, 30, 7], [44, 20, 8], [58, 32, 7], [62, 12, 8], [76, 22, 7]],
  path: [[0, 22], [8, 22], [22, 13], [30, 29], [44, 20], [58, 31], [62, 13], [76, 22], [85, 22]],
  spawns: [
    ['gateway', 1, 22, { to: 'hunt', at: [80, 28], label: 'назад в угодья' }],
    ['gateway', 84, 22, { to: 'marsh', at: [2, 20], label: 'на Гнилые болота' }],
    ['campfire', 10, 25, { save: 'grove' }],
    ['spiker', 20, 10, { lvl: 5 }], ['spiker', 46, 24, { lvl: 6 }], ['spiker', 74, 20, { lvl: 6 }], ['spiker', 32, 33, { lvl: 5 }],
    ['jumper', 24, 15, { lvl: 5 }], ['jumper', 42, 17, { lvl: 6 }], ['jumper', 60, 30, { lvl: 6 }], ['jumper', 64, 14, { lvl: 7 }],
    ['thrower', 28, 28, { lvl: 5 }], ['thrower', 56, 34, { lvl: 6 }], ['thrower', 78, 25, { lvl: 7 }],
    ['boar', 12, 19, { lvl: 4 }], ['boar', 48, 21, { lvl: 5 }], ['rabbit', 18, 14], ['rabbit', 70, 23],
    ['herb', 26, 11], ['herb', 34, 31], ['herb', 50, 18], ['herb', 60, 34], ['herb', 72, 20], ['berries', 14, 24], ['berries', 64, 10],
  ],
});

SCENES.marsh = wild({
  name: 'marsh', w: 90, h: 44, water: 0.1,
  glades: [[8, 20, 6], [20, 30, 7], [36, 14, 8], [48, 30, 7], [60, 22, 8], [74, 12, 7], [82, 30, 6]],
  path: [[0, 20], [8, 20], [20, 29], [36, 15], [48, 29], [60, 22], [74, 13], [82, 29]],
  spawns: [
    ['gateway', 1, 20, { to: 'grove', at: [82, 22], label: 'назад в рощу' }],
    ['campfire', 10, 23, { save: 'marsh' }],
    ['spiker', 18, 32, { lvl: 8 }], ['spiker', 40, 12, { lvl: 9 }], ['spiker', 50, 32, { lvl: 9 }], ['spiker', 62, 25, { lvl: 10 }], ['spiker', 80, 32, { lvl: 10 }],
    ['jumper', 34, 17, { lvl: 8 }], ['jumper', 58, 20, { lvl: 9 }], ['jumper', 76, 14, { lvl: 10 }],
    ['thrower', 24, 28, { lvl: 8 }], ['thrower', 46, 27, { lvl: 9 }], ['thrower', 72, 10, { lvl: 11 }],
    ['herb', 12, 18], ['herb', 22, 33], ['herb', 38, 12], ['herb', 46, 33], ['herb', 62, 19], ['herb', 76, 11], ['herb', 84, 31],
  ],
});

// Хутор у тракта: поля, заборы, колодец и свои заботы
SCENES.village = {
  name: 'village', theme: 'slums', w: 58, h: 40, fill: '.', respawn: true,
  build(P) {
    const { set, rect, get, rng } = P;
    rect(0, 0, 57, 0, 'X'); rect(0, 39, 57, 39, 'X'); rect(0, 0, 0, 39, 'X'); rect(57, 0, 57, 39, 'X');
    for (const [x, y, w, h] of [[6, 6, 5, 3], [16, 4, 4, 3], [26, 6, 6, 4], [40, 5, 5, 3], [8, 16, 4, 3], [44, 16, 5, 3]]) {
      rect(x, y, x + w - 1, y + h - 1, '#'); set(x + Math.floor(w / 2), y + h - 1, 'D');
    }
    // Поля за заборами
    const field = (x0, y0, x1, y1) => {
      rect(x0, y0, x1, y1, ',');
      rect(x0 - 1, y0 - 1, x1 + 1, y0 - 1, 'f'); rect(x0 - 1, y1 + 1, x1 + 1, y1 + 1, 'f');
      rect(x0 - 1, y0, x0 - 1, y1, 'f'); rect(x1 + 1, y0, x1 + 1, y1, 'f');
      set(Math.floor((x0 + x1) / 2), y1 + 1, '.');   // калитка
    };
    field(4, 24, 18, 32); field(36, 24, 52, 33);
    rect(22, 10, 34, 38, ':'); rect(2, 13, 55, 14, ':');
    set(28, 16, 'w');   // колодец
    for (let i = 0; i < 60; i++) { const x = (rng() * 58) | 0, y = (rng() * 40) | 0; if (get(x, y) === '.' && rng() < 0.5) set(x, y, ','); }
    return [
      ...paintTown(P),
      ['gateway', 28, 37, { to: 'road', at: [46, 5], label: 'назад на тракт' }],
      ['npc', 26, 17, { who: 'villager', role: 'farmer', face: 'r' }],
      ['npc', 31, 17, { who: 'kindwoman', role: 'herbwoman', face: 'l' }],
      ['npc', 14, 12, { who: 'boy', role: 'villageBoy', face: 'r' }],
      ['walker', 30, 13, { who: 'villager', area: [2, 10, 55, 22], barks: 'village' }],
      ['critter', 20, 18, { kind: 'chicken', area: [14, 15, 34, 22] }], ['critter', 24, 19, { kind: 'chicken', area: [14, 15, 34, 22] }],
      ['critter', 33, 12, { kind: 'chicken', area: [20, 10, 40, 22] }], ['critter', 36, 18, { kind: 'dog', area: [2, 10, 55, 22] }],
      ['campfire', 24, 20, { save: 'village' }],
      ['boar', 8, 27, { lvl: 2 }], ['boar', 14, 30, { lvl: 2 }], ['boar', 40, 27, { lvl: 2 }], ['boar', 48, 30, { lvl: 3 }], ['boar', 44, 25, { lvl: 3 }],
      ['rabbit', 12, 26], ['rabbit', 46, 31], ['herb', 20, 35], ['herb', 54, 20], ['berries', 4, 18],
      ['crate', 34, 12], ['barrel', 20, 9],
      ['container', 34, 12, { kind: 'crate', name: 'ящик у амбара', loot: { coins: 3 }, watched: true }],
    ];
  },
};
