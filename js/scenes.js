'use strict';
// Сцены: улицы трущоб, дома (интерьеры), Чёрный лес, заброшенная хижина.
// build() рисует карту и возвращает спавны [вид, tx, ty, опции].

// Домик: крыша и фасад с дверью. Размер задаётся, дверь — снизу
function house(P, x, y, w = 3, h = 3, o = {}) {
  const color = o.color !== undefined ? o.color : (x * 7 + y * 5) % 4;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    P.set(xx, yy, '#'); P.meta(xx, yy, color | ((xx * 3 + yy) % 4 === 1 ? 16 : 0));
  }
  const dx = x + (o.door !== undefined ? o.door : Math.floor(w / 2));
  P.set(dx, y + h - 1, 'D'); P.meta(dx, y + h - 1, o.locked ? 256 : 0);
  return [dx, y + h - 1];
}

// Комната: стены по периметру, выход — коврик в нижней стене
function room(name, w, h, layout, spawns) {
  return {
    name, theme: 'interior', w, h,
    build(P) {
      P.rect(0, 0, w - 1, h - 1, '#'); P.rect(1, 2, w - 2, h - 2, '.');
      const ex = Math.floor(w / 2); P.set(ex, h - 1, 'E');
      layout(P);
      return [['exit', ex, h - 1], ...spawns];
    },
  };
}

const SCENES = {
  // ======================= ГЛАВА 0: ТРУЩОБЫ =======================
  // Кривые проулки, тупики, заборы и хлам. Ни одной прямой улицы через весь город.
  slums: {
    name: 'slums', theme: 'slums', w: 60, h: 44,
    build(P) {
      const { set, rect, get, rng } = P;
      rect(0, 0, 59, 0, 'X'); rect(0, 43, 59, 43, 'X'); rect(0, 0, 0, 43, 'X'); rect(59, 0, 59, 43, 'X');
      rect(59, 6, 59, 8, 'f');                                  // ворота в лес заколочены

      const spawns = [];
      // [x, y, w, h, дверь-в-сцену, смещение двери]
      const homes = [
        [3, 33, 4, 3, 'home', 1], [12, 36, 3, 3], [17, 34, 4, 3], [8, 39, 5, 3],
        [2, 27, 3, 4], [7, 26, 4, 3], [13, 28, 3, 3, 'widow', 1], [18, 26, 5, 3],
        [25, 31, 3, 3], [29, 34, 4, 3], [34, 30, 3, 4], [39, 33, 5, 3], [46, 31, 3, 3, 'junkwoman', 1],
        [51, 35, 4, 3], [44, 38, 4, 3], [24, 38, 4, 3], [33, 39, 4, 3],
        [2, 14, 4, 3, 'soldier', 1], [8, 12, 3, 4], [13, 16, 4, 3], [18, 13, 3, 3],
        [24, 16, 4, 3, 'grumpy', 1], [30, 13, 3, 3], [35, 16, 4, 3],
        [2, 4, 3, 3], [7, 6, 4, 3], [13, 3, 3, 4], [18, 6, 4, 3], [24, 3, 3, 3, 'apothecary', 1],
        [30, 5, 4, 3], [36, 2, 3, 3],
        [54, 17, 3, 3], [46, 20, 4, 3], [53, 26, 4, 3], [35, 21, 4, 3], [24, 22, 3, 3],
      ];
      for (const [x, y, w, h, to, door] of homes) {
        const [dx, dy] = house(P, x, y, w, h, { locked: !to, door, color: to === 'home' ? 0 : undefined });
        spawns.push(['door', dx, dy, to ? { to } : { locked: true }]);
      }

      // Кривая сточная канава с двумя мостками
      const canal = [[1, 23], [9, 23], [14, 22], [22, 24], [31, 23], [38, 25], [47, 23], [58, 24]];
      for (let i = 1; i < canal.length; i++) {
        const [ax, ay] = canal[i - 1], [bx, by] = canal[i], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let k = 0; k <= n; k++) set(Math.round(lerp(ax, bx, k / n)), Math.round(lerp(ay, by, k / n)), '~');
      }
      set(11, 23, '='); set(12, 22, '='); set(34, 24, '='); set(35, 24, '='); set(52, 23, '=');

      // Заборы: тупики и петли, из-за которых по трущобам приходится петлять
      rect(9, 29, 9, 32, 'f'); rect(21, 34, 23, 34, 'f'); rect(28, 26, 28, 30, 'f');
      rect(41, 27, 44, 27, 'f'); rect(15, 8, 15, 11, 'f'); rect(20, 19, 23, 19, 'f');
      rect(38, 9, 38, 13, 'f'); rect(43, 16, 45, 16, 'f'); rect(6, 19, 9, 19, 'f');
      rect(31, 19, 31, 22, 'f'); rect(49, 8, 49, 11, 'f'); rect(5, 37, 5, 40, 'f');

      // Рынок неправильной формы
      rect(40, 1, 57, 4, ':'); rect(42, 5, 57, 11, ':'); rect(46, 12, 52, 14, ':');
      rect(44, 6, 46, 6, 'S'); rect(50, 6, 52, 6, 'S'); rect(44, 10, 46, 10, 'S'); rect(50, 10, 52, 10, 'M');
      rect(55, 8, 55, 9, 'S');

      for (let i = 0; i < 160; i++) { const x = (rng() * 60) | 0, y = (rng() * 44) | 0; if (get(x, y) === '.') set(x, y, ','); }

      // Кучи хлама по закоулкам
      const junk = [[1, 8], [6, 10], [11, 6], [16, 2], [22, 9], [27, 8], [33, 9], [39, 6], [44, 15], [55, 3],
        [1, 19], [10, 17], [17, 20], [26, 21], [34, 19], [41, 21], [51, 19], [57, 13],
        [1, 31], [6, 36], [15, 41], [21, 28], [27, 41], [31, 27], [38, 30], [43, 24], [49, 40], [57, 33]];
      const items = ['Битая бутылка', 'Моток гнилой верёвки', 'Ржавая железка', 'Ворох тряпья', 'Треснувший горшок', 'Старый башмак', 'Гнутая ложка', 'Обломок подковы'];
      junk.forEach(([x, y], i) => spawns.push(['junk', x, y, { item: items[i % items.length] }]));

      // Ящики и бочки: и препятствие, и сундук. Обыскивать можно, только если никто не видит
      const crates = [
        [12, 17, 'crate', { coins: 1 }], [29, 21, 'barrel', { junk: 1 }], [42, 12, 'crate', { coins: 2 }],
        [20, 32, 'barrel', { junk: 1 }], [36, 27, 'crate', { coins: 1 }], [48, 17, 'barrel', { coins: 2 }],
        [7, 22, 'crate', { junk: 1 }], [22, 12, 'barrel', { coins: 1 }], [54, 21, 'crate', { herbs: 1 }],
        [33, 36, 'barrel', { coins: 1 }], [16, 24, 'crate', { junk: 1 }], [45, 35, 'barrel', { coins: 2 }],
        [56, 29, 'crate', { coins: 1 }], [10, 42, 'barrel', { junk: 1 }], [39, 17, 'crate', { coins: 1 }],
      ];
      for (const [x, y, kind, loot] of crates) {
        spawns.push([kind, x, y]);
        spawns.push(['container', x, y, { name: kind === 'crate' ? 'ящик' : 'бочку', hold: 0.9, loot, watched: true }]);
      }
      // Просто препятствия
      for (const [x, y, k] of [[14, 13, 'barrel'], [23, 6, 'crate'], [37, 22, 'barrel'], [50, 25, 'crate'], [4, 21, 'barrel'], [27, 35, 'crate'], [19, 41, 'barrel'], [43, 3, 'crate']]) spawns.push([k, x, y]);

      spawns.push(
        ['npc', 12, 20, { who: 'oldman', role: 'beggar', face: 'r' }],
        ['npc', 30, 25, { who: 'washer', role: 'washer', face: 'l' }],
        ['npc', 21, 30, { who: 'boy', role: 'boy', face: 'r' }],
        ['npc', 37, 13, { who: 'kindwoman', role: 'kindwoman', face: 'l' }],
        ['watcher', 26, 42, { who: 'drunk', role: 'drunk', sit: true, look: [2, 3.5] }],
        ['npc', 41, 8, { who: 'dealer', role: 'dealer', face: 'r' }],
        // Хозяева стоят сбоку от прилавков: можно и заговорить, и стащить, пока смотрят в другую сторону
        ['watcher', 43, 6, { who: 'baker', role: 'baker', look: [1.6, 3], angles: [0, Math.PI / 2, 0, Math.PI] }],
        ['watcher', 49, 6, { who: 'fruiter', role: 'fruiter', look: [1.4, 2.6], angles: [0, Math.PI / 2, Math.PI] }],
        ['watcher', 43, 10, { who: 'clother', role: 'clother', look: [1.2, 2.4], angles: [0, Math.PI / 2, Math.PI] }],
        ['watcher', 54, 9, { who: 'smith', role: 'smith', look: [1.8, 3], angles: [Math.PI, Math.PI / 2, 0] }],
        ['watcher', 49, 10, { who: 'merchant', role: 'merchant', look: [1.2, 2.2], angles: [0, Math.PI / 2, 0, -Math.PI / 2] }],
        ['watcher', 47, 13, { who: 'thug', role: 'guardA', look: [1.5, 2.8], angles: [-Math.PI / 2, Math.PI, 0] }],
        ['watcher', 47, 3, { who: 'thug', role: 'guardB', look: [1.5, 2.8], angles: [Math.PI, Math.PI / 2, -Math.PI / 2] }],
        ['container', 46, 6, { watched: true, name: 'хлеб', icon: 'bread', owners: ['baker'], loot: { bread: 1 } }],
        ['container', 50, 6, { watched: true, name: 'яблоки', icon: 'apple', owners: ['fruiter'], loot: { goods: { name: 'Яблоки', value: 2, icon: 'apple' } } }],
        ['container', 52, 6, { watched: true, name: 'яблоки', icon: 'apple', owners: ['fruiter'], loot: { goods: { name: 'Яблоки', value: 2, icon: 'apple' } } }],
        ['container', 45, 10, { watched: true, name: 'отрез ткани', icon: 'cloth', owners: ['clother'], loot: { goods: { name: 'Отрез ткани', value: 4, icon: 'cloth' } } }],
        ['container', 51, 10, { watched: true, name: 'блестящую подвеску', icon: 'pendant', owners: ['merchant', 'guardA', 'guardB'], hold: 1.4, loot: { pendant: true } }],
        ['mark', 51, 12, { tag: 'market' }], ['mark', 57, 41, { tag: 'hideout' }], ['mark', 59, 7, { tag: 'gate' }], ['mark', 4, 36, { tag: 'homeFront' }],
      );
      return spawns;
    },
  },

  home: room('home', 12, 9, P => {
    P.set(2, 2, 'B'); P.set(2, 3, 'V'); P.set(4, 2, 'B'); P.set(4, 3, 'V');
    P.set(10, 2, 'k'); P.set(6, 4, 't'); P.set(7, 4, 't'); P.set(10, 6, 'C'); P.rect(5, 6, 7, 6, 'r');
  }, [
    ['npc', 2, 3, { who: 'mother', role: 'mother', lying: true, face: 'r' }],
    ['npc', 4, 3, { who: 'father', role: 'father', lying: true, face: 'r' }],
  ]),

  widow: room('widow', 10, 8, P => {
    P.set(7, 2, 'B'); P.set(7, 3, 'V'); P.set(2, 4, 't'); P.set(3, 4, 't'); P.set(3, 1, 'H'); P.set(4, 1, 'H'); P.set(8, 5, 'C');
  }, [
    ['watcher', 4, 5, { who: 'widow', role: 'widow', look: [2, 3.5], angles: [Math.PI / 2, 0, Math.PI] }],
    ['container', 8, 5, { name: 'сундук', owners: ['widow'], loot: { coins: 1 } }],
  ]),

  soldier: room('soldier', 10, 8, P => {
    P.set(1, 2, 'B'); P.set(1, 3, 'V'); P.set(6, 3, 't'); P.set(7, 3, 't'); P.set(7, 1, 'H'); P.set(8, 5, 'C');
  }, [
    ['watcher', 5, 5, { who: 'soldier', role: 'soldier', look: [2, 4], angles: [Math.PI / 2, Math.PI, -Math.PI / 2] }],
    ['container', 8, 5, { name: 'сундук', owners: ['soldier'], loot: { coins: 2 } }],
  ]),

  grumpy: room('grumpy', 10, 8, P => {
    P.set(8, 2, 'B'); P.set(8, 3, 'V'); P.set(3, 3, 't'); P.set(4, 3, 't'); P.set(1, 2, 'k'); P.set(1, 5, 'C');
  }, [
    ['watcher', 4, 4, { who: 'grumpy', role: 'grumpy', sit: true, look: [2.5, 4] }],
    ['container', 1, 5, { name: 'сундук', owners: ['grumpy'], loot: { coins: 3 } }],
  ]),

  junkwoman: room('junkwoman', 10, 8, P => {
    P.set(1, 2, 'B'); P.set(1, 3, 'V'); P.set(5, 1, 'H'); P.set(6, 1, 'H'); P.set(8, 3, 'C'); P.set(4, 3, 't');
  }, [
    ['watcher', 4, 5, { who: 'junkwoman', role: 'junkwoman', look: [1.8, 3], angles: [Math.PI / 2, 0, Math.PI, -Math.PI / 2] }],
    ['container', 8, 3, { name: 'сундук', owners: ['junkwoman'], loot: { coins: 2 } }],
  ]),

  apothecary: room('apothecary', 10, 8, P => {
    for (let x = 1; x <= 8; x++) P.set(x, 1, 'H');
    P.rect(2, 4, 7, 4, 't');
  }, [
    ['watcher', 5, 3, { who: 'apothecary', role: 'apothecary', look: [2, 3.5], angles: [Math.PI / 2, -Math.PI / 2, Math.PI / 2, 0] }],
    ['container', 8, 2, { name: 'склянку с полки', icon: 'vial', owners: ['apothecary'], loot: { goods: { name: 'Склянка с настойкой', value: 3, icon: 'vial' } } }],
  ]),

  // ======================= ГЛАВА 1: ЛЕС =======================
  // Лес-змейка: тропа виляет вверх-вниз, поляны разбросаны, прямой просматриваемой линии нет.
  forest: {
    name: 'forest', theme: 'forest', w: 116, h: 40, fill: 'T', tint: 'rgba(12,16,44,0.5)',
    build(P) {
      const { set, rect, circle, get, rng } = P;
      const path = [[0, 20], [8, 21], [14, 26], [21, 30], [28, 24], [33, 15], [42, 11], [50, 16],
        [57, 24], [64, 30], [72, 25], [78, 17], [86, 13], [93, 20], [99, 28], [106, 24], [112, 18]];
      const glades = [[8, 21, 6], [21, 30, 7], [33, 15, 7], [42, 11, 6], [50, 16, 6], [57, 24, 7],
        [64, 30, 6], [78, 17, 8], [86, 13, 5], [93, 20, 6], [99, 28, 6], [109, 20, 6]];
      for (const [x, y, r] of glades) circle(x, y, r, '.');

      const protect = new Set();
      for (let i = 1; i < path.length; i++) {
        const [ax, ay] = path[i - 1], [bx, by] = path[i], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
        for (let k = 0; k <= n; k++) {
          const x = Math.round(lerp(ax, bx, k / n)), y = Math.round(lerp(ay, by, k / n));
          for (let d = -1; d <= 1; d++) { set(x, y + d, d === 0 ? ':' : (get(x, y + d) === 'T' ? '.' : get(x, y + d))); protect.add(`${x},${y + d}`); }
          for (let d = -1; d <= 1; d++) protect.add(`${x + d},${y}`);
        }
      }
      // Хижина на дальней поляне
      rect(108, 17, 111, 18, 'Y'); rect(108, 19, 111, 19, 'Z'); set(109, 19, 'D');
      for (let x = 106; x <= 113; x++) for (let y = 16; y <= 26; y++) protect.add(`${x},${y}`);

      const spawns = [
        ['player', 1, 20],
        ['campfire', 7, 18, { save: 'edge', night: true }],
        ['rabbit', 11, 23], ['rabbit', 5, 24], ['rabbit', 13, 28], ['rabbit', 19, 33], ['rabbit', 24, 27],
        ['berries', 4, 18], ['herb', 10, 26],
        ['mark', 17, 28, { tag: 'pathBlock' }],
        ['boar', 26, 22, { lvl: 1 }], ['boar', 34, 12, { lvl: 2 }], ['rabbit', 30, 18], ['rabbit', 37, 9],
        ['spiker', 32, 17, { lvl: 2, disguised: true, tag: 'firstSpiker' }], ['herb', 29, 26], ['berries', 40, 8],
        ['spiker', 45, 10, { lvl: 2 }], ['spiker', 52, 19, { lvl: 3 }], ['boar', 48, 14, { lvl: 2 }], ['herb', 55, 27], ['berries', 59, 21],
        ['jumper', 62, 28, { lvl: 3, tag: 'firstJumper' }], ['herb', 66, 33], ['rabbit', 68, 27],
        ['hunter', 79, 15], ['bigJumper', 83, 19, { lvl: 5 }],
        ['rock', 75, 16], ['rock', 81, 12], ['rock', 77, 21], ['rock', 84, 15], ['rock', 74, 19], ['rock', 82, 20],
        ['campfire', 76, 22, { save: 'glade' }],
        ['thrower', 94, 17, { lvl: 3 }], ['spiker', 90, 23, { lvl: 3 }], ['berries', 96, 24],
        ['jumper', 100, 30, { lvl: 4 }], ['herb', 103, 26],
        ['campfire', 106, 22, { save: 'hut' }],
        ['door', 109, 19, { to: 'hut' }],
        ['gateway', 113, 22, { to: 'road', at: [2, 20], label: 'на восток, к тракту' }],
        ['mark', 73, 22, { tag: 'bushes' }],
      ];
      for (const [, sx, sy] of spawns) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) protect.add(`${sx + dx},${sy + dy}`);

      // Поляны боёв оставляем просторными, остальной лес — глухой
      const sparse = glades.map(([x, y, r]) => [x, y, r - 1]);
      for (let y = 1; y < 39; y++) for (let x = 1; x < 115; x++) {
        if (get(x, y) !== '.' || protect.has(`${x},${y}`)) continue;
        const k = sparse.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r) ? 0.3 : 1;
        const r = rng();
        if (r < 0.055 * k) set(x, y, 'T');
        else if (r < 0.13 * k) set(x, y, 'b');
        else if (r < 0.155 * k) set(x, y, 'O');
        else if (r < 0.17 * k && get(x + 1, y) === '.' && !protect.has(`${x + 1},${y}`)) { set(x, y, 'L'); set(x + 1, y, 'L'); }
        else if (r < 0.27) set(x, y, 'q');
        else if (r < 0.4) set(x, y, ',');
      }
      // Кусты, из-за которых герой подсматривает за охотником
      for (let y = 19; y <= 29; y++) { set(72, y, 'b'); set(73, y, 'b'); }
      // Завал: пока герой не переночует, дальше в лес он не пойдёт
      for (let y = 27; y <= 33; y++) set(17, y, 'O');
      return spawns;
    },
  },

  hut: room('hut', 10, 8, P => {
    P.set(2, 2, 'B'); P.set(2, 3, 'V'); P.set(8, 2, 'k'); P.set(5, 4, 't'); P.set(8, 5, 'C'); P.rect(4, 6, 6, 6, 'r');
  }, [
    ['container', 8, 5, { name: 'старый сундук', loot: { meatCooked: 2, herbs: 1 } }],
  ]),

  // ======================= ГЛАВА 2: ДОРОГА И ГОРОД =======================
  // Тракт: длинная дорога с колеями, развилками и опасными обочинами
  road: {
    name: 'road', theme: 'forest', w: 124, h: 36, fill: 'T', respawn: true,
    build(P) {
      const { set, rect, circle, get, rng } = P;
      const path = [[0, 20], [10, 22], [20, 18], [32, 14], [44, 17], [56, 22], [68, 26], [80, 22], [92, 16], [104, 19], [118, 22]];
      const protect = new Set();
      for (let i = 1; i < path.length; i++) {
        const [ax, ay] = path[i - 1], [bx, by] = path[i], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
        for (let k = 0; k <= n; k++) {
          const x = Math.round(lerp(ax, bx, k / n)), y = Math.round(lerp(ay, by, k / n));
          for (let d = -2; d <= 2; d++) { set(x, y + d, Math.abs(d) <= 1 ? 'y' : '.'); protect.add(`${x},${y + d}`); }
        }
      }
      // Обочины и привалы
      circle(20, 26, 5, '.'); circle(46, 9, 5, '.'); circle(72, 30, 5, '.'); circle(96, 10, 5, '.');
      circle(112, 28, 4, '.'); rect(45, 2, 47, 6, '.');
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
        ['container', 21, 24, { name: 'брошенный ящик', hold: 0.9, loot: { coins: 3 } }],
        ['container', 95, 12, { name: 'бочку у обочины', hold: 0.9, loot: { herbs: 1 } }],
      ];
      for (const [, sx, sy] of spawns) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) protect.add(`${sx + dx},${sy + dy}`);
      for (let y = 1; y < 35; y++) for (let x = 1; x < 123; x++) {
        if (get(x, y) !== '.' || protect.has(`${x},${y}`)) continue;
        const r = rng();
        if (r < 0.06) set(x, y, 'T'); else if (r < 0.14) set(x, y, 'b'); else if (r < 0.17) set(x, y, 'O');
        else if (r < 0.26) set(x, y, 'q'); else if (r < 0.4) set(x, y, ',');
      }
      return spawns;
    },
  },

  // Стоянка извозчика: костёр, телега, мешки и разговор о проезде
  camp: {
    name: 'camp', theme: 'forest', w: 44, h: 28, fill: 'T',
    build(P) {
      const { set, rect, circle, get, rng } = P;
      circle(20, 14, 10, '.'); rect(0, 12, 44, 16, '.');
      for (let x = 0; x < 44; x++) set(x, 14, 'y');
      const spawns = [
        ['gateway', 1, 14, { to: 'road', at: [120, 22], label: 'назад на тракт' }],
        ['gateway', 42, 14, { to: 'gate', at: [3, 14], label: 'к городским воротам' }],
        ['npc', 18, 11, { who: 'carter', role: 'carter', face: 'r' }],
        ['npc', 24, 18, { who: 'villager', role: 'campGuest', face: 'l' }],
        ['crate', 15, 12], ['barrel', 26, 12], ['barrel', 14, 17],
        ['container', 15, 12, { name: 'мешки в телеге', hold: 1.2, loot: { coins: 2 }, watched: true, owners: ['carter'] }],
        ['herb', 12, 19], ['berries', 28, 8],
        ['mark', 17, 13, { tag: 'cartSpot' }],
      ];
      for (let y = 1; y < 27; y++) for (let x = 1; x < 43; x++) {
        if (get(x, y) !== '.') continue;
        const r = rng();
        if (r < 0.05) set(x, y, 'T'); else if (r < 0.12) set(x, y, 'b'); else if (r < 0.3) set(x, y, ',');
      }
      return spawns;
    },
  },

  // Городские ворота: стража, очередь и щель в стене для тех, кому нечем платить
  gate: {
    name: 'gate', theme: 'slums', w: 40, h: 26, fill: '.',
    build(P) {
      const { set, rect } = P;
      rect(0, 0, 39, 0, 'X'); rect(0, 25, 39, 25, 'X'); rect(0, 0, 0, 25, 'X');
      rect(33, 0, 33, 25, 'X');                       // городская стена
      rect(34, 11, 39, 16, ':');
      rect(33, 12, 33, 14, 'f');                      // шлагбаум
      rect(28, 20, 32, 20, 'f'); rect(28, 21, 28, 24, 'f');
      set(33, 22, ',');                               // щель в стене за поленницей
      rect(0, 12, 32, 16, ':');
      const spawns = [
        ['gateway', 1, 14, { to: 'camp', at: [41, 14], label: 'назад к стоянке' }],
        ['gateway', 38, 13, { to: 'city', at: [3, 30], label: 'в город' }],
        ['watcher', 31, 12, { who: 'guard', role: 'gateGuardA', look: [1.6, 3], angles: [Math.PI, Math.PI / 2, Math.PI] }],
        ['watcher', 31, 16, { who: 'guard', role: 'gateGuardB', look: [1.8, 3.2], angles: [Math.PI, -Math.PI / 2, Math.PI] }],
        ['npc', 24, 13, { who: 'villager', role: 'queueA', face: 'r' }],
        ['npc', 23, 16, { who: 'kindwoman', role: 'queueB', face: 'r' }],
        ['crate', 30, 21], ['barrel', 31, 23], ['crate', 20, 19],
        ['container', 20, 19, { name: 'ящик у стены', hold: 0.9, loot: { coins: 2 }, watched: true }],
        ['mark', 33, 22, { tag: 'crack' }],
      ];
      return spawns;
    },
  },

  // Город: площадь, рынок, гильдия, таверна и жилые кварталы
  city: {
    name: 'city', theme: 'slums', w: 74, h: 50, fill: ':',
    build(P) {
      const { set, rect, get, rng } = P;
      rect(0, 0, 73, 0, 'X'); rect(0, 49, 73, 49, 'X'); rect(0, 0, 0, 49, 'X'); rect(73, 0, 73, 49, 'X');
      const spawns = [];
      const blocks = [
        [4, 4, 6, 4], [12, 3, 5, 5], [20, 5, 6, 4], [30, 3, 7, 5], [40, 4, 5, 4], [48, 3, 6, 5], [58, 5, 6, 4], [66, 4, 5, 5],
        [4, 14, 5, 5], [12, 16, 6, 4], [22, 15, 5, 5], [58, 15, 6, 5], [66, 16, 5, 4],
        [4, 26, 6, 5], [13, 27, 5, 4], [22, 26, 6, 5], [34, 28, 5, 4], [44, 26, 6, 5], [56, 27, 6, 4], [66, 26, 5, 5],
        [6, 38, 6, 4], [16, 39, 5, 4], [26, 38, 6, 4], [38, 39, 6, 4], [50, 38, 5, 4], [60, 39, 6, 4],
      ];
      for (const [x, y, w, h] of blocks) {
        const [dx, dy] = house(P, x, y, w, h, { locked: true, color: (x + y) % 4 });
        spawns.push(['door', dx, dy, { locked: true }]);
      }
      // Гильдия и таверна — крупные здания с вывесками
      const g = house(P, 30, 14, 8, 6, { door: 4, color: 1 });
      const t = house(P, 42, 14, 7, 6, { door: 3, color: 2 });
      spawns.push(['door', g[0], g[1], { to: 'guild' }], ['door', t[0], t[1], { to: 'tavern' }]);
      // Площадь с фонтаном
      rect(28, 24, 46, 34, ':'); rect(35, 28, 38, 30, '~');
      // Рынок
      rect(10, 8, 26, 12, ':'); rect(12, 10, 14, 10, 'S'); rect(18, 10, 20, 10, 'S'); rect(23, 10, 25, 10, 'S');
      for (let i = 0; i < 120; i++) { const x = (rng() * 74) | 0, y = (rng() * 50) | 0; if (get(x, y) === ':' && rng() < 0.3) set(x, y, ','); }

      spawns.push(
        ['gateway', 2, 30, { to: 'gate', at: [37, 13], label: 'к воротам' }],
        ['gateway', 71, 8, { to: 'hunt', at: [3, 20], label: 'в охотничьи угодья' }],
        ['watcher', 13, 9, { who: 'baker', role: 'cityBaker', look: [1.6, 3], angles: [Math.PI / 2, 0, Math.PI] }],
        ['watcher', 19, 9, { who: 'fruiter', role: 'cityFruiter', look: [1.4, 2.6], angles: [Math.PI / 2, Math.PI] }],
        ['npc', 24, 9, { who: 'dealer', role: 'cityDealer', face: 'l' }],
        ['npc', 34, 22, { who: 'clerk', role: 'crier', face: 'r' }],
        ['npc', 44, 32, { who: 'villager', role: 'cityGossip', face: 'l' }],
        ['npc', 20, 33, { who: 'boy', role: 'cityBoy', face: 'r' }],
        ['watcher', 52, 30, { who: 'guard', role: 'cityGuard', look: [2, 3.5], angles: [Math.PI, Math.PI / 2, 0] }],
        ['npc', 62, 22, { who: 'hunterB', role: 'cityHunter', face: 'l' }],
        ['npc', 26, 13, { who: 'smith', role: 'armorer', face: 'l' }],
        ['npc', 11, 13, { who: 'apothecary', role: 'cityHealer', face: 'r' }],
        ['container', 12, 10, { watched: true, name: 'хлеб', icon: 'bread', owners: ['cityBaker'], loot: { bread: 1 } }],
        ['container', 18, 10, { watched: true, name: 'яблоки', icon: 'apple', owners: ['cityFruiter'], loot: { goods: { name: 'Яблоки', value: 2, icon: 'apple' } } }],
        ['crate', 28, 20], ['barrel', 50, 22], ['barrel', 16, 24], ['crate', 60, 34],
        ['container', 28, 20, { name: 'ящик у стены', hold: 0.9, loot: { coins: 2 }, watched: true }],
        ['container', 60, 34, { name: 'бочку', hold: 0.9, loot: { herbs: 1 }, watched: true }],
        ['mark', 37, 20, { tag: 'guildDoor' }], ['mark', 45, 20, { tag: 'tavernDoor' }],
      );
      return spawns;
    },
  },

  guild: room('guild', 18, 12, P => {
    P.rect(1, 2, 16, 9, 'Q');
    P.rect(4, 4, 12, 4, 'c');          // стойка
    P.set(7, 1, 'd'); P.set(8, 1, 'd'); // доска заказов
    P.rect(6, 8, 11, 8, 'r');
    P.set(15, 3, 'C'); P.set(2, 3, 'H');
  }, [
    ['npc', 8, 3, { who: 'clerk', role: 'guildClerk', face: 'd' }],
    ['npc', 14, 7, { who: 'hunterB', role: 'guildHunter', face: 'l' }],
    ['npc', 3, 7, { who: 'guard', role: 'guildVeteran', face: 'r' }],
    ['mark', 7, 2, { tag: 'board' }],
  ]),

  tavern: room('tavern', 16, 11, P => {
    P.rect(2, 3, 5, 3, 'c');
    P.set(9, 4, 't'); P.set(10, 4, 't'); P.set(9, 7, 't'); P.set(10, 7, 't');
    P.set(13, 2, 'B'); P.set(13, 3, 'V');
    P.set(2, 8, 'k'); P.rect(6, 6, 8, 6, 'r');
  }, [
    ['npc', 3, 2, { who: 'barkeep', role: 'barkeep', face: 'd' }],
    ['npc', 9, 5, { who: 'hunterB', role: 'tavernHunter', face: 'r' }],
    ['npc', 11, 8, { who: 'villager', role: 'tavernDrunk', face: 'l' }],
    ['campfire', 2, 9, { save: 'tavern', lit: true }],
  ]),

  // Охотничьи угодья: сюда гильдия шлёт новичков
  hunt: {
    name: 'hunt', theme: 'forest', w: 84, h: 42, fill: 'T', respawn: true,
    build(P) {
      const { set, rect, circle, get, rng } = P;
      const glades = [[8, 20, 6], [20, 12, 6], [30, 26, 7], [44, 16, 7], [56, 28, 6], [68, 18, 7], [76, 30, 5]];
      for (const [x, y, r] of glades) circle(x, y, r, '.');
      const path = [[0, 20], [10, 20], [20, 13], [30, 25], [42, 17], [56, 27], [68, 19], [80, 28]];
      const protect = new Set();
      for (let i = 1; i < path.length; i++) {
        const [ax, ay] = path[i - 1], [bx, by] = path[i], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
        for (let k = 0; k <= n; k++) {
          const x = Math.round(lerp(ax, bx, k / n)), y = Math.round(lerp(ay, by, k / n));
          for (let d = -1; d <= 1; d++) { set(x, y + d, d === 0 ? ':' : (get(x, y + d) === 'T' ? '.' : get(x, y + d))); protect.add(`${x},${y + d}`); }
        }
      }
      const spawns = [
        ['gateway', 1, 20, { to: 'city', at: [69, 9], label: 'назад в город' }],
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
      for (const [, sx, sy] of spawns) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) protect.add(`${sx + dx},${sy + dy}`);
      const sparse = glades.map(([x, y, r]) => [x, y, r - 1]);
      for (let y = 1; y < 41; y++) for (let x = 1; x < 83; x++) {
        if (get(x, y) !== '.' || protect.has(`${x},${y}`)) continue;
        const k = sparse.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r) ? 0.3 : 1;
        const r = rng();
        if (r < 0.06 * k) set(x, y, 'T'); else if (r < 0.14 * k) set(x, y, 'b'); else if (r < 0.17 * k) set(x, y, 'O');
        else if (r < 0.27) set(x, y, 'q'); else if (r < 0.4) set(x, y, ',');
      }
      return spawns;
    },
  },
};

// Дикая местность из полян и петляющей тропы: общий генератор для рощи и болот
function wild(o) {
  return {
    name: o.name, theme: 'forest', w: o.w, h: o.h, fill: 'T', respawn: true,
    build(P) {
      const { set, rect, circle, get, rng } = P;
      for (const [x, y, r] of o.glades) circle(x, y, r, '.');
      const protect = new Set();
      for (let i = 1; i < o.path.length; i++) {
        const [ax, ay] = o.path[i - 1], [bx, by] = o.path[i], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
        for (let k = 0; k <= n; k++) {
          const x = Math.round(lerp(ax, bx, k / n)), y = Math.round(lerp(ay, by, k / n));
          for (let d = -1; d <= 1; d++) { set(x, y + d, d === 0 ? ':' : (get(x, y + d) === 'T' ? '.' : get(x, y + d))); protect.add(`${x},${y + d}`); }
        }
      }
      const spawns = o.spawns.slice();
      for (const [, sx, sy] of spawns) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) protect.add(`${sx + dx},${sy + dy}`);
      const sparse = o.glades.map(([x, y, r]) => [x, y, r - 1]);
      for (let y = 1; y < o.h - 1; y++) for (let x = 1; x < o.w - 1; x++) {
        if (get(x, y) !== '.' || protect.has(`${x},${y}`)) continue;
        const k = sparse.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 < r * r) ? 0.3 : 1;
        const r = rng();
        if (o.water && r < o.water * k) set(x, y, '~');
        else if (r < (o.water || 0) * k + 0.06 * k) set(x, y, 'T');
        else if (r < (o.water || 0) * k + 0.15 * k) set(x, y, 'b');
        else if (r < (o.water || 0) * k + 0.18 * k) set(x, y, 'O');
        else if (r < 0.28) set(x, y, 'q');
        else if (r < 0.42) set(x, y, ',');
      }
      return spawns;
    },
  };
}

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
    const spawns = [];
    for (const [x, y, w, h] of [[6, 6, 5, 3], [16, 4, 4, 3], [26, 6, 6, 4], [40, 5, 5, 3], [8, 16, 4, 3], [44, 16, 5, 3]]) {
      const [dx, dy] = house(P, x, y, w, h, { locked: true, color: (x + y) % 4 });
      spawns.push(['door', dx, dy, { locked: true }]);
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
    set(28, 16, '~');   // колодец
    for (let i = 0; i < 60; i++) { const x = (rng() * 58) | 0, y = (rng() * 40) | 0; if (get(x, y) === '.' && rng() < 0.5) set(x, y, ','); }
    spawns.push(
      ['gateway', 28, 37, { to: 'road', at: [46, 5], label: 'назад на тракт' }],
      ['npc', 26, 17, { who: 'villager', role: 'farmer', face: 'r' }],
      ['npc', 31, 17, { who: 'kindwoman', role: 'herbwoman', face: 'l' }],
      ['npc', 14, 12, { who: 'boy', role: 'villageBoy', face: 'r' }],
      ['campfire', 24, 20, { save: 'village' }],
      ['boar', 8, 27, { lvl: 2 }], ['boar', 14, 30, { lvl: 2 }], ['boar', 40, 27, { lvl: 2 }], ['boar', 48, 30, { lvl: 3 }], ['boar', 44, 25, { lvl: 3 }],
      ['rabbit', 12, 26], ['rabbit', 46, 31], ['herb', 20, 35], ['herb', 54, 20], ['berries', 4, 18],
      ['crate', 34, 12], ['barrel', 20, 9],
      ['container', 34, 12, { name: 'ящик у амбара', hold: 0.9, loot: { coins: 3 }, watched: true }],
    );
    return spawns;
  },
};
