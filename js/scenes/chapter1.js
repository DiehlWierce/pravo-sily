'use strict';
// Сцены главы 1: Чёрный лес и заброшенная хижина.
// Завалы между этапами ставит story/chapter1.js (столбцы на всю высоту карты — их не обойти).

SCENES.forest = {
  name: 'forest', theme: 'forest', w: 116, h: 40, fill: 'T', tint: 'rgba(12,16,44,0.5)',
  build(P) {
    const glades = [[8, 21, 6], [21, 30, 7], [33, 15, 7], [42, 11, 6], [50, 16, 6], [57, 24, 7],
      [64, 30, 6], [78, 17, 8], [86, 13, 5], [93, 20, 6], [99, 28, 6], [109, 20, 6]];
    const path = [[0, 20], [8, 21], [14, 26], [21, 30], [28, 24], [33, 15], [42, 11], [50, 16],
      [57, 24], [64, 30], [72, 25], [78, 17], [86, 13], [93, 20], [99, 28], [106, 24], [112, 18]];
    for (const [x, y, r] of glades) P.circle(x, y, r, '.');
    const protect = new Set();
    carvePath(P, path, protect, { wide: true });

    // Хижина на дальней поляне
    P.rect(108, 17, 111, 18, 'Y'); P.rect(108, 19, 111, 19, 'Z'); P.set(109, 19, 'D');
    for (let x = 106; x <= 113; x++) for (let y = 16; y <= 26; y++) protect.add(`${x},${y}`);

    const spawns = [
      ['player', 1, 20],
      ['campfire', 7, 18, { save: 'edge', night: true }],
      ['rabbit', 11, 23], ['rabbit', 5, 24], ['rabbit', 13, 28], ['rabbit', 19, 33], ['rabbit', 24, 27],
      ['berries', 4, 18], ['herb', 10, 26],
      ['boar', 26, 22, { lvl: 1 }], ['boar', 34, 12, { lvl: 2 }], ['rabbit', 30, 18], ['rabbit', 37, 9],
      ['spiker', 32, 17, { lvl: 2, disguised: true, tag: 'firstSpiker' }], ['herb', 29, 26], ['berries', 40, 8],
      ['spiker', 45, 10, { lvl: 2 }], ['spiker', 52, 19, { lvl: 3 }], ['boar', 48, 14, { lvl: 2 }], ['herb', 55, 27], ['berries', 59, 21],
      ['jumper', 62, 28, { lvl: 3, tag: 'firstJumper' }], ['herb', 66, 33], ['rabbit', 68, 27],
      // Охотник и большой прыгун: обычные бойцы, дерутся друг с другом, когда герой подходит
      ['hunter', 79, 15, { dormant: true }], ['bigJumper', 84, 20, { lvl: 6, dormant: true, tag: 'bigJumper' }],
      ['rock', 75, 16], ['rock', 81, 12], ['rock', 77, 21], ['rock', 84, 15], ['rock', 74, 19], ['rock', 82, 20], ['rock', 79, 19], ['rock', 86, 17],
      ['campfire', 76, 22, { save: 'glade' }],
      ['thrower', 94, 17, { lvl: 3 }], ['spiker', 90, 23, { lvl: 3 }], ['berries', 96, 24],
      ['jumper', 100, 30, { lvl: 4 }], ['herb', 103, 26],
      ['campfire', 106, 22, { save: 'hut' }],
      ['door', 109, 19, { to: 'hut' }],
      ['gateway', 113, 22, { to: 'road', at: [2, 20], label: 'на восток, к тракту' }],
      ['mark', 17, 28, { tag: 'pathBlock' }], ['mark', 73, 22, { tag: 'bushes' }],
    ];
    protectSpawns(spawns, protect);
    overgrow(P, protect, { glades, trees: 0.055, bushes: 0.075, rocks: 0.025, logs: true });
    // Кусты, из-за которых герой подсматривает за охотником
    for (let y = 19; y <= 29; y++) { P.set(72, y, 'b'); P.set(73, y, 'b'); }
    return spawns;
  },
};

SCENES.hut = room('hut', 10, 8, P => {
  P.set(2, 2, 'B'); P.set(2, 3, 'V'); P.set(8, 2, 'k'); P.set(5, 4, 't'); P.set(8, 5, 'C'); P.rect(4, 6, 6, 6, 'r');
}, [
  ['container', 8, 5, { kind: 'chest', name: 'старый сундук', loot: { meatCooked: 2, herbs: 1 } }],
]);
