'use strict';
// Сцены главы 0: трущобы (ASCII-карта MAPS.slums) и дома, в которые можно зайти.

SCENES.slums = {
  name: 'slums', theme: 'slums', map: MAPS.slums,
  build(P) {
    return paintTown(P, {
      doors: { '4,35': 'home', '14,30': 'widow', '47,33': 'junkwoman', '3,16': 'soldier', '25,18': 'grumpy', '25,5': 'apothecary' },
      colors: { '3,33': 0 },
      stalls: { '44,6': 0, '45,6': 0, '46,6': 0, '50,6': 2, '51,6': 2, '52,6': 2, '44,10': 1, '45,10': 1, '46,10': 1, '55,8': 3, '55,9': 3 },
    });
  },
  // Дым из труб
  smoke: [[3, 14], [8, 26], [19, 13], [31, 2], [45, 20], [52, 35], [17, 34], [9, 39]],
  spawns: [
    // Кучи хлама по закоулкам
    ...[[1, 8], [6, 10], [11, 6], [16, 2], [22, 9], [27, 8], [33, 9], [39, 6], [44, 15], [55, 3],
      [1, 19], [10, 17], [17, 20], [26, 21], [34, 19], [41, 21], [51, 19], [57, 13],
      [1, 31], [6, 36], [15, 41], [21, 28], [27, 41], [31, 27], [38, 30], [43, 24], [49, 40], [57, 33]]
      .map(([x, y], i) => ['junk', x, y, { item: ['Битая бутылка', 'Моток гнилой верёвки', 'Ржавая железка', 'Ворох тряпья', 'Треснувший горшок', 'Старый башмак', 'Гнутая ложка', 'Обломок подковы'][i % 8] }]),

    // Ящики и бочки: и препятствие, и тайник. Обыскивать можно, только если никто не видит
    ...[[12, 17, 'crate', { coins: 1 }], [29, 21, 'barrel', { junk: 1 }], [42, 12, 'crate', { coins: 2 }],
      [20, 32, 'barrel', { junk: 1 }], [36, 27, 'crate', { coins: 1 }], [48, 17, 'barrel', { coins: 2 }],
      [7, 22, 'crate', { junk: 1 }], [22, 12, 'barrel', { coins: 1 }], [54, 21, 'crate', { herbs: 1 }],
      [33, 36, 'barrel', { coins: 1 }], [16, 24, 'crate', { junk: 1 }], [45, 35, 'barrel', { coins: 2 }],
      [56, 29, 'crate', { coins: 1 }], [10, 42, 'barrel', { junk: 1 }], [39, 17, 'crate', { coins: 1 }]]
      .flatMap(([x, y, kind, loot]) => [[kind, x, y], ['container', x, y, { name: kind === 'crate' ? 'ящик' : 'бочку', kind: 'crate', loot, watched: true }]]),
    ...[[14, 13, 'barrel'], [23, 6, 'crate'], [37, 22, 'barrel'], [50, 25, 'crate'], [4, 21, 'barrel'], [27, 35, 'crate'], [19, 41, 'barrel'], [43, 3, 'crate']]
      .map(([x, y, k]) => [k, x, y]),

    // Жители
    ['npc', 12, 20, { who: 'oldman', role: 'beggar', face: 'r' }],
    ['npc', 30, 25, { who: 'washer', role: 'washer', face: 'l' }],
    ['npc', 21, 30, { who: 'boy', role: 'boy', face: 'r' }],
    ['npc', 37, 13, { who: 'kindwoman', role: 'kindwoman', face: 'l' }],
    ['watcher', 26, 42, { who: 'drunk', role: 'drunk', sit: true, look: [2, 3.5] }],
    ['npc', 41, 8, { who: 'dealer', role: 'dealer', face: 'r' }],
    // Хозяева стоят сбоку от прилавков и оглядываются: красть — только поймав момент
    ['watcher', 43, 6, { who: 'baker', role: 'baker', look: [1.6, 3], angles: [0, Math.PI / 2, 0, Math.PI] }],
    ['watcher', 49, 6, { who: 'fruiter', role: 'fruiter', look: [1.4, 2.6], angles: [0, Math.PI / 2, Math.PI] }],
    ['watcher', 43, 10, { who: 'clother', role: 'clother', look: [1.2, 2.4], angles: [0, Math.PI / 2, Math.PI] }],
    ['watcher', 54, 9, { who: 'smith', role: 'smith', look: [1.8, 3], angles: [Math.PI, Math.PI / 2, 0] }],
    ['watcher', 49, 10, { who: 'merchant', role: 'merchant', look: [1.2, 2.2], angles: [0, Math.PI / 2, 0, -Math.PI / 2] }],
    ['watcher', 47, 13, { who: 'thug', role: 'guardA', look: [1.5, 2.8], angles: [-Math.PI / 2, Math.PI, 0] }],
    ['watcher', 47, 3, { who: 'thug', role: 'guardB', look: [1.5, 2.8], angles: [Math.PI, Math.PI / 2, -Math.PI / 2] }],
    ['container', 46, 6, { kind: 'stall', watched: true, name: 'хлеб', icon: 'bread', owners: ['baker'], loot: { bread: 1 } }],
    ['container', 50, 6, { kind: 'stall', watched: true, name: 'яблоки', icon: 'apple', owners: ['fruiter'], loot: { apples: 1 } }],
    ['container', 52, 6, { kind: 'stall', watched: true, name: 'яблоки', icon: 'apple', owners: ['fruiter'], loot: { apples: 1 } }],
    ['container', 45, 10, { kind: 'stall', watched: true, name: 'отрез ткани', icon: 'cloth', owners: ['clother'], loot: { cloth: 1 } }],
    ['container', 51, 10, { kind: 'pendant', watched: true, name: 'блестящую подвеску', icon: 'pendant', owners: ['merchant', 'guardA', 'guardB'], loot: { pendant: 1 } }],

    // Прохожие и живность
    ['walker', 44, 13, { who: 'villager', area: [40, 1, 57, 14], barks: 'slums' }],
    ['walker', 52, 12, { who: 'kindwoman', area: [40, 1, 57, 14], barks: 'slums' }],
    ['walker', 20, 9, { who: 'porter', area: [2, 1, 38, 21], barks: 'slums', carry: 'sack' }],
    ['walker', 8, 12, { who: 'washer', area: [2, 1, 38, 21], barks: 'slums' }],
    ['walker', 18, 37, { who: 'boy', area: [2, 24, 58, 42], barks: 'slums', speed: 44 }],
    ['walker', 24, 38, { who: 'girl', area: [2, 24, 58, 42], barks: 'slums', speed: 40 }],
    ['walker', 40, 36, { who: 'mother', area: [2, 24, 58, 42], barks: 'slums' }],
    ['walker', 34, 16, { who: 'villager', area: [10, 14, 56, 30], barks: 'slums' }],
    ['walker', 28, 28, { who: 'porter', area: [10, 14, 56, 30], barks: 'slums', carry: 'sack' }],
    ['walker', 12, 27, { who: 'oldman', area: [2, 24, 30, 42], barks: 'slums', speed: 16 }],
    ['critter', 48, 8, { kind: 'pigeon', flock: 4 }], ['critter', 44, 12, { kind: 'pigeon', flock: 3 }], ['critter', 24, 20, { kind: 'pigeon', flock: 3 }],
    ['critter', 14, 22, { kind: 'dog', area: [2, 14, 40, 30] }], ['critter', 30, 40, { kind: 'dog', area: [10, 30, 56, 42] }],
    ['critter', 6, 30, { kind: 'cat', area: [2, 24, 20, 42] }], ['critter', 36, 8, { kind: 'cat', area: [26, 1, 40, 14] }],

    ['mark', 51, 12, { tag: 'market' }], ['mark', 57, 41, { tag: 'hideout' }], ['mark', 59, 7, { tag: 'gate' }], ['mark', 4, 36, { tag: 'homeFront' }],
  ],
};

SCENES.home = room('home', 12, 9, P => {
  P.set(2, 2, 'B'); P.set(2, 3, 'V'); P.set(4, 2, 'B'); P.set(4, 3, 'V');
  P.set(10, 2, 'k'); P.set(6, 4, 't'); P.set(7, 4, 't'); P.set(10, 6, 'C'); P.rect(5, 6, 7, 6, 'r');
}, [
  ['npc', 2, 3, { who: 'mother', role: 'mother', lying: true, face: 'r' }],
  ['npc', 4, 3, { who: 'father', role: 'father', lying: true, face: 'r' }],
]);

SCENES.widow = room('widow', 10, 8, P => {
  P.set(7, 2, 'B'); P.set(7, 3, 'V'); P.set(2, 4, 't'); P.set(3, 4, 't'); P.set(3, 1, 'H'); P.set(4, 1, 'H'); P.set(8, 5, 'C');
}, [
  ['watcher', 4, 5, { who: 'widow', role: 'widow', look: [2, 3.5], angles: [Math.PI / 2, 0, Math.PI] }],
  ['container', 8, 5, { kind: 'chest', name: 'сундук', owners: ['widow'], loot: { coins: 1 } }],
]);

SCENES.soldier = room('soldier', 10, 8, P => {
  P.set(1, 2, 'B'); P.set(1, 3, 'V'); P.set(6, 3, 't'); P.set(7, 3, 't'); P.set(7, 1, 'H'); P.set(8, 5, 'C');
}, [
  ['watcher', 5, 5, { who: 'soldier', role: 'soldier', look: [2, 4], angles: [Math.PI / 2, Math.PI, -Math.PI / 2] }],
  ['container', 8, 5, { kind: 'chest', name: 'сундук', owners: ['soldier'], loot: { coins: 2 } }],
]);

SCENES.grumpy = room('grumpy', 10, 8, P => {
  P.set(8, 2, 'B'); P.set(8, 3, 'V'); P.set(3, 3, 't'); P.set(4, 3, 't'); P.set(1, 2, 'k'); P.set(1, 5, 'C');
}, [
  ['watcher', 4, 4, { who: 'grumpy', role: 'grumpy', sit: true, look: [2.5, 4] }],
  ['container', 1, 5, { kind: 'chest', name: 'сундук', owners: ['grumpy'], loot: { coins: 3 } }],
]);

SCENES.junkwoman = room('junkwoman', 10, 8, P => {
  P.set(1, 2, 'B'); P.set(1, 3, 'V'); P.set(5, 1, 'H'); P.set(6, 1, 'H'); P.set(8, 3, 'C'); P.set(4, 3, 't');
}, [
  ['watcher', 4, 5, { who: 'junkwoman', role: 'junkwoman', look: [1.8, 3], angles: [Math.PI / 2, 0, Math.PI, -Math.PI / 2] }],
  ['container', 8, 3, { kind: 'chest', name: 'сундук', owners: ['junkwoman'], loot: { coins: 2 } }],
]);

SCENES.apothecary = room('apothecary', 10, 8, P => {
  for (let x = 1; x <= 8; x++) P.set(x, 1, 'H');
  P.rect(2, 4, 7, 4, 't');
}, [
  ['watcher', 5, 3, { who: 'apothecary', role: 'apothecary', look: [2, 3.5], angles: [Math.PI / 2, -Math.PI / 2, Math.PI / 2, 0] }],
  ['container', 8, 2, { kind: 'chest', name: 'склянку с полки', icon: 'vial', owners: ['apothecary'], loot: { vial: 1 } }],
]);
